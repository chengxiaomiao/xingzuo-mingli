// server/routes/profile.js
const router = require('express').Router();
const { ObjectId } = require('mongodb');
const { getDb, getAllowedOwners } = require('../db');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// 列出当前账号「有权访问」的全部档案（主账号含子账号）
router.get('/', async (req, res) => {
  const db = getDb();
  const { role, owners } = await getAllowedOwners(req.user.username);
  const list = await db.collection('profiles')
    .find({ owner: { $in: owners } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  res.json({
    success: true,
    role,
    list: list.map((d) => ({
      _id: d._id.toString(),
      personName: d.personName,
      ownerName: d.owner,
      isMine: d.owner === req.user.username,
      birthInfo: d.birthInfo,
      updatedAt: d.updatedAt
    }))
  });
});

// 保存档案：传 recordId 原地更新（保留原归属）；不传则按姓名在本人名下 upsert
router.post('/', async (req, res) => {
  const db = getDb();
  const { personName, birthInfo, recordId } = req.body || {};
  if (!personName || !personName.trim()) return res.json({ success: false, message: '请填写姓名/称呼' });
  if (!birthInfo) return res.json({ success: false, message: '出生信息为空' });
  const { owners } = await getAllowedOwners(req.user.username);
  const name = personName.trim();

  if (recordId) {
    const cur = await db.collection('profiles').findOne({ _id: new ObjectId(recordId) });
    if (!cur || !owners.includes(cur.owner)) {
      return res.json({ success: false, message: '档案不存在或无权访问' });
    }
    await db.collection('profiles').updateOne(
      { _id: cur._id },
      { $set: { personName: name, birthInfo, updatedAt: new Date() } }
    );
    return res.json({ success: true, _id: cur._id.toString() });
  }

  const exist = await db.collection('profiles').findOne({ owner: req.user.username, personName: name });
  if (exist) {
    await db.collection('profiles').updateOne(
      { _id: exist._id },
      { $set: { birthInfo, updatedAt: new Date() } }
    );
    return res.json({ success: true, _id: exist._id.toString() });
  }
  const r = await db.collection('profiles').insertOne({
    owner: req.user.username,
    personName: name,
    birthInfo,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return res.json({ success: true, _id: r.insertedId.toString() });
});

// 读取单条档案（编辑用）
router.get('/:id', async (req, res) => {
  const db = getDb();
  const { owners } = await getAllowedOwners(req.user.username);
  const d = await db.collection('profiles').findOne({ _id: new ObjectId(req.params.id) });
  if (!d || !owners.includes(d.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }
  res.json({
    success: true,
    _id: d._id.toString(),
    personName: d.personName,
    birthInfo: d.birthInfo,
    ownerName: d.owner
  });
});

// 删除档案（同时清除其分析结果）
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const { owners } = await getAllowedOwners(req.user.username);
  const d = await db.collection('profiles').findOne({ _id: new ObjectId(req.params.id) });
  if (!d || !owners.includes(d.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }
  await db.collection('profiles').deleteOne({ _id: d._id });
  await db.collection('results').deleteMany({ owner: d.owner, recordId: d._id.toString() });
  res.json({ success: true });
});

module.exports = router;
