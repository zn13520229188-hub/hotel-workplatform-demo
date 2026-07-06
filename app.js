/* Hotel AI Brain 工作平台 Demo —— 交互逻辑（纯前端演示，无后端） */
'use strict';

/* ---------- 基础工具 ---------- */
const $ = s => document.querySelector(s);
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = 0; t.style.transition = '.4s'; }, 2600);
  setTimeout(() => t.remove(), 3100);
}
function openModal(html){ $('#modal').innerHTML = '<button class="modal-x" onclick="closeModal()">✕</button>' + html; $('#modal-bg').classList.add('show'); }
function closeModal(){ $('#modal-bg').classList.remove('show'); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function countUp(id, target, suffix, decimals){
  const el = document.getElementById(id); if(!el) return;
  const steps = 28; let i = 0;
  const timer = setInterval(() => {
    i++;
    const v = target * (i / steps);
    el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()) + (suffix || '');
    if(i >= steps) clearInterval(timer);
  }, 26);
}

/* ---------- 简易 SVG 图表 ---------- */
function svgLine(values, w, h, color){
  const max = Math.max(...values) * 1.1, min = Math.min(...values) * .9;
  const pts = values.map((v, i) => [ (i / (values.length - 1)) * (w - 10) + 5, h - 14 - ((v - min) / (max - min)) * (h - 28) ]);
  const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = '5,' + (h - 14) + ' ' + line + ' ' + (w - 5) + ',' + (h - 14);
  const last = pts[pts.length - 1];
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%">' +
    '<polygon points="' + area + '" fill="' + color + '18"/>' +
    '<polyline points="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="' + color + '"/></svg>';
}
function svgDonut(segs, size){
  let off = 25, out = '';
  segs.forEach(s => {
    out += '<circle r="15.9155" cx="21" cy="21" fill="transparent" stroke="' + s.color +
      '" stroke-width="6" stroke-dasharray="' + s.val + ' ' + (100 - s.val) + '" stroke-dashoffset="' + off + '"/>';
    off -= s.val;
  });
  return '<svg viewBox="0 0 42 42" style="width:' + size + 'px;flex-shrink:0">' + out + '</svg>';
}
function donutLegend(segs){
  return '<div class="legend">' + segs.map(s => '<span><i style="background:' + s.color + '"></i>' + s.label + ' ' + s.val + '%</span>').join('') + '</div>';
}

/* ---------- 门户 / 角色切换 ---------- */
let curRole = null, curView = null;
function renderPortal(){
  const grid = $('#role-grid');
  grid.innerHTML = Object.keys(ROLES).map(id => {
    const r = ROLES[id];
    return '<button class="role-card" onclick="enterRole(\'' + id + '\')">' +
      '<div class="emoji">' + r.emoji + '</div><h3>' + r.name + '</h3>' +
      '<div class="who">' + r.person + ' · 登录后只看到本角色入口</div>' +
      '<div class="desc">' + r.desc + '</div>' +
      '<div class="mods">可见模块 ' + r.mods.length + ' / ' + Object.keys(VIEWS).length + ' ｜ 依据《权限矩阵》</div></button>';
  }).join('') +
  '<button class="role-card guest" onclick="enterRole(\'guest\')">' +
    '<div class="emoji">🧳</div><h3>客人（微信视角）</h3><div class="who">扫码即聊 · 无需加好友</div>' +
    '<div class="desc">从公众号/前台二维码进入微信客服，AI 7×24 接待，红线自动转人工</div>' +
    '<div class="mods">出口：微信客服 ｜ 权限：仅对客导出包</div></button>';
}
function enterRole(id){
  curRole = id === 'guest' ? { name:'客人（微信视角）', person:'', emoji:'🧳', mods:['kefu'] } : ROLES[id];
  curRole.id = id;
  $('#portal').style.display = 'none';
  $('#app').style.display = 'block';
  $('#top-role').textContent = curRole.emoji + ' ' + curRole.name + (curRole.person ? ' · ' + curRole.person : '');
  buildSidebar();
  show(curRole.mods[0]);
}
function backPortal(){ $('#app').style.display = 'none'; $('#portal').style.display = 'block'; }
function buildSidebar(){
  $('#sidebar').innerHTML = curRole.mods.map(v =>
    '<button class="side-item" id="side-' + v + '" onclick="show(\'' + v + '\')">' + VIEW_ICONS[v] + ' ' + VIEWS[v] + '</button>'
  ).join('') +
  '<div class="side-note">本角色可见 <b>' + curRole.mods.length + '</b> / ' + Object.keys(VIEWS).length +
  ' 个模块。<br>入口由企业微信「应用可见范围」控制，页面内容按《权限矩阵》生成。' +
  '<br><a href="javascript:showMatrix()" style="color:var(--blue)">查看权限矩阵 →</a></div>';
}

/* ---------- 视图路由 ---------- */
const RENDER = {};
function show(v){
  curView = v;
  document.querySelectorAll('.side-item').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById('side-' + v); if(btn) btn.classList.add('on');
  $('#main').innerHTML = RENDER[v]();
  if(POST[v]) POST[v]();
  window.scrollTo(0, 0);
}
const POST = {};

function head(t, sub){ return '<div class="view-title">' + t + '</div><div class="view-sub">' + sub + '</div>'; }

/* ================= 老板驾驶舱 ================= */
RENDER.dashBoss = function(){
  return head('老板驾驶舱 · ' + HOTEL.name, '每早 07:30 企微卡片推送同款数据 ｜ 只看结果 + 异常 + 待拍板 ｜ 演示数据') +
  '<div class="grid g4">' +
    kpiCard('入住率 OCC', 'k-occ', TODAY.occCmp, '较上周') +
    kpiCard('平均房价 ADR', 'k-adr', TODAY.adrCmp, '较上周') +
    kpiCard('RevPAR', 'k-rp', TODAY.revparCmp, '较上周') +
    kpiCard('昨日房费收入', 'k-rev', TODAY.revCmp, '较上周') +
  '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>📈 近 30 天 RevPAR 走势 <span class="more">数据源：SQLite · daily_kpi</span></h4>' +
      '<div class="svgwrap">' + svgLine(KPI30, 560, 170, '#1e56d6') + '</div>' +
      '<div class="legend"><span><i style="background:#1e56d6"></i>RevPAR（元）</span><span>周六演唱会日预测 ↑</span></div></div>' +
    '<div class="card"><h4>🧩 渠道结构（本月间夜）<span class="more">目标：直订 >30%</span></h4>' +
      '<div style="display:flex;gap:18px;align-items:center">' + svgDonut(CHANNELS, 150) +
      '<div>' + donutLegend(CHANNELS) +
      '<div class="hint" style="margin-top:10px">携程系佣金本月 ¥28,450。直订每 +5%，年省佣金约 ¥5.7 万 → 客服模块的钱景。</div></div></div></div>' +
  '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>⚠️ 异常预警 <span class="more">只报例外，不报流水账</span></h4>' +
      ALERTS.map(a => '<div class="alert-row"><div class="alert-ic" style="background:' + a.bg + '">' + a.ic + '</div>' +
        '<div style="flex:1">' + a.t + '</div><button class="btn sm lite" onclick="toast(\'已跳转（演示）\')">' + a.act + '</button></div>').join('') + '</div>' +
    '<div class="card"><h4>🖋️ 待你拍板（' + DECISIONS.length + '）<span class="more">六类高影响动作永远人拍板</span></h4>' +
      DECISIONS.map((d, i) => '<div class="decide" id="dec-' + i + '"><div class="t"><span class="tag blue">' + d.tag + '</span> ' + d.t + '</div>' +
        '<div class="d">' + d.d + '</div>' +
        '<button class="btn sm ok" onclick="approve(' + i + ')">批准</button> ' +
        '<button class="btn sm" style="border:1px solid var(--line)" onclick="toast(\'已驳回并记录理由（演示）\')">驳回</button></div>').join('') + '</div>' +
  '</div>';
};
function kpiCard(lab, id, cmp, cmpLab){
  return '<div class="card kpi"><div class="lab">' + lab + '</div><div class="val" id="' + id + '">—</div>' +
    '<div class="cmp up">' + cmp + ' <span style="color:var(--ink2)">' + cmpLab + '</span></div></div>';
}
POST.dashBoss = function(){
  countUp('k-occ', TODAY.occ, '%');
  countUp('k-adr', TODAY.adr, ' 元');
  countUp('k-rp', TODAY.revpar, ' 元');
  countUp('k-rev', TODAY.rev, ' 元');
};
function approve(i){
  const el = document.getElementById('dec-' + i);
  el.style.opacity = .45;
  el.querySelectorAll('button').forEach(b => b.disabled = true);
  toast('✅ 已批准 → 生成执行单并写入 audit_log（谁、何时、批了什么）', 'ok');
}

/* ================= 店长驾驶舱 ================= */
RENDER.dashManager = function(){
  const tasks = ['3F 地毯深洗除味（差评整改·周五前）','302 陈先生 14:00 到店：高楼层+硬枕+忌辣','周六演唱会：核对控房方案，前台过升房话术','22:00 前核对今日日报（PMS 自动抓取；未接通门店拍照/表单录入）','review/ 待审 5 条知识升级'];
  return head('店长驾驶舱 · ' + curRoleName(), '任务 + 口碑 + 收益雷达 + 回流治理 ｜ 演示数据') +
  '<div class="grid g2">' +
    '<div class="card"><h4>✅ 今日任务（' + tasks.length + '）<span class="more">来源：晨会录音提炼 + 系统联动</span></h4>' +
      tasks.map((t, i) => '<div class="task-row" id="task-' + i + '"><input type="checkbox" onchange="doneTask(' + i + ')"><span>' + t + '</span></div>').join('') +
      '<div class="hint">完成情况自动汇入「员工执行完成率」，老板端只看百分比。</div></div>' +
    '<div class="card"><h4>📡 收益雷达（未来 8 天）<span class="more">热度=携程市场分析 · 事件=商圈雷达</span></h4>' +
      '<table class="tb"><tr><th>日期</th><th>市场热度</th><th>事件</th></tr>' +
      OTA.market.map(m => '<tr><td>' + m.d + '</td><td>' + heatTag(m.heat) + ' ' + m.v + '</td><td>' + (m.ev || '—') + '</td></tr>').join('') +
      '</table><div class="decide" style="margin-top:10px"><div class="t">💡 ' + OTA.advice.t + '</div><div class="d">' + OTA.advice.d + '</div>' +
      '<button class="btn sm pri" onclick="toast(\'建议单已提交老板拍板（演示）\',\'ok\')">提交老板拍板</button> ' +
      '<button class="btn sm lite" onclick="show(\'rms\')">💹 在收益系统中打开</button></div></div>' +
  '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>⭐ 点评待办 <span class="more">回复率目标 100%</span></h4>' + reviewCard(OTA.reviews[0], 'mgr') + '</div>' +
    '<div class="card"><h4>🔁 知识回流待审（review/）</h4>' +
      '<div class="list-row"><span class="tag amber">candidate</span>FAQ：充电桩位置与收费<span class="sp"></span><button class="btn sm ok" onclick="toast(\'已升 active → 下次导出进对客知识包\',\'ok\')">通过</button></div>' +
      '<div class="list-row"><span class="tag amber">candidate</span>话术：演唱会散场接驾指引<span class="sp"></span><button class="btn sm ok" onclick="toast(\'已升 active\',\'ok\')">通过</button></div>' +
      '<div class="list-row"><span class="tag amber">candidate</span>竞对情报：B 酒店周六 +12%<span class="sp"></span><button class="btn sm" style="border:1px solid var(--line)" onclick="toast(\'已退回补充来源\')">退回</button></div>' +
      '<div class="hint">AI 只能推到 candidate；升 active 必须人在这里勾选——防胡编的最后一道闸。</div></div>' +
  '</div>';
};
function curRoleName(){ return curRole && curRole.person ? curRole.person : ''; }
function doneTask(i){ document.getElementById('task-' + i).classList.add('done'); toast('已完成并计入执行率'); }
function heatTag(h){
  const map = { '淡':'gray', '平':'blue', '热':'red' };
  return '<span class="tag ' + map[h] + '">' + h + '</span>';
}

