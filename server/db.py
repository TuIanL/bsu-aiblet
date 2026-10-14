# -*- coding: utf-8 -*-
"""安行护腰 · 社区管理平台 —— 数据层（SQLite，零第三方依赖）

表结构严格对应商业计划书：
  表 3-3 网页端管理平台功能：老人档案 / 社区风险分布 / 佩戴率看板 / 事件与响应记录 / 季度报告 / 改造建议
  表 4-2 服务闭环七环节：建档 → 评估 → 配发 → 运行 → 响应 → 回流 → 复评
  四层技术架构：柔性感知层 / 风险识别层 / 主动保护层 / 响应与沉淀层
"""

import json
import os
import random
import sqlite3
import threading
import time
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "platform.db")
_local = threading.local()

# ---------------------------------------------------------------- 基础工具

SCHEMA = """
PRAGMA journal_mode=WAL;

-- 社区点位（第 1 环节 社区进场与建档）
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  address TEXT,
  operator TEXT,
  grid_workers TEXT,              -- 社区网格员名单，JSON 数组
  station_count INTEGER,
  elder_count INTEGER,
  created_at TEXT
);

-- 老人档案（第 2 环节 防跌安全评估）
CREATE TABLE IF NOT EXISTS elders (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  name_masked TEXT,               -- 脱敏展示：周**、陆**
  age INTEGER,
  sex TEXT,
  living TEXT,                    -- 独居 / 与子女同住 / 与配偶同住
  risk_level TEXT,                -- 高风险 / 中风险 / 低风险
  risk_score REAL,
  assess_date TEXT,
  assessor TEXT,
  assess_items TEXT,              -- JSON：平衡能力/步速/起立测试/用药史/既往跌倒
  history_fall INTEGER DEFAULT 0,
  device_id TEXT,
  guardian_name TEXT,
  guardian_relation TEXT,
  guardian_phone TEXT,
  note TEXT
);

-- 设备台账（第 3 环节 设备配发与佩戴指导）
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,            -- 设备 SN
  site_id TEXT,
  elder_id TEXT,
  model TEXT,
  firmware TEXT,
  batch TEXT,
  status TEXT,                    -- 在线 / 离线 / 充电中 / 低电量 / 低气压 / 维护
  battery INTEGER,                -- 电量 %
  gas_pressure REAL,              -- 储气压力 kPa（<85 需回充）
  gas_state TEXT,                 -- 充足 / 偏低 / 需回充
  sensing_state TEXT,             -- 柔性传感通道：正常 / 基线漂移告警 / 降级运行
  wear_state TEXT,                -- 佩戴中 / 未佩戴
  wear_minutes_today INTEGER,
  last_seen TEXT,
  assigned_at TEXT,
  charge_base TEXT
);

-- 佩戴率看板（第 4 环节 日常运行与依从性维护）：device_id, day, minutes
CREATE TABLE IF NOT EXISTS wear_logs (
  device_id TEXT,
  day TEXT,
  minutes INTEGER,
  PRIMARY KEY (device_id, day)
);

-- 事件记录（第 5 环节 事件响应）
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  elder_id TEXT,
  site_id TEXT,
  kind TEXT,                      -- 跌倒 / 险跌 / 误报 / 设备告警
  level TEXT,                     -- 紧急 / 重要 / 一般
  stage TEXT,                     -- 处置阶段：待接单 / 已接单 / 已到场 / 已处置 / 已复盘
  happened_at TEXT,
  reported_at TEXT,
  lat REAL, lon REAL,
  place TEXT,                     -- 社区网格位置
  grid_point TEXT,
  airbag_fired INTEGER,           -- 主动保护层是否展开
  impact_peak_g REAL,
  pose TEXT,
  model_state TEXT,               -- 风险识别层输出：安全 / 预警 / 触发
  confidence REAL,
  imu TEXT,                       -- 原始特征摘要 JSON
  teng TEXT,
  battery INTEGER,
  note TEXT
);

-- 双通道消息（网格员本地响应通道 + 家属知情通道）
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  channel TEXT,                   -- 社区网格 / 家属
  receiver TEXT,
  receiver_role TEXT,
  receiver_phone TEXT,
  title TEXT,
  body TEXT,
  pushed_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  ack_at TEXT,
  status TEXT                     -- 已送达 / 已读 / 已确认
);

-- 人工响应工单
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  responder TEXT,
  role TEXT,                      -- 社区网格员 / 家属 / 急救 / 驻场社工
  org TEXT,
  phone TEXT,
  assigned_at TEXT,
  acked_at TEXT,
  arrived_at TEXT,
  onsite_note TEXT,
  measure TEXT,                   -- 处置措施
  hospital TEXT,                  -- 是否就医
  result TEXT,                    -- 处置结论
  closed_at TEXT,
  status TEXT                     -- 待接单 / 响应中 / 已到场 / 已处置 / 已关闭
);

-- 复盘（第 6、7 环节 数据回流与社区画像 / 环境改造建议）
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  reviewer TEXT,
  reviewed_at TEXT,
  protect_effect TEXT,            -- 防护有效性判定
  root_cause TEXT,
  lesson TEXT,
  suggestion TEXT,
  to_heat_map INTEGER DEFAULT 1,
  to_suggestion INTEGER DEFAULT 0,
  content TEXT
);

-- 季度报告
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  site_id TEXT,
  quarter TEXT,
  period TEXT,
  generated_at TEXT,
  generated_by TEXT,
  status TEXT,                    -- 草稿 / 待人工核校 / 已输出
  summary TEXT,
  data_json TEXT
);

-- 全流程留痕审计
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  actor TEXT,
  role TEXT,
  action TEXT,
  target TEXT,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_time ON events(happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_event ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_resp_event ON responses(event_id);
"""


