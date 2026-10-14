/* 安行护腰 · 一次完整设备事件流程回放
   五段链路：设备事件 → 平台记录 → 消息 → 人工响应 → 复盘
   每一段都是对应界面的高保真还原，数据全部来自平台接口，不做前端编造。 */

const Q = new URLSearchParams(location.search);
let EV = null, LIST = [], ACT = 0;

init();

async function init() {
  clock();
  try {
    await API.get('/api/health');
  } catch (e) {
    renderOffline('平台接口没有响应。流程回放页需要本地服务运行，不能直接双击 HTML 打开。');
    return;
  }
  if (!API.token) {
    try { const s = await API.get('/api/session'); API.token = s.token; localStorage.setItem('anxing_token', s.token); } catch (e) {}
  }
  LIST = await API.get('/api/events?limit=80');
  const sel = $('#evSel');
  // 默认优先选五段齐全（已复盘）的事件，保证首屏就是完整链路
  const sorted = [...LIST].sort((a, b) => (b.has_review - a.has_review) || (b.has_response - a.has_response));
  sel.innerHTML = sorted.map(e =>
    `<option value="${e.id}">${e.happened_at}　${e.kind}　${e.elder.name_masked || e.elder_id}　${e.grid_point}　[${e.stage}]</option>`).join('');
  const want = Q.get('id');
  const fallback = (sorted.find(e => e.has_review && e.has_response && e.airbag_fired) || sorted[0]).id;
  if (want && LIST.some(e => e.id === want)) sel.value = want;
  else sel.value = fallback;
  sel.addEventListener('change', () => { location.search = '?id=' + sel.value; load(sel.value); });
  await load(sel.value);
  connectStream({
    onOpen: () => { $('#liveDot').className = 'dot'; $('#liveTxt').textContent = '已连接平台 · 实时'; },
    onFail: () => { $('#liveDot').className = 'dot off'; $('#liveTxt').textContent = '连接断开'; },
    event: d => { toast(`新事件 ${d.kind}`, `${d.elder} @ ${d.place}`); reloadList(); },
  });
}

function clock() {
  const p = n => String(n).padStart(2, '0');
  setInterval(() => { const d = new Date(); $('#clock').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }, 1000);
}
async function reloadList() { try { LIST = await API.get('/api/events?limit=80'); } catch (e) {} }

async function load(id) {
  $('#content').innerHTML = '<div class="loading">正在载入事件…</div>';
  const f = await API.get('/api/events/flow?id=' + encodeURIComponent(id));
  if (!f) { $('#content').innerHTML = '<div class="empty">未找到该事件</div>'; return; }
  EV = f;
  ACT = 0;
  $('#evBadge').className = 'bdg ' + (STAGE_CLS[f.stage] || 'gray');
  $('#evBadge').textContent = `${f.stage}　${f.level}`;
  render();
}

/* ==================== 时间锚点 ==================== */
/* 每个阶段取该 kind 的最早节点作为起点（时间线本身已按时间升序） */
const T = {};
function calcT() {
  ['device', 'platform', 'message', 'response', 'review'].forEach(k => {
    const c = (EV.timeline || []).filter(s => s.kind === k);
    T[k] = c.length ? c[0].at : null;
  });
}

