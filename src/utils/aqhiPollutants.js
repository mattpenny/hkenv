/**
 * AQHI pollutant feed parsing + AQHI composition maths.
 *
 * Two upstream XML feeds from www.aqhi.gov.hk are parsed here. Their exact
 * shapes were captured from the live feeds (format verified, not assumed):
 *
 *  24pc_Eng.xml  — past-24-hour pollutant concentrations
 *    <AQHI24HrPollutantConcentration>
 *      <PollutantConcentration>
 *        <StationName>Central/Western</StationName>
 *        <DateTime>Mon, 05 Oct 2026 14:00:00 +0800</DateTime>
 *        <NO2>36.7</NO2> <O3>137.6</O3> <SO2>3.8</SO2> <CO>-</CO>
 *        <PM10>-</PM10> <PM2.5>-</PM2.5>
 *      </PollutantConcentration>
 *    </AQHI24HrPollutantConcentration>
 *    432 blocks = 18 stations x 24 hourly rows. NO2/O3/SO2/PM10/PM2.5 cover all
 *    18 stations; CO only covers some. A MISSING READING IS THE LITERAL "-",
 *    which must become null — never 0, or the UI silently reports a confident
 *    wrong value (the same trap the rainfall districts hit).
 *
 *  24aqhi_Eng.xml — past-24-hour AQHI, and the ONLY source of station type
 *    <item>
 *      <type>General Stations</type>
 *      <StationName>Central/Western</StationName>
 *      <DateTime>Mon, 05 Oct 2026 14:00:00 +0800</DateTime>
 *      <aqhi>4</aqhi>
 *    </item>
 *    Two traps here: the repeating block is <item> (NOT <AQHI>), and the value
 *    tag is lowercase <aqhi> whereas the concentration feed uses uppercase
 *    <NO2>/<O3>/<PM2.5>. Verified split: 15 General + 3 Roadside
 *    (Causeway Bay, Central, Mong Kok).
 *
 * AQHI COMPOSITION FORMULA (from the EPD FAQ, /en/what-is-aqhi/faqs.html)
 * -----------------------------------------------------------------------
 * The AQHI is a LOG-LINEAR HEALTH-RISK index, not a piecewise-linear breakpoint
 * table, and it is banded on the summed health risk (%AR) — NOT on a 1-10 raw
 * index. An earlier draft of this file got both wrong and produced nonsense
 * (an index of ~5.1 for a station EPD publishes as AQHI 3). The FAQ gives the
 * equations verbatim:
 *
 *     %AR = %AR(NO2) + %AR(SO2) + %AR(O3) + %AR(PM)
 *     %AR(X) = [ exp( β(X) × C(X) ) − 1 ] × 100%
 *
 *   where C(X) is the 3-HOUR MOVING AVERAGE concentration in µg/m³, and
 *   %AR(PM) = %AR(PM10) or %AR(PM2.5), WHICHEVER IS HIGHER.
 *
 * β risk factors (O3 revised 22 Mar 2025; all others unchanged since 2013):
 *     O3    0.0004888034   <- was 0.0005116328
 *     NO2   0.0004462559
 *     SO2   0.0001393235
 *     PM10  0.0002821751
 *     PM2.5 0.0002180567
 *
 * The summed %AR is then banded on the FAQ's cut-points (on %AR, not on an
 * index) — see AR_BANDS below.
 *
 * A pollutant's published share ("各污染物所佔比重") is its own %AR term over
 * the summed %AR: the same terms, expressed as a proportion.
 *
 * VERIFICATION: replaying all 18 stations × 24 hours of the live feed through
 * this formula reproduces EPD's own published AQHI exactly in 403 of 413
 * comparable hours (97.6%); the other 10 are off by a single band, none by
 * more. A 1-, 2- or 4-hour window scores materially worse (315 / 366 / 382),
 * which independently confirms the 3-hour moving average, and using "PM2.5
 * only" rather than "whichever PM is higher" also scores worse (355 / 413),
 * confirming the FAQ's wording.
 *
 * IMPORTANT: the shares below are OUR computation from our own moving average,
 * so they can differ from EPD's published figures by a rounding step. The UI
 * presents them as "computed from the AQHI formula", not as EPD-published.
 */

/** β risk factors from the EPD FAQ (O3 revised 22 March 2025). */
export const BETA = {
  SO2: 0.0001393235,
  NO2: 0.0004462559,
  O3: 0.0004888034,
  PM10: 0.0002821751,
  'PM2.5': 0.0002180567,
};

/**
 * %AR -> AQHI cut-points from the FAQ. `max` is an inclusive upper bound; the
 * first band the value does not exceed wins. Anything above 19.21 is the
 * "10+" (Serious) band, represented as 11 so it sorts above 10.
 */
export const AR_BANDS = [
  { aqhi: 1, max: 1.87 },
  { aqhi: 2, max: 3.73 },
  { aqhi: 3, max: 5.60 },
  { aqhi: 4, max: 7.46 },
  { aqhi: 5, max: 9.33 },
  { aqhi: 6, max: 11.20 },
  { aqhi: 7, max: 12.81 },
  { aqhi: 8, max: 14.94 },
  { aqhi: 9, max: 17.08 },
  { aqhi: 10, max: 19.21 },
];