def now():
    return datetime.now()


def fmt(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def conn():
    c = getattr(_local, "conn", None)
    if c is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        c = sqlite3.connect(DB_PATH, timeout=15)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA foreign_keys=ON")
        _local.conn = c
    return c


def q(sql, args=()):
    return conn().execute(sql, args).fetchall()


def q1(sql, args=()):
    r = conn().execute(sql, args).fetchone()
    return r


def ex(sql, args=()):
    c = conn()
    cur = c.execute(sql, args)
    c.commit()
    return cur


def log_audit(actor, role, action, target, detail):
    ex(
        "INSERT INTO audit_logs(ts,actor,role,action,target,detail) VALUES(?,?,?,?,?,?)",
        (fmt(now()), actor, role, action, target, detail),
    )


# ---------------------------------------------------------------- 种子数据

SURNAME = ["周", "陆", "郑", "王", "李", "孙", "吴", "钱", "冯", "褚", "卫", "蒋"]
GIVEN = ["秀英", "桂芳", "淑珍", "凤英", "玉兰", "金花", "翠萍", "爱华", "美玲", "德芬", "惠珍", "全妹"]

GRID_POINTS = [
    ("1号楼东单元门厅", 20.0, 62.0),
    ("1号楼二层走廊", 20.0, 48.0),
    ("2号楼门前台阶", 38.0, 58.0),
    ("2号楼电梯厅", 38.0, 44.0),
    ("3号楼单元入口", 56.0, 60.0),
    ("中心活动室", 50.0, 33.0),
    ("康复训练室", 68.0, 36.0),
    ("社区食堂", 50.0, 18.0),
    ("院内主干道", 50.0, 74.0),
    ("花园凉亭", 78.0, 68.0),
]

ASSESS_ITEMS_HIGH = {
    "起立测试": "5 次起立耗时 18.6s（>15s 提示力量不足）",
    "步速": "0.62 m/s（<0.8 m/s 提示跌倒高风险）",
    "平衡能力": "Berg 平衡量表 38 分（<45 提示高风险）",
    "用药史": "降压药 2 种 + 镇静类 1 种",
    "既往跌倒": "近 12 个月 2 次",
}
ASSESS_ITEMS_MID = {
    "起立测试": "5 次起立耗时 12.4s",
    "步速": "0.86 m/s",
    "平衡能力": "Berg 平衡量表 44 分",
    "用药史": "降压药 1 种",
    "既往跌倒": "近 12 个月 1 次（轻微）",
}
ASSESS_ITEMS_LOW = {
    "起立测试": "5 次起立耗时 8.9s",
    "步速": "1.05 m/s",
    "平衡能力": "Berg 平衡量表 51 分",
    "用药史": "无多药联用",
    "既往跌倒": "近 12 个月 0 次",
}


def _dt(days_ago, hour=None, minute=None):
    d = now() - timedelta(days=days_ago)
    return d.replace(hour=hour if hour is not None else d.hour,
                     minute=minute if minute is not None else d.minute,
                     second=random.randint(0, 59),
                     microsecond=0)


def seed(force=False):
    if not force and q1("SELECT id FROM sites LIMIT 1"):
        return False
    ex("DELETE FROM audit_logs")
    ex("DELETE FROM reviews")
    ex("DELETE FROM responses")
    ex("DELETE FROM messages")
    ex("DELETE FROM events")
    ex("DELETE FROM wear_logs")
    ex("DELETE FROM devices")
    ex("DELETE FROM elders")
    ex("DELETE FROM reports")
    ex("DELETE FROM sites")

    rnd = random.Random(20260918)
    random.seed(20260918)

    site_id = "SITE-YQY"
    ex(
        "INSERT INTO sites(id,name,district,address,operator,grid_workers,station_count,elder_count,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
        (
            site_id, "颐清园养老社区服务驿站", "海淀区",
            "北京市海淀区颐清园东路 3 号", "安行护腰项目组 × 颐清园养老社区",
            json.dumps(
                [
                    {"name": "刘志强", "phone": "138****4021", "role": "网格员", "zone": "1—3 号楼"},
                    {"name": "马春华", "phone": "139****7735", "role": "网格员", "zone": "活动与餐饮区"},
                    {"name": "赵国栋", "phone": "137****1188", "role": "驻场社工", "zone": "全域"},
                ],
                ensure_ascii=False,
            ),
            3, 12, fmt(now() - timedelta(days=96)),
        ),
    )

    # ---------- 老人档案 + 设备配发
    plan = [
        ("高风险", 4, True), ("高风险", 3, True), ("高风险", 2, True), ("高风险", 2, False),
        ("中风险", 1, False), ("中风险", 3, True), ("中风险", 2, False), ("中风险", 0, False),
        ("低风险", 1, True), ("低风险", 4, False), ("低风险", 1, False), ("低风险", 0, False),
    ]
    grid_workers = ["刘志强", "马春华", "赵国栋"]
    elders, devices = [], []
    for i, (risk, falls, living_alone) in enumerate(plan, start=1):
        eid = f"E{i:03d}"
        sn = f"AXB-2026-{i:04d}"
        place = GRID_POINTS[(i - 1) % len(GRID_POINTS)]
        score = {"高风险": round(rnd.uniform(0.72, 0.91), 2),
                 "中风险": round(rnd.uniform(0.45, 0.68), 2),
                 "低风险": round(rnd.uniform(0.12, 0.38), 2)}[risk]
        items = {"高风险": ASSESS_ITEMS_HIGH, "中风险": ASSESS_ITEMS_MID, "低风险": ASSESS_ITEMS_LOW}[risk]
        name = SURNAME[i - 1] + "**"
        elder_phone = f"136****{rnd.randint(1000,9999)}"
        gname = SURNAME[(i + 4) % len(SURNAME)] + ("**" if i % 3 else GIVEN[i % len(GIVEN)])
        ex(
            "INSERT INTO elders(id,site_id,name_masked,age,sex,living,risk_level,risk_score,assess_date,assessor,assess_items,history_fall,device_id,guardian_name,guardian_relation,guardian_phone,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                eid, site_id, name, rnd.randint(74, 91), "女" if i % 3 else "男",
                "独居" if living_alone else ("与配偶同住" if i % 2 else "与子女同住"),
                risk, score, fmt(now() - timedelta(days=rnd.randint(80, 94))),
                "赵国栋（驻场社工）", json.dumps(items, ensure_ascii=False), falls,
                sn, gname, "子女" if i % 2 else "侄女", f"1{rnd.choice('3578')}{rnd.choice('35789')}****{rnd.randint(1000,9999)}",
                "独居，子女在外地，需重点关注" if living_alone else "有同住家属，日常探访",
            ),
        )
        elders.append((eid, risk, living_alone, falls, place, name, gname, gname and ("子女" if i % 2 else "侄女")))

        gas = round(rnd.uniform(92, 108), 1)
        bat = rnd.randint(46, 98)
        status = "在线"
        sensing = "正常"
        if i == 5:
            gas, status, sensing = 78.4, "低气压", "基线漂移告警"
        if i == 9:
            bat, status = 14, "低电量"
        if i == 12:
            status = "充电中"
        ex(
            "INSERT INTO devices(id,site_id,elder_id,model,firmware,batch,status,battery,gas_pressure,gas_state,sensing_state,wear_state,wear_minutes_today,last_seen,assigned_at,charge_base) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                sn, site_id, eid, "安行护腰 A1", "v1.4.2", "2026-03 批次", status, bat, gas,
                "充足" if gas >= 88 else ("偏低" if gas >= 82 else "需回充"), sensing,
                "佩戴中" if i % 4 else "未佩戴", rnd.randint(180, 640),
                fmt(now() - timedelta(seconds=rnd.randint(20, 900))),
                fmt(now() - timedelta(days=rnd.randint(84, 95))),
                "BC-01 充电底座" if i % 3 else "社区回充站 R-01",
            ),
        )
        devices.append(sn)

        # 30 天佩戴记录
        for d in range(30, 0, -1):
            base = {"高风险": 500, "中风险": 380, "低风险": 300}[risk]
            m = max(0, int(rnd.gauss(base, 150)))
            ex("INSERT OR REPLACE INTO wear_logs VALUES(?,?,?)", (sn, fmt(now() - timedelta(days=d))[:10], min(m, 780)))

    # ---------- 历史事件（30 天）
    ev_no = 0
    for d in range(30, 0, -1):
        n = rnd.choice([0, 0, 1, 1, 2, 3])
        for _ in range(n):
            ev_no += 1
            idx = rnd.randrange(len(elders))
            eid, risk, alone, falls, place, ename, gname, grel = elders[idx]
            sn = devices[idx]
            kind = rnd.choices(["险跌", "跌倒", "误报", "设备告警"], weights=[58, 16, 18, 8])[0]
            if risk == "高风险" and kind == "险跌":
                kind = "跌倒" if rnd.random() < 0.3 else kind
            level = {"跌倒": "紧急", "险跌": "重要", "误报": "一般", "设备告警": "一般"}[kind]
            t = _dt(d, rnd.randint(8, 20), rnd.choice([5, 12, 18, 25, 31, 37, 43, 49, 55]))
            _make_event_chain(ev_no, kind, level, eid, sn, site_id, place, t, risk, ename, gname, grel, alone, rnd)

    # ---------- 重点演示事件：一条完整走完全流程的跌倒
    star = dict(ev_no=901, kind="跌倒", level="紧急", eid="E001", sn=devices[0], site_id=site_id,
                place=("2号楼门前台阶", 38.0, 58.0), risk="高风险", ename=elders[0][5],
                gname="周建国", grel="子女", alone=True)
    t = now() - timedelta(hours=5)
    if t.hour < 7:
        t = now() - timedelta(minutes=40)
    t = t.replace(minute=rnd.choice([12, 26, 38, 47, 53]), second=rnd.randint(0, 59), microsecond=0)
    _make_event_chain(**star, t=t, rnd=rnd, stage_override=True)

    # ---------- 季度报告
    q_now = (now().month - 1) // 3 + 1
    y = now().year
    per = f"{y}Q{q_now}"
    stats = _stats()
    ex(
        "INSERT INTO reports(id,site_id,quarter,period,generated_at,generated_by,status,summary,data_json) VALUES(?,?,?,?,?,?,?,?,?)",
        (
            f"R-{per}-YQY", site_id, per, f"{y} 年 Q{q_now}", fmt(now() - timedelta(hours=6)),
            "平台自动生成", "待人工核校",
            f"本季度站点共服务 {stats['elders']} 名老人，配发设备 {stats['devices']} 台，"
            f"累计记录事件 {stats['events']} 起，其中跌倒 {stats['falls']} 起、险跌 {stats['near']} 起。"
            f"2 号楼门前台阶为高发点位，季度 3 次记录，已列入适老化改造建议清单。",
            json.dumps(stats, ensure_ascii=False),
        ),
    )

    log_audit("平台", "系统", "初始化", site_id, "载入颐清园站点演示数据：12 名老人 / 12 台设备 / 30 天事件记录")
    return True


