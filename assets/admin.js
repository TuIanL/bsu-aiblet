/* 安行护腰 · 社区管理平台前端逻辑 */
const S = { view: 'dash', kpi: null, events: [], devices: [], elders: [], heat: [], wear: [], wearDetail: [], cur: null, es: null };

/* ==================== 启动 ==================== */
boot();

async function boot() {
  tickClock();
  if (API.token) {
    try { const h = await API.get('/api/health'); if (h && h.ok) return enter(); } catch (e) {}
  }
  showLogin();
}

function showLogin() {
  $('#loginView').style.display = 'grid';
  $('#appView').style.display = 'none';
}
async function enter() {
  $('#loginView').style.display = 'none';
  $('#appView').style.display = 'block';
  $('#userPill').textContent = API.user || '运营员';
  location.hash = location.hash || '#dash';
  switchView((location.hash || '#dash').slice(1));
  await Promise.all([loadDash(), loadDevices(), loadEvents(), loadElders(), loadWear(), loadHeat(), loadReport(), loadAudit()]);
  openStream();
  markSync();
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const r = await API.login(fd.get('username'), fd.get('password'));
  if (!r.ok) { $('#loginErr').textContent = r.error; return; }
  $('#loginErr').textContent = '';
  enter();
});
$('#logoutBtn').addEventListener('click', () => { API.logout(); location.reload(); });

function tickClock() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, '0');
  setInterval(() => {
    const d = new Date();
    $('#clockPill').textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }, 1000);
  $('#clockPill').textContent = `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
}

/* ==================== 视图切换 ==================== */
function switchView(v) {
  S.view = v;
  $$('.side a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  const map = { dash: '运营总览', events: '事件与响应记录', devices: '设备台账', elders: '老人档案与评估', wear: '佩戴率看板', heat: '社区风险分布', report: '季度报告与改造建议', audit: '操作日志' };
  document.title = `安行护腰 · ${map[v] || '社区管理平台'}`;
}
$$('.side a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); location.hash = a.getAttribute('href'); }));
$$('[data-goto]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.goto; }));
window.addEventListener('hashchange', () => switchView((location.hash || '#dash').slice(1)));

/* ==================== 实时流 ==================== */
function openStream() {
  S.es = connectStream({
    onOpen: () => { $('#liveDot').className = 'dot live'; $('#liveTxt').textContent = '实时连接'; $('#devLive').textContent = '● 实时数据流已连接'; },
    onFail: () => { $('#liveDot').className = 'dot off'; $('#liveTxt').textContent = '连接断开'; },
    telemetry: d => { patchDevice(d); markSync(); },
    event: d => { toast(`新事件：${d.kind}`, `${d.elder} @ ${d.place}　${d.airbag ? '气囊已展开' : '气囊未展开'}`); loadDash(); loadEvents(); markSync(); },
    response: d => { toast('工单状态更新', `${d.by} 执行了 ${actionName(d.action)}`); loadEvents(); loadDash(); markSync(); },
  });
}
const actionName = a => ({ ack: '接单', arrive: '到场', close: '处置完成', review: '复盘' }[a] || a);
function markSync() { const d = new Date(); const p = n => String(n).padStart(2, '0'); $('#lastSync').textContent = `最近同步 ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

function patchDevice(d) {
  const i = S.devices.findIndex(x => x.id === d.device_sn);
  if (i < 0) return;
  const dv = S.devices[i];
  Object.assign(dv, { battery: d.battery, gas_pressure: d.gas_pressure, wear_minutes_today: d.wear_minutes_today, wear_state: d.wear_state, status: d.status, gas_state: d.gas_state, last_seen: d.last_seen });
  renderDevices();
  loadDash();
}

/* ==================== 加载 ==================== */
async function safe(fn) { try { await fn(); } catch (e) { console.warn(e); } }
const loadDash = () => safe(async () => { S.kpi = await API.get('/api/overview'); renderDash(); });
const loadEvents = () => safe(async () => {
  const q = new URLSearchParams();
  if ($('#fKind').value) q.set('kind', $('#fKind').value);
  if ($('#fStage').value) q.set('stage', $('#fStage').value);
  if ($('#fQ').value) q.set('q', $('#fQ').value);
  S.events = await API.get('/api/events?' + q);
  renderEvents();
});
const loadDevices = () => safe(async () => { S.devices = await API.get('/api/devices'); renderDevices(); });
const loadElders = () => safe(async () => { S.elders = await API.get('/api/elders'); renderElders(); });
const loadWear = () => safe(async () => {
  S.wear = await API.get('/api/wear?days=7');
  S.wearDetail = await API.get('/api/wear/detail?days=7');
  renderWear();
  if (S.kpi) renderDash();          // 依赖 wear 数据的总览图表需要重绘
});
const loadHeat = () => safe(async () => { S.heat = await API.get('/api/heat'); renderHeat(); });
const loadReport = () => safe(async () => { const [r, s] = await Promise.all([API.get('/api/reports'), API.get('/api/suggestions')]); renderReport(r, s); });
const loadAudit = () => safe(async () => { renderAudit(await API.get('/api/audit?limit=120')); });
$('#fGo').addEventListener('click', loadEvents);
['#fKind', '#fStage'].forEach(s => $(s).addEventListener('change', loadEvents));
$('#eQ').addEventListener('input', () => renderElders());

