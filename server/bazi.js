// server/bazi.js
// 命理计算引擎（规则计算，非 AI 生成）
// 理论框架：《子平真诠》——月令为纲、格局为主、扶抑为用
const { Solar, Lunar } = require('lunar-javascript');

// ---------- 五行基础数据 ----------
const GAN_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土',
  庚: '金', 辛: '金', 壬: '水', 癸: '水'
};
const ZHI_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水'
};
const ELEMENTS = ['木', '火', '土', '金', '水'];

// 五行相生：木->火->土->金->水->木（X 生 SHENG[X]）
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
// 生我者（逆相生）：SHENG_WO[X] 生 X
const SHENG_WO = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
// 五行相克：木克土，土克水，水克火，火克金，金克木
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ELEMENT_NAME = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' };

// 五行配色（用于前端图示 / 条形图）
const ELEMENT_COLOR = { 木: '#5b8c5a', 火: '#c0483b', 土: '#b08a4f', 金: '#9aa7b0', 水: '#3f6f8f' };

// 喜用神 → 颜色 / 数字 / 幸运石
const LUCKY = {
  金: { colors: ['白色', '金色', '银色'], numbers: ['4', '9'], stones: ['白水晶', '银饰', '砗磲'] },
  木: { colors: ['绿色', '青色', '翠色'], numbers: ['3', '8'], stones: ['绿幽灵', '翡翠', '木质饰品'] },
  水: { colors: ['黑色', '深蓝', '藏青'], numbers: ['1', '6'], stones: ['黑曜石', '海蓝宝', '黑玛瑙'] },
  火: { colors: ['红色', '紫色', '粉色'], numbers: ['2', '7'], stones: ['红玛瑙', '石榴石', '太阳石'] },
  土: { colors: ['黄色', '棕色', '咖啡色'], numbers: ['5', '0'], stones: ['黄水晶', '虎眼石', '茶晶'] }
};

// 天干五行 + 阴阳（阳=false 表阴，true 表阳）
const GAN_INFO = {
  甲: { el: '木', yin: false }, 乙: { el: '木', yin: true },
  丙: { el: '火', yin: false }, 丁: { el: '火', yin: true },
  戊: { el: '土', yin: false }, 己: { el: '土', yin: true },
  庚: { el: '金', yin: false }, 辛: { el: '金', yin: true },
  壬: { el: '水', yin: false }, 癸: { el: '水', yin: true }
};

// 地支本气天干（用于十神与月令取格）
const ZHI_BENQI = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬'
};

// 地支藏干（本气/中气/余气），用于身强身弱"得地"判断与自坐十神
const ZHI_CANG = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲']
};

// 六十甲子纳音表（用于四柱纳音）
const NAYIN_LIST = [
  ['甲子', '乙丑', '海中金'], ['丙寅', '丁卯', '炉中火'], ['戊辰', '己巳', '大林木'],
  ['庚午', '辛未', '路旁土'], ['壬申', '癸酉', '剑锋金'], ['甲戌', '乙亥', '山头火'],
  ['丙子', '丁丑', '涧下水'], ['戊寅', '己卯', '城头土'], ['庚辰', '辛巳', '白蜡金'],
  ['壬午', '癸未', '杨柳木'], ['甲申', '乙酉', '泉中水'], ['丙戌', '丁亥', '屋上土'],
  ['戊子', '己丑', '霹雳火'], ['庚寅', '辛卯', '松柏木'], ['壬辰', '癸巳', '长流水'],
  ['甲午', '乙未', '砂中金'], ['丙申', '丁酉', '山下火'], ['戊戌', '己亥', '平地木'],
  ['庚子', '辛丑', '壁上土'], ['壬寅', '癸卯', '金箔金'], ['甲辰', '乙巳', '覆灯火'],
  ['丙午', '丁未', '天河水'], ['戊申', '己酉', '大驿土'], ['庚戌', '辛亥', '钗钏金'],
  ['壬子', '癸丑', '桑柘木'], ['甲寅', '乙卯', '大溪水'], ['丙辰', '丁巳', '沙中土'],
  ['戊午', '己未', '天上火'], ['庚申', '辛酉', '石榴木'], ['壬戌', '癸亥', '大海水']
];
const NAYIN = {};
NAYIN_LIST.forEach(([a, b, n]) => { NAYIN[a] = n; NAYIN[b] = n; });

