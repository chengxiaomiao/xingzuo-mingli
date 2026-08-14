// server/routes/profile.js
const router = require('express').Router();
const { get, all, run, getAllowedOwners } = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 列出当前账号「有权访问」的全部档案（主账号含子账号）
router.get('/', async (req, res) => {
  const { role, owners } = await getAllowedOwners(req.user.username);
  const placeholders = owners.map(() => '?').join(',');
  const list = await all(
    `SELECT id, personName, owner, birthInfo, updatedAt FROM profiles WHERE owner IN (${placeholders}) ORDER BY updatedAt DESC LIMIT 200`,
    ...owners
  );
  res.json({
    success: true,
    role,
    list: list.map((d) => ({
      _id: String(d.id),
      personName: d.personName,
      ownerName: d.owner,
      isMine: d.owner === req.user.username,
      birthInfo: JSON.parse(d.birthInfo),
      updatedAt: d.updatedAt
    }))
  });
});

// 保存档案：传 recordId 原地更新（保留原归属）；不传则按姓名在本人名下 upsert
router.post('/', async (req, res) => {
  const { personName, birthInfo, recordId } = req.body || {};
  if (!personName || !personName.trim()) return res.json({ success: false, message: '请填写姓名/称呼' });
  if (!birthInfo) return res.json({ success: false, message: '出生信息为空' });
  const { owners } = await getAllowedOwners(req.user.username);
  const name = personName.trim();
  const now = new Date().toISOString();

  if (recordId) {
    const rid = parseInt(recordId, 10);
    const cur = await get('SELECT id, owner FROM profiles WHERE id = ?', rid);
    if (!cur || !owners.includes(cur.owner)) {
      return res.json({ success: false, message: '档案不存在或无权访问' });
    }
    await run('UPDATE profiles SET personName = ?, birthInfo = ?, updatedAt = ? WHERE id = ?',
      name, JSON.stringify(birthInfo), now, rid);
    return res.json({ success: true, _id: String(rid) });
  }

  const exist = await get('SELECT id FROM profiles WHERE owner = ? AND personName = ?',
    req.user.username, name);
  if (exist) {
    await run('UPDATE profiles SET birthInfo = ?, updatedAt = ? WHERE id = ?',
      JSON.stringify(birthInfo), now, exist.id);
    return res.json({ success: true, _id: String(exist.id) });
  }
  const info = await run('INSERT INTO profiles (owner, personName, birthInfo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    req.user.username, name, JSON.stringify(birthInfo), now, now);
  return res.json({ success: true, _id: String(info.lastInsertRowid) });
});

// 读取单条档案（编辑用）
router.get('/:id', async (req, res) => {
  const { owners } = await getAllowedOwners(req.user.username);
  const rid = parseInt(req.params.id, 10);
  const d = await get('SELECT id, personName, owner, birthInfo FROM profiles WHERE id = ?', rid);
  if (!d || !owners.includes(d.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }
  res.json({
    success: true,
    _id: String(d.id),
    personName: d.personName,
    birthInfo: JSON.parse(d.birthInfo),
    ownerName: d.owner
  });
});

// 删除档案（同时清除其分析结果）
router.delete('/:id', async (req, res) => {
  const { owners } = await getAllowedOwners(req.user.username);
  const rid = parseInt(req.params.id, 10);
  const d = await get('SELECT id, owner FROM profiles WHERE id = ?', rid);
  if (!d || !owners.includes(d.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }
  await run('DELETE FROM profiles WHERE id = ?', rid);
  await run('DELETE FROM results WHERE owner = ? AND recordId = ?', d.owner, rid);
  res.json({ success: true });
});

module.exports = router;