/* ================= 前台工作台 ================= */
RENDER.dashFront = function(){
  return head('前台工作台 · ' + curRoleName(), '一线看任务流，不看报表 ｜ 客史字段按权限矩阵裁剪（无历史消费额）') +
  '<div class="grid g2">' +
    '<div class="card"><h4>🛬 今日抵店（3）/ 离店（9）<span class="more">来源：订单采集 + guest_master</span></h4>' +
      ARRIVALS.map(a => '<div class="list-row"><div><b>' + a.name + '</b> <span class="tag blue">' + a.tag + '</span>' +
        '<div style="font-size:12px;color:var(--ink2)">偏好：' + a.pref + ' ｜ 预计 ' + a.eta + '</div></div></div>').join('') +
      '<div class="hint">手机号默认打码；历史消费汇总仅老板/店长可见——这就是「同一张表、不同角色看到不同字段」。</div></div>' +
    '<div class="card"><h4>⬆️ 今日升房任务 <span class="more">' + UPSSELL.stock + '</span></h4>' +
      '<div class="trans-box">' + UPSSELL.script + '</div>' +
      '<div style="margin-top:10px"><button class="btn sm lite" onclick="toast(\'已复制话术（演示）\')">复制话术</button> ' +
      '<button class="btn sm ok" onclick="toast(\'升房成功 +40 元 → 写入 daily_kpi 增收记录\',\'ok\')">记一单升房成功</button></div>' +
      '<h4 style="margin-top:16px">💬 话术速查</h4>' +
      ['押金退还口径','发票（OTA 单）指引','延迟退房权益','儿童早餐政策'].map(t => '<span class="chip">' + t + '</span>').join('') + '</div>' +
  '</div>' +
  '<div class="card" style="margin-top:14px"><h4>🔄 交接班（白班 → 中班）<span class="more">结构化录入，不再靠微信群刷屏</span></h4>' + handoverForm() + '</div>';
};
function handoverForm(){
  return '<div class="form-row"><label>关键待办</label><input id="ho-1" value="302 陈先生 14:00 到店，高楼层已留 802，硬枕已备"></div>' +
    '<div class="form-row"><label>客诉跟进</label><input id="ho-2" value="305 反映走廊有声响，已告知工程，今晚回访"></div>' +
    '<div class="form-row"><label>现金/物品</label><input id="ho-3" value="备用金 ¥2,000 已清点；寄存行李 2 件（票号 015/016）"></div>' +
    '<button class="btn pri" onclick="submitHandover()">提交交接班</button>' +
    '<span style="font-size:12px;color:var(--ink2);margin-left:10px">提交后：入 02_采集缓冲区 → 中班工作台置顶显示 → 3 天后自动归档</span>';
}
function submitHandover(){ toast('✅ 交接班已提交：中班已收到置顶卡片，audit_log 已留痕', 'ok'); }

/* ================= 客房任务单 ================= */
RENDER.dashHouse = function(){
  return head('客房任务单 · ' + curRoleName(), '优先级自动排：提前入住 > 预抵 > 常规 ｜ 点房间号开始查房') +
  '<div class="grid g2">' +
    '<div class="card" style="grid-column:1/-1"><h4>🧹 今日待清扫 18 间（红=优先，含到店备注）</h4>' +
      '<div class="room-grid">' + HOUSE_ROOMS.map((r, i) =>
        '<button class="room ' + r.st + '" id="room-' + i + '" onclick="openRoom(' + i + ')"><b>' + r.no + '</b>' + (r.note || (r.st === 'ok' ? '已完成' : '待清扫')) + '</button>').join('') + '</div></div>' +
    '<div class="card"><h4>🎯 差评整改项（来自点评自动联动）</h4>' +
      '<div class="list-row"><span class="tag red">卫生差评</span>3F 走廊地毯深洗除味<span class="sp"></span><span class="tag amber">周五前</span></div>' +
      '<div class="list-row"><span class="tag red">卫生差评</span>302 空调滤网随工程检修同步清洗<span class="sp"></span><span class="tag amber">今日</span></div>' +
      '<div class="hint">整改完成拍照回执 → 店长审核 → 差评回复里就能写「已整改」，闭环才敢公开承诺。</div></div>' +
    '<div class="card"><h4>📊 本周质量</h4>' +
      '<div class="list-row">查房一次通过率<span class="sp"></span><b>94%</b></div>' +
      '<div class="list-row">返工间数<span class="sp"></span><b>3 间</b></div>' +
      '<div class="list-row">布草送洗<span class="sp"></span><b>周四 09:00 已预约</b></div></div>' +
  '</div>';
};
function openRoom(i){
  const r = HOUSE_ROOMS[i];
  openModal('<h3>查房 · ' + r.no + '</h3>' +
    ['床品四件套平整无毛发','卫浴无水渍、无异味','迷你吧/耗品补齐','空调/电视/灯具正常','地面踢脚线无灰'].map(c =>
      '<div class="task-row"><input type="checkbox" checked><span>' + c + '</span></div>').join('') +
    '<div style="margin:10px 0"><button class="btn sm lite" onclick="toast(\'已拍照 3 张并上传（演示）\')">📷 拍照上传</button></div>' +
    '<button class="btn ok" onclick="roomDone(' + i + ')">查房通过</button> ' +
    '<button class="btn warn" onclick="roomIssue(' + i + ')">发现问题 → 报修</button>');
}
function roomDone(i){
  closeModal();
  const el = document.getElementById('room-' + i);
  el.className = 'room ok'; el.innerHTML = '<b>' + HOUSE_ROOMS[i].no + '</b>已完成';
  toast('✅ ' + HOUSE_ROOMS[i].no + ' 查房通过 → 房态更新，前台可排房', 'ok');
}
function roomIssue(i){
  closeModal();
  toast('🔧 已生成维修工单并推送工程（' + HOUSE_ROOMS[i].no + '），房间锁定不可售', 'warn');
}

/* ================= 工程工单 ================= */
RENDER.dashEng = function(){
  function col(t, arr, tag){
    return '<div class="card"><h4>' + t + '（' + arr.length + '）</h4>' + arr.map(o =>
      '<div class="decide"><div class="t">' + o.t + ' ' + (o.pri === '高' ? '<span class="tag red">高</span>' : '') + '</div>' +
      '<div class="d">' + o.src + '</div>' +
      (tag === 'todo' ? '<button class="btn sm pri" onclick="toast(\'已接单，开始计时（演示）\',\'ok\')">接单</button>' :
       tag === 'doing' ? '<button class="btn sm ok" onclick="toast(\'完成前须上传修复后照片 → 客房复核 → 工单关闭（演示）\',\'ok\')">完成</button>' :
       '<button class="btn sm lite" onclick="beforeAfter()">前后对比照</button>') +
      '</div>').join('') + '</div>';
  }
  return head('工程工单 · ' + curRoleName(), '差评/查房/能耗预警自动生成工单，微信群报修成为历史 ｜ 演示数据') +
    '<div class="kanban">' + col('🆕 待接单', ENG_ORDERS.todo, 'todo') + col('🛠️ 处理中', ENG_ORDERS.doing, 'doing') + col('✅ 今日完成', ENG_ORDERS.done, 'done') + '</div>' +
    '<div class="grid g2" style="margin-top:14px">' +
      '<div class="card"><h4>🗓️ 预防性保养到期提醒</h4>' + MAINTAIN.map(m => '<div class="list-row">' + m + '</div>').join('') +
        '<div class="hint">保养台账在 SQLite，到期前 3 天自动推企微提醒——设备寿命就是这么省出来的。</div></div>' +
      '<div class="card"><h4>⚡ 能耗监控</h4>' +
        '<div class="list-row">6 月水费<span class="sp"></span><b class="dn">环比 +35% ⚠️</b></div>' +
        '<div class="list-row">6 月电费<span class="sp"></span><b>环比 +6%（随入住率正常）</b></div>' +
        '<button class="btn sm warn" onclick="toast(\'已建立排查工单：夜间分区关阀测漏（演示）\',\'warn\')">建立排查工单</button></div>' +
    '</div>';
};

function beforeAfter(){
  openModal('<h3>505 花洒更换 · 修复前后对比（自动拼接存档）</h3>' +
    '<div class="grid g2">' +
    '<div style="background:var(--red-l);border:1px solid #f2b6bd;border-radius:12px;padding:40px 10px;text-align:center;color:var(--red)">📷 修复前<br><span style="font-size:11.5px">07-02 14:07 前台报修时拍摄<br>花洒断裂 · 水压异常</span></div>' +
    '<div style="background:var(--green-l);border:1px solid #a9e2c4;border-radius:12px;padding:40px 10px;text-align:center;color:var(--green)">📷 修复后<br><span style="font-size:11.5px">07-02 16:09 完工时拍摄<br>已更换同型号 · 试水正常</span></div></div>' +
    '<div class="hint" style="margin-top:12px">每张工单的完整档案：出单时间 → 接单 → 修复前照 → 完工 → 修复后照 → 客房复核。存 photo_log + 工单表，随时倒查"什么时间出的单、修没修好、谁修的"。配件更换记录同步进设备台账，下次坏了先查历史。</div>');
}

/* ================= 财务驾驶舱 ================= */
RENDER.dashFin = function(){
  return head('财务驾驶舱 · ' + curRoleName(), '对账 + 佣金 + 成本结构 ｜ 本角色看不到客史与调价建议（权限矩阵裁剪）') +
  '<div class="grid g3">' +
    '<div class="card kpi"><div class="lab">昨日 PMS 房费</div><div class="val">¥' + FIN.recon.pms.toLocaleString() + '</div><div class="cmp">与 OTA 应结差异 0 ✅</div></div>' +
    '<div class="card kpi"><div class="lab">本月 OTA 佣金累计</div><div class="val">¥' + FIN.feeMonth.toLocaleString() + '</div><div class="cmp">占 OTA 收入 ' + FIN.feeRate + '</div></div>' +
    '<div class="card kpi"><div class="lab">待开发票</div><div class="val">' + FIN.invoices + ' 张</div><div class="cmp">协议客户月结 1 家</div></div>' +
  '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>🥧 本月成本结构</h4><div style="display:flex;gap:18px;align-items:center">' +
      svgDonut(FIN.cost, 150) + '<div>' + donutLegend(FIN.cost) +
      '<div class="hint">水费异常已联动工程排查；佣金占比是「直订战役」的北极星反指标。</div></div></div></div>' +
    '<div class="card"><h4>🔁 渠道对账（昨日）</h4>' +
      '<table class="tb"><tr><th>渠道</th><th>应结</th><th>佣金</th><th>状态</th></tr>' +
      '<tr><td>携程系</td><td>¥' + FIN.recon.ota.toLocaleString() + '</td><td>¥' + FIN.recon.fee.toLocaleString() + '</td><td><span class="tag green">已核对</span></td></tr>' +
      '<tr><td>美团</td><td>¥3,420</td><td>¥342</td><td><span class="tag green">已核对</span></td></tr>' +
      '<tr><td>直订/私域</td><td>¥8,890</td><td>¥0</td><td><span class="tag green">POS 已对</span></td></tr></table>' +
      '<div class="hint">数据从 SQLite 出，每周自动同步飞书多维表格生成月报（见「飞书联通」）。</div></div>' +
  '</div>';
};

/* ================= 人事驾驶舱 ================= */
RENDER.dashHR = function(){
  const maxF = HR.funnel[0][1];
  return head('人事驾驶舱 · ' + curRoleName(), '小店人事常由店长/行政兼任——单独设角色是为了权限干净：工资明细仅老板可见 ｜ 演示数据') +
  '<div class="grid g4">' + HR.head.map(h =>
    '<div class="card kpi"><div class="lab">' + h[0] + '</div><div class="val" style="font-size:22px">' + h[1] + '</div><div class="cmp" style="color:var(--ink2)">' + h[2] + '</div></div>').join('') + '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>📇 证照与合规到期提醒 <span class="more">台账在 SQLite · 到期前 30 天自动推企微</span></h4>' +
      HR.certs.map(c => '<div class="list-row"><span class="tag ' + c[2] + '">' + c[1] + '</span>' + c[0] + '<span class="sp"></span><button class="btn sm lite" onclick="toast(\'已生成办理待办并指派（演示）\')">生成待办</button></div>').join('') +
      '<div class="hint">健康证过期是卫生检查的高频罚款点——这一条提醒一年就把模块钱省回来。</div></div>' +
    '<div class="card"><h4>🎯 招聘漏斗（客房服务员 ×2）</h4>' +
      HR.funnel.map(f => '<div class="list-row">' + f[0] + '<span class="sp"></span><div style="width:150px;height:8px;background:var(--line);border-radius:4px"><div style="width:' + Math.round(f[1] / maxF * 100) + '%;height:100%;background:var(--blue);border-radius:4px"></div></div><b style="width:30px;text-align:right">' + f[1] + '</b></div>').join('') +
      '<div class="hint">行业背景：前厅岗流失率高的酒店达 80%（人力资源报告 2023）——本店近 90 天流失 12%，靠的是 SOP+AI 陪练缩短上手期。</div></div>' +
  '</div>' +
  '<div class="grid g3" style="margin-top:14px">' +
    '<div class="card"><h4>🗓️ 今日排班</h4>' + HR.shifts.map(s => '<div class="list-row"><b style="width:44px">' + s[0] + '</b>' + s[1] + '</div>').join('') +
      '<div class="list-row"><span class="tag red">缺口</span>周六（演唱会日）夜班 1 人<span class="sp"></span><button class="btn sm pri" onclick="toast(\'顶班需求已推送企微「机动群」（演示）\',\'ok\')">发顶班需求</button></div></div>' +
    '<div class="card"><h4>🎓 培训与考核（联动 SOP 库）</h4>' + HR.train.map(t => '<div class="list-row">' + t[0] + '<span class="sp"></span><b>' + t[1] + '</b></div>').join('') +
      '<div class="hint">新员工照 SOP 库学 + AI 陪练模拟客人提问，考核通过才排独立班——培训成本降下来，服务口径统一起来。</div></div>' +
    '<div class="card"><h4>🧮 智能薪酬引擎</h4>' +
      '<div class="list-row"><b style="width:44px">计件</b>客房调度自动记（今日全组 ¥168，见调度模块）</div>' +
      '<div class="list-row"><b style="width:44px">工时</b>排班＋打卡自动算（本月加班 12h，超标已标黄）</div>' +
      '<div class="list-row"><b style="width:44px">提成</b>升房 / 直订成交自动挂人（本月累计 ¥427）</div>' +
      '<div class="list-row"><b style="width:44px">工资条</b>每月 1 日 AI 出草稿 → 人事初核 → 老板批 → 企微发到个人</div>' +
      '<button class="btn sm lite" style="margin-top:8px" onclick="toast(\'6 月工资条草稿已生成：23 人 · 异常 1 条（小周加班超标）待人事复核（演示）\',\'ok\')">生成本月工资条草稿</button>' +
      '<div class="hint">🔒 金额明细仅「老板」角色可见（权限矩阵）；调薪酬规则前，AI 先用近 3 个月真实数据试算每个人到手变化，老板看完影响面再拍板。</div></div>' +
  '</div>';
};

