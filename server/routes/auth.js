// server/routes/auth.js
const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../db');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

// 注册：第一个注册的账号自动成为主账号；之后关闭公共注册
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: '账号或密码为空' });
  if (username.length < 3) return res.json({ success: false, message: '账号至少 3 位' });
  if (password.length < 6) return res.json({ success: false, message: '密码至少 6 位' });

  const db = getDb();
  const ownerCount = await db.collection('users').countDocuments({ role: 'owner' });
  const exist = await db.collection('users').findOne({ username });
  if (exist) return res.json({ success: false, message: '账号已存在' });

  const salt = crypto.randomBytes(8).toString('hex');
  if (ownerCount === 0) {
    await db.collection('users').insertOne({
      username,
      passwordHash: hashPassword(password, salt),
      salt,
      role: 'owner',
      owner: '',
      status: 'active',
      token: '',
      createdAt: new Date()
    });
    return res.json({ success: true, message: '主账号创建成功，请登录', role: 'owner' });
  }
  return res.json({ success: false, message: '已有主账号，请由主账号添加子账号' });
});

// 登录：校验密码，下发 token
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: '账号或密码为空' });

  const db = getDb();
  const user = await db.collection('users').findOne({ username });
  if (!user) return res.json({ success: false, message: '账号不存在' });
  if (user.status === 'disabled') return res.json({ success: false, message: '该账号已被停用，请联系主账号' });
  if (hashPassword(password, user.salt) !== user.passwordHash) {
    return res.json({ success: false, message: '密码错误' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  await db.collection('users').updateOne(
    { username },
    { $set: { token, tokenExpire: new Date(Date.now() + 7 * 24 * 3600 * 1000) } }
  );
  return res.json({
    success: true,
    message: '登录成功',
    username: user.username,
    role: user.role,
    owner: user.owner,
    token
  });
});

// 退出登录：清空 token
router.post('/logout', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token) {
    await getDb().collection('users').updateOne({ token }, { $set: { token: '' } });
  }
  res.json({ success: true });
});

module.exports = router;
