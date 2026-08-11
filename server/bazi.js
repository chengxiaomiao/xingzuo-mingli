// server/bazi.js
// 命理计算引擎（规则计算，非 AI 生成）
// 依赖 lunar-javascript 进行公农历 / 八字 / 生肖换算
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

// 喜用神 → 颜色 / 数字 / 幸运石
const LUCKY = {
  金: { colors: ['白色', '金色', '银色'], numbers: ['4', '9'], stones: ['白水晶', '银饰', '砗磲'] },
  木: { colors: ['绿色', '青色', '翠色'], numbers: ['3', '8'], stones: ['绿幽灵', '翡翠', '木质饰品'] },
  水: { colors: ['黑色', '深蓝', '藏青'], numbers: ['1', '6'], stones: ['黑曜石', '海蓝宝', '黑玛瑙'] },
  火: { colors: ['红色', '紫色', '粉色'], numbers: ['2', '7'], stones: ['红玛瑙', '石榴石', '太阳石'] },
  土: { colors: ['黄色', '棕色', '咖啡色'], numbers: ['5', '0'], stones: ['黄水晶', '虎眼石', '茶晶'] }
};

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
  // 容错：城市名可能带"市/省"后缀
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
  let solar;
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
  // 处理跨日
  while (totalMin < 0) { totalMin += 1440; day -= 1; }
  while (totalMin >= 1440) { totalMin -= 1440; day += 1; }
  hour = Math.floor(totalMin / 60);
  minute = Math.round(totalMin % 60);

  solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
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
  const woSheng = SHENG[dayMasterEl];     // 我生者
  const keWo = Object.keys(KE).find((k) => KE[k] === dayMasterEl); // 克我者

  let support = 0, drain = 0;
  for (const ch of allChars) {
    const el = GAN_ELEMENT[ch] || ZHI_ELEMENT[ch];
    if (el === dayMasterEl || el === shengWo) support += 1;
    else if (el === woKe || el === woSheng || el === keWo) drain += 1;
  }

  let candidates;
  if (support >= drain) {
    candidates = [woSheng, woKe, keWo];
  } else {
    candidates = [dayMasterEl, shengWo];
  }

  let primary = candidates[0];
  let minCount = Infinity;
  for (const el of candidates) {
    if (wuxing[el] < minCount) { minCount = wuxing[el]; primary = el; }
  }

  const xiyong = candidates.map((e) => ELEMENT_NAME[e]).filter((v, i, a) => a.indexOf(v) === i);
  const luck = LUCKY[primary];

  return {
    pillars,
    zodiac,
    dayMaster: dayMasterGan,
    dayMasterElement: dayMasterEl,
    wuxing,
    strong: support >= drain,
    xiyong: xiyong.join('、'),
    primaryElement: primary,
    luckyColor: luck.colors,
    luckyNumber: luck.numbers,
    luckyStone: luck.stones,
    trueSolar: trueSolarStr
  };
}

module.exports = { analyze };