def _stats():
    elders = q1("SELECT COUNT(*) c FROM elders WHERE site_id=?", ("SITE-YQY",))["c"]
    devices = q1("SELECT COUNT(*) c FROM devices WHERE site_id=?", ("SITE-YQY",))["c"]
    ev = q1("SELECT COUNT(*) c FROM events WHERE site_id=?", ("SITE-YQY",))["c"]
    falls = q1("SELECT COUNT(*) c FROM events WHERE site_id=? AND kind='跌倒'", ("SITE-YQY",))["c"]
    near = q1("SELECT COUNT(*) c FROM events WHERE site_id=? AND kind='险跌'", ("SITE-YQY",))["c"]
    return {"elders": elders, "devices": devices, "events": ev, "falls": falls, "near": near}


# ---------------------------------------------------------------- 事件链生成

def _imu(rnd, kind, elapsed_s=0):
    """风险识别层输出的多模态特征摘要（示意字段，非实测值）"""
    if kind == "跌倒":
        return {"roll_deg": round(rnd.uniform(38, 62), 1), "pitch_drop_deg": round(rnd.uniform(22, 41), 1),
                "accel_peak_g": round(rnd.uniform(2.1, 3.4), 2), "gyro_peak_dps": round(rnd.uniform(280, 520), 0),
                "balance_margin": round(rnd.uniform(0.04, 0.12), 2), "inference_ms": rnd.randint(72, 118)}
    if kind == "险跌":
        return {"roll_deg": round(rnd.uniform(16, 31), 1), "pitch_drop_deg": round(rnd.uniform(9, 19), 1),
                "accel_peak_g": round(rnd.uniform(0.9, 1.7), 2), "gyro_peak_dps": round(rnd.randint(90, 210), 0),
                "balance_margin": round(rnd.uniform(0.18, 0.36), 2), "inference_ms": rnd.randint(78, 126)}
    return {"roll_deg": round(rnd.uniform(4, 15), 1), "pitch_drop_deg": round(rnd.uniform(3, 11), 1),
            "accel_peak_g": round(rnd.uniform(0.3, 0.9), 2), "gyro_peak_dps": round(rnd.randint(20, 95), 0),
            "balance_margin": round(rnd.uniform(0.35, 0.72), 2), "inference_ms": rnd.randint(70, 110)}


