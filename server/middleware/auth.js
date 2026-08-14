// server/middleware/auth.js
// 基于登录下发的 token 鉴权，防止客户端伪造身份
const { get } = require('../db');

async function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  const user = await get(
    'SELECT username, role, owner, status FROM users WHERE token = ?',
    token
  );
  if (!user) {
    return res.status(401).json({ success: false, message: '登录已失效，请重新登录' });
  }
  if (user.status === 'disabled') {
    return res.status(403).json({ success: false, message: '该账号已被停用，请联系主账号' });
  }
  req.user = { username: user.username, role: user.role, owner: user.owner };
  next();
}

module.exports = authMiddleware;