/* ================= 收益系统联动（关联产品） ================= */
RENDER.rms = function(){
  return head('收益系统联动 · 酒店 AI 收益管理系统', '关联产品（hotelai.vip）：自动预测 · 自动定价 · 自动推送 · 受控自动改价 ｜ 两个产品可单卖、可打包') +
  '<div class="card" style="background:linear-gradient(135deg,#101c3d,#27439b);color:#fff;border:none"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '<div style="font-size:34px">💹</div><div style="flex:1"><b style="font-size:16px">酒店 AI 收益管理系统（RMS）</b>' +
    '<div style="font-size:12.5px;color:#c8d4f5;margin-top:4px">定价日历 · OTB/Pickup 预测 · 竞对情报 · 审批台 · Autopilot 执行器 —— 工作平台管「经营的手脚」，RMS 管「定价的扳机」</div></div>' +
    '<a class="btn" style="background:#fff;color:#123a99;text-decoration:none" href="https://hotelai.vip/dashboard" target="_blank">打开收益系统 →</a></div></div>' +
  '<div class="grid g3" style="margin-top:14px">' +
    '<div class="card" style="border-top:3px solid var(--blue)"><h4>🧠 工作平台独有（10_brain）</h4>' +
      ['知识库全部（SOP/话术/FAQ/培训）','客史 guest_master 与私域','点评与回复、企微客服会话','任务/工单/交接班/巡检','人事/排班/证照台账','财务成本、能耗、对账','review/ 与 audit_log 治理'].map(x => '<div class="list-row">' + x + '</div>').join('') +
      '<div class="hint">单卖工作平台：含「调价建议（受控）」但无执行器——建议单人工去后台改。</div></div>' +
    '<div class="card" style="border-top:3px solid var(--green)"><h4>🤝 两边共用（00_shared · 只采一次）</h4>' +
      ['门店事实：房型/房量/基础档案','daily_kpi 历史（OCC/ADR/RevPAR）','订单与 OTB 在店数据（eBooking/PMS）','competitor_price 竞对价快照','市场热度/商圈活动/天气（需求信号）','ota_price 自家挂牌价','《指标口径表》：一个口径两个产品'].map(x => '<div class="list-row">' + x + '</div>').join('') +
      '<div class="hint">打包卖的技术底气：共享层只建一次、只采一次，两个产品即插即用（定稿 §12 中立格式）。</div></div>' +
    '<div class="card" style="border-top:3px solid var(--purple)"><h4>💹 RMS 独有（20_rms）</h4>' +
      ['需求预测模型（Fcst/Pickup/OTB pace）','定价规则：底价/封顶/竞对跟随/房型价差','审批台：建议单 → 批准 → 执行','改价执行器与渠道接口凭据','改价日志 + 预测准确率复盘','Autopilot 分级自动策略'].map(x => '<div class="list-row">' + x + '</div>').join('') +
      '<div class="hint">单卖 RMS：自带轻量采集器（自己抓 OTB/竞对价），不依赖工作平台。</div></div>' +
  '</div>' +
  '<div class="card" style="margin-top:14px"><h4>🔗 打包时的联动闭环</h4>' +
    '<div class="flow"><div class="node"><b>工作平台</b>活动/天气/客史结构<br>喂给预测</div><div class="link"></div>' +
    '<div class="node"><b>RMS 预测</b>需求 Fcst<br>+ Pickup 曲线</div><div class="link"></div>' +
    '<div class="node"><b>定价建议</b>房型 × 日期<br>建议价+理由</div><div class="link"></div>' +
    '<div class="node"><b>审批台</b>企微/飞书卡片<br>老板一键批</div><div class="link"></div>' +
    '<div class="node"><b>Autopilot</b>分级执行改价<br>回写各渠道</div><div class="link"></div>' +
    '<div class="node"><b>回写平台</b>结果进 daily_kpi<br>老板驾驶舱看结果</div></div>' +
    '<div class="grid g3" style="margin-top:10px">' +
    '<div class="decide"><div class="t">L0 建议档（默认）</div><div class="d">只出建议单，人工执行——单卖工作平台就是这一档</div></div>' +
    '<div class="decide"><div class="t">L1 一键档</div><div class="d">老板在卡片上点「批准」，RMS 自动执行改价并回执</div></div>' +
    '<div class="decide"><div class="t">L2 守护自动档</div><div class="d">日常小幅调价全自动；护栏：幅度≤8%/日、不破底价、大事件日强制人审、异常熔断回滚、全量 audit_log</div></div></div>' +
    '<div class="hint"><b>为什么分级而不是一步全自动：</b>携程 2026-03 已下线自家 AI 调价助手（防内卷），OTA 侧不会替你做这件事——独立 RMS 正好补位；但盲目全自动一次事故就丢客户信任，Autopilot 默认 OFF、按信任逐级放权，才是「无敌且不败」。</div></div>';
};

