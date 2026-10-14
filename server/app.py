#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""安行护腰 · 社区管理平台服务端

零第三方依赖（仅 Python 标准库）。
  - 静态托管：把网站根目录作为站点根，index.html / admin.html / event-flow.html 均可访问
  - REST API：/api/*
  - SSE 实时推送：/api/stream
  - 设备接入：POST /api/ingest/*（模拟器与真实网关走同一协议）

启动：python3 server/app.py  [--port 8848]
"""

import argparse
import json
import mimetypes
import os
import posixpath
import queue
import re
import secrets
import threading
import time
import traceback
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db.init()

# ----------------------------------------------------------------- SSE 广播

_subs = []
_sub_lock = threading.Lock()
_seq = [0]


def sse_seq():
    _seq[0] += 1
    return _seq[0]


def broadcast(kind, payload):
    msg = f"id: {sse_seq()}\nevent: {kind}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
    with _sub_lock:
        dead = []
        for q_ in _subs:
            try:
                q_.put_nowait(msg)
            except queue.Full:
                dead.append(q_)
        for q_ in dead:
            _subs.remove(q_)


# ----------------------------------------------------------------- 鉴权（轻量演示）

TOKEN = secrets.token_hex(16)
_public = {"/api/overview", "/api/session", "/api/health"}


def authed(path, hdr, qs=None):
    if path in _public:
        return True
    if hdr.get("X-Session-Token") == TOKEN:
        return True
    if qs and qs.get("token", [None])[0] == TOKEN:   # EventSource 无法带请求头
        return True
    return False


# ----------------------------------------------------------------- 业务处理

def api_overview():
    return db.overview()


def api_login(body):
    # 演示用：任意非空账号 + 口令 8888 登录，返回会话 token
    user = (body.get("username") or "").strip()
    pwd = (body.get("password") or "").strip()
    if not user:
        return {"ok": False, "error": "请填写账号"}
    if pwd != "8888":
        return {"ok": False, "error": "口令不正确（演示环境统一为 8888）"}
    db.log_audit(user, body.get("role") or "站点运营", "登录", "SITE-YQY", "网页端管理平台登录成功")
    return {"ok": True, "token": TOKEN, "user": user, "site": "颐清园养老社区服务驿站"}


def api_elders():
    rows = [dict(r) for r in db.q("SELECT * FROM elders ORDER BY risk_level, id")]
    for r in rows:
        r["assess_items"] = json.loads(r["assess_items"] or "{}")
        d = db.q1("SELECT status, battery, gas_pressure, gas_state, wear_state, wear_minutes_today, sensing_state, last_seen FROM devices WHERE id=?", (r["device_id"],))
        r["device"] = dict(d) if d else None
        r["events30"] = db.q1("SELECT COUNT(*) c FROM events WHERE elder_id=? AND happened_at>=?", (r["id"], db.fmt(db.now() - timedelta(days=30))))["c"]
        r["falls30"] = db.q1("SELECT COUNT(*) c FROM events WHERE elder_id=? AND kind='跌倒' AND happened_at>=?", (r["id"], db.fmt(db.now() - timedelta(days=30))))["c"]
    return rows


def api_devices():
    rows = [dict(r) for r in db.q("SELECT * FROM devices ORDER BY id")]
    for r in rows:
        e = db.q1("SELECT name_masked, age, risk_level, living FROM elders WHERE id=?", (r["elder_id"],))
        r["elder"] = dict(e) if e else {}
        r["wear_rate_7d"] = _wear7(r["id"])
    return rows


def _wear7(sn):
    r = db.q1("SELECT AVG(minutes) a FROM (SELECT minutes FROM wear_logs WHERE device_id=? ORDER BY day DESC LIMIT 7)", (sn,))
    return round(r["a"] or 0)


def api_events(qs):
    where, args = ["1=1"], []
    if qs.get("kind"):
        where.append("kind=?")
        args.append(qs["kind"][0])
    if qs.get("stage"):
        where.append("stage=?")
        args.append(qs["stage"][0])
    if qs.get("q"):
        where.append("(id LIKE ? OR grid_point LIKE ?)")
        args += [f"%{qs['q'][0]}%", f"%{qs['q'][0]}%"]
    lim = int(qs.get("limit", [60])[0])
    rows = [dict(r) for r in db.q(f"SELECT * FROM events WHERE {' AND '.join(where)} ORDER BY happened_at DESC LIMIT ?", (*args, lim))]
    for r in rows:
        r["imu"] = json.loads(r["imu"] or "{}")
        e = db.q1("SELECT name_masked, age, risk_level FROM elders WHERE id=?", (r["elder_id"],))
        r["elder"] = dict(e) if e else {}
        m = db.q1("SELECT COUNT(*) c, SUM(CASE WHEN ack_at IS NOT NULL THEN 1 ELSE 0 END) a FROM messages WHERE event_id=?", (r["id"],))
        r["msg_total"] = m["c"] or 0
        r["msg_ack"] = m["a"] or 0
        r["has_response"] = bool(db.q1("SELECT id FROM responses WHERE event_id=?", (r["id"],)))
        r["has_review"] = bool(db.q1("SELECT id FROM reviews WHERE event_id=?", (r["id"],)))
    return rows


def api_reports():
    rows = [dict(r) for r in db.q("SELECT * FROM reports ORDER BY quarter DESC")]
    for r in rows:
        r["data"] = json.loads(r["data_json"] or "{}")
    return rows


def api_suggestions():
    rows = [dict(r) for r in db.q(
        "SELECT v.suggestion, v.root_cause, v.reviewed_at, e.grid_point, e.kind, e.id AS event_id "
        "FROM reviews v JOIN events e ON e.id=v.event_id WHERE v.to_suggestion=1 ORDER BY v.reviewed_at DESC")]
    # 聚合同一点位
    agg = {}
    for r in rows:
        k = r["grid_point"]
        a = agg.setdefault(k, {"point": k, "count": 0, "suggestion": r["suggestion"], "cause": r["root_cause"], "last": r["reviewed_at"]})
        a["count"] += 1
        a["last"] = max(a["last"], r["reviewed_at"])
    out = sorted(agg.values(), key=lambda x: -x["count"])
    for i, a in enumerate(out):
        a["priority"] = "P0" if a["count"] >= 3 else ("P1" if a["count"] == 2 else "P2")
    return out


def api_audit(limit=80):
    return [dict(r) for r in db.q("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))]


# ----------------------------------------------------------------- 设备接入

def ingest_event(body):
    sn = (body.get("device_sn") or "").strip()
    if not sn:
        return {"ok": False, "error": "缺少 device_sn"}
    d = db.q1("SELECT * FROM devices WHERE id=?", (sn,))
    if not d:
        return {"ok": False, "error": f"设备 {sn} 未在平台注册"}
    e = db.q1("SELECT * FROM elders WHERE id=?", (d["elder_id"],))
    kind = body.get("kind") or "跌倒"
    level = {"跌倒": "紧急", "险跌": "重要", "误报": "一般", "设备告警": "一般"}[kind]
    t = db.now()
    place = body.get("place") or "2号楼门前台阶"
    imu = body.get("imu") or db._imu(__import__("random"), kind)
    conf = float(body.get("confidence") or 0.9)
    fired = 1 if kind == "跌倒" else 0
    impact = float(body.get("impact_peak_g") or (2.4 if fired else 0.4))
    seq = db.q1("SELECT COUNT(*) c FROM events")["c"] + 1
    eid = f"EV{t.year}{seq:05d}"
    db.ex("INSERT INTO events(id,device_id,elder_id,site_id,kind,level,stage,happened_at,reported_at,lat,lon,place,grid_point,airbag_fired,impact_peak_g,pose,model_state,confidence,imu,teng,battery,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          (eid, sn, d["elder_id"], d["site_id"], kind, level, "待接单", db.fmt(t), db.fmt(t),
           body.get("lat", 39.9812), body.get("lon", 116.3021), place, place, fired, impact,
           body.get("pose", "侧向后倒"), body.get("model_state", "触发" if fired else "预警"), conf,
           json.dumps(imu, ensure_ascii=False),
           json.dumps(body.get("teng") or {"柔性阵列峰值": 2.1, "接触面积cm2": 5, "腰腹形变mm": 11.4}, ensure_ascii=False),
           d["battery"], body.get("note", f"{e['name_masked'] if e else ''}在{place}触发{kind}，设备本地已声光报警并推送。")))

    # 双通道推送
    grid = "刘志强" if body.get("lon", 116) < 116.31 else "马春华"
    push = t + timedelta(seconds=3)
    body_txt = (f"{e['name_masked'] if e else '老人'}在{place}触发{kind}。"
                + (f"气囊已展开，峰值冲击 {impact} g。" if fired else "")
                + f"位置：{place}。请就近到场核实。")
    chans = [("社区网格", grid, "社区网格员"), ("家属", e["guardian_name"] if e else "家属", e["guardian_relation"] if e else "家属")]
    k = db.q1("SELECT COUNT(*) c FROM messages")["c"] + 1
    for i, (ch, recv, role) in enumerate(chans, start=1):
        db.ex("INSERT INTO messages(id,event_id,channel,receiver,receiver_role,receiver_phone,title,body,pushed_at,delivered_at,read_at,ack_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
              (f"M{t.strftime('%H%M%S')}{i}", eid, ch, recv, role, "—",
               f"【安行护腰】{e['name_masked'] if e else ''}{kind}预警", body_txt,
               db.fmt(push), db.fmt(push + timedelta(seconds=2)), None, None, "已送达"))
    db.ex("INSERT INTO responses(id,event_id,responder,role,org,phone,assigned_at,acked_at,arrived_at,onsite_note,measure,hospital,result,closed_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          (f"R{t.strftime('%H%M%S')}", eid, grid, "社区网格员", "颐清园养老社区服务驿站", "—",
           db.fmt(push), None, None, None, None, None, None, None, "待接单"))
    db.log_audit("设备网关", "设备", "事件上报", eid, f"{sn} 上报 {kind}，平台已落库并双通道下发")
    payload = {"event_id": eid, "kind": kind, "device_sn": sn, "elder": e["name_masked"] if e else "",
               "place": place, "airbag": bool(fired), "impact": impact, "at": db.fmt(t)}
    broadcast("event", payload)
    broadcast("toast", {"text": f"设备 {sn} 上报{kind}：{e['name_masked'] if e else ''} @ {place}"})
    return {"ok": True, "event_id": eid, "pushed_channels": [c[0] for c in chans]}


def ingest_telemetry(body):
    sn = (body.get("device_sn") or "").strip()
    d = db.q1("SELECT * FROM devices WHERE id=?", (sn,))
    if not d:
        return {"ok": False, "error": "device not registered"}
    bat = body.get("battery", d["battery"])
    gas = body.get("gas_pressure", d["gas_pressure"])
    wear = body.get("wear_minutes_today", d["wear_minutes_today"])
    ws = body.get("wear_state", d["wear_state"])
    status = "在线"
    if bat < 20:
        status = "低电量"
    elif gas < 82:
        status = "低气压"
    gas_state = "充足" if gas >= 88 else ("偏低" if gas >= 82 else "需回充")
    db.ex("UPDATE devices SET battery=?, gas_pressure=?, gas_state=?, wear_minutes_today=?, wear_state=?, status=?, last_seen=? WHERE id=?",
          (bat, gas, gas_state, wear, ws, status, db.fmt(db.now()), sn))
    if body.get("sensing_state"):
        db.ex("UPDATE devices SET sensing_state=? WHERE id=?", (body["sensing_state"], sn))
    db.ex("INSERT OR REPLACE INTO wear_logs VALUES(?,?,?)", (sn, db.fmt(db.now())[:10], int(wear)))
    broadcast("telemetry", {"device_sn": sn, "battery": bat, "gas_pressure": gas,
                            "wear_minutes_today": int(wear), "wear_state": ws, "status": status,
                            "gas_state": gas_state, "last_seen": db.fmt(db.now())})
    return {"ok": True, "status": status, "gas_state": gas_state}


# ----------------------------------------------------------------- 工单动作

def act_ack(body):
    rid = body.get("response_id")
    r = db.q1("SELECT * FROM responses WHERE id=?", (rid,))
    if not r:
        return {"ok": False, "error": "工单不存在"}
    db.ex("UPDATE responses SET acked_at=?, status='响应中' WHERE id=?", (db.fmt(db.now()), rid))
    db.ex("UPDATE events SET stage='已接单' WHERE id=?", (r["event_id"],))
    db.ex("UPDATE messages SET ack_at=?, status='已确认' WHERE event_id=? AND channel='社区网格'", (db.fmt(db.now()), r["event_id"]))
    db.log_audit(body.get("actor", r["responder"]), r["role"], "接单", r["event_id"], f"{r['responder']} 接单 {r['event_id']}")
    broadcast("response", {"event_id": r["event_id"], "action": "ack", "by": r["responder"], "at": db.fmt(db.now())})
    return {"ok": True}


def act_arrive(body):
    rid = body.get("response_id")
    r = db.q1("SELECT * FROM responses WHERE id=?", (rid,))
    if not r:
        return {"ok": False, "error": "工单不存在"}
    note = body.get("onsite_note") or "已到达现场，老人状态平稳。"
    db.ex("UPDATE responses SET arrived_at=?, onsite_note=?, status='已到场' WHERE id=?", (db.fmt(db.now()), note, rid))
    db.ex("UPDATE events SET stage='已到场' WHERE id=?", (r["event_id"],))
    db.log_audit(r["responder"], r["role"], "到场", r["event_id"], note)
    broadcast("response", {"event_id": r["event_id"], "action": "arrive", "by": r["responder"], "at": db.fmt(db.now())})
    return {"ok": True}


def act_close(body):
    rid = body.get("response_id")
    r = db.q1("SELECT * FROM responses WHERE id=?", (rid,))
    if not r:
        return {"ok": False, "error": "工单不存在"}
    measure = body.get("measure") or "现场查体无明显外伤，协助起身静坐观察。"
    hospital = body.get("hospital") or "未就医"
    result = body.get("result") or "处置完成，转入观察。"
    db.ex("UPDATE responses SET measure=?, hospital=?, result=?, closed_at=?, status='已关闭' WHERE id=?",
          (measure, hospital, result, db.fmt(db.now()), rid))
    db.ex("UPDATE events SET stage='已处置' WHERE id=?", (r["event_id"],))
    db.log_audit(r["responder"], r["role"], "处置完成", r["event_id"], f"{measure} / {hospital}")
    broadcast("response", {"event_id": r["event_id"], "action": "close", "by": r["responder"], "at": db.fmt(db.now())})
    return {"ok": True}


def act_review(body):
    eid = body.get("event_id")
    ev = db.q1("SELECT * FROM events WHERE id=?", (eid,))
    if not ev:
        return {"ok": False, "error": "事件不存在"}
    if db.q1("SELECT id FROM reviews WHERE event_id=?", (eid,)):
        return {"ok": False, "error": "该事件已复盘"}
    effect = body.get("protect_effect") or "无防护需求：未触地，气囊未展开"
    cause = body.get("root_cause") or f"{ev['grid_point']}点位环境因素与老人平衡能力共同作用。"
    lesson = body.get("lesson") or "响应链路完整，处置及时。"
    sug = body.get("suggestion") or "建议在该点位增加休息座椅与扶手。"
    to_heat = 1 if ev["kind"] in ("跌倒", "险跌") else 0
    db.ex("INSERT INTO reviews(id,event_id,reviewer,reviewed_at,protect_effect,root_cause,lesson,suggestion,to_heat_map,to_suggestion,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          (f"V{eid[-5:]}{int(time.time())%1000}", eid, body.get("actor", "安行护腰项目组"),
           db.fmt(db.now()), effect, cause, lesson, sug, to_heat, to_heat, cause))
    db.ex("UPDATE events SET stage='已复盘' WHERE id=?", (eid,))
    db.log_audit(body.get("actor", "项目组"), "复盘", eid, f"根因：{cause}")
    broadcast("response", {"event_id": eid, "action": "review", "by": body.get("actor", "项目组"), "at": db.fmt(db.now())})
    return {"ok": True}


# ----------------------------------------------------------------- HTTP

ROUTES_GET = {
    "/api/health": lambda qs: {"ok": True, "time": db.fmt(db.now()), "db": db.DB_PATH},
    "/api/session": lambda qs: {"token": TOKEN},
    "/api/overview": lambda qs: api_overview(),
    "/api/elders": lambda qs: api_elders(),
    "/api/devices": lambda qs: api_devices(),
    "/api/events": api_events,
    "/api/heat": lambda qs: db.heat_map(),
    "/api/wear": lambda qs: db.wear_board(int(qs.get("days", [7])[0])),
    "/api/wear/detail": lambda qs: db.wear_detail(int(qs.get("days", [7])[0])),
    "/api/reports": lambda qs: api_reports(),
    "/api/suggestions": lambda qs: api_suggestions(),
    "/api/audit": lambda qs: api_audit(int(qs.get("limit", [80])[0])),
    "/api/site": lambda qs: [dict(r) for r in db.q("SELECT * FROM sites")],
    "/api/star": lambda qs: _star_event(qs),
    "/api/events/flow": lambda qs: (db.event_flow(qs["id"][0]) if qs.get("id") else _star_event(qs)),
}


def _star_event(qs):
    """默认展示事件：优先取演示用的全链路事件（E001 + 跌倒 + 已复盘，五段齐全）。"""
    eid = qs.get("id", [None])[0]
    if eid:
        f = db.event_flow(eid)
        if f:
            return f
    r = db.q1("SELECT id FROM events WHERE elder_id='E001' AND kind='跌倒' AND stage='已复盘' ORDER BY happened_at DESC LIMIT 1")
    if not r:
        r = db.q1("SELECT id FROM events WHERE kind='跌倒' AND stage='已复盘' ORDER BY happened_at DESC LIMIT 1")
    if not r:
        r = db.q1("SELECT id FROM events ORDER BY happened_at DESC LIMIT 1")
    return db.event_flow(r["id"]) if r else None


ROUTES_POST = {
    "/api/login": api_login,
    "/api/ingest/event": ingest_event,
    "/api/ingest/telemetry": ingest_telemetry,
    "/api/actions/ack": act_ack,
    "/api/actions/arrive": act_arrive,
    "/api/actions/close": act_close,
    "/api/actions/review": act_review,
}


class Handler(BaseHTTPRequestHandler):
    server_version = "AnXingPlatform/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if os.environ.get("ANXING_VERBOSE"):
            super().log_message(fmt, *args)

    # ---------- helpers
    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        path = posixpath.normpath(path).lstrip("/")
        full = os.path.join(ROOT, path)
        if not os.path.abspath(full).startswith(ROOT) or not os.path.isfile(full):
            self.send_error(404, "Not Found")
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        with open(full, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    # ---------- SSE
    def do_GET(self):
        u = urlparse(self.path)
        p, qs = u.path, parse_qs(u.query)
        if p == "/api/stream":
            if not authed(p, self.headers, qs):
                return self._json({"ok": False, "error": "unauthorized"}, 401)
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q_ = queue.Queue(maxsize=200)
            with _sub_lock:
                _subs.append(q_)
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while True:
                    try:
                        m = q_.get(timeout=15)
                    except queue.Empty:
                        m = ": ping\n\n"
                    self.wfile.write(m.encode("utf-8"))
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                with _sub_lock:
                    if q_ in _subs:
                        _subs.remove(q_)
            return
        if p.startswith("/api/"):
            if not authed(p, self.headers):
                return self._json({"ok": False, "error": "unauthorized"}, 401)
            fn = ROUTES_GET.get(p)
            if not fn:
                return self._json({"ok": False, "error": "not found"}, 404)
            try:
                return self._json(fn(qs))
            except Exception as e:
                traceback.print_exc()
                return self._json({"ok": False, "error": str(e)}, 500)
        return self._static(p)

    def do_POST(self):
        u = urlparse(self.path)
        p = u.path
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            body = {}
        if p == "/api/login":
            return self._json(ROUTES_POST[p](body))
        if not authed(p, self.headers):
            return self._json({"ok": False, "error": "unauthorized"}, 401)
        fn = ROUTES_POST.get(p)
        if not fn:
            return self._json({"ok": False, "error": "not found"}, 404)
        try:
            return self._json(fn(body))
        except Exception as e:
            traceback.print_exc()
            return self._json({"ok": False, "error": str(e)}, 500)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8848)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--reseed", action="store_true")
    a = ap.parse_args()
    if a.reseed:
        db.seed(force=True)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    srv.daemon_threads = True
    print(f"安行护腰社区管理平台已启动：http://{a.host}:{a.port}/")
    print(f"  · 前台展示      http://{a.host}:{a.port}/index.html")
    print(f"  · 后台管理      http://{a.host}:{a.port}/admin.html   （演示口令 8888）")
    print(f"  · 事件流程回放  http://{a.host}:{a.port}/event-flow.html")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
