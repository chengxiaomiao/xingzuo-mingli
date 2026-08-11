// web/js/common.js —— 通用工具：token 管理、API 调用、鉴权
const API = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; }
}
function setAuth(d) {
  localStorage.setItem('token', d.token);
  localStorage.setItem('user', JSON.stringify({ username: d.username, role: d.role, owner: d.owner }));
}
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = 'Bearer ' + t;
  let res;
  try {
    res = await fetch(API + path, Object.assign({ headers }, opts));
  } catch (e) {
    return { success: false, message: '网络错误，请确认服务已启动' };
  }
  let data;
  try { data = await res.json(); } catch (e) { data = { success: false, message: '服务器响应异常' }; }
  if (res.status === 401) { clearAuth(); location.href = 'login.html'; return data; }
  return data;
}
function requireAuth() {
  if (!getToken()) { location.href = 'login.html'; return false; }
  return true;
}
function logout() {
  api('/auth/logout', { method: 'POST' }).finally(() => {
    clearAuth();
    location.href = 'login.html';
  });
}