/* ==================== 渲染：总览 ==================== */
function renderDash() {
  const k = S.kpi.kpi, site = S.kpi;
  $('#dashSub').textContent = `颐清园养老社区服务驿站 · 近 30 天数据`;
  $('#navPending').textContent = k.pending || 0;
  const cards = [
    ['acc', '在管老人', k.elders, '名', '已完成防跌安全评估并建档'],
    ['', '在管设备', k.devices, '台', `在线 ${k.online} 台 · 异常 ${k.abnormal} 台`],
    ['good', '30 天事件', k.events30, '起', `跌倒 ${k.falls30} · 险跌 ${k.near30} · 闭环率 ${k.closed_rate}%`],
    ['warn', '今日佩戴均值', F.mins(k.avg_wear).replace(/(\d+) 小时 (\d+) 分/, '$1h$2m'), '', `站点依从性 ${k.wear_rate}%`],
    ['bad', '气囊展开次数', k.airbag_fired, '次', '触发后充气可复位，不产生耗材'],
    ['warn', '今日事件', k.today_events, '起', `其中跌倒 ${k.today_falls} 起`],
    ['', '事件闭环率', k.closed_rate, '%', '已处置或已复盘占比'],
    ['bad', '待接单工单', k.pending, '单', k.pending ? '需网格员立即响应' : '当前无积压'],
  ];
  $('#kpiRow').innerHTML = cards.map(c => `
    <div class="card kpi ${c[0]}">
      <div class="lb">${c[1]}</div>
      <div class="vl">${c[2]}<small>${c[3]}</small></div>
      <div class="ex">${c[4]}</div>
    </div>`).join('');

  // 佩戴柱状（数据未就绪时先留空，避免出现 0 值误导）
  if (S.wear.length) {
    const max = Math.max(...S.wear.map(w => w.minutes), 1);
    $('#wearBars').innerHTML = S.wear.map(w => `<div class="b" style="height:${(w.minutes / max * 100).toFixed(1)}%" title="${w.day}　${F.mins(w.minutes)}">
        <span>${w.day.slice(5)}</span></div>`).join('');
    const avg = Math.round(S.wear.reduce((a, b) => a + b.minutes, 0) / S.wear.length);
    $('#wearAxis').innerHTML = `<span>日均 ${F.mins(avg)}</span><span>目标：单人每日 ≥ 6 小时</span>`;
    const todayMin = S.wear[S.wear.length - 1].minutes;
    $('#wearNote').innerHTML = `站点佩戴时长合计 <b>${F.mins(todayMin)}</b>，当日在管 ${k.devices} 台。
      佩戴是防护生效的前提：<b>未被佩戴的时段不提供任何防护</b>。识别到依从性下降的对象后，由社区激励与家访介入。`;
  }

  // 风险构成
  const tot = Object.values(site.risk).reduce((a, b) => a + b, 0) || 1;
  const colors = { '高风险': '#e05252', '中风险': '#ff8a3d', '低风险': '#2f9e6f' };
  $('#riskBox').innerHTML = Object.entries(site.risk).sort((a, b) => b[1] - a[1]).map(([k2, v]) => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line2)">
      <span class="bdg ${RISK_CLS[k2]}">${k2}</span>
      <div style="flex:1;height:7px;background:#eef2f5;border-radius:4px;overflow:hidden">
        <i style="display:block;height:100%;width:${(v / tot * 100).toFixed(0)}%;background:${colors[k2]}"></i></div>
      <b class="mono" style="width:52px;text-align:right">${v} 人</b>
      <span style="width:44px;text-align:right;color:var(--faint);font-size:11px">${(v / tot * 100).toFixed(0)}%</span>
    </div>`).join('');

  // 最新事件
  $('#recentTbl').innerHTML = `<thead><tr><th>时间</th><th>类型</th><th>老人</th><th>点位</th><th>阶段</th></tr></thead><tbody>` +
    site.recent.map(e => `<tr class="evtrow" data-ev="${e.id}">
      <td class="mono">${F.dt(e.happened_at)}</td>
      <td><span class="bdg ${KIND[e.kind].cls}">${KIND[e.kind].ico} ${e.kind}</span></td>
      <td>${esc(e.elder_id)}</td><td>${esc(e.grid_point)}</td>
      <td><span class="bdg ${STAGE_CLS[e.stage]}">${e.stage}</span></td></tr>`).join('') + '</tbody>';
  bindEventRows();

  // 高发点位
  $('#hotTbl').innerHTML = `<thead><tr><th>点位</th><th>跌倒</th><th>险跌</th><th>其他</th><th>合计</th></tr></thead><tbody>` +
    site.hot.map(h => `<tr><td>${esc(h.name)}</td>
      <td class="mono" style="color:${h.falls ? 'var(--red)' : 'var(--faint)'}">${h.falls}</td>
      <td class="mono" style="color:var(--orange)">${h.near}</td>
      <td class="mono">${h.alarm}</td><td><b>${h.c}</b></td></tr>`).join('') + '</tbody>';
}

/* ==================== 渲染：事件 ==================== */
function renderEvents() {
  const rows = S.events;
  $('#evtTbl').innerHTML = `<thead><tr>
    <th>事件号</th><th>发生时间</th><th>类型</th><th>老人</th><th>点位</th><th>气囊</th>
    <th>冲击</th><th>双通道通知</th><th>响应</th><th>复盘</th><th>阶段</th><th>操作</th></tr></thead><tbody>` +
    (rows.length ? rows.map(e => `<tr class="evtrow" data-ev="${e.id}">
      <td class="mono">${e.id}</td>
      <td class="mono">${F.dt(e.happened_at)}</td>
      <td><span class="bdg ${KIND[e.kind].cls}">${KIND[e.kind].ico} ${e.kind}</span></td>
      <td>${esc(e.elder.name_masked || e.elder_id)} <span style="color:var(--faint);font-size:10.5px">${e.elder.age || ''}岁</span></td>
      <td>${esc(e.grid_point)}</td>
      <td>${e.airbag_fired ? '<span class="bdg green">已展开</span>' : '<span class="bdg gray">未展开</span>'}</td>
      <td class="mono">${e.impact_peak_g ? e.impact_peak_g + ' g' : '—'}</td>
      <td style="font-size:11px">${e.msg_ack}/${e.msg_total} 已确认</td>
      <td>${e.has_response ? '<span class="bdg green">✓</span>' : '<span class="bdg gray">—</span>'}</td>
      <td>${e.has_review ? '<span class="bdg violet">✓</span>' : '<span class="bdg gray">—</span>'}</td>
      <td><span class="bdg ${STAGE_CLS[e.stage]}">${e.stage}</span></td>
      <td><button class="btn sm" data-open="${e.id}">处理</button></td></tr>`).join('')
      : `<tr><td colspan="12" class="empty">没有符合条件的事件</td></tr>`) + '</tbody>';
  bindEventRows();
  $$('[data-open]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); openEvent(b.dataset.open); }));
}
function bindEventRows() { $$('.evtrow[data-ev]').forEach(r => r.addEventListener('click', () => openEvent(r.dataset.ev))); }

/* ==================== 渲染：设备 ==================== */
function renderDevices() {
  const d = S.devices;
  const on = d.filter(x => x.status === '在线').length;
  const ab = d.filter(x => ['低电量', '低气压', '离线', '维护'].includes(x.status)).length;
  const gas = d.filter(x => x.gas_state === '需回充').length;
  $('#devKpi').innerHTML = [
    ['acc', '在管设备', d.length, '台', '均为安行护腰 A1'],
    ['good', '在线', on, '台', `离线 ${d.length - on} 台`],
    ['bad', '异常状态', ab, '台', ab ? '需运维介入' : '全部正常'],
    ['warn', '待回充', gas, '台', '储气压力 < 82 kPa'],
  ].map(c => `<div class="card kpi ${c[0]}"><div class="lb">${c[1]}</div>
    <div class="vl">${c[2]}<small>${c[3]}</small></div><div class="ex">${c[4]}</div></div>`).join('');

  $('#devTbl').innerHTML = `<thead><tr>
    <th>设备 SN</th><th>佩戴人</th><th>状态</th><th>电量</th><th>储气压力</th><th>传感通道</th>
    <th>今日佩戴</th><th>近 7 日</th><th>最后上报</th><th>回充/充电</th></tr></thead><tbody>` +
    d.map(x => {
      const wr = Math.min(100, Math.round(x.wear_rate_7d / 720 * 100));
      const spark = x.series || [];
      const mx = Math.max(...spark.map(s => s.minutes), 1);
      return `<tr class="devrow" data-dev="${x.id}">
      <td class="mono">${x.id}<div style="font-size:10px;color:var(--faint)">${x.firmware} · ${x.batch}</div></td>
      <td>${esc(x.elder.name_masked || '—')}<div style="font-size:10px;color:var(--faint)">${esc(x.elder_id)} · ${x.elder.risk_level || ''}</div></td>
      <td><span class="bdg ${DEV_CLS[x.status] || 'gray'}">${x.status}</span>
        <div style="font-size:10px;color:var(--faint);margin-top:2px">${x.wear_state}</div></td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <div class="prog ${x.battery < 20 ? 'low' : x.battery < 45 ? 'mid' : ''}"><i style="width:${x.battery}%"></i></div>
        <span class="mono" style="font-size:11px">${x.battery}%</span></div></td>
      <td><div style="display:flex;align-items:center;gap:6px">
        <div class="prog ${x.gas_pressure < 82 ? 'low' : x.gas_pressure < 90 ? 'mid' : ''}"><i style="width:${Math.min(100, (x.gas_pressure - 60) / 0.6).toFixed(0)}%"></i></div>
        <span class="mono" style="font-size:11px">${x.gas_pressure}</span></div>
        <div style="font-size:10px;color:var(--faint)">${x.gas_state}</div></td>
      <td><span class="bdg ${x.sensing_state === '正常' ? 'green' : 'orange'}">${x.sensing_state}</span></td>
      <td class="mono">${F.mins(x.wear_minutes_today)}</td>
      <td><div class="spark" title="近 7 日日均 ${F.mins(Math.round(x.wear_rate_7d))}，依从性 ${wr}%">
          ${spark.map(s => `<i style="height:${Math.max(2, s.minutes / mx * 22)}px"></i>`).join('')}</div>
        <div style="font-size:10px;color:var(--faint);margin-top:2px">日均 ${F.mins(Math.round(x.wear_rate_7d))} · ${wr}%</div></td>
      <td class="mono" style="font-size:11px;color:var(--muted)">${F.ago(x.last_seen)}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(x.charge_base)}</td></tr>`;
    }).join('') + '</tbody>';
  $('#devLive').textContent = `● 实时数据流已连接 · ${d.length} 台在管`;
  $$('.devrow[data-dev]').forEach(r => r.addEventListener('click', () => openElderByDevice(r.dataset.dev)));
}

/* ==================== 渲染：老人 ==================== */
function renderElders() {
  const q = ($('#eQ').value || '').trim();
  const rows = q ? S.elders.filter(e => (e.name_masked + e.id).includes(q)) : S.elders;
  $('#eldTbl').innerHTML = `<thead><tr>
    <th>编号</th><th>姓名</th><th>年龄</th><th>居住</th><th>风险等级</th><th>风险分</th>
    <th>近 30 天事件</th><th>绑定设备</th><th>设备状态</th><th>紧急联系人</th><th>评估</th></tr></thead><tbody>` +
    rows.map(e => {
      const d = e.device || {};
      return `<tr class="evtrow" data-elder="${e.id}">
      <td class="mono">${e.id}</td><td><b>${esc(e.name_masked)}</b></td>
      <td class="mono">${e.age}</td><td>${esc(e.living)}</td>
      <td><span class="bdg ${RISK_CLS[e.risk_level]}">${e.risk_level}</span></td>
      <td class="mono">${e.risk_score}</td>
      <td>${e.events30} 起${e.falls30 ? ` <span class="bdg red">跌倒 ${e.falls30}</span>` : ''}</td>
      <td class="mono" style="font-size:11.5px">${esc(e.device_id)}</td>
      <td>${d.status ? `<span class="bdg ${DEV_CLS[d.status] || 'gray'}">${d.status}</span>` : '—'}</td>
      <td>${esc(e.guardian_name)} <span style="color:var(--faint);font-size:10.5px">${esc(e.guardian_relation)}</span>
        <div class="mono" style="font-size:10.5px;color:var(--faint)">${esc(e.guardian_phone)}</div></td>
      <td><button class="btn sm" data-elder="${e.id}">查看</button></td></tr>`;
    }).join('') + '</tbody>';
  $$('[data-elder]').forEach(b => b.addEventListener('click', () => openElder(b.dataset.elder)));
}

/* ==================== 渲染：佩戴率 ==================== */
function renderWear() {
  const max = Math.max(...S.wear.map(w => w.minutes), 1);
  const bars = (id, ax) => {
    $(id).innerHTML = S.wear.map(w => `<div class="b" style="height:${(w.minutes / max * 100).toFixed(1)}%" title="${w.day}　${F.mins(w.minutes)}"><span>${w.day.slice(5)}</span></div>`).join('');
    $(ax).innerHTML = `<span>${S.wear[0].day}</span><span>日均 ${F.mins(Math.round(S.wear.reduce((a, b) => a + b.minutes, 0) / S.wear.length))}</span><span>${S.wear[S.wear.length - 1].day}</span>`;
  };
  bars('#wearBars2', '#wearAxis2');

  const rows = S.wearDetail.map(x => {
    const wr = Math.min(100, Math.round((x.series.reduce((a, b) => a + b.minutes, 0) / 7) / 720 * 100));
    const cls = wr >= 65 ? '' : wr >= 40 ? 'mid' : 'low';
    const tag = wr >= 65 ? ['正常', 'green'] : wr >= 40 ? ['偏低·需关注', 'orange'] : ['过低·需家访介入', 'red'];
    return `<tr><td class="mono">${x.device_id}</td><td>${esc(x.elder_id)}</td>
      <td><span class="bdg ${tag[1]}">${tag[0]}</span></td>
      <td style="width:190px"><div class="spark" style="height:26px">
        ${x.series.map(s => `<i style="height:${Math.max(2, s.minutes / 720 * 26)}px;background:${s.minutes / 720 > .65 ? '#7ec8e8' : s.minutes / 720 > .4 ? '#ffc46b' : '#f0908f'}"></i>`).join('')}</div>
        <div style="font-size:10px;color:var(--faint)">${x.series.map(s => s.day.slice(8)).join(' ')}</div></td>
      <td class="mono">${F.mins(x.series[x.series.length - 1].minutes)}</td>
      <td style="min-width:120px"><div class="prog ${cls}"><i style="width:${wr}%"></i></div></td>
      <td><b class="mono">${wr}%</b></td></tr>`;
  }).join('');
  $('#wearTbl').innerHTML = `<thead><tr><th>设备</th><th>老人</th><th>依从性判定</th><th>近 7 日每日佩戴</th><th>今日</th><th>佩戴率</th><th></th></tr></thead><tbody>${rows}</tbody>`;
}

/* ==================== 渲染：热力图 ==================== */
function renderHeat() {
  // 站点示意图：楼栋底图 + 点位气泡。气泡在上、楼栋在下，纵向错开避免遮挡。
  const LAYOUT = [
    ['1号楼', 13, 30], ['2号楼', 37, 27], ['3号楼', 63, 29],
    ['门厅', 13, 56], ['电梯厅', 37, 53], ['二层走廊', 13, 82],
    ['门前台阶', 37, 79], ['活动室', 51, 56], ['康复训练室', 82, 53],
    ['主干道', 25, 95], ['食堂', 52, 92], ['凉亭', 85, 86],
  ];
  const nameMap = Object.fromEntries(LAYOUT.map(l => [l[0], l]));
  const match = n => {
    if (n.includes('东单元门厅')) return nameMap['门厅'];
    if (n.includes('电梯厅')) return nameMap['电梯厅'];
    if (n.includes('主干道')) return nameMap['主干道'];
    if (n.includes('凉亭')) return nameMap['凉亭'];
    if (n.includes('活动室')) return nameMap['活动室'];
    if (n.includes('训练室')) return nameMap['康复训练室'];
    if (n.includes('食堂')) return nameMap['食堂'];
    if (n.includes('1号楼二层')) return nameMap['二层走廊'];
    if (n.includes('2号楼门前台阶')) return nameMap['门前台阶'];
    if (n.includes('3号楼')) return nameMap['3号楼'];
    if (n.includes('2号楼')) return nameMap['2号楼'];
    if (n.includes('1号楼')) return nameMap['1号楼'];
    return [n, 50, 95];
  };
  const max = Math.max(...S.heat.map(h => h.total), 1);
  const maxFalls = Math.max(...S.heat.map(h => h.falls), 1);
  const bg = n => `<div style="position:absolute;left:${n[1]}%;top:${n[2]}%;transform:translate(-50%,-50%);
    font:600 10px 'Noto Sans SC';color:#93a8b8;background:#eef3f7;border:1px solid #dfe8ee;
    border-radius:5px;padding:3px 7px;white-space:nowrap;z-index:1">${n[0]}</div>`;
  $('#heatMap').innerHTML =
    LAYOUT.map(bg).join('') +
    S.heat.map(h => {
      const p = match(h.grid_point || h.name);
      const sz = 22 + (h.total / max) * 26;
      const fr = h.falls / maxFalls;
      const color = fr > .66 ? '#d94f4f' : fr > .4 ? '#f08a5d' : fr > .15 ? '#ffc46b' : '#7fd0a3';
      return `<div class="hnode" style="left:${p[1]}%;top:${p[2] - 13}%;z-index:3"
        title="${esc(h.name)}：合计 ${h.total} 起（跌倒 ${h.falls} · 险跌 ${h.near} · 其他 ${h.alarm}）">
        <div class="ring" style="width:${sz}px;height:${sz}px;background:${color};font-size:${sz > 38 ? 11 : 9.5}px">${h.total}</div>
      </div>`;
    }).join('');

  $('#heatTbl').innerHTML = `<thead><tr><th>#</th><th>点位</th><th>跌倒</th><th>险跌</th><th>其他</th><th>合计</th><th>最近一次</th></tr></thead><tbody>` +
    S.heat.map(h => `<tr><td><b class="mono">${h.rank}</b></td><td>${esc(h.name)}</td>
      <td class="mono" style="color:${h.falls ? 'var(--red)' : 'var(--faint)'}">${h.falls}</td>
      <td class="mono" style="color:var(--orange)">${h.near}</td>
      <td class="mono">${h.alarm}</td><td><b>${h.total}</b></td>
      <td class="mono" style="font-size:11px">${F.dt(h.last)}</td></tr>`).join('') + '</tbody>';
}