/* ================= 采集中心 ================= */
const COLLECT_TABS = [ ['rec','🎙️ 录音卡'], ['paper','📸 文字资料拍照'], ['photo','📷 照片采集'], ['im','🔗 IM 群聊与工作流'], ['pms','🏨 PMS 采集'], ['auto','🤖 外部自动采集'], ['duty','👥 职责矩阵与去纸化'] ];
let colTab = 'rec';
RENDER.collect = function(){
  const def = { front:'paper', house:'photo', manager:'pms', eng:'photo', fin:'paper', boss:'pms', hr:'duty' };
  if(curRole && def[curRole.id] && !RENDER.collect._touched){ colTab = def[curRole.id]; }
  return head('采集中心（入口层）', '中国中小酒店每天产生的工作，从这 7 类入口进平台：先进缓冲区（raw），再走加工流水线 ｜ 当前角色默认打开本岗入口') +
  '<div class="tabs">' + COLLECT_TABS.map(t =>
    '<button class="tab' + (colTab === t[0] ? ' on' : '') + '" onclick="setColTab(\'' + t[0] + '\')">' + t[1] + '</button>').join('') + '</div>' +
  '<div id="col-body">' + collectBody() + '</div>';
};
function setColTab(t){ colTab = t; RENDER.collect._touched = true; show('collect'); }
function collectBody(){
  if(colTab === 'rec') return colRec();
  if(colTab === 'paper') return colPaper();
  if(colTab === 'photo') return colPhoto();
  if(colTab === 'im') return colIM();
  if(colTab === 'pms') return colPMS();
  if(colTab === 'auto') return colAuto();
  return colDuty();
}
function colRec(){
  return '<div class="grid g2"><div class="card">' +
    '<h4>🎙️ 录音卡设备（录完经 Wi-Fi 自动上传，员工零操作）</h4>' +
    [['店长工牌录音卡','在线','电量 82% · 今日已自动上传 2 段'],
     ['前台台面录音卡','在线','电量 64% · 今日已自动上传 1 段'],
     ['会议室录音卡','充电中','昨日上传 1 段']].map(d =>
      '<div class="list-row"><span class="tag ' + (d[1] === '在线' ? 'green' : 'gray') + '">' + d[1] + '</span><b>' + d[0] + '</b><span class="sp"></span><span style="font-size:11.5px;color:var(--ink2)">' + d[2] + '</span></div>').join('') +
    '<div class="hint" style="margin:10px 0">覆盖场景：晨会 / 班前会 / 班后会 / 管理层会议 / 培训课 / 前台咨询电话——凡是「说过就散」的内容，录音卡都自动收进知识库。</div>' +
    '<div style="margin:12px 0"><button class="btn pri" id="rec-sim" onclick="cardUpload()">▶ 模拟：录音卡刚传回《晨会录音 06:12》</button></div>' +
    '<div class="wave" id="wave" style="visibility:hidden">' + '<i style="animation-delay:.1s"></i><i style="animation-delay:.25s"></i><i></i><i style="animation-delay:.4s"></i><i style="animation-delay:.15s"></i><i style="animation-delay:.3s"></i><i></i>'.repeat(2) + '</div>' +
    '<div style="font-size:12px;color:var(--ink2);margin-bottom:8px" id="rec-tip">等待设备回传…</div>' +
    '<div class="trans-box" id="trans">（音频落库后自动转写，逐字稿显示在这里）</div><div id="rec-chips" style="margin-top:10px"></div>' +
    '<div style="margin-top:10px"><button class="btn pri" id="rec-submit" disabled onclick="submitRec()">分发 3 条到对应板块</button></div></div>' +
    '<div class="card"><h4>🗂️ 录音存哪儿？——三层分开存（答案版）</h4>' +
    '<div class="list-row"><span class="tag gray">第 1 层</span><div><b>原始音频文件</b>（.mp3）→ 平台根 <b>data/media/recordings/2026-07/</b>（vault 外·不进 Obsidian·不进网盘），SQLite media_log 表登记：路径/时长/来源设备/哈希</div></div>' +
    '<div class="list-row"><span class="tag amber">第 2 层</span><div><b>逐字稿</b> → <b>vault/02_采集缓冲区/录音转写/</b>2026-07-03_晨会.md（status: raw，头部指回音频路径）——永久留档，但 <b>raw 不可作为经营事实引用</b></div></div>' +
    '<div class="list-row"><span class="tag green">第 3 层</span><div><b>提炼成品</b> → 走状态机分发：知识进 <b>04_经营知识</b> 对应板块（candidate→人审→active）；任务进 <b>SQLite 工单表</b>；客史结构化字段进 <b>guest_master</b>、故事化（脱敏）进 80_私域</div></div>' +
    '<div class="hint"><b>留存策略：</b>音频 90 天后转 99_归档冷库对应的冷存储或删除（录音含人声，最小化保留）；逐字稿永久 raw 留档可回查；只有第 3 层 active 内容才会被驾驶舱和客服引用。</div></div></div>';
}
function cardUpload(){
  $('#rec-sim').disabled = true;
  $('#wave').style.visibility = 'visible';
  $('#rec-tip').textContent = 'Wi-Fi 接收中 → 音频已存 data/media/recordings/ → media_log 已登记 → 转写中…';
  setTimeout(() => {
    $('#wave').style.visibility = 'hidden';
    typeText('trans', REC_DEMO.text, () => {
      $('#rec-tip').textContent = '逐字稿已存 02_采集缓冲区/录音转写（raw）· AI 已提炼 3 条';
      $('#rec-chips').innerHTML = REC_DEMO.chips.map(c => '<span class="chip"><span class="tag ' + c[2] + '">' + c[0] + '</span>' + c[1] + '</span>').join('');
      $('#rec-submit').disabled = false;
      $('#rec-sim').disabled = false;
    });
  }, 1400);
}
function typeText(id, text, done){
  const el = document.getElementById(id); el.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text.slice(i, i + 4); i += 4;
    if(i >= text.length){ clearInterval(timer); if(done) done(); }
  }, 24);
}
function submitRec(){
  toast('✅ 已分发：客房任务 ×1 ｜ 前台客史提示 ×1 ｜ 店长收益提醒 ×1（原文留 raw）', 'ok');
  $('#rec-submit').disabled = true;
}
function colDaily(){
  return '<div class="card" style="max-width:640px"><h4>📝 每日经营日报（店长 22:00 前）→ 写入 SQLite daily_kpi</h4>' +
    '<div class="form-row"><label>可售房数</label><input id="d-sell" type="number" value="108" oninput="calcKpi()"></div>' +
    '<div class="form-row"><label>已售房数</label><input id="d-sold" type="number" value="84" oninput="calcKpi()"></div>' +
    '<div class="form-row"><label>房费收入(元)</label><input id="d-rev" type="number" value="24077" oninput="calcKpi()"></div>' +
    '<div class="form-row"><label>备注</label><input id="d-note" value="周四，商圈平淡；演唱会前夜咨询增多"></div>' +
    '<div class="grid g3" style="margin:12px 0">' +
      '<div class="card kpi" style="padding:10px"><div class="lab">OCC 自动</div><div class="val" id="c-occ" style="font-size:20px">—</div></div>' +
      '<div class="card kpi" style="padding:10px"><div class="lab">ADR 自动</div><div class="val" id="c-adr" style="font-size:20px">—</div></div>' +
      '<div class="card kpi" style="padding:10px"><div class="lab">RevPAR 自动</div><div class="val" id="c-rp" style="font-size:20px">—</div></div></div>' +
    '<button class="btn pri" onclick="toast(\'✅ 已写入 daily_kpi · 明早 07:30 老板卡片用的就是这行数据\',\'ok\')">提交日报</button> ' +
    '<button class="btn" style="border:1px solid var(--line)" onclick="missDemo()">看看漏录会怎样？</button></div>';
}
function calcKpi(){
  const s = +$('#d-sell').value || 1, d = +$('#d-sold').value || 0, r = +$('#d-rev').value || 0;
  $('#c-occ').textContent = Math.round(d / s * 100) + '%';
  $('#c-adr').textContent = d ? Math.round(r / d) + ' 元' : '—';
  $('#c-rp').textContent = Math.round(r / s) + ' 元';
}
function missDemo(){
  openModal('<h3>缺数不装有（平台铁律）</h3>' +
    '<div class="fs-card"><div class="fs-head" style="background:linear-gradient(90deg,#d93848,#f0672c)">📊 每日经营日报 · 07-04 07:30</div>' +
    '<div class="fs-body"><b style="color:var(--red)">⚠️ 昨日 daily_kpi 未录入</b><div style="font-size:12.5px;color:var(--ink2);margin-top:6px">今日卡片不展示旧数据充数。已自动提醒店长补录（22:00 未录即触发）。</div></div>' +
    '<div class="fs-btnrow"><span class="fs-btn" style="background:var(--red)">提醒店长补录</span></div></div>' +
    '<div class="hint" style="margin-top:12px">宁可明说缺数，绝不拿旧数装新数——老板对平台的信任就靠这条守住。</div>');
}
function colPaper(){
  return '<div class="grid g2"><div class="card"><h4>📸 文字资料拍照/上传（日报·交接班·查房单·报修单等文字记录全归这一类）</h4>' +
    '<div class="upload-zone" onclick="fakePaper()">📷 点击模拟：拍照上传今天的纸质单据<br><span style="font-size:11px">手写日报 / 交接班本 / 查房单 / 报修登记本 / 水电抄表读数 / SOP 打印件 / 供应商单据 / 证照</span></div>' +
    '<div id="up-res" style="margin-top:10px"></div>' +
    '<div style="margin-top:10px"><button class="btn sm lite" onclick="openModal(colDaily())">👀 看去纸化阶段 2 的样子：平台原生表单（以每日日报为例）</button></div>' +
    '<div class="hint"><b>为什么留这个入口：</b>中小酒店今天大多还在用纸。先不改员工习惯——每天拍照上传，OCR+AI 自动识别归档，知识库照样一天天变强、越来越懂这家店。</div></div>' +
    '<div class="card"><h4>🧾 拍照进来后发生什么</h4>' +
    '<div class="list-row"><span class="tag gray">1</span>原图存 <b>data/media/scans/2026-07/</b>（vault 外），media_log 登记</div>' +
    '<div class="list-row"><span class="tag amber">2</span>OCR 识别 → AI 判断单据类型（交接班/查房/报修/日报…）并抽取字段</div>' +
    '<div class="list-row"><span class="tag blue">3</span>结构化数据进对应 SQLite 表；文字内容进 02_采集缓冲区（raw）</div>' +
    '<div class="list-row"><span class="tag green">4</span>识别置信度低的字段标黄 → 店长 review 时顺手改，越用越准</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🛤️ 去纸化三阶段路线（目标：全店流程只在平台 + 飞书上跑）</h4>' +
    '<div class="grid g3">' +
    '<div class="decide"><div class="t">阶段 1 · 全收（第 1–2 月）</div><div class="d">员工零改变：纸照写，每天拍照上传全收。系统同时把企微/钉钉/飞书里的存量记录用 CLI 拉干净。KPI：单据入库率 100%</div></div>' +
    '<div class="decide"><div class="t">阶段 2 · 双轨（第 2–4 月）</div><div class="d">高频单据（交接班/日报/工单）切平台原生表单＋飞书流程，纸质并行兜底。KPI：纸质单据量每周递减</div></div>' +
    '<div class="decide"><div class="t">阶段 3 · 去纸（第 4 月起）</div><div class="d">流程流转、工作交接、SOP、日报全部在工作平台＋飞书完成，纸质入口只留应急（停电/断网预案）。KPI：周纸质单据 ≈ 0</div></div></div></div>';
}
function fakePaper(){
  $('#up-res').innerHTML = '<span class="chip">📷 IMG_0703_交接班本.jpg <span class="tag green">OCR 完成</span></span>' +
    '<div class="trans-box" style="margin-top:8px">AI 识别：<b>交接班记录</b>（置信 96%）· 白班→中班<br>抽取字段：备用金 ¥2,000 ✓ ｜ 寄存行李 2 件（015/016）✓ ｜ <span style="background:#fff4e0">302 陈先生 14:00 到店（置信 81%，请复核）</span></div>' +
    '<div style="margin-top:8px"><button class="btn sm ok" onclick="toast(\'✅ 已入库：结构化字段进交接班表，原图存 data/media/scans/，raw 留档\',\'ok\')">确认入库</button></div>';
  toast('照片已上传 → OCR + AI 识别完成（演示）');
}
function colIM(){
  return '<div class="grid g3">' + [
    ['企业微信', 'green', '已连通', '<b>工作群聊天记录每日增量归档</b>＋客服会话回流（每周五）——全店每天的沟通都沉在群里，这是知识库最重要的活水', '拉取最近 7 天'],
    ['飞书', 'green', '已连通', '审批流/人事流/财务流的<b>流程数据</b>＋多维表格双向＋群记录归档', '拉取最近 7 天'],
    ['钉钉', 'amber', '待授权', '历史群记录与审批记录<b>一次性迁移</b>（换平台前先把老账本搬走）', '去授权']
  ].map((p, i) => '<div class="auto-card">' + (p[1] === 'green' ? '<div class="dot"></div>' : '') +
    '<h5>' + p[0] + ' <span class="tag ' + p[1] + '">' + p[2] + '</span></h5><div class="meta">' + p[3] + '</div>' +
    '<div class="prog" id="improg-' + i + '"><i></i></div>' +
    '<button class="btn sm lite" style="margin-top:10px" onclick="imPull(' + i + ')">' + p[4] + '</button></div>').join('') +
  '</div>' +
  '<div class="card" style="margin-top:12px"><h4>🧠 AI 每天从群聊里捞什么（捞完自动分发）</h4>' +
    '<div class="list-row"><span class="tag blue">任务承诺</span>"明天上午我去修 302 空调" → 自动生成带责任人和期限的工单</div>' +
    '<div class="list-row"><span class="tag red">客诉线索</span>群里提到客人不满 → 进客诉台账，店长工作台置顶</div>' +
    '<div class="list-row"><span class="tag amber">事实变更</span>"周末早餐改到 7 点开" → 提示更新知识库对应条目（走 review）</div>' +
    '<div class="list-row"><span class="tag green">交接信息</span>夜班 @ 早班的注意事项 → 置顶到对方工作台，不再靠爬楼</div></div>' +
  '<div class="card" style="margin-top:12px"><h4>🛤️ 工作流的现状与终局</h4>' +
    '<div class="list-row"><span class="tag green">现状</span>审批流 / 人事流 / 财务流 / 工作流程在<b>飞书</b>上跑（调价审批、报销、入职离职、采购）</div>' +
    '<div class="list-row"><span class="tag amber">过渡</span>企微 / 钉钉 / 其他 OA 里的存量流程与记录，用 API/CLI 采集归档进知识库</div>' +
    '<div class="list-row"><span class="tag blue">终局</span><b>工作流统一到飞书，日常沟通统一到企微＋飞书群</b>；平台负责把两边数据汇进同一个知识库、按权限分发到各驾驶舱</div></div>';
}
function imPull(i){
  if(i === 2){ toast('已生成钉钉授权二维码，管理员扫码即可（演示）'); return; }
  const p = document.getElementById('improg-' + i);
  p.style.display = 'block';
  requestAnimationFrame(() => { p.firstChild.style.width = '100%'; });
  setTimeout(() => { toast('✅ 已拉取 312 条记录 → 02_采集缓冲区/IM归档 · AI 识别出 14 条知识候选待提炼', 'ok'); p.style.display = 'none'; p.firstChild.style.width = '0'; }, 1600);
}
function colAuto(){
  return '<div class="grid g3">' + AUTO_SRC.map((s, i) =>
    '<div class="auto-card"><div class="dot"></div><h5>' + s.ic + ' ' + s.t + '</h5><div class="meta">' + s.meta + '</div>' +
    '<div class="prog" id="prog-' + i + '"><i></i></div>' +
    '<button class="btn sm lite" style="margin-top:10px" onclick="syncNow(' + i + ')">手动同步</button></div>').join('') +
  '</div><div class="hint" style="margin-top:12px"><b>为什么自动采集是中小店的胜负手：</b>老板不用再半夜刷 eBooking——竞对价、市场热度、演唱会、天气、点评全部定时进库，AI 汇总成建议，人只做拍板。（微信客服"热门问题"后台仅存一周，所以每周五脚本自动导出兜底。）</div>';
}
function syncNow(i){
  const p = document.getElementById('prog-' + i);
  p.style.display = 'block';
  requestAnimationFrame(() => { p.firstChild.style.width = '100%'; });
  setTimeout(() => { toast('✅ ' + AUTO_SRC[i].t + ' 同步完成 → 新数据已入库并触发规则检查', 'ok'); p.style.display = 'none'; p.firstChild.style.width = '0'; }, 1700);
}
function colDuty(){
  return '<div class="card"><h4>👥 谁采集什么（职责矩阵）</h4>' +
    '<table class="tb"><tr><th>角色</th><th>负责采集</th><th>频率</th></tr>' +
    COLLECT_DUTY.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') +
    '</table><div class="hint">采集动作全部嵌在本岗工作台里「顺手完成」，不是额外作业——这是采集能坚持下去的唯一办法。</div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🎯 终局：无纸化酒店</h4><div class="hint" style="margin-top:0">' +
    '录音卡管「说过的话」，拍照入口管「写过的纸」，CLI 连通管「聊过的群」，原生表单管「以后的流程」——四路汇进同一个知识库。' +
    '运营 3–4 个月后纸质全退役，全店流程只在 <b>工作平台 + 飞书</b> 上流转，每一单每一句都成为知识库的养料，越用越懂这家店。</div></div>';
}

/* ================= 照片采集 ================= */
function colPhoto(){
  return '<div class="grid g2">' +
  '<div class="card"><h4>📷 照片采集（查房 / 工区卫生 / 仪容仪表 / 巡检 / 质检 / 随手拍 / 定时拍）</h4>' +
    '<div class="upload-zone" onclick="fakePhoto()">📷 点击模拟：客房刘姐上传 302 打扫完成照（4 张标准角度）</div>' +
    '<div id="photo-res" style="margin-top:10px"></div>' +
    '<div class="hint">场景全清单：①查房后房间照（每间 3–4 张标准角度）②工区/公区卫生 ③员工仪容仪表（每日班前一张）④安全巡检 / 卫生巡检 / 仪容巡检 ⑤质检抽查 ⑥店长、管理层、老板随手拍 ⑦定时拍摄点位（大堂/早餐台，班前班后各一张）</div></div>' +
  '<div class="card"><h4>❓ 三个关键问题（答案版）</h4>' +
    '<div class="list-row"><span class="tag gray">a 存哪</span><div>原图 → <b>data/media/photos/类型/日期/</b>（如 photos/查房/2026-07-04/302_1420.jpg，vault 外·不进网盘）；SQLite <b>photo_log</b> 表登记：时间/拍摄人/类型/位置/关联工单</div></div>' +
    '<div class="list-row"><span class="tag amber">b 怎么筛</span><div>AI 视觉四道自动筛：①<b>自动分类</b>（查房/仪容/巡检/随手拍）②<b>质量筛</b>（模糊、重复、拍歪 → 打回重拍）③<b>问题识别</b>（床品不平/地面污渍/工装不规范 → 自动生成整改项并@责任人）④<b>隐私筛</b>（拍到客人面部自动模糊，含身份证画面拒收）</div></div>' +
    '<div class="list-row"><span class="tag green">c 怎么归档</span><div>合格照按「类型＋位置＋日期」归档可追溯；问题照自动挂工单（修复前照），<b>工单关闭必须传修复后照</b>，前后对比图自动拼接存档；90 天后普通照转冷库，问题照随工单永久保留；每周抽样进《质检周报》</div></div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🤖 AI 拿这些照片干什么（不是存完就完）</h4>' +
    '<div class="list-row"><span class="tag blue">卫生质检打分</span>每间房照片按 SOP 标准打分，低分间自动进返工单；周报出「每人一次通过率」</div>' +
    '<div class="list-row"><span class="tag purple">仪容仪表核查</span>班前照比对规范（工牌/工装/发型），不合格当班提醒本人；周报只给比例、不公开点名</div>' +
    '<div class="list-row"><span class="tag red">差评预防</span>照片问题项与历史差评根因（地毯/异味/床品）自动关联——先于客人发现问题</div>' +
    '<div class="list-row"><span class="tag green">素材挖掘</span>老板随手拍一张，AI 判断「是问题还是素材」：问题进工单，好图进内容工厂（小红书/OTA 图库候选）</div></div>';
}
function fakePhoto(){
  $('#photo-res').innerHTML = '<span class="chip">📷 302_1420.jpg ×4 <span class="tag green">AI 质检 92 分</span></span>' +
    '<div class="trans-box" style="margin-top:8px">AI 视觉分析：床品平整 ✓ ｜ 卫浴无水渍 ✓ ｜ 迷你吧补齐 ✓ ｜ <span style="background:#fff4e0">窗台有杂物（-8 分）→ 已生成返工提示 @刘姐</span><br>归档：photos/查房/2026-07-04/ ｜ photo_log 已登记 ｜ 1 张床品特写标记「OTA 图库候选」→ 内容工厂</div>';
  toast('照片上传：AI 质检 + 自动归档 + 素材挖掘一次完成（演示）');
}

