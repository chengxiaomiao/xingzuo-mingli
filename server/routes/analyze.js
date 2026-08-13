// server/routes/analyze.js
const router = require('express').Router();
const { getDb, getAllowedOwners } = require('../db');
const { analyze } = require('../bazi');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', (req, res) => {
  const db = getDb();
  const { recordId } = req.body || {};
  if (!recordId) return res.json({ success: false, message: '请选择要分析的档案' });

  const rid = parseInt(recordId, 10);
  const { owners } = getAllowedOwners(req.user.username);
  const profile = db.prepare('SELECT id, owner, personName, birthInfo FROM profiles WHERE id = ?').get(rid);
  if (!profile || !owners.includes(profile.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }

  const result = analyze(JSON.parse(profile.birthInfo));
  const personName = profile.personName;
  const now = new Date().toISOString();

  const exist = db.prepare('SELECT id FROM results WHERE owner = ? AND recordId = ?')
    .get(profile.owner, profile.id);
  if (exist) {
    db.prepare('UPDATE results SET personName = ?, result = ?, updatedAt = ? WHERE id = ?')
      .run(personName, JSON.stringify(result), now, exist.id);
  } else {
    db.prepare('INSERT INTO results (owner, recordId, personName, result, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(profile.owner, profile.id, personName, JSON.stringify(result), now, now);
  }

  res.json({ success: true, result, personName });
});

module.exports = router;
