async function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.textContent = '';
  if (!username || !password) { msg.textContent = '请输入账号和密码'; return; }
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (data.success) {
    setAuth(data);
    location.href = 'home.html';
  } else {
    msg.textContent = data.message || '登录失败';
  }
}