def _make_event_chain(ev_no, kind, level, eid, sn, site_id, place, t, risk, ename, gname, grel, alone, rnd,
                      stage_override=False):
    """写入一次事件 + 双通道消息 + 响应工单 + 复盘，构造完整五段链路。"""
    eid_evt = f"EV{now().year}{ev_no:05d}"
    place_name, gx, gy = place
    fired = kind == "跌倒"
    impact = round(rnd.uniform(1.6, 3.2), 2) if fired else (round(rnd.uniform(0.2, 0.7), 2) if kind == "险跌" else 0.0)
    conf = round(rnd.uniform(0.82, 0.97), 2) if kind in ("跌倒", "险跌") else round(rnd.uniform(0.31, 0.66), 2)
    model_state = {"跌倒": "触发", "险跌": "预警", "误报": "预警（判定为日常动作）", "设备告警": "安全"}[kind]
    reason = {"跌倒": "重心越过不可逆平衡边界", "险跌": "重心偏移但可自主恢复",
              "误报": "坐下动作被判为失衡", "设备告警": "储气压力低于阈值"}[kind]
    note = {
        "跌倒": f"{ename}在{place_name}发生跌倒，气囊已展开（{'腰骶部+双侧大转子' if rnd.random()<0.7 else '双侧大转子'}），未着地。",
        "险跌": f"{ename}在{place_name}出现失衡但未触地，自行扶墙后稳定。",
        "误报": f"{ename}坐下动作触发预警，10 秒内未进一步演化，判定为误报，已现场口头确认。",
        "设备告警": f"{ename}设备储气压力偏低，需引导至社区回充站 R-01 回充。",
    }[kind]

    ex(
        "INSERT INTO events(id,device_id,elder_id,site_id,kind,level,stage,happened_at,reported_at,lat,lon,place,grid_point,airbag_fired,impact_peak_g,pose,model_state,confidence,imu,teng,battery,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            eid_evt, sn, eid, site_id, kind, level,
            "已复盘" if stage_override else "已处置", fmt(t), fmt(t + timedelta(seconds=rnd.randint(1, 4))),
            round(39.98 + rnd.uniform(-0.004, 0.004), 6), round(116.30 + rnd.uniform(-0.004, 0.004), 6),
            place_name, place_name, 1 if fired else 0, impact,
            "侧向后倒" if rnd.random() < 0.6 else "前向屈曲", model_state, conf,
            json.dumps(_imu(rnd, kind), ensure_ascii=False),
            json.dumps({"柔性阵列峰值": round(rnd.uniform(0.6, 3.8), 2), "接触面积cm2": rnd.randint(2, 9),
                        "腰腹形变mm": round(rnd.uniform(3, 18), 1)}, ensure_ascii=False),
            rnd.randint(52, 99), note,
        ),
    )

    # ---- 平台记录落库 → 双通道推送
    push = t + timedelta(seconds=rnd.randint(3, 6))
    grid = "刘志强" if gx < 40 else ("马春华" if gx < 62 else "赵国栋")
    body = (f"{ename}在{place_name}触发{kind}。"
            + (f"气囊已展开，峰值冲击 {impact} g。" if fired else "")
            + f"位置：{place_name}。请就近到场核实。")
    channels = [("社区网格", grid, grid if grid != "赵国栋" else "赵国栋",
                 {"刘志强": "社区网格员", "马春华": "社区网格员", "赵国栋": "驻场社工"}[grid],
                 f"138****{rnd.randint(1000,9999)}")]
    if not alone or True:  # 双通道：本地响应通道 + 家属知情通道
        channels.append(("家属", gname, gname, grel, f"1{rnd.choice('3578')}****{rnd.randint(1000,9999)}"))
    for i, (ch, recv, rname, rrole, phone) in enumerate(channels, start=1):
        ack = t + timedelta(minutes=rnd.randint(3, 9)) if stage_override else (push + timedelta(minutes=rnd.randint(5, 40)))
        ex(
            "INSERT INTO messages(id,event_id,channel,receiver,receiver_role,receiver_phone,title,body,pushed_at,delivered_at,read_at,ack_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                f"M{eid_evt[-5:]}{i}", eid_evt, ch, rname, rrole, phone,
                f"【安行护腰】{ename}{kind}预警", body, fmt(push),
                fmt(push + timedelta(seconds=rnd.randint(2, 9))),
                fmt(push + timedelta(minutes=rnd.randint(1, 6))) if stage_override else (fmt(ack) if rnd.random() < 0.8 else None),
                fmt(ack) if stage_override or rnd.random() < 0.85 else None,
                "已确认" if (stage_override or rnd.random() < 0.85) else "已读",
            ),
        )

    # ---- 人工响应
    if kind == "设备告警":
        return eid_evt
    ack_t = t + timedelta(minutes=rnd.randint(2, 8))
    arr_t = ack_t + timedelta(minutes=rnd.randint(4, 16))
    close_t = arr_t + timedelta(minutes=rnd.randint(12, 40))
    if kind == "跌倒":
        measure = "现场查体：意识清醒，无活动性出血，髋部外观无明显畸形；协助起身至长椅静坐 10 分钟，低位就坐观察。"
        result = "疑似软组织挫伤，未见骨折征象，建议 24 小时内社区随访问诊。"
        hospital = "未就医（社区随访问诊）"
    elif kind == "险跌":
        measure = "现场查体：四肢活动正常，无疼痛主诉；陪同至活动室休息 15 分钟，测量血压 138/86 mmHg。"
        result = "无明显损伤，纳入户内观察名单，48 小时内电话回访。"
        hospital = "未就医"
    else:
        measure = "电话核实为坐下动作，非跌倒。现场演示确认未着地，解除本次事件。"
        result = "确认为误报。已向老人说明误报机制，避免因此降低佩戴意愿。"
        hospital = "未就医"
    ex(
        "INSERT INTO responses(id,event_id,responder,role,org,phone,assigned_at,acked_at,arrived_at,onsite_note,measure,hospital,result,closed_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            f"R{eid_evt[-5:]}", eid_evt, grid, {"刘志强": "社区网格员", "马春华": "社区网格员", "赵国栋": "驻场社工"}[grid],
            "颐清园养老社区服务驿站", f"138****{rnd.randint(1000,9999)}",
            fmt(push), fmt(ack_t), fmt(arr_t),
            f"{rnd.randint(2,9)} 分钟内到达{rnd.choice(place_name)}，老人坐于地面/座椅旁，生命体征平稳。",
            measure, hospital, result, fmt(close_t), "已关闭",
        ),
    )

    # ---- 复盘
    rev_t = close_t + timedelta(days=rnd.randint(1, 4))
    if rev_t > now():          # 演示数据不产生"未来时间"
        rev_t = now() - timedelta(minutes=rnd.randint(20, 180))
    if rev_t <= close_t:
        rev_t = close_t + timedelta(hours=rnd.randint(2, 10))
    if kind == "跌倒":
        effect = "有效防护：气囊在着地前完成展开，峰值冲击由同等高度自由跌落实测基线下降（待整机实测复核）"
        cause = f"{place_name}为高发点位，台阶高差 18cm 且无扶手，老人起身转身时重心越过平衡边界。"
        lesson = "预判成立，防护动作抢在触地之前；但现场到场均耗时需继续压缩——本次网格员接单后 X 分钟到场。"
        sug = "建议在 2 号楼门前台阶加装 L 型扶手与防滑条，列入本季度适老化改造清单。"
    elif kind == "险跌":
        effect = "无防护需求：未触地，气囊未展开"
        cause = f"{place_name}地面偏硬，步速下降时支撑相时长占比上升。"
        lesson = "险跌事件是跌倒的前置指标，应作为佩戴率与作息干预的触发条件。"
        sug = "建议在该点位增加休息座椅，鼓励老人分段行走。"
    else:
        effect = "无防护需求：未触地，气囊未展开"
        cause = "坐下动作的躯干倾角与角速度包络与失衡早期重叠。"
        lesson = "误报处置同样需要闭环，若不解释清楚会直接削弱老人佩戴意愿。"
        sug = "建议在居家指导中增加坐下/弯腰动作的对照演示。"
    ex(
        "INSERT INTO reviews(id,event_id,reviewer,reviewed_at,protect_effect,root_cause,lesson,suggestion,to_heat_map,to_suggestion,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (
            f"V{eid_evt[-5:]}", eid_evt, "安行护腰项目组 × 颐清园站点", fmt(rev_t), effect, cause, lesson, sug,
            1 if kind in ("跌倒", "险跌") else 0, 1 if kind in ("跌倒", "险跌") else 0, cause,
        ),
    )
    if stage_override:
        ex("UPDATE events SET stage='已复盘' WHERE id=?", (eid_evt,))
    else:
        # 历史事件的处置与复盘时间不得晚于当前时刻
        for col, val in (("acked_at", ack_t), ("arrived_at", arr_t), ("closed_at", close_t)):
            if val > now():
                db.ex(f"UPDATE responses SET {col}=? WHERE id=?", (fmt(now() - timedelta(minutes=rnd.randint(30, 400))), f"R{eid_evt[-5:]}"))
    return eid_evt