// 十神：以日干为基准
function getShiShen(dayGan, otherGan) {
  const a = GAN_INFO[dayGan], b = GAN_INFO[otherGan];
  if (!a || !b) return '未知';
  if (a.el === b.el) return a.yin === b.yin ? '比肩' : '劫财';
  if (SHENG[a.el] === b.el) return a.yin === b.yin ? '食神' : '伤官';      // 我生
  if (KE[a.el] === b.el) return a.yin === b.yin ? '偏财' : '正财';        // 我克
  if (KE[b.el] === a.el) return a.yin === b.yin ? '七杀' : '正官';        // 克我
  if (SHENG[b.el] === a.el) return a.yin === b.yin ? '偏印' : '正印';     // 生我
  return '未知';
}

// 月令取格：月支本气十神 → 格局名
function buildPatternName(monthShiShen) {
  const map = {
    正官: '正官格', 七杀: '七杀格', 正印: '正印格', 偏印: '偏印格',
    食神: '食神格', 伤官: '伤官格', 正财: '正财格', 偏财: '偏财格',
    比肩: '建禄格', 劫财: '羊刃比劫格'
  };
  return map[monthShiShen] || '杂气格';
}

// 各十神（兼作格局）的通俗特征描述
const SHISHEN_FEATURE = {
  正官: '主规矩、责任与名望，行事稳重自律，重视秩序与口碑。',
  七杀: '主魄力、挑战与突破，行事果敢进取，敢于承压迎难。',
  正印: '主学识、庇护与涵养，性情温厚包容，得长辈师长之助。',
  偏印: '主领悟、专长与独立，心思沉静独到，宜钻研冷门技艺。',
  食神: '主才华、表达与享受，从容自在，多才多艺而通达。',
  伤官: '主聪明、创意与表现，灵动外放，不喜拘束、长于表达。',
  正财: '主踏实、积累与务实，稳健守成，靠勤勉致富。',
  偏财: '主机缘、流动与变通，灵活开阔，多有意外之财与外缘。',
  比肩: '主同辈、协作与自强，独立务实，朋友相助而各立。',
  劫财: '主竞争、行动与义气，积极外拓，重情尚义而喜争先。'
};

// 十神在四柱不同位置的意象侧重
const SHISHEN_POSITION = {
  yearGan: '祖上根基与早年环境',
  monthGan: '才华禀赋与同辈手足',
  dayZhi: '配偶宫与自我内在',
  timeGan: '子女缘分与晚年归宿'
};

// 格局层次（按月令透干与否粗略判定，仅供参考）
function buildPatternLevel(patternName, monthGanShiShen, monthZhiShiShen) {
  // 月干十神与月支本气十神同气（透干），格局更清纯
  if (monthGanShiShen === monthZhiShiShen) return '格局清纯，层次较佳';
  return '格局兼有杂气，宜辨主次而用';
}

function buildPatternText(patternName, monthShiShen, dayMasterGan, dayMasterEl, strong, primary) {
  const feature = SHISHEN_FEATURE[monthShiShen] || '';
  const strength = strong ? '日主偏强，自身能量较为充足' : '日主偏弱，需外力生扶以厚其基';
  const advice = strong
    ? '宜以「克、泄、耗」来平衡过旺之势，避免一味强进'
    : '宜以「生、扶」来补充自身能量，厚积而后发';
  return `本命以「${patternName}」为主导格局。${feature}日主为 ${dayMasterGan}（属${dayMasterEl}），${strength}。命理上呈现${strong ? '顺势而为、收敛有度' : '借力补足、稳健积累'}的倾向，喜用神落在「${ELEMENT_NAME[primary]}」系，${advice}。`;
}

// 主要城市经度（东经，单位：度），用于真太阳时校正
const CITY_LONGITUDE = {
  '北京': 116.4, '上海': 121.47, '天津': 117.2, '重庆': 106.55, '广州': 113.26,
  '深圳': 114.06, '成都': 104.07, '杭州': 120.15, '武汉': 114.31, '南京': 118.8,
  '西安': 108.95, '苏州': 120.62, '郑州': 113.65, '长沙': 112.94, '沈阳': 123.43,
  '青岛': 120.38, '大连': 121.62, '厦门': 118.09, '福州': 119.3, '昆明': 102.83,
  '贵阳': 106.71, '南宁': 108.37, '海口': 110.35, '兰州': 103.83, '太原': 112.55,
  '石家庄': 114.51, '哈尔滨': 126.63, '长春': 125.35, '济南': 117.0, '合肥': 117.27,
  '南昌': 115.86, '东莞': 113.75, '佛山': 113.12, '无锡': 120.3, '宁波': 121.55,
  '乌鲁木齐': 87.62, '拉萨': 91.13, '银川': 106.27, '西宁': 101.78, '呼和浩特': 111.75
};

