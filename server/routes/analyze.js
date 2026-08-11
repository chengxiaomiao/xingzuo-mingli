// server/routes/analyze.js
const router = require('express').Router();
const { ObjectId } = require('mongodb');
const { getDb, getAllowedOwners } = require('../db');
const { analyze } = require('../bazi');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const db = getDb();
  const { recordId } = req.body || {};
  if (!recordId) return res.json({ success: false, message: '请选择要分析的档案' });

  const { owners } = await getAllowedOwners(req.user.username);
  const profile = await db.collection('profiles').findOne({ _id: new ObjectId(recordId) });
  if (!profile || !owners.includes(profile.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }

  const result = analyze(profile.birthInfo);
  const personName = profile.personName;

  const exist = await db.collection('results').findOne({ owner: profile.owner, recordId });
  if (exist) {
    await db.collection('results').updateOne(
      { _id: exist._id },
      { $set: { personName, result, updatedAt: new Date() } }
    );
  } else {
    await db.collection('results').insertOne({
      owner: profile.owner,
      recordId,
      personName,
      result,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  res.json({ success: true, result, personName });
});

module.exports = router;