/** The four pollutants the AQHI combines (PM = whichever of PM10/PM2.5 is higher). */
export const AQHI_POLLUTANTS = ['SO2', 'NO2', 'O3', 'PM'];

/** The five raw measured channels in the feed, in display order. */
export const RAW_POLLUTANTS = ['NO2', 'O3', 'SO2', 'PM10', 'PM2.5'];

/** Number of hourly readings averaged for the AQHI (EPD FAQ: 3-hour moving average). */
export const MOVING_AVERAGE_HOURS = 3;

/** Map a summed %AR to the published AQHI band. Returns 11 for the "10+" band. */
export function aqhiFromAR(ar) {
  if (ar == null || !Number.isFinite(ar)) return null;
  for (const b of AR_BANDS) if (ar <= b.max) return b.aqhi;
  return 11; // 10+ (Serious)
}

/** The three roadside monitoring stations (used as a fallback for <type>). */
export const ROADSIDE_STATIONS = ['Causeway Bay', 'Central', 'Mong Kok'];

/**
 * Parse an RFC-822 style datetime, e.g. "Mon, 05 Oct 2026 14:00:00 +0800".
 * The offset is honoured so timestamps render in the viewer's local zone.
 */
function parseFeedDate(s) {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a numeric feed field. The feeds use "-" for "no reading", which must
 * never be coerced to 0. Returns null for anything non-finite.
 */
function num(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s === '-') return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
}

/** Read the text of the first <tag>…</tag> inside an XML fragment. */
function tag(xml, name) {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? m[1].trim() : '';
}

/**
 * Split an XML document into the inner content of every <name>…</name> block.
 * Pass several candidate names to tolerate the feeds' inconsistent block
 * elements (e.g. <PollutantConcentration> vs <item>).
 */
function blocks(xml, ...names) {
  const out = [];
  for (const name of names) {
    const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi');
    let m;
    while ((m = re.exec(xml)) !== null) out.push(m[1]);
  }
  return out;
}

/** Decode the handful of XML entities these feeds actually use. */
function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Parse the pollutant-concentration feed into
 *   Map { "Central/Western" => [ { time, NO2, O3, SO2, CO, PM10, 'PM2.5' }, … ] }
 * with each station's rows sorted oldest -> newest.
 */
export function parsePollutantFeed(xml) {
  const byStation = new Map();
  if (!xml) return byStation;

  for (const raw of blocks(xml, 'PollutantConcentration', 'item')) {
    const station = decode(tag(raw, 'StationName'));
    if (!station) continue;

    const row = {
      time: parseFeedDate(tag(raw, 'DateTime')),
      station,
      NO2: num(tag(raw, 'NO2')),
      O3: num(tag(raw, 'O3')),
      SO2: num(tag(raw, 'SO2')),
      CO: num(tag(raw, 'CO')),
      PM10: num(tag(raw, 'PM10')),
      'PM2.5': num(tag(raw, 'PM2.5')),
    };

    // Only keep rows that carry at least one reading, so a stray header block
    // never produces an empty entry.
    if (RAW_POLLUTANTS.every((p) => row[p] == null)) continue;

    if (!byStation.has(station)) byStation.set(station, []);
    byStation.get(station).push(row);
  }

  for (const rows of byStation.values()) {
    rows.sort((a, b) => (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0));
  }
  return byStation;
}

/**
 * Parse the AQHI feed into
 *   Map { "Central/Western" => { aqhi, type: 'General'|'Roadside', series: [...] } }
 * The AQHI value used for display is the most recent row.
 */
export function parseStationFeed(xml) {
  const byStation = new Map();
  if (!xml) return byStation;

  for (const raw of blocks(xml, 'item')) {
    const station = decode(tag(raw, 'StationName'));
    if (!station) continue;

    const typeText = decode(tag(raw, 'type'));
    const aqhi = num(tag(raw, 'aqhi'));
    const time = parseFeedDate(tag(raw, 'DateTime'));

    if (!byStation.has(station)) {
      byStation.set(station, {
        station,
        // Trust the feed's own wording; fall back to the known Roadside list so
        // a missing <type> never mislabels a roadside site as general.
        type: /road/i.test(typeText)
          ? 'Roadside'
          : /general/i.test(typeText)
            ? 'General'
            : ROADSIDE_STATIONS.includes(station)
              ? 'Roadside'
              : 'General',
        typeRaw: typeText,
        latest: null,
        latestTime: null,
        series: [],
      });
    }

    const entry = byStation.get(station);
    if (aqhi != null) entry.series.push({ time, aqhi });
    if (aqhi != null && (entry.latestTime == null || (time && time > entry.latestTime))) {
      entry.latest = aqhi;
      entry.latestTime = time;
    }
  }

  for (const entry of byStation.values()) {
    entry.series.sort((a, b) => (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0));
  }
  return byStation;
}

