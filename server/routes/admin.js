// server/routes/admin.js
// 主账号管理子账号：仅 role=owner 可调用
const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

router.use(authMiddleware);

// 仅主账号可操作
router.use((req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.json({ success: false, message: '仅主账号可操作' });
  }
  next();
});

// 列出名下子账号
router.get('/list', (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT username, role, owner, status, createdAt FROM users WHERE owner = ?')
    .all(req.user.username);
  res.json({ success: true, list });
});

// 添加 / 停用 / 启用 / 删除 子账号
router.post('/', (req, res) => {
  const db = getDb();
  const { action, username, password, target } = req.body || {};

  if (action === 'add') {
    if (!username || !password) return res.json({ success: false, message: '账号或密码为空' });
    if (username.length < 3) return res.json({ success: false, message: '账号至少 3 位' });
    if (password.length < 6) return res.json({ success: false, message: '密码至少 6 位' });
    const exist = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (exist) return res.json({ success: false, message: '账号已存在' });
    const salt = crypto.randomBytes(8).toString('hex');
    db.prepare(`INSERT INTO users (username, passwordHash, salt, role, owner, status, token, createdAt)
      VALUES (?, ?, ?, 'member', ?, 'active', '', ?)`)
      .run(username, hashPassword(password, salt), salt, req.user.username, new Date().toISOString());
    return res.json({ success: true, message: '子账号已添加' });
  }

  if (action === 'disable' || action === 'enable') {
    if (!target) return res.json({ success: false, message: '缺少目标账号' });
    const t = db.prepare('SELECT username, owner FROM users WHERE username = ?').get(target);
    if (!t) return res.json({ success: false, message: '目标账号不存在' });
    if (t.owner !== req.user.username) return res.json({ success: false, message: '只能管理自己名下的账号' });
    const newStatus = action === 'disable' ? 'disabled' : 'active';
    db.prepare('UPDATE users SET status = ? WHERE username = ?').run(newStatus, target);
    return res.json({ success: true, message: action === 'disable' ? '已停用' : '已启用' });
  }

  if (action === 'remove') {
    if (!target) return res.json({ success: false, message: '缺少目标账号' });
    const t = db.prepare('SELECT username, owner FROM users WHERE username = ?').get(target);
    if (!t) return res.json({ success: false, message: '目标账号不存在' });
    if (t.owner !== req.user.username) return res.json({ success: false, message: '只能管理自己名下的账号' });
    db.prepare('DELETE FROM users WHERE username = ?').run(target);
    db.prepare('DELETE FROM profiles WHERE owner = ?').run(target);
    db.prepare('DELETE FROM results WHERE owner = ?').run(target);
    return res.json({ success: true, message: '已删除' });
  }

  return res.json({ success: false, message: '未知操作' });
});

module.exports = router;
