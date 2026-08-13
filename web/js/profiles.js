let currentTab = 'all';

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabAll').classList.toggle('active', tab === 'all');
  document.getElementById('tabMine').classList.toggle('active', tab === 'mine');
  loadList();
}

async function loadList() {
  const data = await api('/profiles');
  if (!data.success) return;
  if (data.role === 'owner') {
    document.getElementById('tabs').style.display = 'flex';
  }
  let list = data.list || [];
  if (currentTab === 'mine') {
    list = list.filter((p) => p.isMine);
  }
  const box = document.getElementById('list');
  if (list.length === 0) {
    box.innerHTML = '<div class="card"><p class="sub">还没有档案，点下方"新增档案"录入第一个人吧。</p></div>';
    return;
  }
  box.innerHTML = list.map((p) => {
    const tag = p.isMine ? '本人档案' : ('录入者：' + p.ownerName);
    return '<div class="profile-item">' +
      '<div><div class="name">' + escapeHtml(p.personName) +
        '<span class="meta" style="margin-left:8px">' + escapeHtml(tag) + '</span></div>' +
        '<div class="meta">' + cityOf(p) + '</div></div>' +
      '<div class="actions">' +
        '<button class="mini" onclick="analyze(\'' + p._id + '\')">分析</button>' +
        '<button class="mini" onclick="edit(\'' + p._id + '\')">编辑</button>' +
        '<button class="mini danger" onclick="remove(\'' + p._id + '\')">删除</button>' +
      '</div></div>';
  }).join('');
}

function cityOf(p) {
  return p.birthInfo && p.birthInfo.city ? escapeHtml(p.birthInfo.city) : '';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function analyze(id) { location.href = 'result.html?recordId=' + id; }
function edit(id) { location.href = 'entry.html?recordId=' + id; }
async function remove(id) {
  if (!confirm('确定删除该档案及其分析结果？')) return;
  const data = await api('/profiles/' + id, { method: 'DELETE' });
  if (data.success) loadList();
  else alert(data.message || '删除失败');
}

window.onload = function () {
  if (!requireAuth()) return;
  loadList();
};