/* ================= PMS 数据采集 ================= */
function colPMS(){
  return '<div class="card"><h4>🏨 PMS 数据采集（房态 / 经营数据 / 在住客人特征）——三条接入路，按酒店实际情况选</h4>' +
    '<table class="tb"><tr><th>接入方式</th><th>适用</th><th>稳定性</th><th>如实说明</th></tr>' +
    '<tr><td><b>① 官方 API / 开放平台</b></td><td>绿云、别样红等主流云 PMS</td><td><span class="tag green">高 ✅</span></td><td>最优解；部分需酒店开通开放能力或走 ISV 合作，有周期</td></tr>' +
    '<tr><td><b>② 本地数据库直读</b></td><td>单机版 / 本地部署的老 PMS</td><td><span class="tag green">高 ✅</span></td><td>数据就在店内电脑里，直接读库反而最好接</td></tr>' +
    '<tr><td><b>③ RPA 页面采集（兜底）</b></td><td>无 API 的云 PMS</td><td><span class="tag amber">中 ⚠️</span></td><td>用酒店自己的账号定时读自己的后台页面；<b>只读不写</b>；页面改版需维护，按「尽力而为＋维护响应」承诺，不吹 100%</td></tr></table>' +
  '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>📥 采什么、喂给谁</h4>' +
      '<div class="list-row"><span class="tag blue">房态快照</span>每 15 分钟 → 喂「客房智能调度」（扫态/派房）<span class="sp"></span><button class="btn sm lite" onclick="show(\'dispatch\')">看调度模块</button></div>' +
      '<div class="list-row"><span class="tag green">经营数据</span>夜审后自动抓 → <b>daily_kpi 自动生成，店长从"录日报"变"核对日报"</b></div>' +
      '<div class="list-row"><span class="tag purple">在住客人特征</span>年龄段 / 性别 / 客源地 → guest_master 做定制服务（亲子备防撞条、年长客备老花镜、南方客备加湿提示）</div>' +
      '<div class="list-row"><span class="tag gray">历史订单与房价</span>→ 共享数据层（收益系统同源使用）</div></div>' +
    '<div class="card"><h4>🛡️ 诚实边界（写进合同的话）</h4>' +
      '<div class="list-row">✅ <b>读</b>自己的数据：三条路总有一条通，可承诺</div>' +
      '<div class="list-row">⚠️ <b>写回</b>（如改房态）：只在 PMS 有 API 时承诺自动；无 API 走"平台提醒 + 人工一键"，不做 RPA 自动写</div>' +
      '<div class="list-row">🔒 客人身份证号<b>绝不采集入库</b>（合规红线）——只取年龄段/性别/客源地统计特征</div>' +
      '<div class="hint">为什么 RPA 不写：写操作一旦错一间房，超售/空房都是真金白银的事故；读错了可以重读，写错了要赔。</div></div></div>';
}

/* ================= 客房智能调度（PMS 联动） ================= */
RENDER.dispatch = function(){
  return head('客房智能调度（PMS 联动）', '上班 → 扫描 PMS 房态 → AI 派房 → 计件计时 → 查房 → 房态回写 ｜ 每个环节的可行性如实标注') +
  '<div class="card" style="margin-bottom:14px"><h4>🛡️ 先说实话：哪些能做、哪些看条件</h4>' +
    '<div class="list-row"><span class="tag green">✅ 现在就能做</span>AI 派房、计件计时、查房闭环、任务推送——全在我们自己平台内，不依赖任何外部授权</div>' +
    '<div class="list-row"><span class="tag green">✅ 能做（三选一）</span>读 PMS 房态：官方 API / 本地库直读 / RPA 只读采集（详见采集中心·PMS 页签）</div>' +
    '<div class="list-row"><span class="tag amber">⚠️ 视 PMS 而定</span>自动写回房态：有 API → 自动写；无 API → 前台收到企微提醒、在 PMS 一键确认（多一步人工，但绝不出错）。<b>我们不做 RPA 自动改房态，不虚假承诺</b></div></div>' +
  '<div class="grid g4">' +
    '<div class="card kpi"><div class="lab">今晨 08:00 扫描 · 脏房</div><div class="val">18 间</div><div class="cmp">来源：PMS 房态快照</div></div>' +
    '<div class="card kpi"><div class="lab">今日预抵</div><div class="val">12 间</div><div class="cmp dn">含提前入住 2 间（优先）</div></div>' +
    '<div class="card kpi"><div class="lab">在住续住</div><div class="val">45 间</div><div class="cmp">按客人勿扰时段排后</div></div>' +
    '<div class="card kpi"><div class="lab">今日出勤</div><div class="val">4 人</div><div class="cmp">客房班组（1 人休）</div></div></div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>🧠 AI 派房结果（规则：预抵优先 → 楼层就近 → 计件均衡）</h4>' +
      '<table class="tb"><tr><th>员工</th><th>分配房间</th><th>间数</th><th>预计</th><th>优先单</th></tr>' +
      '<tr><td>刘姐</td><td>302 305 306 308 311</td><td>5</td><td>3.5h</td><td><span class="tag red">302（14:00 提前住）</span></td></tr>' +
      '<tr><td>王姐</td><td>402 403 405 406</td><td>4</td><td>3.0h</td><td>—</td></tr>' +
      '<tr><td>陈姐</td><td>501 502 505 508</td><td>4+机动</td><td>3.2h</td><td><span class="tag amber">505 预抵</span></td></tr>' +
      '<tr><td>小周</td><td>601 602 605 + 布草间</td><td>3</td><td>2.8h</td><td>—</td></tr></table>' +
      '<div style="margin-top:10px"><button class="btn sm pri" onclick="toast(\'✅ 派房单已推送 4 人企微，各自任务单已更新\',\'ok\')">一键派发</button> ' +
      '<button class="btn sm lite" onclick="toast(\'已按新出勤重算：王姐临时请假 → 13 间自动重分给 3 人（演示）\')">模拟：有人临时请假</button></div></div>' +
    '<div class="card"><h4>⏱️ 计件计时（实时·自动记，喂智能工资条）</h4>' +
      '<div class="list-row"><span class="tag blue">进行中</span>刘姐 · 302 · 已用 23 分钟（班组均值 28 分钟）</div>' +
      '<div class="list-row"><span class="tag green">已完成</span>刘姐 3 间 ｜ 王姐 2 间 ｜ 陈姐 2 间 ｜ 小周 1 间</div>' +
      '<div class="list-row"><span class="tag purple">今日计件</span>全组 ¥168（单间 ¥6 + 优先单加成）· 实时可查</div>' +
      '<div class="hint">员工在企微任务卡上点「开始/完成」即计时计件——数据直接进 SQLite，月底喂「智能工资条」（见人事驾驶舱），一分不差、一句不吵。</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🔁 房态回写（分级承诺）</h4>' +
    '<div class="flow"><div class="node"><b>阿姨完成</b>任务卡点完成<br>自动停表</div><div class="link"></div>' +
    '<div class="node"><b>领班查房</b>拍照 + AI 质检<br>（质量闸门保留）</div><div class="link"></div>' +
    '<div class="node"><b>有 API 的 PMS</b>自动写回「净房」<br><span style="color:var(--green)">✅ 全自动</span></div></div>' +
    '<div class="flow" style="margin-top:0"><div class="node" style="visibility:hidden"></div><div class="node" style="visibility:hidden"></div>' +
    '<div class="node"><b>无 API 的 PMS</b>前台收企微提醒<br>PMS 里一键改 <span style="color:var(--amber)">⚠️ 人工一步</span></div></div>' +
    '<div class="hint">为什么保留查房环节：全自动跳过查房＝卫生风险回潮。系统提效的是「派房/记录/提醒/算账」，质量闸门永远留给人。</div></div>';
};

/* ================= AI 数字员工 ================= */
RENDER.aiops = function(){
  return head('AI 数字员工 · 每日在岗', 'AI 不是开发完就退场的工具——它是 7×24 常驻员工：自动获取数据 → 分析 → 给经营建议，人只做拍板') +
  '<div class="grid g4">' +
    '<div class="card kpi"><div class="lab">今日 AI 完成动作</div><div class="val">142 次</div><div class="cmp">采集/质检/接待/分发</div></div>' +
    '<div class="card kpi"><div class="lab">生成经营建议</div><div class="val">9 条</div><div class="cmp up">人已批 4 · 待拍板 3 · 驳回 2</div></div>' +
    '<div class="card kpi"><div class="lab">拦截风险</div><div class="val">2 次</div><div class="cmp">红线转人工 / 缺数拦截</div></div>' +
    '<div class="card kpi"><div class="lab">折算节省人工</div><div class="val">≈5.5 h</div><div class="cmp">按动作耗时估算·演示口径</div></div></div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>📅 每天干的（一个不休的班表）</h4>' +
      [['06:30','采集 OTA + PMS 夜审数据入库，自动生成 daily_kpi'],['07:30','推送老板经营卡 / 店长任务卡（缺数明示，绝不拿旧数充）'],['08:00','扫描房态 → AI 派房 → 任务到人'],['全天','客服接待 / 照片质检打分 / 群聊捞任务客诉 / 仪容核查'],['15:00','竞对价快照 + 比价分析，异常即时预警'],['22:00','核对日报完整性，漏项提醒店长']].map(r =>
        '<div class="list-row"><b style="width:52px;color:var(--blue)">' + r[0] + '</b>' + r[1] + '</div>').join('') + '</div>' +
    '<div class="card"><h4>📆 每周 / 每月干的</h4>' +
      '<div class="list-row"><span class="tag blue">每周五</span>客服未命中提炼 FAQ ｜ 黄金问题集回归测试 ｜ 知识库体检（过期/断链）｜ 质检周报（每人一次通过率）｜ 广告 ROI 周检</div>' +
      '<div class="list-row"><span class="tag purple">每月 1 日</span><b>智能工资条草稿</b>：计件（调度自动记）+ 工时（排班考勤）+ 提成（升房/直订挂人）自动汇总 → 人事初核 → 老板批 → 企微发到个人</div>' +
      '<div class="list-row"><span class="tag green">每月 5 日</span>经营月复盘初稿（RevPAR 归因：价格/出租率/渠道结构各贡献多少）｜ 竞对格局月报</div>' +
      '<div class="hint">薪酬体系调整也有 AI 参与：改计件单价/提成比例前，AI 用近 3 个月真实数据先算一遍"每个人到手会怎么变"，老板看完影响面再拍板。</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🔄 三大优化闭环（AI 常驻的意义：数据 → 分析 → 建议 → 效果回流）</h4>' +
    '<div class="grid g3">' +
    '<div class="decide"><div class="t">OTA 优化闭环</div><div class="d">采集 eBooking 数据 → 诊断（漏斗/信息分/点评）→ 生成待办 → 执行后转化数据回流验证 → 下一轮诊断</div></div>' +
    '<div class="decide"><div class="t">收益优化闭环</div><div class="d">热度/竞对/OTB → 预测与调价建议 → 老板拍板 →（RMS）执行 → RevPAR 回写对比"听了 vs 没听"的差距</div></div>' +
    '<div class="decide"><div class="t">服务优化闭环</div><div class="d">照片质检 + 点评根因 + 客服记录 → 找到重复问题 → 更新 SOP（走 review）→ 培训考核 → 差评率验证</div></div></div>' +
    '<div class="hint"><b>AI 的边界同样写死：</b>分析和建议到 candidate 为止——升 active、改价、对外发布、发工资，永远人拍板。这不是能力不够，是治理设计。</div></div>';
};

/* ================= 知识加工流水线 ================= */
let PIPE = null;
RENDER.pipeline = function(){
  if(!PIPE) PIPE = JSON.parse(JSON.stringify(PIPE_INIT));
  return head('知识加工流水线（筛选 → 分级 → 存储 → 演化）', '状态机：raw → candidate → human_review → active ｜ AI 只能推进到 candidate，升 active 必须人拍板') +
  '<div class="statebar"><span class="st">raw 原料</span><span class="arrow">→</span><span class="st">candidate AI 提炼</span><span class="arrow">→</span><span class="st">human_review 人审</span><span class="arrow">→</span><span class="st hot">active 生效</span><span class="arrow">→</span><span class="st">stale/archived 沉冷库</span></div>' +
  '<div style="margin-bottom:12px"><button class="btn pri" onclick="aiRefine()">▶ ① AI 提炼（raw → candidate）</button> ' +
  '<button class="btn lite" onclick="toReview()">② 提交人审</button> ' +
  '<button class="btn ok" onclick="humanPass()">③ 人工通过（升 active）</button></div>' +
  '<div class="pipe-board">' + pipeCol('raw', '02_采集缓冲区 raw') + pipeCol('cand', 'AI 提炼 candidate') + pipeCol('rev', 'review/ 待人审') + pipeCol('act', 'active 已生效') + '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>🗄️ 双底座存储</h4>' +
      '<div class="list-row">📝 Obsidian 母版（文字：SOP/话术/FAQ/复盘）<span class="sp"></span><b id="cnt-ob">' + STORE_CNT.obsidian + '</b> 条 active</div>' +
      '<div class="list-row">🧮 SQLite（数字：8 张表，客史/KPI/价格快照）<span class="sp"></span><b id="cnt-sq">' + STORE_CNT.sqlite.toLocaleString() + '</b> 行</div>' +
      '<div class="hint">文字进知识库、数字进数据库；客史手机号只进库、绝不进知识库和对客模型（合规红线）。</div></div>' +
    '<div class="card"><h4>♻️ 演化机制</h4>' +
      '<div class="list-row">事实变了 → 旧条目 archived + superseded_by → 新条目 active（不覆盖、留痕迹）</div>' +
      '<div class="list-row">每周五管家体检：过期检查、断链检查、黄金问题集回归</div>' +
      '<div class="list-row">客服未命中 → 自动回流成新 FAQ → 知识库越用越聪明</div></div>' +
  '</div>';
};
function pipeCol(key, title){
  return '<div class="pipe-col"><h5>' + title + '<span>' + PIPE[key].length + '</span></h5>' +
    PIPE[key].map(c => '<div class="pcard ' + c.s + '">' + c.t + '<div class="meta">' + c.meta + '</div></div>').join('') + '</div>';
}
function repaintPipe(){ show('pipeline'); }
function aiRefine(){
  if(!PIPE.raw.length){ toast('raw 区已空——去采集中心再喂点原料'); return; }
  const c = PIPE.raw.shift();
  c.s = 'cand'; c.t = 'AI 提炼：' + c.t.replace(/^.*?：/, '');
  c.meta = 'AI 已打标：板块 / 敏感级 / source_ref 建议 · 刚刚';
  PIPE.cand.push(c); repaintPipe();
  toast('🤖 AI 提炼完成 → candidate（含自动脱敏检查）');
}
function toReview(){
  if(!PIPE.cand.length){ toast('没有 candidate 可提交'); return; }
  const c = PIPE.cand.shift(); c.s = 'rev'; c.meta = '等老板/店长在 review/ 勾选';
  PIPE.rev.push(c); repaintPipe(); toast('已进入 review/ 等人拍板');
}
function humanPass(){
  if(!PIPE.rev.length){ toast('review/ 区为空'); return; }
  const c = PIPE.rev.shift(); c.s = 'act'; c.meta = 'active · 下次导出将进入对客/驾驶舱出口';
  PIPE.act.push(c); STORE_CNT.obsidian++; repaintPipe();
  toast('✅ 已升 active 并写 audit_log —— 现在它才是「酒店事实」', 'ok');
}