// 时辰 → 代表时间（用于"时辰范围"模式的近似）
const SHICHEN_HOUR = {
  '子时': 0, '丑时': 2, '寅时': 4, '卯时': 6, '辰时': 8, '巳时': 10,
  '午时': 12, '未时': 14, '申时': 16, '酉时': 18, '戌时': 20, '亥时': 22
};

// 1986–1991 大陆夏令时（近似区间：4/15–9/15）
function isDST(year, month, day) {
  if (year < 1986 || year > 1991) return false;
  if (month > 4 && month < 9) return true;
  if (month === 4 && day >= 15) return true;
  if (month === 9 && day <= 15) return true;
  return false;
}

function getLongitude(city) {
  if (!city) return 116.4;
  for (const key of Object.keys(CITY_LONGITUDE)) {
    if (city.indexOf(key) !== -1) return CITY_LONGITUDE[key];
  }
  return 116.4; // 未知城市默认北京经度
}

// 计算真太阳时对应的 solar 时间（处理经度与时令）
function toTrueSolar(birthInfo) {
  let year = birthInfo.year;
  let month = birthInfo.month;
  let day = birthInfo.day;
  let hour, minute;

  if (birthInfo.timeMode === 'range') {
    hour = SHICHEN_HOUR[birthInfo.range] != null ? SHICHEN_HOUR[birthInfo.range] : 12;
    minute = 0;
  } else {
    hour = birthInfo.hour != null ? birthInfo.hour : 12;
    minute = birthInfo.minute != null ? birthInfo.minute : 0;
  }

  // 1) 农历 → 公历
  if (birthInfo.calendarType === 'lunar') {
    const lunar = Lunar.fromYmd(year, month, day);
    const s = lunar.getSolar();
    year = s.getYear();
    month = s.getMonth();
    day = s.getDay();
  }

  // 2) 真太阳时校正：经度差 + 夏令时扣回
  const lng = getLongitude(birthInfo.city);
  let adjustMin = (lng - 120) * 4; // 每度 4 分钟
  if (isDST(year, month, day)) adjustMin -= 60; // 夏令时时钟快 1 小时，扣回

  let totalMin = hour * 60 + minute + adjustMin;
  while (totalMin < 0) { totalMin += 1440; day -= 1; }
  while (totalMin >= 1440) { totalMin -= 1440; day += 1; }
  hour = Math.floor(totalMin / 60);
  minute = Math.round(totalMin % 60);

  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  return { solar, trueSolarStr: `${year}-${month}-${day} ${hour}:${String(minute).padStart(2, '0')}` };
}