# ---------------------------------------------------------------- 查询

def overview():
    s = _stats()
    today = now().strftime("%Y-%m-%d")
    today_events = q1("SELECT COUNT(*) c FROM events WHERE substr(happened_at,1,10)=?", (today,))["c"]
    today_falls = q1("SELECT COUNT(*) c FROM events WHERE substr(happened_at,1,10)=? AND kind='跌倒'", (today,))["c"]
    pend = q1("SELECT COUNT(*) c FROM events WHERE stage='待接单'")["c"]
    online = q1("SELECT COUNT(*) c FROM devices WHERE status='在线'")["c"]
    lowbat = q1("SELECT COUNT(*) c FROM devices WHERE status IN ('低电量','低气压')")["c"]
    fire = q1("SELECT COUNT(*) c FROM events WHERE airbag_fired=1")["c"]
    m30 = fmt(now() - timedelta(days=30))[:10]
    rows = q("SELECT wear_minutes_today, id FROM devices")
    avg_wear = round(sum(r["wear_minutes_today"] for r in rows) / max(1, len(rows)))
    risk = {r["risk_level"]: r["c"] for r in q("SELECT risk_level, COUNT(*) c FROM elders GROUP BY risk_level")}
    recent = [dict(r) for r in q("SELECT * FROM events ORDER BY happened_at DESC LIMIT 8")]
    hot = [dict(r) for r in q(
        "SELECT grid_point AS name, COUNT(*) c, "
        "SUM(CASE WHEN kind='跌倒' THEN 1 ELSE 0 END) falls, "
        "SUM(CASE WHEN kind='险跌' THEN 1 ELSE 0 END) near, "
        "SUM(CASE WHEN kind IN ('误报','设备告警') THEN 1 ELSE 0 END) alarm, "
        "MAX(happened_at) last "
        "FROM events GROUP BY grid_point ORDER BY c DESC LIMIT 6")]
    return {
        "kpi": {
            "elders": s["elders"], "devices": s["devices"], "online": online,
            "abnormal": lowbat, "events30": s["events"], "falls30": s["falls"],
            "near30": s["near"], "pending": pend, "airbag_fired": fire,
            "avg_wear": avg_wear, "wear_rate": round(min(99, int(avg_wear / 720 * 100))),
            "today_events": today_events, "today_falls": today_falls,
            "closed_rate": _closed_rate(),
        },
        "risk": risk, "recent": recent, "hot": hot,
    }