/* ================= OTA 运营中心 ================= */
const OTA_TABS = [ ['ov','📊 经营总览'], ['fu','🔻 流量漏斗'], ['od','📦 订单雷达'], ['rv','⭐ 点评管理'], ['cp','🥊 竞争圈'], ['mk','📅 市场分析'], ['info','🖼️ 信息维护'], ['ad','💰 付费推广'], ['ct','🎬 内容工厂'] ];
let otaTab = 'ov';
RENDER.ota = function(){
  return head('OTA 运营中心', '数据每日 06:30 从携程 eBooking / 美团自动采集入库（订单·点评·竞争圈·市场热度·信息分），AI 出建议，人做决定') +
  '<div class="tabs">' + OTA_TABS.map(t => '<button class="tab' + (otaTab === t[0] ? ' on' : '') + '" onclick="setOtaTab(\'' + t[0] + '\')">' + t[1] + '</button>').join('') + '</div>' +
  '<div id="ota-body">' + otaBody() + '</div>';
};
function setOtaTab(t){ otaTab = t; show('ota'); }
function otaBody(){
  if(otaTab === 'ov') return otaOv();
  if(otaTab === 'fu') return otaFu();
  if(otaTab === 'od') return otaOd();
  if(otaTab === 'rv') return otaRv();
  if(otaTab === 'cp') return otaCp();
  if(otaTab === 'mk') return otaMk();
  if(otaTab === 'info') return otaInfo();
  if(otaTab === 'ad') return otaAd();
  return otaCt();
}
function otaOv(){
  return '<div class="grid g2" style="margin-bottom:14px">' +
    '<div class="card" style="border-top:3px solid var(--green)"><h4>🩺 收益体检 · OTA 运营分</h4>' +
      '<div style="font-size:36px;font-weight:800;color:var(--green)">82<span style="font-size:14px;color:var(--ink2)"> /100</span></div>' +
      '<div class="hint" style="margin-top:8px">信息分 92 ✓ ｜ 5 分钟回复率 96% ✓ ｜ 点评分圈内第 1 ✓ ｜ 待办：首图 A/B、亲子房补图（见各页签）</div></div>' +
    '<div class="card" style="border-top:3px solid var(--red)"><h4>🩺 收益体检 · 定价能力分</h4>' +
      '<div style="font-size:36px;font-weight:800;color:var(--red)">45<span style="font-size:14px;color:var(--ink2)"> /100</span></div>' +
      '<div class="hint" style="margin-top:8px">无动态定价 ✗ ｜ 演唱会日未调价 ✗ ｜ 高分低价、溢价未兑现 ✗ —— 流量端 82 分、定价端 45 分：<b>钱正漏在定价上</b></div>' +
      '<button class="btn sm" style="margin-top:8px;background:var(--purple);color:#fff" onclick="show(\'rms\')">💹 看「酒店 AI 收益管理系统」怎么补上这 55 分</button></div>' +
  '</div><div class="grid g4">' +
    '<div class="card kpi"><div class="lab">酒店点评分</div><div class="val">' + OTA.score + '</div><div class="cmp up">竞争圈第 2 / 19</div></div>' +
    '<div class="card kpi"><div class="lab">5 分钟回复率</div><div class="val">' + OTA.reply5min + '</div><div class="cmp">AI 客服接管后 100% 可期</div></div>' +
    '<div class="card kpi"><div class="lab">信息分</div><div class="val">' + OTA.infoScore + '%</div><div class="cmp dn">3 项待办（见信息维护）</div></div>' +
    '<div class="card kpi"><div class="lab">曝光转化率</div><div class="val">3.2%</div><div class="cmp dn">竞争圈均值 4.1% ⚠️</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🧠 AI 周度诊断（自动生成 → 店长确认后执行）</h4>' +
    '<div class="list-row"><span class="tag red">P0</span>曝光转化低于圈均 22%：首图仍是外观图，建议换「零压床品特写」并 A/B 测 7 天<span class="sp"></span><button class="btn sm lite" onclick="setOtaTab(\'info\')">去处理</button></div>' +
    '<div class="list-row"><span class="tag amber">P1</span>周六演唱会日房价未动，竞争圈 5 家已上调 → 见调价建议<span class="sp"></span><button class="btn sm lite" onclick="setOtaTab(\'mk\')">去查看</button></div>' +
    '<div class="list-row"><span class="tag amber">P1</span>亲子房型点击率圈内第 1，但图片仅 2 张：补图可放大优势<span class="sp"></span><button class="btn sm lite" onclick="setOtaTab(\'info\')">去处理</button></div>' +
    '<div class="hint">对应线下课「AI OTA 优化体系」：总结数据中心数据 → 给出经营优化建议 → 落到可执行待办。</div></div>';
}
function reviewCard(r, prefix){
  return '<div class="decide"><div class="t">' + (r.bad ? '<span class="tag red">差评 ' + r.score + '</span>' : '<span class="tag green">好评 ' + r.score + '</span>') +
    ' ' + r.user + ' · ' + r.room + ' · ' + r.date + '</div><div class="d">' + r.text + '</div>' +
    (r.bad ? '<button class="btn sm pri" onclick="genReply(\'' + prefix + '\')">🤖 AI 生成回复草稿</button><div id="' + prefix + '-reply"></div>' :
      '<button class="btn sm lite" onclick="toast(\'好评感谢模板已发布（演示）\',\'ok\')">一键感谢</button>') + '</div>';
}
function genReply(prefix){
  const box = document.getElementById(prefix + '-reply');
  box.innerHTML = '<div class="trans-box" id="' + prefix + '-txt" style="margin-top:8px">生成中…</div>';
  setTimeout(() => {
    typeText(prefix + '-txt', OTA.aiReply, () => {
      box.innerHTML += '<div style="margin-top:8px"><span class="tag purple">道歉三段式：共情→补救→下一步</span> <span class="tag green">整改已联动：地毯工单+空调工单</span></div>' +
        '<div style="margin-top:8px"><button class="btn sm ok" onclick="toast(\'已提交店长审核 → 老板拍板后发布（公开回复=对外动作，人拍板）\',\'ok\')">提交审核</button> ' +
        '<button class="btn sm" style="border:1px solid var(--line)" onclick="toast(\'已重新生成（演示）\')">换一版</button></div>';
    });
  }, 300);
}
function otaRv(){
  return '<div class="grid g2"><div class="card"><h4>⭐ 点评概况 <span class="more">携程 4.7 · 待回复 1 · 差评 31/1811</span></h4>' +
    OTA.dims.map(d => '<div class="list-row">' + d[0] + '<span class="sp"></span><b>' + d[1] + '</b><div style="width:120px;height:6px;background:var(--line);border-radius:3px;margin-left:8px"><div style="width:' + (d[1] / 5 * 100) + '%;height:100%;background:var(--blue);border-radius:3px"></div></div></div>').join('') +
    '<div class="hint">正面高频词：设施齐全 / 安静舒适 / 前台热情 ｜ 负面高频词：房间一般 ×6 —— 高频词自动进知识库「问题清单」。</div></div>' +
    '<div class="card"><h4>📝 待回复（1）</h4>' + reviewCard(OTA.reviews[0], 'ota') + reviewCard(OTA.reviews[1], 'ota2') + '</div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🔬 差评根因闭环（点评分析 → 整改工单 → 回复标注「已整改」）</h4>' +
    '<table class="tb"><tr><th>根因（近 90 天聚类）</th><th>条数</th><th>整改动作</th><th>状态</th></tr>' +
    '<tr><td>地毯/走廊异味</td><td>2</td><td>3F 深洗除味工单（客房+工程）</td><td><span class="tag amber">处理中 · 周五前</span></td></tr>' +
    '<tr><td>空调噪音</td><td>3</td><td>工程检修 + 滤网季度清洗计划</td><td><span class="tag green">已完成 · 回复已标注</span></td></tr>' +
    '<tr><td>房间偏小（20㎡ 房型）</td><td>6</td><td>详情页真实标注面积 + 前台引导升大房型</td><td><span class="tag blue">长期策略</span></td></tr></table>' +
    '<div class="hint">四维 90 天走势：卫生 4.6→4.8 ↑ ｜ 服务 4.6→4.7 ↑ ｜ 设施 4.6 持平 ｜ 环境 4.7 持平。规矩：<b>每条差评必须指向一张可关闭的工单</b>——否则回复只是道歉，不是经营。</div></div>';
}
function otaCp(){
  return '<div class="card"><h4>🥊 竞争圈动态（19 家 · 每日 15:00 快照进 competitor_price 表）</h4>' +
    '<table class="tb"><tr><th>酒店</th><th>今日挂牌</th><th>出租率(估)</th><th>调价动作</th><th>点评分</th></tr>' +
    OTA.comp.map(c => '<tr' + (c.me ? ' style="background:var(--blue-l);font-weight:700"' : '') + '><td>' + c.name + '</td><td>¥' + c.price + '</td><td>' + c.occ + '</td><td>' + c.act + '</td><td>' + c.score + '</td></tr>').join('') +
    '</table><div class="decide" style="margin-top:12px"><div class="t">🧠 AI 解读</div>' +
    '<div class="d">A、B 两家已为周六演唱会提价且出租率仍高于本店 → 需求真实存在；本店点评分圈内最高（4.7），有溢价资格却在低卖。建议不跟低价 D 店——它评分 4.2 与我们不是一个客群。</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🎯 价格带定位（评分 × 价格 象限）</h4>' +
    '<div class="grid g2"><div>' +
      '<div class="list-row">点评分 <b>4.7</b><span class="sp"></span><span class="tag green">圈内第 1</span></div>' +
      '<div class="list-row">挂牌价 <b>¥286</b><span class="sp"></span><span class="tag red">圈内仅第 4</span></div>' +
      '<div class="list-row">判定<span class="sp"></span><b style="color:var(--red)">高分低价区 —— 溢价资格未兑现</b></div></div>' +
    '<div class="decide"><div class="t">💸 按圈内「评分-价格」关系回归，本店合理价带 ¥305–325</div>' +
      '<div class="d">现价 ¥286 = 每间夜让利约 ¥20–40；按月 2,100 间夜估算，一个月漏掉 ¥4–8 万。什么时候收、收多少、哪个房型先收——这是收益系统每天早上算好的事。</div>' +
      '<button class="btn sm" style="background:var(--purple);color:#fff" onclick="show(\'rms\')">💹 让 RMS 把该收的收回来</button></div></div></div>';
}
function otaMk(){
  return '<div class="card"><h4>📅 未来 8 天市场热度 × 商圈事件（热度=携程市场分析 · 事件=活动雷达自动采集）</h4>' +
    '<table class="tb"><tr><th>日期</th><th>热度</th><th>事件</th><th>竞争圈调价</th></tr>' +
    OTA.market.map(m => '<tr><td>' + m.d + '</td><td>' + heatTag(m.heat) + ' ' + m.v + '</td><td>' + (m.ev || '—') + '</td><td>' + (m.heat === '热' ? '<span class="dn">5 家已涨 8–15%</span>' : '平稳') + '</td></tr>').join('') + '</table>' +
    '<div class="decide" style="margin-top:12px"><div class="t">💡 ' + OTA.advice.t + '</div><div class="d">' + OTA.advice.d + '</div>' +
    '<button class="btn sm pri" onclick="toast(\'建议单已推送老板企微待拍板（演示）\',\'ok\')">生成建议单 → 老板拍板</button> ' +
    '<button class="btn sm lite" onclick="show(\'rms\')">💹 在收益系统中打开</button></div>' +
    '<div class="hint">天气雷达补充：周六小雨 → 散场打车难 → 前台准备「接驾指引」话术，好评素材+1。</div></div>' +
  '<div class="card" style="margin-top:14px"><h4>📰 行业动态（AI 每日定时采集 · 只推「与本店有关」的）</h4>' +
    '<div class="list-row"><span class="tag red">竞争预警</span>某连锁品牌签约本商圈新店（约 3km · 120 间 · 预计 Q4 开业）<span class="sp"></span><span class="src">已推老板企微</span></div>' +
    '<div class="list-row"><span class="tag blue">需求信号</span>本市 7 月演出季日历发布：未来 60 天 12 场大型演出<span class="sp"></span><span class="src">已并入活动雷达</span></div>' +
    '<div class="list-row"><span class="tag green">机会</span>OTA 平台报告：暑期亲子游预订同比 +18% —— 本店亲子房点击率圈内第 1，建议加推<span class="sp"></span><span class="src">→ 内容工厂</span></div>' +
    '<div class="hint">采集范围：OTA 官方公告、酒店业媒体、本地文旅公告。AI 先过滤「与本店无关」的行业噪音，老板只看命中项。</div></div>';
}
function otaInfo(){
  return '<div class="grid g2"><div class="card"><h4>🖼️ 信息分 ' + OTA.infoScore + '%（满分能换曝光）</h4>' +
    '<div style="height:10px;background:var(--line);border-radius:5px"><div style="width:' + OTA.infoScore + '%;height:100%;background:var(--blue);border-radius:5px"></div></div>' +
    '<div style="margin-top:12px">' + OTA.infoTodos.map(t => '<div class="list-row">📌 ' + t + '<span class="sp"></span><button class="btn sm lite" onclick="toast(\'已生成待办并指派（演示）\')">生成待办</button></div>').join('') + '</div></div>' +
    '<div class="card"><h4>🏷️ 房型标题 AI 优化</h4>' +
    '<div class="trans-box">现：零压大床房\n优化建议：零压大床房【梦百合记忆棉+95%白鹅绒被+免费延迟退房】\n理由：竞争圈点击率 TOP3 标题都带「床品资产+权益」双钩子</div>' +
    '<div style="margin-top:10px"><button class="btn sm pri" onclick="toast(\'新标题已生成 → eBooking 信息维护人工提交（平台后台仍人操作，AI 只备好料）\',\'ok\')">采用此标题</button></div>' +
    '<div class="hint">红线：平台后台的实际修改始终人工操作，AI 不碰真实后台。</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🖼️ 图片覆盖度体检（对照 eBooking 图片分类逐格检查）</h4>' +
    '<table class="tb"><tr><th>分类</th><th>现有</th><th>建议</th><th>判定</th></tr>' +
    '<tr><td>外观</td><td>4</td><td>≥4</td><td><span class="tag green">达标</span></td></tr>' +
    '<tr><td>房型</td><td>76</td><td>每房型 ≥8</td><td><span class="tag green">达标</span></td></tr>' +
    '<tr><td>公共区域</td><td>27</td><td>≥10</td><td><span class="tag green">达标</span></td></tr>' +
    '<tr><td>餐饮（早餐）</td><td>2</td><td>≥4</td><td><span class="tag amber">补 2 张</span></td></tr>' +
    '<tr><td>周边</td><td>5</td><td>≥5</td><td><span class="tag green">达标</span></td></tr>' +
    '<tr><td><b>家庭/亲子</b></td><td><b>0</b></td><td>≥6</td><td><span class="tag red">严重缺口</span></td></tr></table>' +
    '<div class="decide" style="margin-top:10px"><div class="t">🧠 AI 判断</div><div class="d">亲子房是全店点击率第 1 的房型，却一张实拍图都没有——客人点进来看不到「防撞条/小帐篷/投影」就走了。这是最便宜的转化修复：拍 6 张图，当天见效。</div>' +
    '<button class="btn sm pri" onclick="toast(\'拍摄清单已生成并指派客房+店长（含构图建议 6 条）\',\'ok\')">生成拍摄清单</button></div>' +
    '<div class="hint">首图 A/B 测试：现首图=外观（CTR 3.2%）vs 测试组=零压床品特写（第 3 天 CTR 4.4%）——再跑 4 天出结论。</div></div>';
}
function otaFu(){
  const steps = [
    ['① 曝光（列表页展示）', '12,400 次', '圈均 9,800', 100, 'green', '排名 + 信息分撑起的底盘 ✓'],
    ['② 详情页浏览', '398 · 转化 3.2%', '圈均 4.1% ⚠️', 42, 'red', '首图不抓人 + 展示起价缺竞争力 —— 两大流失原因'],
    ['③ 提交订单', '46 · 转化 11.6%', '圈均 10.9%', 18, 'green', '房型描述/政策/评分承接良好 ✓'],
    ['④ 成交', '38 · 成交率 82.6%', '圈均 88% ⚠️', 15, 'red', '高峰时段确认超时 + 热门房型价格未随需求走']
  ];
  return '<div class="card"><h4>🔻 流量四级漏斗（昨日 · 携程 ｜ 曝光→浏览→下单→成交）</h4>' +
    steps.map(s => '<div class="list-row"><b style="width:170px;flex-shrink:0">' + s[0] + '</b>' +
      '<div style="flex:1"><div style="height:12px;background:var(--line);border-radius:6px"><div style="width:' + s[3] + '%;height:100%;border-radius:6px;background:' + (s[4] === 'red' ? 'var(--red)' : 'var(--green)') + '"></div></div>' +
      '<div style="font-size:11.5px;color:var(--ink2);margin-top:3px">' + s[5] + '</div></div>' +
      '<div style="width:150px;text-align:right;flex-shrink:0"><b>' + s[1] + '</b><br><span style="font-size:11px;color:var(--ink2)">' + s[2] + '</span></div></div>').join('') + '</div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>🔧 修复 ②：浏览转化（本平台管）</h4>' +
      '<div class="list-row">首图 A/B：外观 → 零压床品特写（测试中）<span class="sp"></span><span class="tag amber">Day 3/7</span></div>' +
      '<div class="list-row">一句话推荐词 90 天未更新 → AI 已生成 3 版<span class="sp"></span><button class="btn sm lite" onclick="toast(\'3 版推荐词已生成待选（演示）\')">查看</button></div>' +
      '<div class="list-row">亲子房补图 6 张（点击率第 1 却零实拍）<span class="sp"></span><span class="tag red">最优先</span></div></div>' +
    '<div class="card" style="border:1.5px solid var(--purple)"><h4>💹 修复 ②④ 的另一半：价格（RMS 管）</h4>' +
      '<div class="hint" style="margin-top:0">漏斗两处出血点（浏览流失、成交流失）都压着同一个词：<b>价格竞争力</b>。展示起价该挂多少、热门日该涨多少、尾房该不该放——OTA 中心回答「流量为什么没接住」，收益系统回答「每天该卖多少钱」。</div>' +
      '<div style="margin-top:10px"><b style="color:var(--purple)">打包用的好处：</b>RMS 改价后，转化数据回流本漏斗自动验证效果——调价不再凭感觉，闭环看结果。</div>' +
      '<button class="btn sm" style="margin-top:10px;background:var(--purple);color:#fff" onclick="show(\'rms\')">💹 了解收益系统 + 打包权益</button></div></div>';
}
function otaOd(){
  return '<div class="grid g4">' +
    '<div class="card kpi"><div class="lab">今日新订</div><div class="val">12 单</div><div class="cmp up">演唱会前夜 +40%</div></div>' +
    '<div class="card kpi"><div class="lab">未处理订单</div><div class="val">0</div><div class="cmp">已开自动接单（5 分钟内确认）</div></div>' +
    '<div class="card kpi"><div class="lab">近 7 天取消率</div><div class="val">8.2%</div><div class="cmp dn">圈均 6.5% ⚠️</div></div>' +
    '<div class="card kpi"><div class="lab">连住率</div><div class="val">31%</div><div class="cmp">连住 ≥2 晚订单占比</div></div></div>' +
  '<div class="grid g2" style="margin-top:14px">' +
    '<div class="card"><h4>🔍 取消原因分析（近 30 天 · AI 聚类）</h4>' +
      '<table class="tb"><tr><th>原因</th><th>占比</th><th>动作</th></tr>' +
      '<tr><td>行程变化</td><td>41%</td><td>—（不可控）</td></tr>' +
      '<tr><td><b>找到更低价（本店或竞对）</b></td><td><b style="color:var(--red)">23%</b></td><td>价格竞争力问题 → 收益系统</td></tr>' +
      '<tr><td>房型/政策与预期不符</td><td>14%</td><td>详情页政策口径已修订（07-01）</td></tr>' +
      '<tr><td>未说明</td><td>22%</td><td>取消挽留话术已上线客服</td></tr></table>' +
      '<div class="decide" style="margin-top:10px"><div class="t">💸 23% 因价格取消 ≈ 每月流失约 ¥6,800</div>' +
      '<div class="d">这些客人不是不想住，是在比价窗口里被截走——动态定价的意义就是别在比价窗口里裸奔。</div>' +
      '<button class="btn sm" style="background:var(--purple);color:#fff" onclick="show(\'rms\')">💹 看 RMS 怎么守住比价窗口</button></div></div>' +
    '<div class="card"><h4>📋 平台任务与合规（对应 eBooking 通知）</h4>' +
      '<div class="list-row"><span class="tag green">已完成</span>PSI 端午保留房任务</div>' +
      '<div class="list-row"><span class="tag green">已完成</span>PSI 五一保留房任务</div>' +
      '<div class="list-row"><span class="tag amber">进行中</span>踏青季保留房任务（07-15 截止）<span class="sp"></span><button class="btn sm lite" onclick="toast(\'已生成待办给店长（演示）\')">生成待办</button></div>' +
      '<div class="list-row"><span class="tag gray">监控中</span>违约看板 0 条 ｜ 住店审核 0 条待处理</div>' +
      '<div class="hint">平台任务错过=掉权重。AI 盯着 eBooking 通知栏，到期前 3 天自动生成待办。</div></div></div>';
}
function otaAd(){
  return '<div class="grid g4">' +
    '<div class="card kpi"><div class="lab">本月广告花费</div><div class="val">¥1,860</div><div class="cmp">广告营销 + 生意通</div></div>' +
    '<div class="card kpi"><div class="lab">广告带单</div><div class="val">26 单</div><div class="cmp">带来收入 ¥7,850</div></div>' +
    '<div class="card kpi"><div class="lab">ROI</div><div class="val">1 : 4.2</div><div class="cmp up">健康线 1:3 以上</div></div>' +
    '<div class="card kpi"><div class="lab">平均点击成本</div><div class="val">¥2.4</div><div class="cmp">圈均 ¥2.9</div></div></div>' +
  '<div class="card" style="margin-top:14px"><h4>🧠 AI 投放建议（花钱动作同样人拍板）</h4>' +
    '<div class="list-row"><span class="tag green">加</span>07-05 演唱会日预算 +50%：需求真实、转化率翻倍窗口，错过不再有<span class="sp"></span><button class="btn sm pri" onclick="toast(\'建议单已推老板拍板（演示）\',\'ok\')">提交拍板</button></div>' +
    '<div class="list-row"><span class="tag red">停</span>关键词「会议室」「钟点房」ROI 1:0.8——本店无会议室，纯浪费 ¥210/月<span class="sp"></span><button class="btn sm lite" onclick="toast(\'关停建议已提交（演示）\')">提交</button></div>' +
    '<div class="list-row"><span class="tag blue">调</span>生意通推广时段集中到 20:00–23:00（本店下单高峰，见用户行为数据）<span class="sp"></span><button class="btn sm lite" onclick="toast(\'时段方案已生成（演示）\')">查看方案</button></div>' +
    '<div class="hint">广告花费自动记入财务成本域；ROI 连续 2 周低于 1:2 自动预警——推广费是放大器，先把转化底子（图片/点评/价格）修好再加油门。</div></div>';
}
function otaCt(){
  return '<div class="card"><h4>🎬 内容工厂（小红书 / 抖音 / 朋友圈素材，围绕真实卖点）</h4>' +
    '<div class="grid g3">' + [
      ['小红书', '「演唱会散场 10 分钟到床上」— 周六看演出住哪攻略', '钩子：距体育中心 2.1km + 零压床'],
      ['抖音', '30 秒查房挑战：白手套摸完这间房', '钩子：卫生 4.8 分的底气'],
      ['朋友圈', '周六演唱会房源告急预告 + 直订权益', '钩子：稀缺 + 老客专属价']
    ].map(c => '<div class="decide"><div class="t">' + c[0] + '</div><div class="d">' + c[1] + '<br><span style="color:var(--purple)">' + c[2] + '</span></div>' +
    '<button class="btn sm lite" onclick="toast(\'完整脚本已生成到 07_驾驶舱_OUTPUTS（演示）\')">生成完整脚本</button></div>').join('') + '</div>' +
    '<div class="hint">素材全部来自知识库 active 事实（床品/距离/评分），不夸大不虚构——内容也要接地。</div></div>';
}

