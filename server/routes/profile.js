// server/routes/profile.js
const router = require('express').Router();
const { getDb, getAllowedOwners } = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 列出当前账号「有权访问」的全部档案（主账号含子账号）
router.get('/', (req, res) => {
  const db = getDb();
  const { role, owners } = getAllowedOwners(req.user.username);
  const placeholders = owners.map(() => '?').join(',');
  const list = db.prepare(
    `SELECT id, personName, owner, birthInfo, updatedAt FROM profiles WHERE owner IN (${placeholders}) ORDER BY updatedAt DESC LIMIT 200`
  ).all(...owners);
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
router.post('/', (req, res) => {
  const db = getDb();
  const { personName, birthInfo, recordId } = req.body || {};
  if (!personName || !personName.trim()) return res.json({ success: false, message: '请填写姓名/称呼' });
  if (!birthInfo) return res.json({ success: false, message: '出生信息为空' });
  const { owners } = getAllowedOwners(req.user.username);
  const name = personName.trim();
  const now = new Date().toISOString();

  if (recordId) {
    const rid = parseInt(recordId, 10);
    const cur = db.prepare('SELECT id, owner FROM profiles WHERE id = ?').get(rid);
    if (!cur || !owners.includes(cur.owner)) {
      return res.json({ success: false, message: '档案不存在或无权访问' });
    }
    db.prepare('UPDATE profiles SET personName = ?, birthInfo = ?, updatedAt = ? WHERE id = ?')
      .run(name, JSON.stringify(birthInfo), now, rid);
    return res.json({ success: true, _id: String(rid) });
  }

  const exist = db.prepare('SELECT id FROM profiles WHERE owner = ? AND personName = ?')
    .get(req.user.username, name);
  if (exist) {
    db.prepare('UPDATE profiles SET birthInfo = ?, updatedAt = ? WHERE id = ?')
      .run(JSON.stringify(birthInfo), now, exist.id);
    return res.json({ success: true, _id: String(exist.id) });
  }
  const info = db.prepare('INSERT INTO profiles (owner, personName, birthInfo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.username, name, JSON.stringify(birthInfo), now, now);
  return res.json({ success: true, _id: String(info.lastInsertRowid) });
});

// 读取单条档案（编辑用）
router.get('/:id', (req, res) => {
  const db = getDb();
  const { owners } = getAllowedOwners(req.user.username);
  const rid = parseInt(req.params.id, 10);
  const d = db.prepare('SELECT id, personName, owner, birthInfo FROM profiles WHERE id = ?').get(rid);
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
router.delete('/:id', (req, res) => {
  const db = getDb();
  const { owners } = getAllowedOwners(req.user.username);
  const rid = parseInt(req.params.id, 10);
  const d = db.prepare('SELECT id, owner FROM profiles WHERE id = ?').get(rid);
  if (!d || !owners.includes(d.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }
  db.prepare('DELETE FROM profiles WHERE id = ?').run(rid);
  db.prepare('DELETE FROM results WHERE owner = ? AND recordId = ?').run(d.owner, rid);
  res.json({ success: true });
});

module.exports = router;