def _closed_rate():
    r = q1("SELECT COUNT(*) tot, SUM(CASE WHEN stage IN ('已处置','已复盘') THEN 1 ELSE 0 END) done FROM events")
    return round((r["done"] or 0) / r["tot"] * 100) if r["tot"] else 0


def wear_board(days=7):
    out = []
    for d in range(days - 1, -1, -1):
        day = fmt(now() - timedelta(days=d))[:10]
        rows = q("SELECT wear_minutes_today FROM devices")
        # 用佩戴日志聚合当天（当天用实时值）
        logs = q("SELECT SUM(minutes) s, COUNT(*) c FROM wear_logs WHERE day=?", (day,))[0]["s"] or 0
        if d == 0:
            logs = sum(r["wear_minutes_today"] for r in rows)
        cnt = q("SELECT COUNT(*) c FROM wear_logs WHERE day=?", (day,))[0]["c"] or len(rows)
        out.append({"day": day, "minutes": int(logs), "devices": cnt})
    return out


def wear_detail(days=7):
    res = []
    for r in q("SELECT * FROM devices ORDER BY id"):
        series = [dict(x) for x in q(
            "SELECT day, minutes FROM wear_logs WHERE device_id=? AND day>=? ORDER BY day",
            (r["id"], fmt(now() - timedelta(days=days))[:10]))]
        m = {s["day"]: s["minutes"] for s in series}
        m[fmt(now())[:10]] = r["wear_minutes_today"]
        res.append({"device_id": r["id"], "elder_id": r["elder_id"], "status": r["status"],
                    "wear_state": r["wear_state"], "battery": r["battery"], "gas_pressure": r["gas_pressure"],
                    "series": [{"day": fmt(now() - timedelta(days=k))[:10], "minutes": m.get(fmt(now() - timedelta(days=k))[:10], 0)}
                               for k in range(days - 1, -1, -1)]})
    return res


