/**
 * translations.js — all UI strings, English and Traditional Chinese.
 *
 * Keys are grouped by area. Both languages MUST define the same keys;
 * `t()` falls back to the key itself so a missing string is visible rather
 * than crashing.
 *
 * Placeholders use {name} syntax and are substituted by `t(key, vars)`.
 */

export const LANGUAGES = {
  en: 'English',
  zh: '繁體中文',
};

export const STRINGS = {
  en: {
    // Header
    'app.title': 'HK Environment Watch',
    'app.subtitle': 'Air quality and beach water quality across Hong Kong',
    'lang.label': 'Language',

    // Map controls
    'map.layerStations': 'Air Quality Stations',
    'map.layerBeaches': 'Beaches',
    'map.legend': 'Legend',
    'map.legend.show': 'Show legend',
    'map.legend.hide': 'Hide legend',
    'map.aria': 'Map of Hong Kong air quality stations and beaches',

    // Legend entries
    'legend.good': 'Good / Low risk',
    'legend.goodDetail': 'AQHI 1-3, Grade 1',
    'legend.fair': 'Fair / Moderate',
    'legend.fairDetail': 'AQHI 4-6, Grade 2',
    'legend.poor': 'Poor / High',
    'legend.poorDetail': 'AQHI 7, Grade 3',
    'legend.veryPoor': 'Very Poor / Very High',
    'legend.veryPoorDetail': 'AQHI 8-10, Grade 4',
    'legend.serious': 'Serious',
    'legend.seriousDetail': 'AQHI 10+',

    // Region tabs
    'region.label': 'Area',
    'region.hongkong': 'Hong Kong',
    'region.kowloon': 'Kowloon',
    'region.newterritories': 'New Territories',
    'region.defaultFromLocation': 'Area set from your location',
    'region.other': 'Other',

    // Air quality card
    'aqhi.title': 'Air Quality Now',
    'aqhi.loading': 'Loading AQHI…',
    'aqhi.error': 'Could not load AQHI data: {error}',
    'aqhi.none': 'No data.',
    'aqhi.emptyInRegion': 'No monitoring stations in this area.',
    'aqhi.highest': 'Highest: {station}',
    'aqhi.published': 'Published {time}',
    'aqhi.healthRisk': 'Health risk',
    'aqhi.na': 'n/a',
    'aqhi.stationCount': '{count} stations',

    // Beach card
    'beach.title': 'Beach Water Quality',
    'beach.loading': 'Loading beaches…',
    'beach.error': 'Could not load beach data: {error}',
    'beach.none': 'No beaches in service.',
    'beach.emptyInRegion': 'No beaches in service in this area.',
    'beach.warning': '{count} beach{plural} at Grade 3 or 4 — avoid swimming:',
    'beach.retrieved': 'Data retrieved {time}.',
    'beach.noSamplingDate': '(feed does not publish a sampling date)',
    'beach.closedExcluded': 'Beaches closed for the season are excluded.',
    'beach.count': '{count} beaches',
    'beach.grade1': 'Good',
    'beach.grade2': 'Fair',
    'beach.grade3': 'Poor',
    'beach.grade4': 'Very Poor',

    // Beach map popup
    'popup.beachRetrieved': 'Data retrieved: {time}',

    // Recommendation card
    'rec.title': 'Should I Go Out?',
    'rec.useLocation': 'Use my location',
    'rec.locating': 'Locating…',
    'rec.noLocation': 'No location selected',
    'rec.manualLabel': 'District / station (manual fallback):',
    'rec.chooseStation': 'Choose a station…',
    'rec.rainedLabel': 'It rained heavily in the last 3 days',
    'rec.rainedNote': 'you tell us — this app has no rainfall feed',
    'rec.recommend': 'Recommend',
    'rec.denied': 'Location unavailable or permission denied — use the manual dropdown.',
    'rec.noData': 'No nearby data found.',
    'rec.nearestStation': 'Nearest station: {station} — AQHI {aqhi} ({category}), {distance} km away',
    'rec.nearestBeach': 'Nearest beach: {beach} — {desc}, {distance} km away',

    // Recommendation verdicts
    'rec.verdict.stayIndoors':
      'Stay indoors — air quality is too poor for outdoor activity.',
    'rec.verdict.skipBeach':
      'Skip the beach — water quality is not suitable for swimming. Try a park, pool or indoor activity instead.',
    'rec.verdict.goodDay': 'Good day to go out — conditions look fine.',
    'rec.verdict.mixed':
      'Conditions are mixed. Check the details below before heading out.',
    'rec.verdict.rain':
      ' Heads-up: you reported heavy rain in the last 3 days — runoff can raise bacteria levels, so swimming soon after rain is not advised.',

    // Map popups
    'popup.aqhi': 'AQHI',
    'popup.healthRisk': 'Health risk',

    // Footer
    'footer.attribution':
      'This app uses open data from data.gov.hk, provided by the Hong Kong Special Administrative Region Government and the Environmental Protection Department.',
    'footer.disclaimer':
      'The data is provided on an "as is" basis. The Government makes no warranty as to its accuracy or completeness.',
    'footer.reference':
      'This app is for reference only and is not affiliated with the Government of Hong Kong. For personal, non-commercial use.',
    'footer.aqhiLink': 'EPD Air Quality Health Index',
    'footer.beachLink': 'EPD Beach Water Quality',
    'footer.mapTiles': 'Map tiles ©',
    'footer.contributors': 'contributors',
  },

  zh: {
    // Header
    'app.title': '香港環境監測',
    'app.subtitle': '全港空氣質素及泳灘水質',
    'lang.label': '語言',

    // Map controls
    'map.layerStations': '空氣質素監測站',
    'map.layerBeaches': '泳灘',
    'map.legend': '圖例',
    'map.legend.show': '顯示圖例',
    'map.legend.hide': '隱藏圖例',
    'map.aria': '香港空氣質素監測站及泳灘地圖',

    // Legend entries
    'legend.good': '良好 / 低風險',
    'legend.goodDetail': '空氣質素健康指數 1-3，一級',
    'legend.fair': '一般 / 中等',
    'legend.fairDetail': '空氣質素健康指數 4-6，二級',
    'legend.poor': '欠佳 / 高',
    'legend.poorDetail': '空氣質素健康指數 7，三級',
    'legend.veryPoor': '甚差 / 甚高',
    'legend.veryPoorDetail': '空氣質素健康指數 8-10，四級',
    'legend.serious': '嚴重',
    'legend.seriousDetail': '空氣質素健康指數 10+',

    // Region tabs
    'region.label': '地區',
    'region.hongkong': '香港島',
    'region.kowloon': '九龍',
    'region.newterritories': '新界',
    'region.defaultFromLocation': '已根據您的位置選擇地區',
    'region.other': '其他',

    // Air quality card
    'aqhi.title': '現時空氣質素',
    'aqhi.loading': '正在載入空氣質素數據…',
    'aqhi.error': '無法載入空氣質素數據：{error}',
    'aqhi.none': '沒有數據。',
    'aqhi.emptyInRegion': '此地區沒有監測站。',
    'aqhi.highest': '最高：{station}',
    'aqhi.published': '發布時間 {time}',
    'aqhi.healthRisk': '健康風險',
    'aqhi.na': '無資料',
    'aqhi.stationCount': '{count} 個監測站',

    // Beach card
    'beach.title': '泳灘水質',
    'beach.loading': '正在載入泳灘數據…',
    'beach.error': '無法載入泳灘數據：{error}',
    'beach.none': '沒有開放中的泳灘。',
    'beach.emptyInRegion': '此地區沒有開放中的泳灘。',
    'beach.warning': '{count} 個泳灘為三級或四級 — 請避免游泳：',
    'beach.retrieved': '數據擷取時間 {time}。',
    'beach.noSamplingDate': '（數據來源不提供採樣日期）',
    'beach.closedExcluded': '已剔除季節性關閉的泳灘。',
    'beach.count': '{count} 個泳灘',
    'beach.grade1': '良好',
    'beach.grade2': '一般',
    'beach.grade3': '欠佳',
    'beach.grade4': '甚差',

    // Beach map popup
    'popup.beachRetrieved': '數據擷取時間：{time}',

    // Recommendation card
    'rec.title': '今日適合外出嗎？',
    'rec.useLocation': '使用我的位置',
    'rec.locating': '正在定位…',
    'rec.noLocation': '未選擇位置',
    'rec.manualLabel': '地區 / 監測站（手動選擇）：',
    'rec.chooseStation': '請選擇監測站…',
    'rec.rainedLabel': '過去三日曾下大雨',
    'rec.rainedNote': '由您自行申報 — 本應用沒有雨量數據',
    'rec.recommend': '建議',
    'rec.denied': '無法取得位置或被拒絕授權 — 請使用手動選單。',
    'rec.noData': '附近沒有相關數據。',
    'rec.nearestStation': '最近的監測站：{station} — 空氣質素健康指數 {aqhi}（{category}），距離 {distance} 公里',
    'rec.nearestBeach': '最近的泳灘：{beach} — {desc}，距離 {distance} 公里',

    // Recommendation verdicts
    'rec.verdict.stayIndoors': '請留在室內 — 空氣質素欠佳，不適合戶外活動。',
    'rec.verdict.skipBeach':
      '不建議前往泳灘 — 水質不適宜游泳。可考慮公園、游泳池或室內活動。',
    'rec.verdict.goodDay': '適合外出 — 環境狀況良好。',
    'rec.verdict.mixed': '狀況一般，外出前請先查看下方詳情。',
    'rec.verdict.rain':
      ' 請注意：您表示過去三日曾下大雨 — 雨水沖刷可能令細菌含量上升，不建議雨後立即游泳。',

    // Map popups
    'popup.aqhi': '空氣質素健康指數',
    'popup.healthRisk': '健康風險',

    // Footer
    'footer.attribution':
      '本應用使用 data.gov.hk 的開放數據，由香港特別行政區政府及環境保護署提供。',
    'footer.disclaimer':
      '數據按「現狀」提供，政府對其準確性或完整性不作任何保證。',
    'footer.reference':
      '本應用僅供參考，與香港政府無關。僅供個人非商業用途。',
    'footer.aqhiLink': '環保署空氣質素健康指數',
    'footer.beachLink': '環保署泳灘水質',
    'footer.mapTiles': '地圖圖塊 ©',
    'footer.contributors': '貢獻者',
  },
};

