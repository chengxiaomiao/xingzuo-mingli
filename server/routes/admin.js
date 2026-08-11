// server/routes/admin.js
// 主账号管理子账号：仅 role=owner 可调用
const router = require('express').Router();
const crypto = require('crypto');
const { getDb: getDbColl } = require('../db');
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
router.get('/list', async (req, res) => {
  const db = getDbColl();
  const list = await db.collection('users')
    .find({ owner: req.user.username })
    .project({ passwordHash: 0, salt: 0, token: 0 })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({
    success: true,
    list: list.map((u) => ({ ...u, _id: u._id.toString() }))
  });
});

// 添加 / 停用 / 启用 / 删除 子账号
router.post('/', async (req, res) => {
  const db = getDbColl();
  const { action, username, password, target } = req.body || {};

  if (action === 'add') {
    if (!username || !password) return res.json({ success: false, message: '账号或密码为空' });
    if (username.length < 3) return res.json({ success: false, message: '账号至少 3 位' });
    if (password.length < 6) return res.json({ success: false, message: '密码至少 6 位' });
    const exist = await db.collection('users').findOne({ username });
    if (exist) return res.json({ success: false, message: '账号已存在' });
    const salt = crypto.randomBytes(8).toString('hex');
    await db.collection('users').insertOne({
      username,
      passwordHash: hashPassword(password, salt),
      salt,
      role: 'member',
      owner: req.user.username,
      status: 'active',
      token: '',
      createdAt: new Date()
    });
    return res.json({ success: true, message: '子账号已添加' });
  }

  if (action === 'disable' || action === 'enable') {
    if (!target) return res.json({ success: false, message: '缺少目标账号' });
    const t = await db.collection('users').findOne({ username: target });
    if (!t) return res.json({ success: false, message: '目标账号不存在' });
    if (t.owner !== req.user.username) return res.json({ success: false, message: '只能管理自己名下的账号' });
    const newStatus = action === 'disable' ? 'disabled' : 'active';
    await db.collection('users').updateOne({ username: target }, { $set: { status: newStatus } });
    return res.json({ success: true, message: action === 'disable' ? '已停用' : '已启用' });
  }

  if (action === 'remove') {
    if (!target) return res.json({ success: false, message: '缺少目标账号' });
    const t = await db.collection('users').findOne({ username: target });
    if (!t) return res.json({ success: false, message: '目标账号不存在' });
    if (t.owner !== req.user.username) return res.json({ success: false, message: '只能管理自己名下的账号' });
    await db.collection('users').deleteOne({ username: target });
    await db.collection('profiles').deleteMany({ owner: target });
    await db.collection('results').deleteMany({ owner: target });
    return res.json({ success: true, message: '已删除' });
  }

  return res.json({ success: false, message: '未知操作' });
});

module.exports = router;