/* ================= 企微 AI 客服 ================= */
RENDER.kefu = function(){
  return head('企微 AI 客服（对客出口）', '客人从公众号/二维码进入微信客服，体验与微信聊天一致 ｜ 大脑=腾讯元器智能体，只吃对客导出包') +
  '<div class="kefu-wrap"><div class="phone"><div class="screen">' +
    '<div class="wx-head">' + HOTEL.name + ' 在线客服<div class="sub">由 AI 智能助手提供服务 · 随时可转人工</div></div>' +
    '<div class="wx-body" id="wx-body"><div class="sysline">对方为企业微信客服账号</div></div>' +
    '<div class="wx-foot"><div class="fake-input">和我聊聊：房型 / 政策 / 周边…</div><span style="font-size:20px">😀 ➕</span></div>' +
  '</div></div>' +
  '<div><div class="card"><h4>🎬 点击播放典型场景</h4>' +
    KEFU_SCEN.map(s => '<button class="scen-btn" onclick="playScen(\'' + s.id + '\')"><b>' + s.b + '</b><span>' + s.s + '</span></button>').join('') + '</div>' +
    '<div class="card" style="margin-top:12px"><h4>🛡️ 三道保险（系统提示词写死）</h4>' +
    '<div class="list-row">1️⃣ 只答知识库：包外一律「知识库缺这条」，绝不编造</div>' +
    '<div class="list-row">2️⃣ 价格/退改只复述原文，不改写不推算</div>' +
    '<div class="list-row">3️⃣ 红线直接转人工：赔偿 / 折扣 / 他人信息 / 医疗 / 纠纷</div>' +
    '<div class="hint">坐席侧：值班店长企微收到转接会话，白天 10 分钟 / 夜间次日 8 点前两档承诺。未命中问题每周五自动回流成新 FAQ。</div></div></div></div>';
};
async function playScen(id){
  const s = KEFU_SCEN.find(x => x.id === id);
  const body = $('#wx-body');
  body.innerHTML = '<div class="sysline">对方为企业微信客服账号</div>';
  for(const m of s.msgs){
    await sleep(500);
    if(m[0] === 'me'){
      body.insertAdjacentHTML('beforeend', '<div class="msg me"><div class="ava">🧳</div><div class="bub">' + m[1] + '</div></div>');
    } else if(m[0] === 'sys'){
      body.insertAdjacentHTML('beforeend', '<div class="sysline">' + m[1] + '</div>');
    } else if(m[0] === 'db'){
      body.insertAdjacentHTML('beforeend', '<div class="sysline" style="background:var(--green-l);color:var(--green)">🗄️ ' + m[1] + '</div>');
      toast('客史入库：客服模块直接给 L3 客户数据层供血', 'ok');
    } else {
      body.insertAdjacentHTML('beforeend', '<div class="msg" id="tp"><div class="ava">🏨</div><div class="bub"><span class="typing"><i></i><i></i><i></i></span></div></div>');
      body.scrollTop = body.scrollHeight;
      await sleep(1100);
      const tp = document.getElementById('tp');
      let extra = '';
      if(m[2] === 'REDLINE'){ extra = '<div class="redline-card">⚠️ 命中红线「超权限折扣」→ 不给结论，已转人工（audit_log 留痕）</div>'; }
      else if(m[2]){ extra = '<span class="src">📎 ' + m[2] + '</span>'; }
      tp.removeAttribute('id');
      tp.querySelector('.bub').innerHTML = m[1] + extra;
    }
    body.scrollTop = body.scrollHeight;
  }
}

