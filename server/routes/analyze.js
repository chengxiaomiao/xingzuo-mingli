// server/routes/analyze.js
const router = require('express').Router();
const { get, run, getAllowedOwners } = require('../db');
const { analyze } = require('../bazi');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { recordId } = req.body || {};
  if (!recordId) return res.json({ success: false, message: '请选择要分析的档案' });

  const rid = parseInt(recordId, 10);
  const { owners } = await getAllowedOwners(req.user.username);
  const profile = await get('SELECT id, owner, personName, birthInfo FROM profiles WHERE id = ?', rid);
  if (!profile || !owners.includes(profile.owner)) {
    return res.json({ success: false, message: '档案不存在或无权访问' });
  }

  const result = analyze(JSON.parse(profile.birthInfo));
  const personName = profile.personName;
  const now = new Date().toISOString();

  const exist = await get('SELECT id FROM results WHERE owner = ? AND recordId = ?',
    profile.owner, profile.id);
  if (exist) {
    await run('UPDATE results SET personName = ?, result = ?, updatedAt = ? WHERE id = ?',
      personName, JSON.stringify(result), now, exist.id);
  } else {
    await run('INSERT INTO results (owner, recordId, personName, result, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      profile.owner, profile.id, personName, JSON.stringify(result), now, now);
  }

  res.json({ success: true, result, personName });
});

module.exports = router;