// 主计算函数
function analyze(birthInfo) {
  const { solar, trueSolarStr } = toTrueSolar(birthInfo);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const pillars = {
    year: ec.getYear(),
    month: ec.getMonth(),
    day: ec.getDay(),
    time: ec.getTime()
  };

  const zodiac = lunar.getYearShengXiao();

  // 五行统计（天干 + 地支主气）
  const wuxing = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const allChars = [
    pillars.year[0], pillars.year[1],
    pillars.month[0], pillars.month[1],
    pillars.day[0], pillars.day[1],
    pillars.time[0], pillars.time[1]
  ];
  for (const ch of allChars) {
    const el = GAN_ELEMENT[ch] || ZHI_ELEMENT[ch];
    if (el) wuxing[el] += 1;
  }

  // 日主
  const dayMasterGan = pillars.day[0];
  const dayMasterEl = GAN_ELEMENT[dayMasterGan];

  // 喜用神推导（简化：以日主强弱判断扶抑）
  const shengWo = SHENG_WO[dayMasterEl];  // 生我者
  const woKe = KE[dayMasterEl];           // 我克者
  const woSheng = SHENG[dayMasterEl];     // 我生者（注意：SHENG 是 X->下一，即我生）
  const keWo = Object.keys(KE).find(k => KE[k] === dayMasterEl); // 克我者

  let support = 0, drain = 0;
  for (const ch of allChars) {
    const el = GAN_ELEMENT[ch] || ZHI_ELEMENT[ch];
    if (el === dayMasterEl || el === shengWo) support += 1;
    else if (el === woKe || el === woSheng || el === keWo) drain += 1;
  }

  let candidates; // 喜用神候选元素
  if (support >= drain) {
    // 日主偏强 → 喜克泄耗
    candidates = [woSheng, woKe, keWo];
  } else {
    // 日主偏弱 → 喜生扶
    candidates = [dayMasterEl, shengWo];
  }

  // 取候选中出现最少的元素作为主喜用神（趋于平衡）
  let primary = candidates[0];
  let minCount = Infinity;
  for (const el of candidates) {
    if (wuxing[el] < minCount) { minCount = wuxing[el]; primary = el; }
  }

  const xiyong = candidates.map(e => ELEMENT_NAME[e]).filter((v, i, a) => a.indexOf(v) === i);
  const luck = LUCKY[primary];

  // ---------- 十神与格局 ----------
  const shiShen = {
    yearGan: getShiShen(dayMasterGan, pillars.year[0]),
    monthGan: getShiShen(dayMasterGan, pillars.month[0]),
    timeGan: getShiShen(dayMasterGan, pillars.time[0]),
    monthZhi: getShiShen(dayMasterGan, ZHI_BENQI[pillars.month[1]] || '')
  };
  // 自坐（日支）十神
  const dayZhiShiShen = getShiShen(dayMasterGan, ZHI_BENQI[pillars.day[1]] || '');
  const pattern = buildPatternName(shiShen.monthZhi);
  const patternLevel = buildPatternLevel(pattern, shiShen.monthGan, shiShen.monthZhi);
  const patternText = buildPatternText(pattern, shiShen.monthZhi, dayMasterGan, dayMasterEl, support >= drain, primary);

  // 十神逐柱解读
  const shiShenDetail = [
    { pos: '年干', gan: pillars.year[0], ss: shiShen.yearGan, text: SHISHEN_POSITION.yearGan + '：' + (SHISHEN_FEATURE[shiShen.yearGan] || '') },
    { pos: '月干', gan: pillars.month[0], ss: shiShen.monthGan, text: SHISHEN_POSITION.monthGan + '：' + (SHISHEN_FEATURE[shiShen.monthGan] || '') },
    { pos: '日支', gan: pillars.day[1], ss: dayZhiShiShen, text: SHISHEN_POSITION.dayZhi + '：' + (SHISHEN_FEATURE[dayZhiShiShen] || '') },
    { pos: '时干', gan: pillars.time[0], ss: shiShen.timeGan, text: SHISHEN_POSITION.timeGan + '：' + (SHISHEN_FEATURE[shiShen.timeGan] || '') }
  ];

  // ---------- 身强身弱（得令 / 得地 / 得势）----------
  const monthZhiEl = ZHI_ELEMENT[pillars.month[1]];
  const deLing = (monthZhiEl === dayMasterEl) || (SHENG[monthZhiEl] === dayMasterEl); // 月令同我或生我
  // 得地：四柱地支藏干中是否有日主本气
  const zhis = [pillars.year[1], pillars.month[1], pillars.day[1], pillars.time[1]];
  let deDi = false;
  for (const z of zhis) {
    const cg = ZHI_CANG[z] || [];
    if (cg.some(g => GAN_ELEMENT[g] === dayMasterEl)) { deDi = true; break; }
  }
  // 得势：天干中比劫、印星帮身
  let deShi = 0;
  for (const g of [pillars.year[0], pillars.month[0], pillars.day[0], pillars.time[0]]) {
    const el = GAN_ELEMENT[g];
    if (el === dayMasterEl || el === shengWo) deShi += 1;
  }
  const strong = support >= drain;
  const strongText = strong ? '日主偏强' : '日主偏弱';
  const strongDetail =
    `身强身弱参三端：${deLing ? '得令' : '失令'}（月令${monthZhiEl}）、${deDi ? '得地' : '失地'}（地支有根）、得势 ${deShi} 干。` +
    (strong
      ? '三者兼具其二以上，日主能量偏足，宜向外疏导。'
      : '帮扶之力不足，日主偏弱，宜借生扶以厚根基。');

  // ---------- 五行占比 ----------
  const wuxingTotal = ELEMENTS.reduce((s, e) => s + wuxing[e], 0) || 1;
  const wuxingPercent = {};
  const wuxingBars = ELEMENTS.map((el) => {
    const pct = Math.round((wuxing[el] / wuxingTotal) * 100);
    wuxingPercent[el] = pct;
    return { el, count: wuxing[el], pct, color: ELEMENT_COLOR[el] };
  });
  // 五行旺衰解读
  let maxEl = ELEMENTS[0], minEl = ELEMENTS[0];
  for (const el of ELEMENTS) {
    if (wuxing[el] > wuxing[maxEl]) maxEl = el;
    if (wuxing[el] < wuxing[minEl]) minEl = el;
  }
  const wuxingAnalysis =
    `五行之中，「${maxEl}」最盛（${wuxing[maxEl]} 数），「${minEl}」最弱（${wuxing[minEl]} 数）。` +
    `日主属${dayMasterEl}，${minEl === dayMasterEl ? '本气偏弱，更需培补' : '本气尚有所依'}。` +
    '五行贵在流转有情、偏者得救；过旺宜泄，过弱宜扶，方成中和之象。';

  // ---------- 喜用神详细解读（用神 / 喜神 / 忌神）----------
  const xiShenEls = [SHENG_WO[primary], primary].filter((v, i, a) => a.indexOf(v) === i);
  let jiShenEls = strong
    ? [dayMasterEl, shengWo].filter((v, i, a) => a.indexOf(v) === i)
    : [keWo, woKe, woSheng].filter((v, i, a) => a.indexOf(v) === i);
  // 去重并剔除与喜神相冲突者（如"火"既生用神土、又克日主金时，不列为忌）
  jiShenEls = jiShenEls.filter(e => !xiShenEls.includes(e));
  const xiyongDetail =
    `日主 ${dayMasterGan}（属${dayMasterEl}）${strong ? '偏强' : '偏弱'}。喜用神为「${xiyong.join('、')}」系，` +
    `其中以「${ELEMENT_NAME[primary]}」为用神，喜神（生助用神者）为「${xiShenEls.map(e => ELEMENT_NAME[e]).join('、')}」，` +
    `忌神（克制耗泄用神者）为「${jiShenEls.map(e => ELEMENT_NAME[e]).join('、')}」。` +
    (strong
      ? '命局偏旺，宜以「克、泄、耗」来平衡过旺之气；'
      : '命局偏弱，宜以「生、扶」来补充自身能量；') +
    '日常可借助喜用色、幸运数字与幸运石，呼应喜用五行，趋于协调。';

  const luckyDetail =
    `喜用色以「${luck.colors.join('、')}」为主，日常衣着、居室点缀可呼应「${ELEMENT_NAME[primary]}」行；` +
    `幸运数字 ${luck.numbers.join('、')} 可在择日、编号等场合稍加留意；` +
    `幸运石 ${luck.stones.join('、')} 有助凝神聚气，随身佩戴亦佳。`;

  // 四柱纳音
  const nayin = {
    year: NAYIN[pillars.year] || '',
    month: NAYIN[pillars.month] || '',
    day: NAYIN[pillars.day] || '',
    time: NAYIN[pillars.time] || ''
  };

  return {
    pillars,
    zodiac,
    dayMaster: dayMasterGan,
    dayMasterElement: dayMasterEl,
    wuxing,
    strong,
    xiyong: xiyong.join('、'),
    primaryElement: primary,
    luckyColor: luck.colors,
    luckyNumber: luck.numbers,
    luckyStone: luck.stones,
    // —— 模块一：生辰格局 ——
    shiShen,
    shiShenDetail,
    dayZhiShiShen,
    pattern,
    patternLevel,
    patternText,
    strongText,
    strongDetail,
    nayin,
    // —— 模块二：五行 ——
    wuxingTotal,
    wuxingPercent,
    wuxingBars,
    wuxingColor: ELEMENT_COLOR,
    wuxingAnalysis,
    // —— 模块三：喜用神与幸运要素 ——
    xiShen: xiShenEls.map(e => ELEMENT_NAME[e]).join('、'),
    jiShen: jiShenEls.map(e => ELEMENT_NAME[e]).join('、'),
    xiyongDetail,
    luckyDetail,
    // 出生时校正值（供展示/调试）
    trueSolar: trueSolarStr
  };
}

module.exports = { analyze };