/* ================= 飞书联通 ================= */
RENDER.feishu = function(){
  return head('飞书联通（报表与协同出口）', '企微管「门」（对客+员工入口），飞书管「表」（多维表格/仪表盘/审批/机器人）—— 华住华通同款分工') +
  '<div class="card"><h4>🔗 数据怎么流过去</h4>' +
    '<div class="flow"><div class="node"><b>🧮 SQLite</b>daily_kpi 等 8 表</div><div class="link"></div>' +
    '<div class="node"><b>🔌 同步脚本</b>开放平台 API<br>每日 07:00</div><div class="link"></div>' +
    '<div class="node"><b>📋 多维表格</b>经营数据表<br>按角色设行列权限</div><div class="link"></div>' +
    '<div class="node"><b>📊 仪表盘</b>50+ 图表组件<br>定时截图推群</div><div class="link"></div>' +
    '<div class="node"><b>🤖 群机器人</b>日报卡片<br>+ 到期提醒</div></div>' +
    '<div class="hint">Obsidian 知识库同理：周报/复盘导出为飞书文档共享，权限跟角色走。</div></div>' +
  '<div class="grid g3" style="margin-top:14px">' +
    '<div class="fs-card"><div class="fs-head">📊 每日经营日报 · 07-03 07:30</div><div class="fs-body"><div class="fs-kv">' +
      '<div><div class="k">入住率</div><b>78%（↑5.2%）</b></div><div><div class="k">ADR</div><b>¥286（↑3.1%）</b></div>' +
      '<div><div class="k">RevPAR</div><b>¥223（↑8.4%）</b></div><div><div class="k">直订占比</div><b>30%</b></div></div>' +
      '<div style="margin-top:8px;font-size:12px;color:var(--red)">⚠️ 异常 2：水费+35% ｜ 周六竞对已涨价</div></div>' +
      '<div class="fs-btnrow"><span class="fs-btn">查看驾驶舱</span></div>' +
      '<div style="padding:8px 14px;font-size:11px;color:var(--ink2)">机器人卡片按钮为跳转链接（飞书自定义机器人限制），点开进平台 H5</div></div>' +
    '<div class="fs-card"><div class="fs-head" style="background:linear-gradient(90deg,#18a058,#3fbf7f)">📋 多维表格 · daily_kpi</div><div class="fs-body" style="padding:0">' +
      '<table class="tb"><tr><th>日期</th><th>OCC</th><th>ADR</th><th>RevPAR</th></tr>' +
      [['07-02','78%','¥286','¥223'],['07-01','75%','¥278','¥209'],['06-30','81%','¥292','¥237'],['06-29','84%','¥301','¥253']].map(r =>
        '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table></div>' +
      '<div class="fs-btnrow"><span class="fs-btn" style="background:#18a058">打开仪表盘</span></div>' +
      '<div style="padding:8px 14px;font-size:11px;color:var(--ink2)">开高级权限：财务看全表、店长看运营列、前台不可见</div></div>' +
    '<div class="fs-card"><div class="fs-head" style="background:linear-gradient(90deg,#b76e00,#e09a2b)">🖋️ 审批 · 周六调价 +8%</div><div class="fs-body">' +
      '<div class="approve-node"><div class="st-ic">✓</div>发起：李店长（附 AI 建议单）</div>' +
      '<div class="approve-node wait"><div class="st-ic">…</div>审批：张总（待处理 · 已催办）</div>' +
      '<div class="approve-node" style="opacity:.4"><div class="st-ic">3</div>抄送：财务 陈会计</div></div>' +
      '<div class="fs-btnrow"><span class="fs-btn" style="background:#b76e00">去审批</span></div>' +
      '<div style="padding:8px 14px;font-size:11px;color:var(--ink2)">金额/幅度可设条件分支：>15% 强制加一道复核</div></div>' +
  '</div>' +
  '<div class="card" style="margin-top:14px"><h4>📈 仪表盘（示意）</h4><div class="grid g2">' +
    '<div><div style="font-size:12px;color:var(--ink2);margin-bottom:6px">RevPAR 月度趋势</div>' + svgLine(KPI30, 460, 130, '#3370ff') + '</div>' +
    '<div><div style="font-size:12px;color:var(--ink2);margin-bottom:6px">渠道结构</div><div style="display:flex;gap:16px;align-items:center">' + svgDonut(CHANNELS, 110) + donutLegend(CHANNELS) + '</div></div>' +
  '</div><div class="hint">仪表盘支持定时自动以图片推送到「经营群」——老板不打开任何系统也能被数据找到。</div></div>';
};

/* ================= 平台总架构 ================= */
RENDER.arch = function(){
  const stages = [
    ['📥 入口层', ['录音 / 日报 / 交接班', '查房报修 / SOP 文件', 'OTA·竞对·活动·天气 自动采集', '企微客服会话回流'], '七类采集入口，人工的嵌在岗位工作台，机器的定时跑'],
    ['🗃️ 缓冲区 raw', ['02_采集缓冲区', '原文不动 · 不可引用', '个人信息先脱敏'], '一切素材先进缓冲区，raw 永远不能直接当事实'],
    ['🤖 AI 加工', ['提炼 / 分类 / 打标', '板块 + 敏感级 + source_ref', '推进到 candidate 为止'], 'AI 只能提建议，没有定稿权'],
    ['🖋️ 人审闸门', ['review/ 勾选升 active', '六类高影响动作老板拍板', 'audit_log 全留痕'], '人是唯一的事实认定者'],
    ['🗄️ 双底座存储', ['Obsidian：文字知识（active）', 'SQLite：8 表数字（客史/KPI/价格）', '每日备份 · 境内存放'], '文字进知识库，数字进数据库'],
    ['🛂 权限矩阵', ['角色 × 数据域', '出口只吃视图契约', '白名单逐条可对账'], '同一份事实，不同角色看到不同切面'],
    ['🚀 出口层', ['六个岗位驾驶舱', '企微 AI 客服（对客）', '飞书报表 / 日报卡片推送'], '入口是员工的手，出口是每个人的驾驶舱']
  ];
  let html = head('平台总架构：从入口到驾驶舱', '对标：万豪 MGS / 希尔顿 The Lobby / 洲际 Merlin / 华住华通 ——「一个门户、一次登录、角色决定入口」，缩到 108 间房刚好合身') +
    '<div class="arch-stage">';
  stages.forEach((s, i) => {
    html += '<button class="arch-box" onclick="archInfo(' + i + ')"><h5>' + s[0] + '</h5><ul>' + s[1].map(x => '<li>· ' + x + '</li>').join('') + '</ul></button>';
    if(i < stages.length - 1) html += '<div class="arch-arrow">➜</div>';
  });
  html += '</div>' +
    '<div class="card"><h4>🏛️ 五根柱子（V1 骨架）</h4><div class="pillar">' +
    '<div class="p"><b>身份入口</b>：企业微信（可见范围=谁看见哪个入口）</div>' +
    '<div class="p"><b>数字底座</b>：SQLite 8 表（多店平移 PostgreSQL）</div>' +
    '<div class="p"><b>文字底座</b>：Obsidian 母版（status:active 才算事实）</div>' +
    '<div class="p"><b>对客出口</b>：微信客服 + 元器（只吃导出包）</div>' +
    '<div class="p"><b>对内出口</b>：驾驶舱 + 日报卡片 + 飞书报表</div></div>' +
    '<div style="margin-top:12px"><button class="btn lite" onclick="showMatrix()">查看权限矩阵（平台宪法）</button></div></div>';
  window._archStages = stages;
  return html;
};
function archInfo(i){
  const s = window._archStages[i];
  openModal('<h3>' + s[0] + '</h3><div class="hint" style="margin-top:0">' + s[2] + '</div>' +
    '<ul style="margin:12px 0 0 18px;line-height:2">' + s[1].map(x => '<li>' + x + '</li>').join('') + '</ul>');
}
function showMatrix(){
  const rows = [
    ['经营 KPI（OCC/ADR/RevPAR）','✅','✅','❌','❌','❌'],
    ['成本 · 毛利 · 工资','✅','❌','❌','❌','❌'],
    ['竞对价格与调价建议','✅','👁','❌','❌','❌'],
    ['客史 guest_master','✅','✅','🔸当日客','🔸偏好项','❌'],
    ['点评与口碑','✅','✅','👁','🔸整改项','❌'],
    ['SOP / 培训 / 话术','✅','✅','👁本岗','👁本岗','❌'],
    ['对客事实（房型/政策/周边）','✅','✅','👁','👁','👁导出包'],
    ['任务与工单','👁','✅','✅本岗','✅本岗','❌'],
    ['红线与老板意志','✅','👁','🔸','🔸','❌'],
    ['人事档案 · 工资明细','✅','🔸排班考勤','❌','❌','❌'],
    ['调价建议与 RMS 审批台','✅','👁','❌','❌','❌'],
    ['PMS 房态与客房调度','👁','✅','🔸改态确认','🔸本人任务','❌'],
    ['照片库（质检/仪容/巡检）','✅','✅','🔸本岗','🔸本人相关','❌'],
    ['审计日志 review/','✅','🔸自己的','❌','❌','❌']
  ];
  openModal('<h3>权限矩阵 · 五档角色（平台宪法，2026-07-03 拍板）</h3>' +
    '<table class="tb"><tr><th>数据域</th><th>老板</th><th>店长</th><th>前台</th><th>客房</th><th>客人</th></tr>' +
    rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>' +
    '<div class="hint">✅ 可看可改 ｜ 👁 只读 ｜ 🔸 部分可见 ｜ ❌ 不可见。规则：先改矩阵、后开发；对客导出包=「客人」列的落地件。工程/财务角色按同一方法加列。</div>');
}

/* ================= 痛点对照 ================= */
RENDER.pain = function(){
  return head('中小酒店 7 大痛点 × 平台模块对照', '痛点数据来自 2026-07 行业调研（来源标注在括号内），模块=本平台的对应解法') +
    '<div class="card"><table class="tb"><tr><th style="width:42%">行业痛点（带依据）</th><th style="width:38%">平台对应模块</th><th>盯的指标</th></tr>' +
    PAINS.map(p => '<tr><td>' + p.p + '</td><td>' + p.m + '</td><td><b>' + p.k + '</b></td></tr>').join('') +
    '</table><div class="hint">打法：不做大而全 PMS，只吃「集团有、单体没有」的 AI 经营能力差——精准切 30–150 间纯客房酒店。</div></div>';
};

/* ---------- 启动 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  renderPortal();
  if(typeof calcKpi === 'function'){ /* noop */ }
});
