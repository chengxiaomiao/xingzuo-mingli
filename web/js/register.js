async function doRegister() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';
  if (!username || !password) { msg.textContent = '请输入账号和密码'; return; }
  const data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (data.success) {
    alert('主账号创建成功，请登录');
    location.href = 'login.html';
  } else {
    msg.textContent = data.message || '注册失败';
  }
}
