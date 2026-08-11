const ELEMENT_COLOR = {
  '木': '#4caf50', '火': '#e53935', '土': '#a1887f', '金': '#b0bec5', '水': '#1e88e5'
};

window.onload = async function () {
  if (!requireAuth()) return;
  const recordId = getParam('recordId');
  if (!recordId) { location.href = 'profiles.html'; return; }

  const data = await api('/analyze', {
    method: 'POST',
    body: JSON.stringify({ recordId })
  });

  document.getElementById('pname').textContent = data.personName || '';
  const box = document.getElementById('content');

  if (!data.success) {
    box.innerHTML = '<div class="card"><p class="msg">' + (data.message || '分析失败') + '</p></div>';
    return;
  }

  const r = data.result;
  const p = r.pillars;
  const wuxing = r.wuxing;
  const total = Object.values(wuxing).reduce((a, b) => a + b, 0) || 1;

  const wuxingHtml = Object.keys(wuxing).map((e) => {
    const pct = Math.round((wuxing[e] / total) * 100);
    return '<span style="background:' + ELEMENT_COLOR[e] + '">' + e + ' ' + wuxing[e] + ' (' + pct + '%)</span>';
  }).join('');

  box.innerHTML =
    '<div class="card">' +
      '<h2>' + escapeHtml(data.personName) + ' 的命理分析</h2>' +
      '<div class="pillars">' +
        pillar('年', p.year) + pillar('月', p.month) + pillar('日', p.day) + pillar('时', p.time) +
      '</div>' +
      '<div class="grid2">' +
        boxx('生肖', r.zodiac) +
        boxx('日主', r.dayMaster + '（' + r.dayMasterElement + '）') +
        boxx('日主强弱', r.strong ? '偏强' : '偏弱') +
        boxx('喜用神', r.xiyong) +
      '</div>' +
      '<p class="sub" style="margin-top:12px">五行分布</p>' +
      '<div class="wuxing-bar">' + wuxingHtml + '</div>' +
    '</div>' +

    '<div class="card">' +
      '<h2>开运建议</h2>' +
      '<div class="grid2">' +
        boxx('喜用色', r.luckyColor.join('、')) +
        boxx('幸运数字', r.luckyNumber.join('、')) +
        boxx('幸运石', r.luckyStone.join('、')) +
      '</div>' +
      '<p class="note">真太阳时校正后：' + r.trueSolar + '</p>' +
    '</div>' +

    '<p class="note">说明：以上分析由规则引擎基于传统干支历法计算，喜用神为简化推导（参考级），仅供文化娱乐，不构成任何专业命理定论。</p>';

  function pillar(label, val) {
    return '<div class="pillar"><div class="label">' + label + '</div><div class="val">' + val + '</div></div>';
  }
  function boxx(label, val) {
    return '<div class="box"><div class="label">' + label + '</div><div class="val">' + val + '</div></div>';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};
