/* 安行护腰 · 平台端公共 JS：API 客户端、鉴权、格式化、SSE、UI 工具 */
const API = {
  token: localStorage.getItem('anxing_token') || '',
  user: localStorage.getItem('anxing_user') || '',

  async req(path, opt = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['X-Session-Token'] = this.token;
    const r = await fetch(path, { ...opt, headers: { ...headers, ...(opt.headers || {}) } });
    if (r.status === 401) {
      // 服务重启会使会话 token 失效：静默换发一个新 token 并重试一次
      if (!opt.__retry) {
        try {
          const s = await (await fetch('/api/session')).json();
          if (s && s.token) {
            this.token = s.token;
            localStorage.setItem('anxing_token', s.token);
            return this.req(path, { ...opt, __retry: true });
          }
        } catch (e) {}
      }
      this.logout();
      throw new Error('unauthorized');
    }
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('json')) return r.text();
    return r.json();
  },
  get(p) { return this.req(p); },
  post(p, body) { return this.req(p, { method: 'POST', body: JSON.stringify(body || {}) }); },

  async login(u, p) {
    const r = await this.req('/api/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (r.ok) { this.token = r.token; this.user = u; localStorage.setItem('anxing_token', r.token); localStorage.setItem('anxing_user', u); }
    return r;
  },
  logout() { this.token = ''; this.user = ''; localStorage.removeItem('anxing_token'); localStorage.removeItem('anxing_user'); },
};

/* ---------- 格式化 ---------- */
const F = {
  dt(s, withSec = true) { return s ? s.slice(5, withSec ? 19 : 16) : '—'; },
  date(s) { return s ? s.slice(0, 10) : '—'; },
  hm(s) { return s ? s.slice(11, 16) : '—'; },
  dur(sec) {
    if (sec == null) return '—';
    if (sec < 60) return `${sec} 秒`;
    if (sec < 3600) return `${Math.floor(sec / 60)} 分 ${sec % 60} 秒`;
    return `${Math.floor(sec / 3600)} 小时 ${Math.floor((sec % 3600) / 60)} 分`;
  },
  mins(m) {
    if (m == null) return '—';
    const h = Math.floor(m / 60); return h ? `${h} 小时 ${m % 60} 分` : `${m} 分钟`;
  },
  ago(s) {
    if (!s) return '—';
    const t = new Date(s.replace(/-/g, '/')).getTime();
    const d = Math.floor((Date.now() - t) / 1000);
    if (d < 60) return '刚刚';
    if (d < 3600) return `${Math.floor(d / 60)} 分钟前`;
    if (d < 86400) return `${Math.floor(d / 3600)} 小时前`;
    return `${Math.floor(d / 86400)} 天前`;
  },
  maskPhone(p) { return p || '—'; },
};

const KIND = {
  '跌倒': { cls: 'red', ico: '⚠' },
  '险跌': { cls: 'orange', ico: '△' },
  '误报': { cls: 'gray', ico: '○' },
  '设备告警': { cls: 'blue', ico: 'ⓘ' },
};
const STAGE_ORDER = ['待接单', '已接单', '已到场', '已处置', '已复盘'];
const STAGE_CLS = { '待接单': 'red', '已接单': 'orange', '已到场': 'blue', '已处置': 'green', '已复盘': 'violet' };
const RISK_CLS = { '高风险': 'red', '中风险': 'orange', '低风险': 'green' };
const DEV_CLS = { '在线': 'green', '离线': 'gray', '充电中': 'blue', '低电量': 'orange', '低气压': 'red', '维护': 'violet' };

/* ---------- UI ---------- */
function toast(title, detail) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.innerHTML = `<span class="t">${esc(title)}</span>${detail ? `<span class="d">${esc(detail)}</span>` : ''}`;
  el.classList.add('on');
  clearTimeout(window.__tt);
  window.__tt = setTimeout(() => el.classList.remove('on'), 4200);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- SSE ---------- */
function connectStream(handlers) {
  if (window.__es) { window.__es.close(); window.__es = null; }
  const es = new EventSource('/api/stream?token=' + encodeURIComponent(API.token));
  window.__es = es;
  let opened = false;
  es.addEventListener('open', () => { opened = true; handlers.onOpen && handlers.onOpen(); });
  ['event', 'telemetry', 'response', 'toast'].forEach(k => {
    es.addEventListener(k, e => {
      let d = {}; try { d = JSON.parse(e.data); } catch (_) {}
      handlers[k] && handlers[k](d);
      handlers.any && handlers.any(k, d);
    });
  });
  es.addEventListener('error', () => { if (!opened) handlers.onFail && handlers.onFail(); });
  return es;
}

/* 站点不可达时的统一提示 */
function renderOffline(msg) {
  document.body.innerHTML = `<div class="err-box">
    <h2>无法连接平台服务</h2>
    <p style="color:var(--muted)">${esc(msg || '后台接口没有响应。这两个页面需要本地服务运行，不能直接双击 HTML 打开。')}</p>
    <p>在项目文件夹的终端里执行下面一行，然后刷新本页：</p>
    <code style="display:block;padding:11px 13px;margin:10px 0;border-radius:6px">python3 server/app.py</code>
    <p style="color:var(--faint);font-size:11.5px">默认端口 8848。启动后访问 <code>http://127.0.0.1:8848/admin.html</code></p>
  </div>`;
}
