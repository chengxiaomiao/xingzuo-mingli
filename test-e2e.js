// test-e2e.js —— 端到端验证（自动启动服务 + 本地 LibSQL 库，跑完整流程）
require('./server/index.js'); // 启动 Express + LibSQL（未配 LIBSQL_URL 时回退本地 data/mingli.db）

const BASE = 'http://localhost:3000/api';

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch('http://localhost:3000/login.html');
      if (res.ok) return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('服务未就绪（请确认 3000 端口空闲且依赖已安装）');
}

async function call(path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); process.exitCode = 1; }
  else { console.log('  ✓ ' + msg); }
}

async function main() {
  await waitReady();
  console.log('— 注册 / 登录 —');
  let r = await call('/auth/register', null, { username: 'owner1', password: 'pass123456' });
  assert(r.success && r.role === 'owner', '首个注册账号成为主账号');

  r = await call('/auth/register', null, { username: 'owner2', password: 'pass123456' });
  assert(!r.success, '已有主账号后公共注册关闭');

  let lo = await call('/auth/login', null, { username: 'owner1', password: 'pass123456' });
  assert(lo.success && lo.token, '主账号登录成功并拿到 token');
  const tokenO = lo.token;

  console.log('— 主账号录入档案 + 分析 —');
  const birthA = {
    calendarType: 'solar', year: 1990, month: 6, day: 15,
    timeMode: 'precise', hour: 12, minute: 0, range: null, gender: '男', city: '北京'
  };
  r = await call('/profiles', tokenO, { personName: '张三', birthInfo: birthA });
  assert(r.success && r._id, '主账号保存档案「张三」');
  const idA = r._id;

  r = await call('/analyze', tokenO, { recordId: idA });
  assert(r.success && r.result && r.result.pillars && r.result.zodiac && r.result.luckyColor.length > 0, '分析成功：含八字/生肖/喜用色');
  console.log('    示例：' + r.result.pillars.year + ' ' + r.result.pillars.month + ' ' + r.result.pillars.day + ' ' + r.result.pillars.time + ' | 生肖' + r.result.zodiac + ' | 喜用色' + r.result.luckyColor.join('/'));

  console.log('— 主账号添加子账号 —');
  r = await call('/admin', tokenO, { action: 'add', username: 'member1', password: 'pass123456' });
  assert(r.success, '主账号添加子账号 member1');

  let lm = await call('/auth/login', null, { username: 'member1', password: 'pass123456' });
  assert(lm.success && lm.role === 'member', '子账号登录成功，角色 member');
  const tokenM = lm.token;

  console.log('— 子账号录入 + 分析 —');
  r = await call('/profiles', tokenM, { personName: '李四', birthInfo: { calendarType: 'lunar', year: 1988, month: 1, day: 1, timeMode: 'range', hour: null, minute: null, range: '午时', gender: '女', city: '上海' } });
  assert(r.success && r._id, '子账号保存档案「李四」（农历+时辰范围）');
  const idB = r._id;
  r = await call('/analyze', tokenM, { recordId: idB });
  assert(r.success && r.result, '子账号分析成功');

  console.log('— 主账号视角（跨账号可见） —');
  r = await call('/profiles', tokenO);
  assert(r.success && r.role === 'owner', '主账号查档案带 role=owner');
  const names = (r.list || []).map((p) => p.personName);
  assert(names.includes('张三') && names.includes('李四'), '主账号可见自己与子账号的档案');
  const li = (r.list || []).find((p) => p.personName === '李四');
  assert(li && li.isMine === false && li.ownerName === 'member1', '李四档案标注录入者为 member1');

  console.log('— 停用子账号 —');
  r = await call('/admin', tokenO, { action: 'disable', target: 'member1' });
  assert(r.success, '主账号停用 member1');
  let lm2 = await call('/auth/login', null, { username: 'member1', password: 'pass123456' });
  assert(!lm2.success, '停用后子账号无法登录');

  console.log('\n全部用例执行完毕。');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error('测试异常：', e); process.exit(1); });
