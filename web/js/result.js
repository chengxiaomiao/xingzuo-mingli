const ELEMENT_ORDER = ['木', '火', '土', '金', '水'];
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

function drawWuxing(canvas, bars, colorMap) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth || 300;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, R = size * 0.33;
  const cnt = ELEMENT_ORDER.length;
  const pos = {};
  ELEMENT_ORDER.forEach((el, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / cnt;
    pos[el] = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });
  function line(a, b, dash) {
    ctx.beginPath();
    ctx.setLineDash(dash ? [6, 5] : []);
    ctx.strokeStyle = dash ? 'rgba(158,61,52,0.55)' : 'rgba(63,90,107,0.6)';
    ctx.lineWidth = 2;
    ctx.moveTo(pos[a].x, pos[a].y);
    ctx.lineTo(pos[b].x, pos[b].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ELEMENT_ORDER.forEach((el) => line(el, SHENG[el], false));
  ELEMENT_ORDER.forEach((el) => line(el, KE[el], true));
  ELEMENT_ORDER.forEach((el) => {
    const p = pos[el];
    const bar = bars.find((b) => b.el === el);
    const pct = bar ? bar.pct : 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = colorMap[el] || '#999';
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 16px serif';
    ctx.fillText(el, p.x, p.y - 7);
    ctx.font = '12px sans-serif';
    ctx.fillText(pct + '%', p.x, p.y + 12);
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function pillarHtml(label, val, nayin) {
  return `<div class="pillar"><div class="label">${label}</div><div class="val">${escapeHtml(val)}</div><div class="label" style="margin-top:4px;color:var(--gold)">${escapeHtml(nayin)}</div></div>`;
}
function boxx(label, val) {
  return `<div class="box"><div class="label">${label}</div><div class="val">${escapeHtml(val)}</div></div>`;
}
function luckyItem(label, val) {
  return `<div class="lucky-item"><span class="lucky-label">${label}</span><span class="lucky-val">${escapeHtml(val)}</span></div>`;
}

window.onload = async function () {
  if (!requireAuth()) return;
  const recordId = getParam('recordId');
  if (!recordId) { location.href = 'profiles.html'; return; }

  const data = await api('/analyze', { method: 'POST', body: JSON.stringify({ recordId }) });
  document.getElementById('pname').textContent = data.personName || '';
  const box = document.getElementById('content');

  if (!data.success) {
    box.innerHTML = '<div class="card"><p class="msg">' + escapeHtml(data.message || '分析失败') + '</p></div>';
    return;
  }

  const r = data.result;
  const p = r.pillars;

  box.innerHTML =
    // 模块一：生辰格局
    '<div class="card">' +
      '<div class="module-head"><div class="seal">壹</div><div class="module-titles"><div class="module-title">生辰格局</div><div class="module-sub">四柱纳音 · 十神格局</div></div></div>' +
      '<div class="pillars">' +
        pillarHtml('年', p.year, r.nayin.year) + pillarHtml('月', p.month, r.nayin.month) +
        pillarHtml('日', p.day, r.nayin.day) + pillarHtml('时', p.time, r.nayin.time) +
      '</div>' +
      '<div class="grid2">' +
        boxx('生肖', r.zodiac) + boxx('日主', r.dayMaster + '（' + r.dayMasterElement + '）') +
        boxx('日主强弱', r.strongText) + boxx('主导格局', r.pattern) +
      '</div>' +
      '<p class="section-label">格局解读</p><p class="body-text">' + r.patternText + '</p>' +
      '<p class="note">' + r.patternLevel + '</p>' +
      '<p class="section-label">身强身弱</p><p class="body-text">' + r.strongDetail + '</p>' +
      '<p class="section-label">十神分布</p><div class="grid2">' +
        r.shiShenDetail.map((d) => boxx(d.pos + '·' + d.ss, d.text)).join('') +
      '</div>' +
    '</div>' +

    // 模块二：五行分布
    '<div class="card">' +
      '<div class="module-head"><div class="seal">贰</div><div class="module-titles"><div class="module-title">五行分布</div><div class="module-sub">相生相克 · 旺衰占比</div></div></div>' +
      '<canvas id="wuxingCanvas" style="width:100%;height:240px;display:block;margin:4px 0"></canvas>' +
      '<div class="wuxing-bar">' +
        r.wuxingBars.map((b) =>
          '<div class="wuxing-seg"><span class="name">' + b.el + '</span>' +
          '<div class="wuxing-track"><div class="wuxing-fill" style="width:' + b.pct + '%;background:' + b.color + '"></div></div>' +
          '<span class="pct">' + b.count + ' · ' + b.pct + '%</span></div>'
        ).join('') +
      '</div>' +
      '<p class="section-label" style="margin-top:14px">五行旺衰</p><p class="body-text">' + r.wuxingAnalysis + '</p>' +
    '</div>' +

    // 模块三：喜用神
    '<div class="card">' +
      '<div class="module-head"><div class="seal">叁</div><div class="module-titles"><div class="module-title">喜用神</div><div class="module-sub">用神喜忌 · 幸运要素</div></div></div>' +
      '<div class="grid2">' +
        boxx('喜用神', r.xiyong) + boxx('用神', r.primaryElement) +
        boxx('喜神', r.xiShen) + boxx('忌神', r.jiShen) +
      '</div>' +
      '<p class="section-label">喜用解读</p><p class="body-text">' + r.xiyongDetail + '</p>' +
      '<p class="section-label">幸运要素</p><div class="lucky-row">' +
        luckyItem('喜用色', r.luckyColor.join('、')) + luckyItem('幸运数字', r.luckyNumber.join('、')) + luckyItem('幸运石', r.luckyStone.join('、')) +
      '</div>' +
      '<p class="body-text" style="margin-top:10px">' + r.luckyDetail + '</p>' +
    '</div>' +

    // 说明 / 免责
    '<div class="card disclaimer">' +
      '<div class="section-label">说明</div>' +
      '<div class="disc-text">真太阳时校正后：' + r.trueSolar + '。本分析依《子平真诠》格局之法推算，含简化的喜用神与强弱判断，仅供文化娱乐参考，不作任何绝对结论。</div>' +
      '<div class="disc-warn">娱乐参考 · 不构成任何专业建议，请勿据此作出重大人生决策</div>' +
    '</div>' +
    '<button class="btn-ghost" onclick="location.href=\'entry.html?recordId=' + encodeURIComponent(recordId) + '\'">修改出生信息</button>';

  drawWuxing(document.getElementById('wuxingCanvas'), r.wuxingBars, r.wuxingColor);
};