def heat_map():
    rows = q("SELECT grid_point, kind, happened_at, lat, lon, elder_id FROM events ORDER BY happened_at DESC")
    agg = {}
    for r in rows:
        k = r["grid_point"]
        a = agg.setdefault(k, {"name": k, "near": 0, "falls": 0, "alarm": 0, "last": r["happened_at"], "lat": r["lat"], "lon": r["lon"]})
        if r["kind"] == "跌倒":
            a["falls"] += 1
        elif r["kind"] == "险跌":
            a["near"] += 1
        else:
            a["alarm"] += 1
        a["last"] = max(a["last"], r["happened_at"])
    out = list(agg.values())
    for a in out:
        a["total"] = a["falls"] + a["near"] + a["alarm"]
    out.sort(key=lambda x: -x["total"])
    for i, a in enumerate(out):
        a["rank"] = i + 1
    return out


def event_flow(event_id):
    ev = q1("SELECT * FROM events WHERE id=?", (event_id,))
    if not ev:
        return None
    ev = dict(ev)
    ev["imu"] = json.loads(ev["imu"] or "{}")
    ev["teng"] = json.loads(ev["teng"] or "{}")
    ev["elder"] = dict(q1("SELECT * FROM elders WHERE id=?", (ev["elder_id"],)) or {})
    ev["elder"]["assess_items"] = json.loads(ev["elder"].get("assess_items") or "{}")
    ev["device"] = dict(q1("SELECT * FROM devices WHERE id=?", (ev["device_id"],)) or {})
    ev["messages"] = [dict(r) for r in q("SELECT * FROM messages WHERE event_id=? ORDER BY pushed_at", (event_id,))]
    rs = q1("SELECT * FROM responses WHERE event_id=?", (event_id,))
    ev["response"] = dict(rs) if rs else None
    rv = q1("SELECT * FROM reviews WHERE event_id=?", (event_id,))
    ev["review"] = dict(rv) if rv else None
    ev["timeline"] = build_timeline(ev)
    return ev