/* ==================== 渲染：报告 ==================== */
function renderReport(reports, suggestions) {
  const r = reports[0];
  $('#reportCard').innerHTML = r ? `
    <div class="card-h"><span class="tag">${r.quarter}</span><h3>${r.period} 社区跌倒风险报告（初稿）</h3>
      <div class="spacer"></div><span class="bdg ${r.status === '已输出' ? 'green' : 'orange'}">${r.status}</span></div>
    <div style="font-size:12.5px;line-height:1.9;color:#39424b">${esc(r.summary)}</div>
    <div class="sec-t">关键指标</div>
    <div class="grid g4" style="gap:9px">
      ${[['服务老人', r.data.elders + ' 名'], ['配发设备', r.data.devices + ' 台'],
         ['季度事件', r.data.events + ' 起'], ['其中跌倒', r.data.falls + ' 起']]
        .map(c => `<div style="background:var(--pale);border-radius:7px;padding:9px 11px">
          <div style="font-size:11px;color:var(--muted)">${c[0]}</div>
          <div style="font:600 17px 'Space Grotesk';margin-top:2px">${c[1]}</div></div>`).join('')}
    </div>
    <div class="sec-t">生成信息</div>
    <dl class="kv"><dt>生成时间</dt><dd class="mono">${r.generated_at}</dd>
      <dt>生成方式</dt><dd>${esc(r.generated_by)}</dd>
      <dt>当前状态</dt><dd>${r.status} — 平台只出初稿，正式报告须经项目组与站点人工核校后输出</dd></dl>
    <div class="flow-note">报告内容为<b>群体层面的分布统计</b>，不含个体可识别信息，不构成对任何个体的健康结论。</div>`
    : '<div class="empty">暂无报告</div>';

  $('#sugTbl').innerHTML = `<thead><tr><th>优先级</th><th>点位</th><th>建议</th><th>依据</th><th>次数</th></tr></thead><tbody>` +
    (suggestions.length ? suggestions.map(s => `<tr>
      <td><span class="prio ${s.priority}">${s.priority}</span></td>
      <td>${esc(s.point)}</td>
      <td style="max-width:230px">${esc(s.suggestion)}</td>
      <td style="max-width:210px;color:var(--muted);font-size:11.5px">${esc(s.cause)}</td>
      <td class="mono">${s.count}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">暂无建议</td></tr>') + '</tbody>';
}

/* ==================== 渲染：审计 ==================== */
function renderAudit(rows) {
  $('#audTbl').innerHTML = `<thead><tr><th>时间</th><th>操作者</th><th>角色</th><th>动作</th><th>对象</th><th>详情</th></tr></thead><tbody>` +
    (rows.length ? rows.map(r => `<tr><td class="mono">${F.dt(r.ts)}</td><td>${esc(r.actor)}</td>
      <td><span class="bdg gray">${esc(r.role)}</span></td><td><b>${esc(r.action)}</b></td>
      <td class="mono" style="font-size:11.5px">${esc(r.target)}</td>
      <td style="color:var(--muted)">${esc(r.detail)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">暂无日志</td></tr>') + '</tbody>';
}

/* ==================== 抽屉：事件详情 ==================== */
function openDrawer() { $('#drawer').classList.add('on'); $('#mask').classList.add('on'); }
function closeDrawer() { $('#drawer').classList.remove('on'); $('#mask').classList.remove('on'); S.cur = null; }
$('#drClose').addEventListener('click', closeDrawer);
$('#mask').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

async function openEvent(id) {
  const f = await API.get('/api/events/flow?id=' + encodeURIComponent(id)).catch(async () => {
    // 后端无单事件接口时回退到列表数据
    const e = S.events.find(x => x.id === id); return e ? { ...e, messages: [], response: null, review: null, timeline: [] } : null;
  });
  if (!f) return;
  S.cur = f;
  $('#drTitle').textContent = `事件 ${f.id}　${f.kind}`;
  $('#drStage').textContent = f.stage;
  $('#drStage').className = 'bdg ' + (STAGE_CLS[f.stage] || 'gray');

  const el = f.elder || {};
  const dv = f.device || {};
  const imu = f.imu || {}, teng = f.teng || {};

  let h = `
  ${f.airbag_fired ? `<div class="evt-banner"><div class="ic">🛡</div>
      <div><h4>气囊已展开</h4><p>储气罐 ${dv.gas_pressure} kPa 释放，覆盖腰骶部与双侧髋部大转子</p></div>
      <div class="rt">峰值冲击<br>${f.impact_peak_g} g</div></div>`
    : `<div class="evt-banner safe"><div class="ic">✓</div>
      <div><h4>气囊未展开</h4><p>${f.kind === '险跌' ? '重心偏移但可自主恢复，未触地' : f.kind === '误报' ? '判定为日常动作，判定为误报' : '设备状态告警，不涉及防护动作'}</p></div></div>`}

  <div class="sec-t">事件概要</div>
  <dl class="kv">
    <dt>事件号</dt><dd class="mono">${f.id}</dd>
    <dt>发生时间</dt><dd class="mono">${f.happened_at}</dd>
    <dt>平台入库</dt><dd class="mono">${f.reported_at} <span style="color:var(--faint)">（延迟 ${(new Date(f.reported_at.replace(/-/g, '/')) - new Date(f.happened_at.replace(/-/g, '/'))) / 1000} 秒）</span></dd>
    <dt>事件类型</dt><dd><span class="bdg ${KIND[f.kind].cls}">${f.kind}</span> <span class="bdg gray">${f.level}</span></dd>
    <dt>老人</dt><dd>${esc(el.name_masked || '—')}　${el.age || ''} 岁　${esc(el.living || '')}　<span class="bdg ${RISK_CLS[el.risk_level] || 'gray'}">${el.risk_level || ''}</span></dd>
    <dt>设备</dt><dd class="mono">${f.device_id}　<span class="bdg ${DEV_CLS[dv.status] || 'gray'}">${dv.status || ''}</span></dd>
    <dt>点位</dt><dd>${esc(f.grid_point)}　<span class="mono" style="color:var(--faint);font-size:11px">${f.lat}, ${f.lon}</span></dd>
    <dt>姿态</dt><dd>${esc(f.pose || '—')}</dd>
    <dt>平台记录</dt><dd style="color:var(--muted)">${esc(f.note || '')}</dd>
  </dl>

  <div class="sec-t">风险识别层输出</div>
  <dl class="kv">
    <dt>判定状态</dt><dd><b>${esc(f.model_state)}</b>　置信度 <span class="mono">${f.confidence}</span></dd>
    <dt>躯干侧倾</dt><dd class="mono">${imu.roll_deg ?? '—'} °</dd>
    <dt>俯仰骤降</dt><dd class="mono">${imu.pitch_drop_deg ?? '—'} °</dd>
    <dt>加速度峰值</dt><dd class="mono">${imu.accel_peak_g ?? '—'} g</dd>
    <dt>角速度峰值</dt><dd class="mono">${imu.gyro_peak_dps ?? '—'} °/s</dd>
    <dt>平衡裕度</dt><dd class="mono">${imu.balance_margin ?? '—'} <span style="color:var(--faint);font-size:11px">（越小越接近失衡）</span></dd>
    <dt>端侧推理耗时</dt><dd class="mono">${imu.inference_ms ?? '—'} ms <span style="color:var(--faint);font-size:11px">（本地推理，不依赖网络往返）</span></dd>
    <dt>柔性传感</dt><dd class="mono">阵列峰值 ${teng['柔性阵列峰值'] ?? '—'}　接触面积 ${teng['接触面积cm2'] ?? '—'} cm²　形变 ${teng['腰腹形变mm'] ?? '—'} mm</dd>
  </dl>

  <div class="sec-t">双通道消息（${(f.messages || []).length} 条）</div>
  ${(f.messages || []).map(m => `<div style="border:1px solid var(--line);border-radius:7px;padding:9px 11px;margin-bottom:7px">
      <div style="display:flex;gap:7px;align-items:center;margin-bottom:4px">
        <span class="bdg ${m.channel === '家属' ? 'blue' : 'green'}">${m.channel}</span>
        <b>${esc(m.receiver)}</b><span style="color:var(--faint);font-size:11px">${esc(m.receiver_role)}</span>
        <span class="bdg ${m.status === '已确认' ? 'green' : 'gray'}" style="margin-left:auto">${m.status || '—'}</span></div>
      <div style="font-size:12px;font-weight:600">${esc(m.title)}</div>
      <div style="font-size:11.5px;color:var(--muted);margin:3px 0 5px">${esc(m.body)}</div>
      <div class="mono" style="font-size:10.5px;color:var(--faint);display:flex;gap:12px;flex-wrap:wrap">
        <span>下发 ${F.hm(m.pushed_at)}</span><span>送达 ${F.hm(m.delivered_at)}</span>
        <span>已读 ${F.hm(m.read_at)}</span><span>确认 ${F.hm(m.ack_at)}</span></div>
    </div>`).join('') || '<div class="empty">无消息记录</div>'}

  ${f.response ? `<div class="sec-t">人工响应工单</div>
    <dl class="kv">
      <dt>工单号</dt><dd class="mono">${f.response.id}　<span class="bdg ${f.response.status === '已关闭' ? 'green' : 'orange'}">${f.response.status}</span></dd>
      <dt>响应人</dt><dd>${esc(f.response.responder)}　<span class="bdg gray">${esc(f.response.role)}</span>　${esc(f.response.org)}</dd>
      <dt>派发</dt><dd class="mono">${F.dt(f.response.assigned_at)}</dd>
      <dt>接单</dt><dd class="mono">${F.dt(f.response.acked_at)}</dd>
      <dt>到场</dt><dd class="mono">${F.dt(f.response.arrived_at)}　<span style="color:var(--faint);font-size:11px">${esc(f.response.onsite_note || '')}</span></dd>
      <dt>处置措施</dt><dd>${esc(f.response.measure || '—')}</dd>
      <dt>就医情况</dt><dd>${esc(f.response.hospital || '—')}</dd>
      <dt>处置结论</dt><dd>${esc(f.response.result || '—')}</dd>
      <dt>结案</dt><dd class="mono">${F.dt(f.response.closed_at)}</dd>
    </dl>` : ''}

  ${f.review ? `<div class="sec-t">复盘</div>
    <dl class="kv">
      <dt>复盘人</dt><dd>${esc(f.reviewer)}</dd>
      <dt>复盘时间</dt><dd class="mono">${f.reviewed_at}</dd>
      <dt>防护有效性</dt><dd>${esc(f.protect_effect)}</dd>
      <dt>根因</dt><dd>${esc(f.root_cause)}</dd>
      <dt>经验</dt><dd>${esc(f.lesson)}</dd>
      <dt>改进建议</dt><dd>${esc(f.suggestion)}</dd>
      <dt>数据回流</dt><dd>${f.to_heat_map ? '已计入社区风险热力图' : '不计入风险热力图'}　${f.to_suggestion ? '已生成改造建议' : '未生成改造建议'}</dd>
    </dl>` : ''}

  ${f.timeline && f.timeline.length ? `<div class="sec-t">全流程时间线（${f.timeline.length} 个节点）</div>
    <div class="tl">${f.timeline.map(s => `<div class="it ${s.kind}">
      <div class="h">${esc(s.title)}<time>${F.dt(s.at)}</time>${s.delta_s != null ? `<span class="bdg gray" style="font-size:10px">+${F.dur(s.delta_s)}</span>` : ''}</div>
      <div class="d">${esc(s.detail)}</div>
      ${s.actor ? `<div class="w">${esc(s.actor)}${s.role ? ' · ' + esc(s.role) : ''}</div>` : ''}
    </div>`).join('')}</div>` : ''}
  `;
  $('#drBody').innerHTML = h;
  renderActions(f);
  openDrawer();
}

function renderActions(f) {
  const r = f.response;
  const btns = [];
  if (r && r.status === '待接单') btns.push(`<button class="btn pri" data-act="ack" data-rid="${r.id}">确认接单</button>`);
  if (r && r.status === '响应中') btns.push(`<button class="btn pri" data-act="arrive" data-rid="${r.id}">标记到场</button>`);
  if (r && ['响应中', '已到场'].includes(r.status)) btns.push(`<button class="btn pri" data-act="close" data-rid="${r.id}">填写处置结果</button>`);
  if (r && r.status === '已关闭' && !f.review) btns.push(`<button class="btn pri" data-act="review" data-eid="${f.id}">填写复盘</button>`);
  btns.push(`<a class="btn" href="event-flow.html?id=${f.id}" target="_blank">在流程回放中查看 →</a>`);
  btns.push(`<button class="btn" id="drCancel">关闭</button>`);
  $('#drFoot').innerHTML = btns.join('');
  $('#drCancel').addEventListener('click', closeDrawer);
  $$('#drFoot [data-act]').forEach(b => b.addEventListener('click', () => doAct(b.dataset.act, b.dataset.rid, b.dataset.eid)));
}

async function doAct(act, rid, eid) {
  const body = { response_id: rid, event_id: eid, actor: API.user || '运营员' };
  if (act === 'close') {
    const m = prompt('处置措施（现场查体与处理）', '现场查体：意识清醒，无活动性出血；协助起身至长椅静坐观察。');
    if (m === null) return;
    body.measure = m;
    body.hospital = prompt('就医情况', '未就医（社区随访问诊）') || '未就医';
    body.result = prompt('处置结论', '处置完成，转入户内观察名单。') || '处置完成。';
  }
  if (act === 'review') {
    const eff = prompt('防护有效性判定', '有效防护：气囊在着地前完成展开（待整机实测复核）');
    if (eff === null) return;
    body.protect_effect = eff || '无防护需求：未触地，气囊未展开';
    body.root_cause = prompt('根因分析', '该点位环境因素与老人平衡能力共同作用，重心越过不可逆平衡边界。');
    if (body.root_cause === null) return;
    body.lesson = prompt('经验总结', '响应链路完整，处置及时。') || '';
    body.suggestion = prompt('改进建议', '建议在该点位增加休息座椅与扶手，列入适老化改造清单。') || '';
  }
  const r = await API.post('/api/actions/' + act, body);
  if (r.ok) {
    toast('操作已记录', `${actionName(act)} · ${eid || rid}`);
    await Promise.all([loadEvents(), loadDash(), loadAudit()]);
    openEvent(eid || S.cur.id);
  } else toast('操作失败', r.error || '');
}

/* ==================== 抽屉：老人详情 ==================== */
async function openElder(id) {
  const e = S.elders.find(x => x.id === id);
  if (!e) return;
  const d = e.device || {};
  const items = e.assess_items || {};
  $('#drTitle').textContent = `老人档案 ${e.id}　${e.name_masked}`;
  $('#drStage').textContent = e.risk_level;
  $('#drStage').className = 'bdg ' + (RISK_CLS[e.risk_level] || 'gray');
  $('#drBody').innerHTML = `
    <div class="sec-t">基础档案</div>
    <dl class="kv">
      <dt>编号</dt><dd class="mono">${e.id}</dd>
      <dt>姓名</dt><dd>${esc(e.name_masked)}（脱敏展示）</dd>
      <dt>年龄 / 性别</dt><dd>${e.age} 岁　${esc(e.sex)}</dd>
      <dt>居住情况</dt><dd>${esc(e.living)}</dd>
      <dt>紧急联系人</dt><dd>${esc(e.guardian_name)}（${esc(e.guardian_relation)}）　<span class="mono">${esc(e.guardian_phone)}</span></dd>
      <dt>备注</dt><dd style="color:var(--muted)">${esc(e.note)}</dd>
    </dl>
    <div class="sec-t">防跌安全评估　<span class="mono" style="color:var(--faint);font-weight:400">${e.assess_date} · ${esc(e.assessor)}</span></div>
    <dl class="kv"><dt>风险等级</dt><dd><span class="bdg ${RISK_CLS[e.risk_level]}">${e.risk_level}</span>　风险分 <b class="mono">${e.risk_score}</b></dd></dl>
    <table class="mini" style="margin-top:7px"><tbody>
      ${Object.entries(items).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
    </tbody></table>
    <div class="sec-t">绑定设备</div>
    <dl class="kv">
      <dt>设备 SN</dt><dd class="mono">${esc(e.device_id)}</dd>
      <dt>状态</dt><dd><span class="bdg ${DEV_CLS[d.status] || 'gray'}">${d.status || '—'}</span>　${d.wear_state || ''}</dd>
      <dt>电量 / 气压</dt><dd class="mono">${d.battery ?? '—'}%　${d.gas_pressure ?? '—'} kPa（${d.gas_state || '—'}）</dd>
      <dt>传感通道</dt><dd>${esc(d.sensing_state || '—')}</dd>
      <dt>今日佩戴</dt><dd>${F.mins(d.wear_minutes_today)}</dd>
      <dt>最后上报</dt><dd class="mono">${d.last_seen || '—'}</dd>
    </dl>
    <div class="sec-t">近 30 天事件</div>
    <dl class="kv"><dt>事件总数</dt><dd><b>${e.events30}</b> 起，其中跌倒 <b style="color:var(--red)">${e.falls30}</b> 起</dd>
      <dt>风险分含义</dt><dd style="color:var(--muted)">分值越高表示跌倒风险越高，用于确定探访频次与辅具适配优先级</dd></dl>`;
  $('#drFoot').innerHTML = `<button class="btn" id="drCancel2">关闭</button>`;
  $('#drCancel2').addEventListener('click', closeDrawer);
  openDrawer();
}
async function openElderByDevice(sn) {
  const e = S.elders.find(x => x.device_id === sn);
  if (e) openElder(e.id);
}
