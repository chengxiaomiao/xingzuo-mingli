function goProfiles() { location.href = 'profiles.html'; }
function goAdmin() { location.href = 'admin.html'; }

window.onload = function () {
  if (!requireAuth()) return;
  const u = getUser();
  document.getElementById('userInfo').textContent = u.username + (u.role === 'owner' ? '（主账号）' : '');
  document.getElementById('roleDesc').textContent = u.role === 'owner'
    ? '你是主账号，可管理子账号并跨账号查看档案。'
    : '你是子账号，可录入并管理自己名下的命理档案。';
  if (u.role === 'owner') {
    document.getElementById('adminBtn').style.display = 'block';
  }
};
