// server/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connect } = require('./db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const analyzeRoutes = require('./routes/analyze');
const adminRoutes = require('./routes/admin');

async function start() {
  await connect();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // API 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/analyze', analyzeRoutes);
  app.use('/api/admin', adminRoutes);

  // 静态前端
  app.use(express.static(path.join(__dirname, '..', 'web')));

  // 根路径重定向到登录页
  app.get('/', (req, res) => res.redirect('/login.html'));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`\n  星座命理网页版已启动：`);
    console.log(`  → 打开 http://localhost:${port}/login.html\n`);
  });
}

start().catch((e) => {
  console.error('启动失败：', e);
  process.exit(1);
});
