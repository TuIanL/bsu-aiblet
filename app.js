const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast = setTimeout(() => el.classList.remove('show'), 2400); };
$('#menuToggle').addEventListener('click', () => $('#mainNav').classList.toggle('open'));
$$('.main-nav a').forEach(a => a.addEventListener('click', () => $('#mainNav').classList.remove('open')));
// Keep every top-level item visibly active and route submenu links to their exact target.
const navItems = $$('.main-nav > a');
const dropdowns = $$('.nav-dropdown');
const setActive = (item) => {
  navItems.forEach(n => n.classList.toggle('active', n === item));
  dropdowns.forEach(n => {
    const active = n === item;
    n.classList.toggle('active', active);
    n.querySelector('button')?.setAttribute('aria-expanded', active ? 'true' : 'false');
  });
};
dropdowns.forEach(dropdown => {
  const trigger = dropdown.querySelector('.nav-section-trigger');
  trigger?.addEventListener('click', (e) => {
    e.preventDefault();
    setActive(dropdown);
    document.querySelector(trigger.dataset.target)?.scrollIntoView({behavior:'smooth', block:'start'});
    $('#mainNav').classList.remove('open');
  });
  dropdown.querySelectorAll('.dropdown-menu a').forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    setActive(dropdown);
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    history.replaceState(null, '', link.getAttribute('href'));
    $('#mainNav').classList.remove('open');
  }));
});
$('.home-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  setActive($('.home-link'));
  // Use the document scroll container directly; this also works when the sticky
  // header is the #top anchor and avoids scrollIntoView being a no-op.
  window.scrollTo({left: 0, top: 0, behavior: 'auto'});
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  history.replaceState(null, '', '#top');
  $('#mainNav').classList.remove('open');
});
const details = {
  device: {kicker:'PRODUCT A / CORE DEVICE', title:'安行护腰', body:'安行护腰将 TENG 柔性传感、IMU 惯性测量、AI 语音交互和主动气囊护髋放进一件日常护腰。设备在本地完成推理，尽量减少对用户的打扰。', list:['TENG + IMU 多模态传感，识别危险步态','百毫秒级响应，跌倒瞬间触发气囊','GPS + 蓝牙通知家属，形成事后救援链路']},
  app: {kicker:'PRODUCT B / CARE APP', title:'子女端 App', body:'子女端 App 面向异地照护场景，提供跌倒报警、GPS 位置推送和每周步态健康报告。基础报警功能不依赖订阅，安心周报提供更长期的趋势分析。', list:['实时接收跌倒报警与位置推送','每周查看步态趋势与异常提醒','支持养老机构与家庭两类使用场景']},
  platform: {kicker:'PRODUCT PLATFORM / 网页端', title:'社区管理平台（后台）', body:'网页端面向社区养老服务驿站、区域养老服务中心及运营方，是服务的日常操作界面。平台可运行：老人档案与防跌评估、设备台账与实时状态、佩戴率看板、事件与响应全流程留痕、季度报告与适老化改造建议。', list:['承载服务闭环七环节的运营操作界面','设备事件 → 平台记录 → 双通道消息 → 人工响应 → 复盘，全链路可追溯','数据来自本地 SQLite 与设备网关实时上报，接入真实硬件只需替换网关侧']},
  knowledge: {kicker:'行业知识', title:'为什么跌倒防护，必须发生在触地之前？', body:'报警只能告诉家属“发生了什么”，却无法改变触地时的冲击。安行护腰把临跌风险识别和主动气囊缓冲放在同一件日常穿戴设备里，尝试把防护节点前移到跌倒瞬间。', list:['老年跌倒后髋部骨折的后果往往严重','日常护腰形态有助于降低穿戴心理门槛','事前识别与事发保护需要在同一安全闭环中协同']},
  tech: {kicker:'技术文章', title:'TENG + IMU：一件护腰如何读懂危险步态', body:'TENG 柔性传感器负责捕捉腰腹部动态变化，IMU 记录九轴姿态与运动状态。两类信号经过预处理、去噪和多模态特征融合后，进入危险步态识别与触发判定。', list:['TENG 具备超薄、柔性和自发电特征','多模态融合帮助降低坐下、弯腰等动作的误报','识别准确率待整机实测，误报率验证目标 ≤5%']},
  case: {kicker:'案例分析', title:'从颐清园开始：社区反馈如何改变研发优先级', body:'团队在北京体育大学颐清园养老社区完成面对面调研。老人真正关心的往往不是功能越多越好，而是轻便、舒适、容易使用，并且在危险时能提供保护。', list:['243 份面对面有效问卷','4 次进社区，3 场专题讲座','32 份有效老年步态数据进入后续模型优化']},
  privacy: {kicker:'隐私政策摘要', title:'把数据留在该留的地方', body:'安行护腰坚持本地优先。AI 推理在设备端完成，步态数据默认不上传云端。只有用户主动同步时，数据才会联网传输。我们仅在提供服务、改进产品和取得授权的范围内处理信息。', list:['本地推理，默认不上传云端','主动同步前明确告知用户','不出售个人数据，不将健康信息用于无关用途']}
};
const dialog = $('#detailDialog');
$$('.open-detail').forEach(btn => btn.addEventListener('click', () => { const d = details[btn.dataset.detail]; $('#dialogContent').innerHTML = `<div class="dialog-body"><div class="section-label">${d.kicker}</div><h3>${d.title}</h3><p>${d.body}</p><ul>${d.list.map(x => `<li>${x}</li>`).join('')}</ul></div>`; dialog.showModal(); }));
$('#dialogClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
$('#contactForm').addEventListener('submit', (e) => { e.preventDefault(); e.currentTarget.reset(); toast('信息已收到，我们会尽快联系你'); });
navItems.forEach(a => a.addEventListener('click', () => setActive(a)));
