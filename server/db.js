// server/db.js
// LibSQL 连接层（兼容远程 Turso 与本地文件，部署零原生编译）
// - 远程：process.env.LIBSQL_URL + process.env.LIBSQL_AUTH_TOKEN
// - 本地（未配置远程时）：file:<project>/data/mingli.db
// 用 @libsql/client（纯 JS + HTTP/WASM，无需 node-gyp 编译，规避 Render 上
// better-sqlite3 在 Node 26 的编译失败问题）。
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const REMOTE_URL = (process.env.LIBSQL_URL || '').trim();
const REMOTE_TOKEN = (process.env.LIBSQL_AUTH_TOKEN || '').trim();

const DB_FILE = path.join(__dirname, '..', 'data', 'mingli.db');
const DB_URL = REMOTE_URL ? REMOTE_URL : 'file:' + DB_FILE;

let client = null;

async function connect() {
  const opts = { url: DB_URL };
  if (REMOTE_TOKEN) opts.authToken = REMOTE_TOKEN;
  if (!REMOTE_URL) {
    // 本地模式：确保 data 目录存在
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  client = createClient(opts);
  await initSchema();
  console.log('[db] LibSQL 已连接：' + (REMOTE_URL ? REMOTE_URL : DB_FILE));
  return client;
}

async function initSchema() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      owner TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      token TEXT NOT NULL DEFAULT '',
      tokenExpire TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      personName TEXT NOT NULL,
      birthInfo TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      recordId INTEGER NOT NULL,
      personName TEXT NOT NULL,
      result TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(owner, recordId)
    );
  `);
}

// 同步风格包装（返回 Promise）
function get(sql, ...args) {
  return client.execute({ sql, args }).then((r) => (r.rows[0] || null));
}
function all(sql, ...args) {
  return client.execute({ sql, args }).then((r) => r.rows);
}
function run(sql, ...args) {
  return client.execute({ sql, args }).then((r) => ({ lastInsertRowid: r.lastInsertRowid }));
}

// 返回操作者「有权访问的账号集合」
// - 子账号：仅自己
// - 主账号：自己 + 名下所有子账号
async function getAllowedOwners(username) {
  const me = await get('SELECT role FROM users WHERE username = ?', username);
  const role = me ? me.role : '';
  if (role !== 'owner') {
    return { role: role || 'member', owners: [username] };
  }
  const members = await all(
    "SELECT username FROM users WHERE owner = ? AND role = 'member'",
    username
  );
  return { role: 'owner', owners: [username, ...members.map((m) => m.username)] };
}

module.exports = { connect, getClient: () => client, get, all, run, getAllowedOwners };