/** Human-readable health-risk category, translated. */
export const RISK_LABELS = {
  en: {
    Low: 'Low',
    Moderate: 'Moderate',
    High: 'High',
    'Very High': 'Very High',
    Serious: 'Serious',
    Unknown: 'Unknown',
  },
  zh: {
    Low: '低',
    Moderate: '中等',
    High: '高',
    'Very High': '甚高',
    Serious: '嚴重',
    Unknown: '未知',
  },
};

/**
 * AQHI station name -> Chinese label.
 *
 * The feed publishes English station names only, so these official Chinese
 * equivalents are kept here. `stationLabel()` falls back to the English name
 * when a station is missing, so a new station never renders blank.
 */
export const STATION_NAMES_ZH = {
  'Central/Western': '中西區',
  Central: '中環',
  'Causeway Bay': '銅鑼灣',
  Eastern: '東區',
  Southern: '南區',
  'Kwun Tong': '觀塘',
  'Sham Shui Po': '深水埗',
  'Mong Kok': '旺角',
  'Kwai Chung': '葵涌',
  'Tsuen Wan': '荃灣',
  'Tseung Kwan O': '將軍澳',
  'Yuen Long': '元朗',
  'Tuen Mun': '屯門',
  'Tung Chung': '東涌',
  'Tai Po': '大埔',
  'Sha Tin': '沙田',
  North: '北區',
  'Tap Mun': '塔門',
};

/** Translate an AQHI station name for the active language. */
export function stationLabel(name, lang) {
  if (lang === 'zh') return STATION_NAMES_ZH[name] ?? name;
  return name;
}

/**
 * Beach district name -> Chinese label.
 * Like the stations, the beach feed is English-only.
 */
export const DISTRICT_NAMES_ZH = {
  'Southern District': '南區',
  'Tsuen Wan District': '荃灣區',
  'Tuen Mun District': '屯門區',
  'Tai Po District': '大埔區',
  'Sai Kung District': '西貢區',
  'Islands District': '離島區',
};

/** Translate a beach district name for the active language. */
export function districtLabel(name, lang) {
  if (lang === 'zh') return DISTRICT_NAMES_ZH[name] ?? name;
  return name;
}
