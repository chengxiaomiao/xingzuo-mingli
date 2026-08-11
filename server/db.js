// server/db.js
// MongoDB 连接层：优先读 MONGODB_URI（生产/线上），否则用内存库（本地零配置开发）
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'mingli');
    console.log('[db] 已连接 MongoDB');
    return db;
  }

  // 本地开发：自动拉起内存版 MongoDB，无需安装任何数据库
  console.log('[db] 未检测到 MONGODB_URI，启动本地内存数据库（仅开发用）...');
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    client = new MongoClient(mem.getUri());
    await client.connect();
    db = client.db('mingli');
    console.log('[db] 内存数据库已就绪');
    return db;
  } catch (e) {
    console.error('[db] 内存数据库启动失败：', e.message);
    console.error('[db] 请在环境变量中设置 MONGODB_URI 指向你的 MongoDB 连接串');
    throw e;
  }
}

function getDb() {
  if (!db) throw new Error('数据库尚未连接');
  return db;
}

// 返回操作者「有权访问的账号集合」
// - 子账号：仅自己
// - 主账号：自己 + 名下所有子账号
async function getAllowedOwners(username) {
  const me = await getDb().collection('users').findOne({ username });
  const role = me ? me.role : '';
  if (role !== 'owner') {
    return { role: role || 'member', owners: [username] };
  }
  const members = await getDb().collection('users')
    .find({ owner: username, role: 'member' })
    .toArray();
  return { role: 'owner', owners: [username, ...members.map((m) => m.username)] };
}

module.exports = { connect, getDb, getAllowedOwners };