/** Mean of the non-null values; null when nothing is available. */
function mean(values) {
  const nums = values.filter((v) => v != null);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Trailing moving average of `channel` over the last `hours` readings
 * (inclusive of index `end`). Readings with a null channel are skipped, which
 * mirrors treating "no data" as "not part of the average".
 */
export function movingAverage(rows, end, channel, hours = MOVING_AVERAGE_HOURS) {
  const start = Math.max(0, end - hours + 1);
  const window = rows.slice(start, end + 1);
  return mean(window.map((r) => r[channel]));
}

/**
 * Compute the AQHI composition at a single reading index.
 *
 * Returns null when any of the four decisive pollutants is unavailable, since a
 * partial sum would produce meaningless shares.
 *
 * PM follows the FAQ: %AR(PM) is whichever of PM10 / PM2.5 gives the HIGHER
 * %AR — not simply "prefer PM2.5". They must never be double counted. Note the
 * comparison is made on the %AR terms, so PM10 can win even when PM2.5 is
 * available (it has the larger β).
 */
export function compositionAt(rows, end, hours = MOVING_AVERAGE_HOURS) {
  const c = {
    SO2: movingAverage(rows, end, 'SO2', hours),
    NO2: movingAverage(rows, end, 'NO2', hours),
    O3: movingAverage(rows, end, 'O3', hours),
  };
  const pm25 = movingAverage(rows, end, 'PM2.5', hours);
  const pm10 = movingAverage(rows, end, 'PM10', hours);

  // %AR of each PM channel, then take the higher — this is the FAQ's rule.
  const arPm10 = pm10 != null ? Math.exp(BETA.PM10 * pm10) - 1 : null;
  const arPm25 = pm25 != null ? Math.exp(BETA['PM2.5'] * pm25) - 1 : null;
  let pmBasis = null;
  if (arPm10 != null && arPm25 != null) pmBasis = arPm10 >= arPm25 ? 'PM10' : 'PM2.5';
  else if (arPm10 != null) pmBasis = 'PM10';
  else if (arPm25 != null) pmBasis = 'PM2.5';

  c.PM = pmBasis === 'PM10' ? pm10 : pmBasis === 'PM2.5' ? pm25 : null;

  const terms = {};
  let sum = 0;
  for (const key of AQHI_POLLUTANTS) {
    const conc = c[key];
    const beta = key === 'PM' ? BETA[pmBasis] : BETA[key];
    if (conc == null || beta == null) return null;
    const t = Math.exp(beta * conc) - 1;
    terms[key] = t;
    sum += t;
  }
  if (!(sum > 0)) return null;

  const shares = {};
  for (const key of AQHI_POLLUTANTS) shares[key] = (terms[key] / sum) * 100;

  // %AR is the sum of the terms × 100 (the FAQ's "× 100%" on each term).
  const addedRisk = sum * 100;

  return {
    time: rows[end]?.time ?? null,
    hours,
    concentrations: c,
    pmBasis,
    terms,
    addedRisk, // summed %AR
    aqhi: aqhiFromAR(addedRisk),
    shares, // percentages, summing to ~100
  };
}

/**
 * Full composition series over the 24-hour window, one entry per reading with
 * enough data, so the chart can plot each pollutant's share over time.
 */
export function compositionSeries(rows, hours = MOVING_AVERAGE_HOURS) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (i < hours - 1) continue; // need a full window before the average is meaningful
    const c = compositionAt(rows, i, hours);
    if (c) out.push(c);
  }
  return out;
}

/**
 * Build the per-station pollutant view consumed by the UI from the two raw XML
 * documents. Station type comes from the AQHI feed and is applied first, so a
 * station is still classified correctly even with no concentration rows.
 */
export function buildPollutantStations(rawXml, stationXml) {
  const concByStation = parsePollutantFeed(rawXml);
  const metaByStation = parseStationFeed(stationXml);

  const names = new Set([...concByStation.keys(), ...metaByStation.keys()]);

  const stations = [];
  for (const name of names) {
    const rows = concByStation.get(name) ?? [];
    const meta = metaByStation.get(name);
    const last = rows.length - 1;

    // 1-hour (latest) values for the table — independent of the composite
    // window, so the table still shows the newest reading when the AQHI
    // composition is incomplete.
    const values = {};
    for (const p of RAW_POLLUTANTS) {
      values[p] = last >= 0 ? movingAverage(rows, last, p, 1) : null;
    }

    stations.push({
      station: name,
      type: meta?.type ?? (ROADSIDE_STATIONS.includes(name) ? 'Roadside' : 'General'),
      aqhi: meta?.latest ?? null,
      latestTime: rows[last]?.time ?? meta?.latestTime ?? null,
      rows,
      values,
      composition: last >= 0 ? compositionAt(rows, last) : null,
      series: compositionSeries(rows),
      aqhiSeries: meta?.series ?? [],
      // True when a channel the four-pollutant summary needs is missing.
      incomplete: !(last >= 0 && compositionAt(rows, last)),
    });
  }

  stations.sort((a, b) => a.station.localeCompare(b.station));
  return stations;
}
