// server/db.js
// SQLite 连接层（文件数据库，免外部服务，部署零配置）
// 用 better-sqlite3（同步 API），数据库文件随应用部署，无需注册任何云数据库账号。
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'mingli.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;

function connect() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
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
  console.log('[db] SQLite 已连接：' + DB_PATH);
  return db;
}

function getDb() {
  if (!db) throw new Error('数据库尚未连接');
  return db;
}

// 返回操作者「有权访问的账号集合」
// - 子账号：仅自己
// - 主账号：自己 + 名下所有子账号
function getAllowedOwners(username) {
  const me = getDb().prepare('SELECT role FROM users WHERE username = ?').get(username);
  const role = me ? me.role : '';
  if (role !== 'owner') {
    return { role: role || 'member', owners: [username] };
  }
  const members = getDb()
    .prepare("SELECT username FROM users WHERE owner = ? AND role = 'member'")
    .all(username);
  return { role: 'owner', owners: [username, ...members.map((m) => m.username)] };
}

module.exports = { connect, getDb, getAllowedOwners };