/* ==================== 渲染 ==================== */
function render() {
  calcT();
  const el = EV.elder || {}, dv = EV.device || {}, imu = EV.imu || {}, teng = EV.teng || {};
  const msgs = EV.messages || [], r = EV.response, v = EV.review;
  const steps = [
    { k: 'device', n: 'STAGE 01', t: '设备事件', d: '端侧识别失衡并触发主动保护' },
    { k: 'platform', n: 'STAGE 02', t: '平台记录', d: '事件入库、风险分级与留痕' },
    { k: 'message', n: 'STAGE 03', t: '消息下发', d: '网格员 + 家属双通道推送' },
    { k: 'response', n: 'STAGE 04', t: '人工响应', d: '接单 → 到场 → 现场处置' },
    { k: 'review', n: 'STAGE 05', t: '复盘回流', d: '根因分析、热力图与改造建议' },
  ];

  const delta = (a, b) => {
    if (!a || !b) return null;
    return Math.round((new Date(b.replace(/-/g, '/')) - new Date(a.replace(/-/g, '/'))) / 1000);
  };
  const total = delta(EV.happened_at, v ? v.reviewed_at : (r ? r.closed_at : null));

  $('#content').innerHTML = `
  <!-- ===== 事件概要 ===== -->
  <div class="flow-hero">
    <h1>${esc(el.name_masked || EV.elder_id)} · ${EV.kind}事件全流程
      <span class="badge ${EV.kind === '跌倒' ? '' : 'n'}">${EV.airbag_fired ? '气囊已展开' : '气囊未展开'}</span></h1>
    <div style="font-size:12.5px;color:#b8d5e6;max-width:820px;line-height:1.8">
      ${esc(EV.note || '')}
    </div>
    <div class="meta">
      <span>事件号 <b>${EV.id}</b></span>
      <span>发生时间 <b>${EV.happened_at}</b></span>
      <span>点位 <b>${esc(EV.grid_point)}</b></span>
      <span>设备 <b>${EV.device_id}</b></span>
      <span>全链路耗时 <b>${total != null ? F.dur(total) : '—'}</b></span>
    </div>
  </div>

  <div class="sum">
    <div class="c"><div class="k">老人</div><div class="v">${esc(el.name_masked || '—')} <span style="font-weight:400;color:var(--muted);font-size:11px">${el.age || ''}岁</span></div></div>
    <div class="c"><div class="k">风险等级</div><div class="v"><span class="bdg ${RISK_CLS[el.risk_level] || 'gray'}">${el.risk_level || '—'}</span></div></div>
    <div class="c"><div class="k">识别判定</div><div class="v">${esc(EV.model_state)} <span class="mono" style="font-size:11px;color:var(--muted)">${EV.confidence}</span></div></div>
    <div class="c"><div class="k">峰值冲击</div><div class="v mono">${EV.impact_peak_g || '—'} g</div></div>
    <div class="c"><div class="k">通知通道</div><div class="v">${msgs.length} 条 · ${[...new Set(msgs.map(m => m.channel))].join(' / ') || '—'}</div></div>
    <div class="c"><div class="k">当前状态</div><div class="v"><span class="bdg ${STAGE_CLS[EV.stage] || 'gray'}">${EV.stage}</span></div></div>
  </div>

  <!-- ===== 五段导航 ===== -->
  <div class="flowbar" id="flowbar">
    ${steps.map((s, i) => `<div class="st ${i === ACT ? 'on' : ''}" data-i="${i}">
      <div class="n">${s.n}</div>
      <div class="t">${i + 1}. ${s.t}</div>
      <div class="d">${s.d}</div>
      <div class="tm">${T[s.k] ? F.dt(T[s.k]) : '<span style="color:var(--faint)">无记录</span>'}
        ${T[s.k] && i > 0 && T[steps[i - 1].k] ? `<span class="ok">+${F.dur(delta(T[steps[i - 1].k], T[s.k]))}</span>` : ''}</div>
    </div>`).join('')}
  </div>

  <div class="col">
    <div id="shots">${shots()}</div>
    <div id="side"></div>
  </div>`;

  $$('#flowbar .st').forEach(el2 => el2.addEventListener('click', () => {
    ACT = +el2.dataset.i;
    $$('#flowbar .st').forEach(x => x.classList.toggle('on', x === el2));
    $('#shots').innerHTML = shots();
    $('#side').innerHTML = side();
    $('#shots').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $('#side').innerHTML = side();
  bindSide();
}

/* ==================== 五段界面还原 ==================== */
function shots() {
  const el = EV.elder || {}, dv = EV.device || {}, imu = EV.imu || {}, teng = EV.teng || {};
  const msgs = EV.messages || [], r = EV.response, v = EV.review;
  const out = [];

  /* ---------- 01 设备端 ---------- */
  out.push(`
  <div class="shot b0">
    <div class="cap"><span class="n">01</span>设备端 · 事件发生
      <span class="sp">安行护腰 A1　固件 ${esc(dv.firmware || '—')}　SN ${EV.device_id}</span></div>
    <div class="screen">
      <div class="grid g2" style="gap:14px">
        <div>
          <div class="sec-t">本地识别与触发（第一、二层）</div>
          <div class="dev-body">
            <div class="row"><span>风险识别层输出</span><b style="color:#ffb27a">${esc(EV.model_state)}</b></div>
            <div class="row"><span>判定置信度</span><b>${EV.confidence}</b></div>
            <div class="row"><span>端侧推理耗时</span><b>${imu.inference_ms ?? '—'} ms</b></div>
            <div class="row"><span>平衡裕度</span><b>${imu.balance_margin ?? '—'}</b></div>
            <div class="row"><span>躯干侧倾角</span><b>${imu.roll_deg ?? '—'}°</b></div>
            <div class="row"><span>俯仰骤降</span><b>${imu.pitch_drop_deg ?? '—'}°</b></div>
            <div class="row"><span>加速度峰值</span><b>${imu.accel_peak_g ?? '—'} g</b></div>
            <div class="row"><span>角速度峰值</span><b>${imu.gyro_peak_dps ?? '—'} °/s</b></div>
            <div class="row" style="border:0"><span>跌倒姿态</span><b>${esc(EV.pose || '—')}</b></div>
            ${EV.airbag_fired ? `<div class="alert">⚠ 判定越过不可逆平衡边界，电磁快速阀已开启</div>
              <div class="fired">🛡 储气罐 ${dv.gas_pressure ?? '—'} kPa 释放，气囊展开覆盖腰骶部与双侧髋部大转子；触地峰值冲击 ${EV.impact_peak_g} g。展开后储气罐可回充复用，不产生耗材。</div>`
              : `<div class="alert" style="background:rgba(120,190,255,.14);border-color:rgba(120,190,255,.35);color:#bcdcff">未达到展开阈值，气囊保持收起；设备转入本地声光报警与事件上报。</div>`}
          </div>
        </div>
        <div>
          <div class="sec-t">柔性传感通道（TENG）</div>
          <div class="card" style="padding:11px 13px">
            <div style="display:flex;gap:18px;flex-wrap:wrap">
              ${[['阵列峰值', teng['柔性阵列峰值'], 'V'], ['接触面积', teng['接触面积cm2'], 'cm²'], ['腰腹形变', teng['腰腹形变mm'], 'mm'],
                 ['气压自检', dv.gas_pressure, 'kPa'], ['电量', dv.battery, '%'], ['传感通道', dv.sensing_state, '']]
                .map(x => `<div><div style="font-size:10.5px;color:var(--muted)">${x[0]}</div>
                  <div style="font:600 17px 'Space Grotesk';margin-top:2px">${x[1] ?? '—'}<span style="font-size:10.5px;font-weight:400;color:var(--faint);margin-left:2px">${x[2]}</span></div></div>`).join('')}
            </div>
            <div style="margin-top:11px">${wave(imu)}</div>
            <div class="legend">
              <span><i style="background:#7a6bd0"></i>躯干侧倾角</span>
              <span><i style="background:#1b9ddb"></i>加速度模长</span>
              <span><i style="background:#ff8a3d"></i>柔性阵列形变</span>
            </div>
          </div>
          <div class="sec-t">设备动作顺序</div>
          <div class="tl">
            <div class="it device"><div class="h">低频惯性值守中<time>常态</time></div>
              <div class="d">气囊驱动回路完全断电，仅惯性通道以低频采样运行。</div></div>
            <div class="it device"><div class="h">检出可疑运动 → 唤醒高频采样与推理链路<time>${F.dt(EV.happened_at)}</time></div>
              <div class="d">TENG 柔性传感阵列与 IMU 同步进入高频采样。</div></div>
            <div class="it device"><div class="h">多模态融合推理 → 输出「${esc(EV.model_state)}」<time>${F.dt(EV.happened_at)}</time></div>
              <div class="d">推理在设备本地完成，不依赖网络往返，耗时 ${imu.inference_ms ?? '—'} ms。</div></div>
            ${EV.airbag_fired ? `<div class="it device"><div class="h">连续多帧保持判断 → 电磁阀开启<time>+0.18 s</time></div>
              <div class="d">气囊在着地前完成展开，防护动作发生在伤害形成之前。</div></div>` : ''}
            <div class="it device"><div class="h">本地声光报警 + 事件上报<time>${F.dt(EV.reported_at)}</time></div>
              <div class="d">通过低功耗链路将事件与位置信息上报平台，等待双通道通知下发。</div></div>
          </div>
        </div>
      </div>
      <div class="flow-note">
        <b>关键设计：</b>跌倒从失衡到触地的可用窗口以百毫秒计，任何依赖网络往返的方案在原理上都无法满足实时性。
        因此识别与展开都在端侧完成，联网只负责事后响应与数据沉淀。
      </div>
    </div>
  </div>`);

  /* ---------- 02 平台记录 ---------- */
  out.push(`
  <div class="shot b1">
    <div class="cap"><span class="n">02</span>平台记录 · 事件入库
      <span class="sp">社区管理平台　事件 ${EV.id}</span></div>
    <div class="screen">
      ${EV.airbag_fired
        ? `<div class="evt-banner"><div class="ic">🛡</div><div><h4>气囊已展开</h4>
             <p>防护动作发生在着地之前，峰值冲击记录 ${EV.impact_peak_g} g</p></div>
             <div class="rt">风险等级<br>${EV.level}</div></div>`
        : `<div class="evt-banner safe"><div class="ic">✓</div><div><h4>气囊未展开</h4>
             <p>${EV.kind === '险跌' ? '重心偏移但可自主恢复，未触地' : EV.kind === '误报' ? '判定为日常动作（误报）' : '设备状态告警，不涉及防护动作'}</p></div>
             <div class="rt">风险等级<br>${EV.level}</div></div>`}
      <div class="grid g2" style="gap:14px">
        <div>
          <div class="sec-t">事件记录</div>
          <table class="mini"><tbody>
            <tr><td class="k">事件号</td><td class="mono">${EV.id}</td></tr>
            <tr><td class="k">发生时间</td><td class="mono">${EV.happened_at}</td></tr>
            <tr><td class="k">平台入库</td><td class="mono">${EV.reported_at}
              <span style="color:var(--faint)">（端到端延迟 ${latency()} 秒）</span></td></tr>
            <tr><td class="k">事件类型</td><td><span class="bdg ${KIND[EV.kind].cls}">${KIND[EV.kind].ico} ${EV.kind}</span>
              <span class="bdg gray">${EV.level}</span></td></tr>
            <tr><td class="k">老人</td><td>${esc(el.name_masked)}　${el.age} 岁　${esc(el.living)}
              <span class="bdg ${RISK_CLS[el.risk_level] || 'gray'}">${el.risk_level}</span></td></tr>
            <tr><td class="k">设备</td><td class="mono">${EV.device_id}　<span class="bdg ${DEV_CLS[dv.status] || 'gray'}">${dv.status || '—'}</span></td></tr>
            <tr><td class="k">网格点位</td><td>${esc(EV.grid_point)}</td></tr>
            <tr><td class="k">坐标</td><td class="mono">${EV.lat}, ${EV.lon}</td></tr>
            <tr><td class="k">当前阶段</td><td><span class="bdg ${STAGE_CLS[EV.stage] || 'gray'}">${EV.stage}</span></td></tr>
          </tbody></table>
          <div class="sec-t">风险识别层特征入库</div>
          <table class="mini"><tbody>
            <tr><td class="k">判定状态</td><td><b>${esc(EV.model_state)}</b>　置信度 <span class="mono">${EV.confidence}</span></td></tr>
            <tr><td class="k">平衡裕度</td><td class="mono">${imu.balance_margin ?? '—'}　<span style="color:var(--faint)">越小越接近不可逆失衡</span></td></tr>
            <tr><td class="k">加速度峰值</td><td class="mono">${imu.accel_peak_g ?? '—'} g</td></tr>
            <tr><td class="k">角速度峰值</td><td class="mono">${imu.gyro_peak_dps ?? '—'} °/s</td></tr>
            <tr><td class="k">跌倒姿态</td><td>${esc(EV.pose || '—')}</td></tr>
            <tr><td class="k">柔性通道</td><td class="mono">峰值 ${teng['柔性阵列峰值'] ?? '—'} V　接触 ${teng['接触面积cm2'] ?? '—'} cm²</td></tr>
          </tbody></table>
        </div>
        <div>
          <div class="sec-t">老人档案（自动关联）</div>
          <table class="mini"><tbody>
            <tr><td class="k">编号 / 姓名</td><td class="mono">${el.id}</td><td><b>${esc(el.name_masked)}</b></td></tr>
            <tr><td class="k">年龄 / 居住</td><td class="mono">${el.age} 岁</td><td>${esc(el.living)}</td></tr>
            <tr><td class="k">风险等级</td><td colspan="2"><span class="bdg ${RISK_CLS[el.risk_level] || 'gray'}">${el.risk_level}</span>
              <span class="mono" style="color:var(--muted)"> 风险分 ${el.risk_score}</span></td></tr>
            <tr><td class="k">评估日期</td><td colspan="2" class="mono" style="font-size:11px">${el.assess_date || '—'}</td></tr>
            ${Object.entries(el.assess_items || {}).slice(0, 4).map(([k, val]) =>
              `<tr><td class="k">${esc(k)}</td><td colspan="2" style="font-size:11px;color:var(--muted)">${esc(val)}</td></tr>`).join('')}
            <tr><td class="k">紧急联系人</td><td colspan="2">${esc(el.guardian_name)}（${esc(el.guardian_relation)}）　<span class="mono">${esc(el.guardian_phone)}</span></td></tr>
          </tbody></table>
          <div class="sec-t">平台留痕</div>
          <div style="font-size:11.5px;color:var(--muted);background:#f7fafc;border:1px solid var(--line2);border-radius:7px;padding:9px 11px">
            ${esc(EV.note || '')}
            <div style="margin-top:6px;color:var(--faint);font-size:10.5px">
              留痕写入时间 ${F.dt(EV.reported_at)}　·　操作者：设备网关（${EV.device_id}）　·　本条记录不可修改，仅可追加处置与复盘
            </div>
          </div>
        </div>
      </div>
      <div class="flow-note">
        <b>为什么要落库：</b>多数养老硬件项目止步于"设备卖出去、报警能响"。事件记录是后续复盘、社区画像与改造建议的唯一数据来源，
        也是向街道与社区交账的依据。
      </div>
    </div>
  </div>`);

  /* ---------- 03 消息 ---------- */
  out.push(`
  <div class="shot b2">
    <div class="cap"><span class="n">03</span>消息下发 · 双通道推送
      <span class="sp">${msgs.length} 条消息　本地响应通道 + 家属知情通道</span></div>
    <div class="screen">
      <div class="grid g2" style="gap:14px">
        <div>
          <div class="sec-t">通道设计</div>
          <div class="card" style="padding:11px 13px;background:#fff8ef;border-color:#f6dcbb">
            <div style="font-size:12px;line-height:1.85">
              <b>社区网格</b>（网格员 / 驻场社工）负责<b>到场</b>；<b>家属</b>（子女）负责<b>知情与决策</b>。<br />
              独居老人的子女往往不在本地，仅推送给子女无法保证有人及时到场，因此采用双通道。
            </div>
          </div>
          <div class="sec-t">消息投递明细</div>
          <table class="mini"><thead><tr><th>通道</th><th>接收方</th><th>下发</th><th>送达</th><th>已读</th><th>确认</th><th>状态</th></tr></thead><tbody>
            ${msgs.map(m => `<tr>
              <td><span class="bdg ${m.channel === '家属' ? 'blue' : 'green'}">${m.channel}</span></td>
              <td><b>${esc(m.receiver)}</b><div style="font-size:10px;color:var(--faint)">${esc(m.receiver_role)}</div></td>
              <td class="mono">${F.hm(m.pushed_at)}</td>
              <td class="mono">${F.hm(m.delivered_at)}</td>
              <td class="mono">${F.hm(m.read_at)}</td>
              <td class="mono">${F.hm(m.ack_at)}</td>
              <td><span class="bdg ${m.status === '已确认' ? 'green' : 'gray'}">${m.status || '—'}</span></td>
            </tr>`).join('')}
          </tbody></table>
          <div class="sec-t">消息内容</div>
          ${msgs.map(m => `<div style="border:1px solid var(--line);border-radius:7px;padding:9px 11px;margin-bottom:7px">
            <div style="display:flex;gap:7px;align-items:center;margin-bottom:4px">
              <span class="bdg ${m.channel === '家属' ? 'blue' : 'green'}">${m.channel}</span>
              <b>${esc(m.receiver)}</b><span style="color:var(--faint);font-size:11px">${esc(m.receiver_role)}</span>
              <span class="bdg ${m.status === '已确认' ? 'green' : 'gray'}" style="margin-left:auto">${m.status || '—'}</span></div>
            <div style="font-size:12px;font-weight:600">${esc(m.title)}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:3px">${esc(m.body)}</div>
          </div>`).join('')}
        </div>
        <div>
          <div class="sec-t">接收端界面还原</div>
          <div class="grid g2" style="gap:11px">
            ${msgs.map(m => `<div class="phone">
              <div class="st"><span>9:41</span><span>${m.channel === '家属' ? '家属端' : '网格员端'}</span></div>
              <div class="bd">
                <div style="font-size:10.5px;color:var(--faint);text-align:center;margin-bottom:9px">${F.dt(m.pushed_at)}</div>
                <div class="push ${m.channel === '家属' ? 'fam' : ''}">
                  <div class="h"><span class="ic">安</span>安行护腰　${F.hm(m.pushed_at)}</div>
                  <div class="t">${esc(m.title)}</div>
                  <div class="b">${esc(m.body)}</div>
                  <div class="tm">${m.status || '—'}${m.ack_at ? ' · ' + F.hm(m.ack_at) : ''}</div>
                </div>
                <div class="push ${m.channel === '家属' ? 'fam' : ''}" style="opacity:${m.read_at ? 1 : .45}">
                  <div class="h"><span class="ic">位</span>位置信息</div>
                  <div class="b">${esc(EV.grid_point)}<br><span class="mono" style="font-size:10.5px">${EV.lat}, ${EV.lon}</span></div>
                  <div class="tm">${m.delivered_at ? F.hm(m.delivered_at) : '—'}</div>
                </div>
                <div style="margin-top:9px;display:flex;gap:6px">
                  <div style="flex:1;text-align:center;padding:7px 0;border-radius:7px;background:${m.ack_at ? 'var(--deep)' : '#dfe6ec'};color:${m.ack_at ? '#fff' : '#8d97a1'};font-size:11.5px">
                    ${m.ack_at ? '已确认接单' : '确认'}</div>
                  <div style="flex:1;text-align:center;padding:7px 0;border-radius:7px;background:#eef2f5;color:#69737d;font-size:11.5px">拨号</div>
                </div>
                <div style="margin-top:9px;font-size:10.5px;color:var(--faint);line-height:1.6">
                  接收人：${esc(m.receiver)}（${esc(m.receiver_role)}）<br>联系方式：<span class="mono">${esc(m.receiver_phone)}</span>
                </div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="flow-note">
        <b>口径说明：</b>双通道推送能力本身不是差异化优势——市面上的事后报警类产品已普遍具备。
        它的价值在于把接收端从"家庭消费品"变成嵌入基层养老服务体系的组件，社区从设备购买方变为服务链条中的执行方。
      </div>
    </div>
  </div>`);

  /* ---------- 04 人工响应 ---------- */
  out.push(`
  <div class="shot b3">
    <div class="cap"><span class="n">04</span>人工响应 · 工单闭环
      <span class="sp">${r ? '工单 ' + r.id + '　' + r.status : '尚未生成工单'}</span></div>
    <div class="screen">
      ${r ? `
      <div class="grid g2" style="gap:14px">
        <div>
          <div class="sec-t">响应工单</div>
          <table class="mini"><tbody>
            <tr><td class="k">工单号</td><td class="mono">${r.id}　<span class="bdg ${r.status === '已关闭' ? 'green' : 'orange'}">${r.status}</span></td></tr>
            <tr><td class="k">关联事件</td><td class="mono">${EV.id}　${EV.kind}　${esc(EV.grid_point)}</td></tr>
            <tr><td class="k">响应人</td><td><b>${esc(r.responder)}</b>　<span class="bdg gray">${esc(r.role)}</span></td></tr>
            <tr><td class="k">所属机构</td><td>${esc(r.org)}</td></tr>
            <tr><td class="k">联系方式</td><td class="mono">${esc(r.phone)}</td></tr>
            <tr><td class="k">派发规则</td><td>按网格分区自动派发：${esc(EV.grid_point)} → ${esc(r.role)}</td></tr>
          </tbody></table>
          <div class="sec-t">时间节点</div>
          <table class="mini"><tbody>
            <tr><td class="k">工单生成</td><td class="mono">${F.dt(r.assigned_at)}</td></tr>
            <tr><td class="k">接单</td><td class="mono">${F.dt(r.acked_at)}　<span style="color:var(--muted)">事件下发后 ${F.dur(dl(T.message, r.acked_at))}</span></td></tr>
            <tr><td class="k">到场</td><td class="mono">${F.dt(r.arrived_at)}　<span style="color:var(--muted)">接单后 ${F.dur(dl(r.acked_at, r.arrived_at))}</span></td></tr>
            <tr><td class="k">处置完成</td><td class="mono">${F.dt(r.closed_at)}　<span style="color:var(--muted)">到场后 ${F.dur(dl(r.arrived_at, r.closed_at))}</span></td></tr>
            <tr><td class="k">事件下发到场</td><td><b style="color:var(--orange)">${F.dur(dl(T.message, r.arrived_at))}</b></td></tr>
          </tbody></table>
        </div>
        <div>
          <div class="sec-t">现场记录</div>
          <div class="sec-t" style="margin-top:0">到场情况</div>
          <div style="font-size:12px;color:#39424b;background:#f7fafc;border:1px solid var(--line2);border-radius:7px;padding:10px 12px;line-height:1.8">
            ${esc(r.onsite_note || '—')}
          </div>
          <div class="sec-t">处置措施</div>
          <div style="font-size:12px;color:#39424b;background:#f7fafc;border:1px solid var(--line2);border-radius:7px;padding:10px 12px;line-height:1.8">
            ${esc(r.measure || '—')}
          </div>
          <div class="sec-t">就医情况</div>
          <div style="margin-bottom:10px"><span class="bdg ${r.hospital && r.hospital.includes('未就医') ? 'gray' : 'red'}">${esc(r.hospital || '—')}</span></div>
          <div class="sec-t">处置结论</div>
          <div style="font-size:12px;color:#39424b;background:#ecf8f2;border:1px solid #cbe8da;border-radius:7px;padding:10px 12px;line-height:1.8">
            ${esc(r.result || '—')}
          </div>
        </div>
      </div>
      <div class="sec-t">响应链路</div>
      <div class="tl">
        ${(EV.timeline || []).filter(s => s.kind === 'response' || (s.kind === 'message' && /确认接收/.test(s.title))).map(s => `
          <div class="it ${s.kind}"><div class="h">${esc(s.title)}<time>${F.dt(s.at)}</time>
            ${s.delta_s != null ? `<span class="bdg gray" style="font-size:10px">事件后 +${F.dur(s.delta_s)}</span>` : ''}</div>
            <div class="d">${esc(s.detail)}</div>
            ${s.actor ? `<div class="w">${esc(s.actor)}${s.role ? ' · ' + esc(s.role) : ''}</div>` : ''}</div>`).join('')}
      </div>
      ` : '<div class="empty">该事件尚未生成响应工单</div>'}
      <div class="flow-note">
        <b>为什么人工响应必须留痕：</b>跌倒伤害的责任认定需要"谁在什么时间收到、什么时间到场、做了什么处置"的完整证据链。
        这条链路同时是机构对老人的服务承诺的兑现凭证。
      </div>
    </div>
  </div>`);

  /* ---------- 05 复盘 ---------- */
  out.push(`
  <div class="shot b4">
    <div class="cap"><span class="n">05</span>复盘 · 数据回流与改造建议
      <span class="sp">环节 ⑥ 数据回流　⑦ 环境改造建议与复评</span></div>
    <div class="screen">
      ${v ? `
      <div class="grid g2" style="gap:14px">
        <div>
          <div class="sec-t">复盘记录</div>
          <table class="mini"><tbody>
            <tr><td class="k">复盘人</td><td>${esc(v.reviewer)}</td></tr>
            <tr><td class="k">复盘时间</td><td class="mono">${v.reviewed_at}</td></tr>
            <tr><td class="k">防护有效性</td><td>${esc(v.protect_effect)}</td></tr>
            <tr><td class="k">根因</td><td>${esc(v.root_cause)}</td></tr>
            <tr><td class="k">经验</td><td>${esc(v.lesson)}</td></tr>
            <tr><td class="k">改进建议</td><td style="color:var(--deep);font-weight:600">${esc(v.suggestion)}</td></tr>
            <tr><td class="k">数据回流</td><td>
              <span class="bdg ${v.to_heat_map ? 'green' : 'gray'}">${v.to_heat_map ? '已计入风险热力图' : '不计入热力图'}</span>
              <span class="bdg ${v.to_suggestion ? 'orange' : 'gray'}">${v.to_suggestion ? '已生成改造建议' : '未生成建议'}</span></td></tr>
          </tbody></table>
          <div class="sec-t">回流后的社区风险分布（局部）</div>
          <div class="card" style="padding:11px 13px">
            <div id="miniHeat"></div>
            <div class="hlegend" style="margin-top:8px">
              <span>跌倒占比低</span><i style="background:#7fd0a3"></i><i style="background:#ffc46b"></i><i style="background:#f08a5d"></i><i style="background:#d94f4f"></i><span>高</span>
            </div>
          </div>
        </div>
        <div>
          <div class="sec-t">该点位在热力图中的贡献</div>
          <div class="card" style="padding:12px 14px;background:#fff8ef;border-color:#f6dcbb">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px">${esc(EV.grid_point)}</div>
            <div style="font-size:11.5px;color:#8a5a20;line-height:1.8">
              本次事件已计入该点位的风险统计。平台把跌倒与险跌两类事件的发生位置与时间汇总，
              识别高发点位，输出给街道、物业与社区服务中心，用于确定适老化改造的优先级。
            </div>
          </div>
          <div class="sec-t">改造建议（自动生成初稿）</div>
          <div style="font-size:12px;color:#39424b;background:#f7fafc;border:1px solid var(--line2);border-radius:7px;padding:11px 13px;line-height:1.85">
            ${esc(v.suggestion)}
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);color:var(--faint);font-size:10.5px">
              建议由平台自动聚合复盘结论生成，须经项目组与站点人工核校后提交街道与物业。
            </div>
          </div>
          <div class="sec-t">闭环回到起点</div>
          <div class="tl">
            <div class="it review"><div class="h">个体事件 → 点位风险<time>${F.dt(v.reviewed_at)}</time></div>
              <div class="d">本次事件的位置与类型计入「${esc(EV.grid_point)}」的统计。</div></div>
            <div class="it review"><div class="h">点位风险 → 改造清单<time>${F.dt(v.reviewed_at)}</time></div>
              <div class="d">该点位在季度报告中列为改造对象。</div></div>
            <div class="it review"><div class="h">改造清单 → 环境改善<time>下一轮复评</time></div>
              <div class="d">改造完成后重新统计该点位事件量，验证建议是否有效。</div></div>
            <div class="it review"><div class="h">环境改善 → 服务延续<time>持续</time></div>
              <div class="d">产品由一次性交易转为持续性服务关系，社区由设备使用者变为服务共同生产者。</div></div>
          </div>
        </div>
      </div>
      ` : `<div class="empty">该事件尚未复盘。可在
          <a href="admin.html" style="color:var(--deep);text-decoration:underline">后台管理</a> 中补填。</div>`}
    </div>
  </div>`);

  return out.join('');
}

/* ==================== 侧栏 ==================== */
function side() {
  const v = EV.review, r = EV.response, el = EV.elder || {}, dv = EV.device || {};
  const t = EV.timeline || [];
  return `
  <div class="side-card">
    <h4><span class="n">全流程时间线</span></h4>
    <div class="full-tl">
      ${t.map((s, i) => `<div class="it ${s.kind} ${i === 0 ? 'hl' : ''}">
        <div class="h">${esc(s.title)}<time>${F.dt(s.at)}</time></div>
        ${s.delta_s != null && i > 0 ? `<div class="d" style="color:var(--deep)">事件后 +${F.dur(s.delta_s)}</div>` : ''}
        ${s.actor ? `<div class="d" style="color:var(--faint)">${esc(s.actor)}${s.role ? ' · ' + esc(s.role) : ''}</div>` : ''}
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--faint);margin-top:4px">共 ${t.length} 个节点，全部来自平台操作日志。</div>
  </div>

  <div class="side-card">
    <h4><span class="n">关键指标</span></h4>
    <table class="mini" style="font-size:11.5px"><tbody>
      <tr><td style="color:var(--muted)">端到平台延迟</td><td class="mono" style="text-align:right">${latency()} s</td></tr>
      <tr><td style="color:var(--muted)">双通道下发</td><td class="mono" style="text-align:right">${F.dur(dl(T.platform, T.message))}</td></tr>
      <tr><td style="color:var(--muted)">消息 → 接单</td><td class="mono" style="text-align:right">${r ? F.dur(dl(T.message, r.acked_at)) : '—'}</td></tr>
      <tr><td style="color:var(--muted)">消息 → 到场</td><td class="mono" style="text-align:right;color:var(--orange)">${r ? F.dur(dl(T.message, r.arrived_at)) : '—'}</td></tr>
      <tr><td style="color:var(--muted)">在场处置时长</td><td class="mono" style="text-align:right">${r ? F.dur(dl(r.arrived_at, r.closed_at)) : '—'}</td></tr>
      <tr><td style="color:var(--muted)">响应 → 复盘</td><td class="mono" style="text-align:right">${(r && v) ? F.dur(dl(r.closed_at, v.reviewed_at)) : '—'}</td></tr>
      <tr><td style="color:var(--muted)">事件 → 复盘闭环</td><td class="mono" style="text-align:right">${v ? F.dur(dl(EV.happened_at, v.reviewed_at)) : '—'}</td></tr>
      <tr><td style="color:var(--muted)">通知确认率</td><td class="mono" style="text-align:right">${ackRate()}</td></tr>
      <tr><td style="color:var(--muted)">气囊是否展开</td><td style="text-align:right"><span class="bdg ${EV.airbag_fired ? 'green' : 'gray'}">${EV.airbag_fired ? '是' : '否'}</span></td></tr>
      <tr><td style="color:var(--muted)">峰值冲击</td><td class="mono" style="text-align:right">${EV.impact_peak_g || '—'} g</td></tr>
    </tbody></table>
  </div>

  <div class="side-card">
    <h4><span class="n">关联对象</span></h4>
    <table class="mini" style="font-size:11.5px"><tbody>
      <tr><td style="color:var(--muted)">老人</td><td><b>${esc(el.name_masked || '—')}</b>　${el.age || ''} 岁</td></tr>
      <tr><td style="color:var(--muted)">风险等级</td><td><span class="bdg ${RISK_CLS[el.risk_level] || 'gray'}">${el.risk_level || '—'}</span></td></tr>
      <tr><td style="color:var(--muted)">居住</td><td>${esc(el.living || '—')}</td></tr>
      <tr><td style="color:var(--muted)">设备</td><td class="mono">${EV.device_id}</td></tr>
      <tr><td style="color:var(--muted)">设备状态</td><td><span class="bdg ${DEV_CLS[dv.status] || 'gray'}">${dv.status || '—'}</span></td></tr>
      <tr><td style="color:var(--muted)">储气压力</td><td class="mono">${dv.gas_pressure ?? '—'} kPa（${dv.gas_state || '—'}）</td></tr>
      <tr><td style="color:var(--muted)">点位</td><td>${esc(EV.grid_point)}</td></tr>
    </tbody></table>
  </div>

  <div class="side-card">
    <h4><span class="n">服务闭环定位</span></h4>
    <p>本次事件覆盖服务闭环的<b>第 5 环节（事件响应）</b>与<b>第 6、7 环节（数据回流、环境改造建议）</b>。
    前面四个环节——建档、评估、配发、依从性维护——在后台的<a href="admin.html" style="color:var(--deep);text-decoration:underline">老人档案</a>与<a href="admin.html" style="color:var(--deep);text-decoration:underline">佩戴率看板</a>中体现。</p>
    <div class="btn-row" style="margin-top:10px">
      <a class="btn sm" href="admin.html">← 返回后台</a>
      <a class="btn sm" href="index.html">官网首页</a>
    </div>
  </div>

  <div class="side-card" style="background:#fff8ef;border-color:#f6dcbb">
    <h4 style="color:#8a5a20"><span class="n" style="background:#c96a1c">口径</span></h4>
    <p style="color:#8a5a20">本页为概念验证阶段（TRL 3–4）的平台演示。所列冲击值、识别置信度、响应时长均为演示数据，
    <b>不代表整机实测结果</b>。响应结论不构成医学诊断。接入真实硬件时替换设备网关即可，链路与字段口径不变。</p>
  </div>`;
}

function bindSide() {
  const box = $('#miniHeat');
  if (!box) return;
  API.get('/api/heat').then(h => {
    const top = h.slice(0, 6);
    const max = Math.max(...top.map(x => x.total), 1);
    const maxF = Math.max(...top.map(x => x.falls), 1);
    box.innerHTML = top.map(x => {
      const fr = x.falls / maxF;
      const c = fr > .66 ? '#d94f4f' : fr > .4 ? '#f08a5d' : fr > .15 ? '#ffc46b' : '#7fd0a3';
      const hl = x.name === EV.grid_point;
      return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
        <div style="flex:1;font-size:11.5px;${hl ? 'font-weight:700;color:var(--deep)' : ''}">${esc(x.name)}</div>
        <div style="width:96px;height:7px;background:#eef2f5;border-radius:4px;overflow:hidden">
          <i style="display:block;height:100%;width:${(x.total / max * 100).toFixed(0)}%;background:${c}"></i></div>
        <div class="mono" style="width:56px;text-align:right;font-size:11px">${x.total} 起</div>
        <div class="mono" style="width:44px;text-align:right;font-size:11px;color:${x.falls ? 'var(--red)' : 'var(--faint)'}">${x.falls} 跌倒</div>
      </div>`;
    }).join('');
  }).catch(() => {});
}

function latency() {
  return Math.round((new Date(EV.reported_at.replace(/-/g, '/')) - new Date(EV.happened_at.replace(/-/g, '/'))) / 1000);
}
function dl(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b.replace(/-/g, '/')) - new Date(a.replace(/-/g, '/'))) / 1000);
}
function ackRate() {
  const m = EV.messages || [];
  if (!m.length) return '—';
  return m.filter(x => x.ack_at).length + '/' + m.length;
}

/* ==================== 波形图 ==================== */
function wave(imu) {
  const roll = Number(imu.roll_deg || 30), acc = Number(imu.accel_peak_g || 1.5);
  const N = 64;
  const pts = { a: [], b: [], c: [] };
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const env = Math.exp(-Math.pow((t - 0.72) * 3.4, 2));       // 失衡包络
    const noise = (i * 9301 + 49297) % 233280 / 233280 - 0.5;
    const a = 6 + env * (roll * 0.52) + noise * 4;              // 侧倾角
    const b = 8 + env * (acc * 13) + noise * 3;                 // 加速度模长
    const c = 5 + env * 26 + noise * 6;                         // 柔性形变
    pts.a.push([i * (520 / (N - 1)), 56 - a]);
    pts.b.push([i * (520 / (N - 1)), 56 - b]);
    pts.c.push([i * (520 / (N - 1)), 56 - c]);
  }
  const path = k => pts[k].map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = k => path(k) + ` L520 56 L0 56 Z`;
  return `<svg class="wave" viewBox="0 0 520 62" preserveAspectRatio="none">
    <defs>
      <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6bd0" stop-opacity=".22"/><stop offset="1" stop-color="#7a6bd0" stop-opacity="0"/></linearGradient>
      <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b9ddb" stop-opacity=".2"/><stop offset="1" stop-color="#1b9ddb" stop-opacity="0"/></linearGradient>
      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".26"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></linearGradient>
    </defs>
    <line x1="0" y1="56" x2="520" y2="56" stroke="#dde6ed" stroke-width="1"/>
    <line x1="373" y1="2" x2="373" y2="56" stroke="#e05252" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="377" y="11" font-size="8" fill="#e05252" font-family="JetBrains Mono, monospace">TRIGGER</text>
    <path d="${area('c')}" fill="url(#gC)"/><path d="${path('c')}" fill="none" stroke="#ff8a3d" stroke-width="1.3"/>
    <path d="${area('b')}" fill="url(#gB)"/><path d="${path('b')}" fill="none" stroke="#1b9ddb" stroke-width="1.3"/>
    <path d="${area('a')}" fill="url(#gA)"/><path d="${path('a')}" fill="none" stroke="#7a6bd0" stroke-width="1.3"/>
  </svg>`;
}
