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

/**
 * Compact labels for the header toggle. The full names are used as the
 * accessible name / tooltip; only the visible text is shortened so the
 * control stays small on a phone.
 */
export const LANGUAGE_SHORT = {
  en: 'Eng',
  zh: '中文',
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
    'aqhi.focusHint': 'Click to show this station on the map',
    'aqhi.focusHintCard': 'Click the station name to show it on the map',

    // Station type (General / Roadside)
    'station.general': 'General',
    'station.roadside': 'Roadside',
    'station.generalHint':
      'General station — the pollution level you are exposed to most of the time.',
    'station.roadsideHint':
      'Roadside station — measured beside heavy traffic and tall buildings.',
    'station.filterAll': 'All',
    'station.typeLabel': 'Station type',

    // Pollutants (Air Quality card, detail section)
    'poll.title': 'Pollutant Detail',
    'poll.open': 'Pollutant detail',
    'poll.openHint': 'Open pollutant detail for the stations',
    'poll.close': 'Close',
    'poll.aria.dialog': 'Pollutant detail for all stations',
    'poll.aria.chartPicker': 'Choose which pollutant to chart',

    /**
     * Short tab labels for the single-chart accordion. Kept separate from
     * `poll.legend.*` (which spells the names out for the chart caption) so the
     * summary row stays on one line on a phone.
     */
    'poll.chip.SO2': 'SO2',
    'poll.chip.NO2': 'NO2',
    'poll.chip.O3': 'O3',
    'poll.chip.PM10': 'PM10',
    'poll.chip.PM2.5': 'PM2.5',

    'poll.range.hours': 'last 24 hours',

    'poll.loading': 'Loading pollutant data…',
    'poll.unavailable':
      'Pollutant detail is not available on this deployment (the data feed needs a server-side proxy).',
    'poll.error': 'Could not load pollutant data: {error}',
    'poll.none': 'No pollutant data.',
    'poll.viewChart': 'Chart',
    'poll.viewTable': 'Table',
    'poll.aria.viewToggle': 'Switch between chart and table',
    'poll.chartTitle': '24-hour pollutant concentrations',
    'poll.chartCaption':
      'Hourly readings for {station}, in µg/m³. The dot marks the most recent hour; a break in a line means no reading was published for those hours.',
    'poll.seriesLabel': 'Pollutant series',
    'poll.legend.NO2': 'Nitrogen dioxide (NO2)',
    'poll.legend.O3': 'Ozone (O3)',
    'poll.legend.SO2': 'Sulphur dioxide (SO2)',
    'poll.legend.PM10': 'PM10',
    'poll.legend.PM2.5': 'PM2.5',
    'poll.unit': 'µg/m³',
    'poll.colPollutant': 'Pollutant',
    'poll.colLatest': 'Latest',
    'poll.colAvg': '3-hr avg',
    'poll.colShare': 'Share of AQHI',
    'poll.colMin': '24-hr min',
    'poll.colMax': '24-hr max',
    'poll.colAvg24': '24-hr avg',
    'poll.touchHint': 'Tap the chart for hourly values',
    'poll.na': '—',
    'poll.naHint': 'No reading published for this hour.',
    'poll.averaging':
      'Averaging window: {window}. The AQHI combines these pollutants over a 3-hour moving average.',
    'poll.window1h': '1 hour (latest reading)',
    'poll.window3h': '3 hours',
    'poll.window24h': '24 hours',
    'poll.pmBasis': 'PM counted as {basis} (whichever poses the higher health risk)',
    'poll.noComposition':
      'The AQHI breakdown is unavailable for this station/hour — a required pollutant reading is missing.',
    'poll.composedTitle': 'What makes up the AQHI here',
    'poll.composedCaption':
      'Each pollutant’s share of the summed added health risk (%AR), recomputed from the 3-hour moving average using the EPD formula. EPD publishes rounded shares, so these can differ by a percentage point.',
    'poll.arValue': 'Summed added health risk: {ar}% → AQHI {aqhi}',
    'poll.computedNotice': 'Recomputed by this app, not an EPD-published figure.',
    'poll.latestAt': 'Latest reading {time}',
    'poll.stationPicker': 'Station',
    'poll.noStation': 'Select a station to see its pollutant detail.',
    'poll.pmNote':
      'PM10 and PM2.5 are alternative measures of particulate matter. The AQHI uses whichever gives the higher health risk, so only one is counted.',
    'poll.source': 'Source: EPD AQHI past-24-hour pollutant concentration feed.',

    // Pollutant long names (also used by the table)
    'poll.name.NO2': 'Nitrogen dioxide',
    'poll.name.O3': 'Ozone',
    'poll.name.SO2': 'Sulphur dioxide',
    'poll.name.PM10': 'Respirable suspended particulates (PM10)',
    'poll.name.PM2.5': 'Fine suspended particulates (PM2.5)',
    'poll.short.NO2': 'NO2',
    'poll.short.O3': 'O3',
    'poll.short.SO2': 'SO2',
    'poll.short.PM10': 'PM10',
    'poll.short.PM2.5': 'PM2.5',

    // Beach card
    'beach.title': 'Beach Water Quality',
    'beach.loading': 'Loading beaches…',
    'beach.error': 'Could not load beach data: {error}',
    'beach.none': 'No beaches in service.',
    'beach.emptyInDistrict': 'No beaches in this district.',
    'beach.districtLabel': 'District',
    'beach.legend': 'Water quality grading',
    'beach.notOpen': 'Not open',
    'beach.notOpenForSwimming': 'Not open for swimming',
    'beach.warning': '{count} beach{plural} at Grade 3 or 4 — avoid swimming:',
    'beach.retrieved': 'Data retrieved {time}.',
    'beach.bestFirst': 'Sorted best water quality first.',
    'beach.focusHint': 'Click to show this beach on the map',
    'beach.noSamplingDate': '(feed does not publish a sampling date)',
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
    'rec.recommend': 'Recommend',
    'rec.denied': 'Location unavailable or permission denied — use the manual dropdown.',
    'rec.retry': 'Try again',
    'rec.err.unsupported': 'This browser does not support location. Use the dropdown instead.',
    'rec.err.insecure':
      'Location is blocked because this page is not served over HTTPS. Use the dropdown instead.',
    'rec.err.permission':
      'Location permission was denied. Allow location access in your browser settings, then try again.',
    'rec.err.unavailable':
      'Your location could not be determined right now. Try again, or pick a station below.',
    'rec.err.timeout': 'Location request timed out. Try again, or pick a station below.',
    'rec.err.unknown': 'Could not get your location. Please pick a station below.',
    'rec.noData': 'No nearby data found.',
    'rec.nearestStation': 'Nearest station: {station} — AQHI {aqhi} ({category}), {distance} km away',
    'rec.nearestBeach': 'Nearest beach: {beach} — {desc}, {distance} km away',

    // Observed rainfall (live HKO feed — a rolling 1-hour window)
    'rec.rainHeader': 'Rainfall in the past hour',
    'rec.rainWindow': 'Measured {start} – {end}',
    'rec.rainNone': 'Trace / none recorded',
    'rec.rainUnavailable': 'Rainfall data is unavailable right now.',
    'rec.rainMax': 'Wettest district: {district} — {mm} mm',
    'rec.rainYourDistrict': '{district} (your location)',
    'rec.rainNote':
      'A rolling 1-hour reading from the Hong Kong Observatory. Heavy rain raises bacteria levels, and this feed cannot total the last few days — so use your own judgement for older rain.',

    // Recommendation verdicts
    'rec.verdict.stayIndoors':
      'Stay indoors — air quality is too poor for outdoor activity.',
    'rec.verdict.skipBeach':
      'Skip the beach — water quality is not suitable for swimming. Try a park, pool or indoor activity instead.',
    'rec.verdict.goodDay': 'Good day to go out — conditions look fine.',
    'rec.verdict.mixed':
      'Conditions are mixed. Check the details below before heading out.',
    'rec.verdict.rain':
      ' Heads-up: {mm} mm of rain was recorded nearby in the past hour — runoff can raise bacteria levels, so swimming soon after rain is not advised.',

    // Map popups
    'popup.aqhi': 'AQHI',
    'popup.healthRisk': 'Health risk',

    // Footer
    'footer.toggle': 'Data sources',
    'footer.attribution':
      'This app uses open data from data.gov.hk, provided by the Hong Kong Special Administrative Region Government and the Environmental Protection Department.',
    'footer.disclaimer':
      'The data is provided on an "as is" basis. The Government makes no warranty as to its accuracy or completeness.',
    'footer.reference':
      'This app is for reference only and is not affiliated with the Government of Hong Kong. For personal, non-commercial use.',
    'footer.aqhiLink': 'EPD Air Quality Health Index',
    'footer.beachLink': 'EPD Beach Water Quality',
    'footer.rainLink': 'HKO Rainfall in the Past Hour',
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
    'legend.veryPoor': '極差 / 甚高',
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
    'aqhi.focusHint': '點擊可在地圖上顯示此監測站',
    'aqhi.focusHintCard': '點擊監測站名稱可在地圖上顯示',

    // Station type (General / Roadside)
    'station.general': '一般',
    'station.roadside': '路邊',
    'station.generalHint': '一般監測站 — 反映您大部分時間接觸到的污染水平。',
    'station.roadsideHint': '路邊監測站 — 於交通繁忙及高樓大廈旁量度。',
    'station.filterAll': '全部',
    'station.typeLabel': '監測站類型',

    // Pollutants (Air Quality card, detail section)
    'poll.title': '污染物詳情',
    'poll.open': '污染物詳情',
    'poll.openHint': '開啟各監測站的污染物詳情',
    'poll.close': '關閉',
    'poll.aria.dialog': '各監測站的污染物詳情',
    'poll.aria.chartPicker': '選擇要顯示圖表的污染物',

    'poll.chip.SO2': '二氧化硫',
    'poll.chip.NO2': '二氧化氮',
    'poll.chip.O3': '臭氧',
    'poll.chip.PM10': 'PM10',
    'poll.chip.PM2.5': 'PM2.5',

    'poll.range.hours': '過去 24 小時',

    'poll.loading': '正在載入污染物數據…',
    'poll.unavailable':
      '此部署未能提供污染物詳情（數據來源需要伺服器端代理）。',
    'poll.error': '無法載入污染物數據：{error}',
    'poll.none': '沒有污染物數據。',
    'poll.viewChart': '圖表',
    'poll.viewTable': '表格',
    'poll.aria.viewToggle': '切換圖表與表格',
    'poll.chartTitle': '過去 24 小時污染物濃度',
    'poll.chartCaption':
      '{station} 的每小時讀數，單位為微克／立方米。圓點標示最新一小時；折線中斷表示該時段沒有發布讀數。',
    'poll.seriesLabel': '污染物數列',
    'poll.legend.NO2': '二氧化氮（NO2）',
    'poll.legend.O3': '臭氧（O3）',
    'poll.legend.SO2': '二氧化硫（SO2）',
    'poll.legend.PM10': '可吸入懸浮粒子（PM10）',
    'poll.legend.PM2.5': '微細懸浮粒子（PM2.5）',
    'poll.unit': '微克／立方米',
    'poll.colPollutant': '污染物',
    'poll.colLatest': '最新',
    'poll.colAvg': '三小時平均',
    'poll.colShare': '佔空氣質素健康指數比重',
    'poll.colMin': '24 小時最低',
    'poll.colMax': '24 小時最高',
    'poll.colAvg24': '24 小時平均',
    'poll.touchHint': '點按圖表查看每小時數值',
    'poll.na': '—',
    'poll.naHint': '此小時沒有發布讀數。',
    'poll.averaging':
      '平均時段：{window}。空氣質素健康指數以三小時移動平均計算上述污染物。',
    'poll.window1h': '一小時（最新讀數）',
    'poll.window3h': '三小時',
    'poll.window24h': '24 小時',
    'poll.pmBasis': '懸浮粒子以 {basis} 計算（取健康風險較高者）',
    'poll.noComposition':
      '此監測站／小時未能計算空氣質素健康指數的組成 — 缺少所需的污染物讀數。',
    'poll.composedTitle': '此處空氣質素健康指數的組成',
    'poll.composedCaption':
      '各污染物在總增加健康風險（%AR）中所佔比重，按環保署公式以三小時移動平均重新計算。環保署公布的是四捨五入後的比重，因此數值可能相差一個百分點。',
    'poll.arValue': '總增加健康風險：{ar}% → 空氣質素健康指數 {aqhi}',
    'poll.computedNotice': '由本應用重新計算，並非環保署公布的數字。',
    'poll.latestAt': '最新讀數 {time}',
    'poll.stationPicker': '監測站',
    'poll.noStation': '請選擇監測站以查看其污染物詳情。',
    'poll.pmNote':
      'PM10 與 PM2.5 是懸浮粒子的兩種量度方式。空氣質素健康指數取健康風險較高者，因此只會計算其中一項。',
    'poll.source': '資料來源：環保署空氣質素健康指數過去 24 小時污染物濃度數據。',

    // Pollutant long names (also used by the table)
    'poll.name.NO2': '二氧化氮',
    'poll.name.O3': '臭氧',
    'poll.name.SO2': '二氧化硫',
    'poll.name.PM10': '可吸入懸浮粒子（PM10）',
    'poll.name.PM2.5': '微細懸浮粒子（PM2.5）',
    'poll.short.NO2': 'NO2',
    'poll.short.O3': 'O3',
    'poll.short.SO2': 'SO2',
    'poll.short.PM10': 'PM10',
    'poll.short.PM2.5': 'PM2.5',

    // Beach card
    'beach.title': '泳灘水質',
    'beach.loading': '正在載入泳灘數據…',
    'beach.error': '無法載入泳灘數據：{error}',
    'beach.none': '沒有開放中的泳灘。',
    'beach.emptyInDistrict': '此區域沒有泳灘。',
    'beach.districtLabel': '地區',
    'beach.legend': '水質等級',
    'beach.notOpen': '未開放',
    'beach.notOpenForSwimming': '未開放游泳',
    'beach.warning': '{count} 個泳灘為三級或四級 — 請避免游泳：',
    'beach.retrieved': '數據擷取時間 {time}。',
    'beach.bestFirst': '已按水質由最好至最差排序。',
    'beach.focusHint': '點擊可在地圖上顯示此泳灘',
    'beach.noSamplingDate': '（數據來源不提供採樣日期）',
    'beach.count': '{count} 個泳灘',
    'beach.grade1': '良好',
    'beach.grade2': '一般',
    'beach.grade3': '欠佳',
    'beach.grade4': '極差',

    // Beach map popup
    'popup.beachRetrieved': '數據擷取時間：{time}',

    // Recommendation card
    'rec.title': '今日適合外出嗎？',
    'rec.useLocation': '使用我的位置',
    'rec.locating': '正在定位…',
    'rec.noLocation': '未選擇位置',
    'rec.manualLabel': '地區 / 監測站（手動選擇）：',
    'rec.chooseStation': '請選擇監測站…',
    'rec.recommend': '建議',
    'rec.denied': '無法取得位置或被拒絕授權 — 請使用手動選單。',
    'rec.retry': '重試',
    'rec.err.unsupported': '此瀏覽器不支援定位功能，請使用下方選單。',
    'rec.err.insecure': '此頁面並非以 HTTPS 提供，瀏覽器已封鎖定位功能。請使用下方選單。',
    'rec.err.permission': '定位權限被拒絕。請在瀏覽器設定中允許存取位置，然後再試一次。',
    'rec.err.unavailable': '暫時無法確定您的位置。請再試一次，或於下方選擇監測站。',
    'rec.err.timeout': '定位請求逾時。請再試一次，或於下方選擇監測站。',
    'rec.err.unknown': '無法取得您的位置，請於下方選擇監測站。',
    'rec.noData': '附近沒有相關數據。',
    'rec.nearestStation': '最近的監測站：{station} — 空氣質素健康指數 {aqhi}（{category}），距離 {distance} 公里',
    'rec.nearestBeach': '最近的泳灘：{beach} — {desc}，距離 {distance} 公里',

    // Observed rainfall (live HKO feed — a rolling 1-hour window)
    'rec.rainHeader': '過去一小時雨量',
    'rec.rainWindow': '測量時段 {start} – {end}',
    'rec.rainNone': '微量 / 沒有記錄',
    'rec.rainUnavailable': '暫時無法取得雨量數據。',
    'rec.rainMax': '雨量最高的地區：{district} — {mm} 毫米',
    'rec.rainYourDistrict': '{district}（你的位置）',
    'rec.rainNote':
      '此為香港天文台的滾動一小時讀數。大雨會令細菌含量上升，而本數據源無法計算過去數日的總雨量 — 較早期的降雨請自行判斷。',

    // Recommendation verdicts
    'rec.verdict.stayIndoors': '請留在室內 — 空氣質素欠佳，不適合戶外活動。',
    'rec.verdict.skipBeach':
      '不建議前往泳灘 — 水質不適宜游泳。可考慮公園、游泳池或室內活動。',
    'rec.verdict.goodDay': '適合外出 — 環境狀況良好。',
    'rec.verdict.mixed': '狀況一般，外出前請先查看下方詳情。',
    'rec.verdict.rain':
      ' 請注意：過去一小時附近錄得 {mm} 毫米雨量 — 雨水沖刷可能令細菌含量上升，不建議雨後立即游泳。',

    // Map popups
    'popup.aqhi': '空氣質素健康指數',
    'popup.healthRisk': '健康風險',

    // Footer
    'footer.toggle': '資料來源',
    'footer.attribution':
      '本應用使用 data.gov.hk 的開放數據，由香港特別行政區政府及環境保護署提供。',
    'footer.disclaimer':
      '數據按「現狀」提供，政府對其準確性或完整性不作任何保證。',
    'footer.reference':
      '本應用僅供參考，與香港政府無關。僅供個人非商業用途。',
    'footer.aqhiLink': '環保署空氣質素健康指數',
    'footer.beachLink': '環保署泳灘水質',
    'footer.rainLink': '天文台過去一小時雨量',
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
/**
 * District -> Chinese label.
 *
 * Two naming schemes appear in the feeds:
 *   - the beach feed uses the official "X District" form (6 districts, the only
 *     ones that have gazetted beaches)
 *   - the HKO rainfall feed uses the shorter "X" form for most districts
 *     ("Sai Kung", "Sha Tin", "Kwun Tong") but keeps " District" on the
 *     island-based ones ("Southern District", "Islands District")
 *
 * Both spellings are listed so a name from either source translates. Anything
 * unmatched falls back to the English name, so a new district never renders
 * blank.
 */
export const DISTRICT_NAMES_ZH = {
  // --- Beach feed spellings ("X District") ---
  'Southern District': '南區',
  'Tsuen Wan District': '荃灣區',
  'Tuen Mun District': '屯門區',
  'Tai Po District': '大埔區',
  'Sai Kung District': '西貢區',
  'Islands District': '離島區',

  // --- All 18 districts, HKO rainfall feed spellings ---
  'Central & Western District': '中西區',
  'Eastern District': '東區',
  'Kwai Tsing': '葵青區',
  'North District': '北區',
  'Sai Kung': '西貢區',
  'Sha Tin': '沙田區',
  'Tai Po': '大埔區',
  'Tsuen Wan': '荃灣區',
  'Tuen Mun': '屯門區',
  'Wan Chai': '灣仔區',
  'Yuen Long': '元朗區',
  'Yau Tsim Mong': '油尖旺區',
  'Sham Shui Po': '深水埗區',
  'Kowloon City': '九龍城區',
  'Wong Tai Sin': '黃大仙區',
  'Kwun Tong': '觀塘區',
};

/** Translate a beach district name for the active language. */
export function districtLabel(name, lang) {
  if (lang === 'zh') return DISTRICT_NAMES_ZH[name] ?? name;
  return name;
}

/**
 * Beach name -> Chinese label.
 *
 * The feed is English-only, so these are the official EPD Chinese beach names.
 * Keys are the TRIMMED English names exactly as the feed reports them (the raw
 * feed has stray trailing spaces on a few names; useBeachQuality trims them).
 * `beachLabel()` falls back to the English name, so adding a beach never
 * renders a blank chip.
 */
export const BEACH_NAMES_ZH = {
  // Southern District
  'Big Wave Bay Beach': '大浪灣泳灘',
  'Chung Hom Kok Beach': '舂坎角泳灘',
  'Deep Water Bay Beach': '深水灣泳灘',
  'Hairpin Beach': '夏萍灣泳灘',
  'Middle Bay Beach': '中灣泳灘',
  'Repulse Bay Beach': '淺水灣泳灘',
  'Rocky Bay Beach': '石澳後灘泳灘',
  'Shek O Beach': '石澳泳灘',
  'South Bay Beach': '南灣泳灘',
  "St. Stephen's Beach": '聖士提反灣泳灘',
  'Stanley Main Beach': '赤柱正灘泳灘',
  'Turtle Cove Beach': '龜背灣泳灘',

  // Tsuen Wan District
  "Anglers' Beach": '釣魚灣泳灘',
  'Approach Beach': '近水灣泳灘',
  'Casam Beach': '更生灣泳灘',
  'Gemini Beaches': '雙仙灣泳灘',
  'Hoi Mei Wan Beach': '海美灣泳灘',
  'Lido Beach': '麗都灣泳灘',
  'Ma Wan Tung Wan Beach': '馬灣東灣泳灘',
  'Ting Kau Beach': '汀九灣泳灘',

  // Tuen Mun District
  'Butterfly Beach': '蝴蝶灣泳灘',
  'Cafeteria New Beach': '新咖啡灣泳灘',
  'Cafeteria Old Beach': '舊咖啡灣泳灘',
  'Castle Peak Beach': '青山灣泳灘',
  'Golden Beach': '黃金泳灘',
  'Kadoorie Beach': '加多利灣泳灘',

  // Sai Kung District
  'Clear Water Bay First Beach': '清水灣第一灣泳灘',
  'Clear Water Bay Second Beach': '清水灣第二灣泳灘',
  'Hap Mun Bay Beach': '廈門灣泳灘',
  'Kiu Tsui Beach': '橋咀泳灘',
  'Silverstrand Beach': '銀線灣泳灘',
  'Trio Beach': '三星灣泳灘',

  // Islands District
  'Cheung Chau Tung Wan Beach': '長洲東灣泳灘',
  'Discovery Bay Tai Pak Beach': '愉景灣大白灣泳灘',
  'Hung Shing Yeh Beach': '洪聖爺灣泳灘',
  'Kwun Yam Beach': '觀音灣泳灘',
  'Lo So Shing Beach': '蘆鬚城泳灘',
  'Lower Cheung Sha Beach': '下長沙泳灘',
  'Pui O Beach': '貝澳泳灘',
  'Silver Mine Bay Beach': '銀礦灣泳灘',
  'Tong Fuk Beach': '塘福泳灘',
  'Upper Cheung Sha Beach': '上長沙泳灘',

  // Tai Po District
  'Tai Po Lung Mei Beach': '大埔龍尾泳灘',
};

/** Translate a beach name for the active language. */
export function beachLabel(name, lang) {
  if (lang === 'zh') return BEACH_NAMES_ZH[name] ?? name;
  return name;
}