def _hm(s):
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def build_timeline(ev):
    t0 = _hm(ev["happened_at"])
    tl = []

    def add(title, t, kind, detail, actor=None, role=None):
        delta = int((_hm(t) - t0).total_seconds()) if t else None
        tl.append({"title": title, "at": t, "kind": kind, "detail": detail, "actor": actor, "role": role,
                   "delta_s": delta})

    add("设备侧识别：风险识别层输出", ev["happened_at"], "device",
        f"多模态特征融合后判定为「{ev['model_state']}」，置信度 {ev['confidence']}。"
        f"推理耗时 {ev['imu'].get('inference_ms', '—')} ms，平衡裕度 {ev['imu'].get('balance_margin', '—')}。")
    if ev["airbag_fired"]:
        t_fire = fmt(t0 + timedelta(milliseconds=180))
        add("主动保护层：电磁快速阀开启，气囊展开", t_fire, "device",
            f"储气罐 {ev['device'].get('gas_pressure', '—')} kPa 释放，"
            f"覆盖腰骶部与双侧髋部大转子，触地峰值冲击记录 {ev['impact_peak_g']} g。", "设备本体", "第三层 主动保护")
    add("平台记录：事件入库", ev["reported_at"], "platform",
        f"事件 {ev['id']} 落库，风险等级「{ev['level']}」，网格位置 {ev['grid_point']}，"
        f"坐标 {ev['lat']:.5f}, {ev['lon']:.5f}。")
    for m in ev["messages"]:
        add(f"消息下发：{m['channel']}通道 → {m['receiver']}（{m['receiver_role']}）", m["pushed_at"], "message",
            m["body"], m["receiver"], m["receiver_role"])
        if m["delivered_at"]:
            add(f"送达回执：{m['receiver']}", m["delivered_at"], "message", "通道回执已返回。", m["receiver"], m["receiver_role"])
        if m["read_at"]:
            add(f"已读：{m['receiver']}", m["read_at"], "message", "接收方打开消息。", m["receiver"], m["receiver_role"])
        if m["ack_at"]:
            add(f"确认接收：{m['receiver']}", m["ack_at"], "message", "接收方点击确认，平台回写工单。", m["receiver"], m["receiver_role"])
    r = ev["response"]
    if r:
        add("工单派发：生成响应工单", r["assigned_at"], "response",
            f"按网格分区自动派发至{r['role']} {r['responder']}（{r['org']}）。", r["responder"], r["role"])
        add("接单", r["acked_at"], "response", f"{r['responder']}确认接单，导航已启动。", r["responder"], r["role"])
        add("到场", r["arrived_at"], "response", r["onsite_note"] or "", r["responder"], r["role"])
        add("处置完成", r["closed_at"], "response",
            f"处置措施：{r['measure']}\n就医情况：{r['hospital']}\n结论：{r['result']}", r["responder"], r["role"])
    v = ev["review"]
    if v:
        add("复盘", v["reviewed_at"], "review",
            f"防护有效性：{v['protect_effect']}\n根因：{v['root_cause']}\n改进：{v['suggestion']}",
            v["reviewer"], "项目组 × 站点")
        add("数据回流：写入社区风险热力图", v["reviewed_at"], "review",
            f"该事件已计入「{ev['grid_point']}」的风险点位统计。" if v["to_heat_map"] else "本次事件不计入风险热力图。",
            "平台", "第六环节 数据回流")
        if v["to_suggestion"]:
            add("生成适老化改造建议", v["reviewed_at"], "review", v["suggestion"], "平台", "第七环节 环境改造")
    tl = [x for x in tl if x["at"]]
    tl.sort(key=lambda x: x["at"])
    return tl


def init():
    c = conn()
    c.executescript(SCHEMA)
    c.commit()
    return seed()
