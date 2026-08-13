async function doAdd() {
  const msg = document.getElementById('addMsg');
  msg.textContent = '';
  const username = document.getElementById('newUser').value.trim();
  const pw = document.getElementById('newPass').value;
  if (!username || !pw) { msg.textContent = '请填写账号和密码'; return; }
  const data = await api('/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'add', username, password: pw })
  });
  if (data.success) {
    document.getElementById('newUser').value = '';
    document.getElementById('newPass').value = '';
    loadList();
  } else {
    msg.textContent = data.message || '添加失败';
  }
}

async function loadList() {
  const data = await api('/admin/list');
  const box = document.getElementById('list');
  if (!data.success || !data.list || data.list.length === 0) {
    box.innerHTML = '<p class="sub">还没有子账号。</p>';
    return;
  }
  box.innerHTML = data.list.map((u) => {
    const disabled = u.status === 'disabled';
    const statusText = disabled ? '已停用' : '正常';
    const actionBtn = disabled
      ? '<button class="mini" onclick="toggle(\'' + u.username + '\',\'enable\')">启用</button>'
      : '<button class="mini" onclick="toggle(\'' + u.username + '\',\'disable\')">停用</button>';
    return '<div class="member-item' + (disabled ? ' disabled' : '') + '">' +
      '<div><div class="mname">' + escapeHtml(u.username) + '</div><div class="mstatus">状态：' + statusText + '</div></div>' +
      '<div class="actions">' + actionBtn +
      '<button class="mini danger" onclick="remove(\'' + u.username + '\')">删除</button></div></div>';
  }).join('');
}

async function toggle(target, action) {
  await api('/admin', { method: 'POST', body: JSON.stringify({ action, target }) });
  loadList();
}
async function remove(target) {
  if (!confirm('确定删除该子账号？其录入的档案与分析也会一并清除。')) return;
  const data = await api('/admin', { method: 'POST', body: JSON.stringify({ action: 'remove', target }) });
  if (data.success) loadList();
  else alert(data.message || '删除失败');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.onload = function () {
  if (!requireAuth()) return;
  if (getUser().role !== 'owner') { location.href = 'home.html'; return; }
  loadList();
};
