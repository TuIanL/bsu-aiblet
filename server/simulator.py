#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""安行护腰 · 设备侧模拟器（Device Gateway Simulator）

扮演真实硬件网关，通过 HTTP 向平台上报：
  1) 周期性遥测 POST /api/ingest/telemetry   —— 电量、储气压力、佩戴时长、佩戴状态
  2) 事件上报   POST /api/ingest/event       —— 跌倒 / 险跌 / 误报 / 设备告警

与真实网关的差异仅在于信号由脚本生成而非由 TENG+IMU 采集，协议与字段口径一致。
接入真实硬件时，只需把这层替换为网关的 HTTP 客户端，平台侧无需改动。

用法：
  python3 server/simulator.py --base http://127.0.0.1:8848
  python3 server/simulator.py --fall        # 立即触发一次跌倒事件
  python3 server/simulator.py --once        # 只发一帧遥测后退出（便于验证）
"""

import argparse
import json
import random
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

PLACES = ["2号楼门前台阶", "1号楼东单元门厅", "中心活动室", "社区食堂", "院内主干道",
          "康复训练室", "3号楼单元入口", "花园凉亭", "1号楼二层走廊", "2号楼电梯厅"]


class Sim:
    def __init__(self, base, token, verbose=True):
        self.base = base.rstrip("/")
        self.token = token
        self.verbose = verbose
        self.state = {}

    def _post(self, path, payload):
        req = urllib.request.Request(
            self.base + path,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json", "X-Session-Token": self.token},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read().decode("utf-8"))

    def _get(self, path):
        req = urllib.request.Request(self.base + path, headers={"X-Session-Token": self.token})
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read().decode("utf-8"))

    def log(self, *a):
        if self.verbose:
            print(*a, flush=True)

    # ---------- 遥测
    def telemetry(self, dev):
        st = self.state.setdefault(dev["id"], {
            "battery": dev["battery"], "gas": dev["gas_pressure"], "wear": dev["wear_minutes_today"],
        })
        st["battery"] = max(3, st["battery"] - random.choice([0, 0, 1]))
        st["gas"] = round(max(70.0, st["gas"] - random.choice([0, 0, 0.2, 0.4])), 1)
        st["wear"] = min(780, st["wear"] + random.randint(3, 22))
        wear_state = "佩戴中" if 7 <= datetime.now().hour < 21 else "未佩戴"
        sensing = "正常"
        if dev["id"].endswith("0005"):
            sensing = "基线漂移告警"
        res = self._post("/api/ingest/telemetry", {
            "device_sn": dev["id"], "battery": st["battery"], "gas_pressure": st["gas"],
            "wear_minutes_today": st["wear"], "wear_state": wear_state, "sensing_state": sensing,
        })
        self.log(f"  [遥测] {dev['id']} 电量 {st['battery']}% 气压 {st['gas']}kPa 佩戴 {st['wear']}min → {res.get('status')}")
        return res

    # ---------- 事件
    def event(self, dev, kind=None):
        kind = kind or random.choices(["跌倒", "险跌", "误报", "设备告警"], weights=[14, 46, 28, 12])[0]
        place = random.choice(PLACES)
        imu = {
            "roll_deg": round(random.uniform(35, 64) if kind == "跌倒" else random.uniform(14, 32), 1),
            "pitch_drop_deg": round(random.uniform(20, 42) if kind == "跌倒" else random.uniform(8, 20), 1),
            "accel_peak_g": round(random.uniform(2.0, 3.5) if kind == "跌倒" else random.uniform(0.8, 1.8), 2),
            "gyro_peak_dps": round(random.uniform(260, 540) if kind == "跌倒" else random.uniform(80, 220)),
            "balance_margin": round(random.uniform(0.03, 0.13) if kind == "跌倒" else random.uniform(0.15, 0.4), 2),
            "inference_ms": random.randint(70, 126),
        }
        res = self._post("/api/ingest/event", {
            "device_sn": dev["id"], "kind": kind, "place": place, "imu": imu,
            "confidence": round(random.uniform(0.83, 0.97) if kind == "跌倒" else random.uniform(0.45, 0.78), 2),
            "impact_peak_g": round(random.uniform(1.5, 3.2), 2) if kind == "跌倒" else round(random.uniform(0.2, 0.8), 2),
            "pose": random.choice(["侧向后倒", "前向屈曲", "后向失衡"]),
            "teng": {"柔性阵列峰值": round(random.uniform(1.4, 3.9), 2),
                     "接触面积cm2": random.randint(3, 9),
                     "腰腹形变mm": round(random.uniform(6, 19), 1)},
        })
        self.log(f"  [事件] {dev['id']} → {kind} @ {place}  result={res}")
        return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8848")
    ap.add_argument("--interval", type=float, default=6.0, help="遥测上报间隔秒")
    ap.add_argument("--event-every", type=int, default=6, help="平均每 N 帧遥测触发一次事件")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--fall", action="store_true", help="立即触发一次跌倒")
    ap.add_argument("--kind", default=None, help="配合 --fall 指定事件类型")
    ap.add_argument("--device", default=None, help="指定设备 SN")
    a = ap.parse_args()

    sim = Sim(a.base, "", True)
    try:
        sim.token = sim._get("/api/session")["token"]
        devices = sim._get("/api/devices")
    except urllib.error.URLError:
        print(f"无法连接平台 {a.base}，请先启动：python3 server/app.py")
        return

    if a.device:
        devices = [d for d in devices if d["id"] == a.device] or devices
    print(f"设备网关模拟器已接入 {a.base}，共 {len(devices)} 台在管设备")

    if a.fall:
        sim.event(devices[0], a.kind or "跌倒")
        return
    if a.once:
        for d in devices:
            sim.telemetry(d)
        return

    tick = 0
    try:
        while True:
            tick += 1
            sim.log(f"— tick {tick} {datetime.now():%H:%M:%S} —")
            for d in devices:
                try:
                    sim.telemetry(d)
                except Exception as e:
                    sim.log(f"  遥测失败 {d['id']}: {e}")
            if random.random() < 1.0 / max(1, a.event_every):
                sim.event(random.choice(devices))
            time.sleep(a.interval)
    except KeyboardInterrupt:
        print("\n模拟器已停止")


if __name__ == "__main__":
    main()
