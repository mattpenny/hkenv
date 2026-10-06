import { useEffect, useState } from 'react';

/**
 * useRainfall — observed rainfall for the past hour, by district.
 *
 * WHY THIS SOURCE
 * ---------------
 * The EPD feeds used elsewhere in this app carry no rainfall at all, so the
 * "Should I go out?" card previously asked the user to self-report heavy rain.
 * The Hong Kong Observatory publishes a real figure, and — unlike the EPD
 * beach feed — it sends `Access-Control-Allow-Origin: *`, so the browser can
 * call it directly. No serverless proxy is needed.
 *
 * ENDPOINT CHOICE — why `rhrread` and not `hourlyRainfall.php`
 * -----------------------------------------------------------
 * data.gov.hk points at `hourlyRainfall.php`, which returns 36 individual
 * automatic weather stations as *point* readings. `rhrread` carries the same
 * rolling 1-hour window but already aggregated to the **18 official districts
 * by name**, which is what this app displays everywhere else. District names
 * also mean no coordinate table to maintain, and the payload gives us explicit
 * `startTime` / `endTime` so the UI can state the window honestly.
 *
 * WHAT THIS CANNOT DO
 * -------------------
 * HKO publishes **only** a rolling 1-hour window. There is no 24-hour or
 * multi-day accumulated product (`rainfall24hr.php` 404s, and the `r` parameter
 * is ignored), so "did it rain heavily in the last 3 days?" is not answerable
 * from this feed. A 3-day total would require accumulating samples server-side
 * over time. The UI therefore labels the window explicitly and never implies a
 * multi-day total.
 */

const URL =
  import.meta.env.VITE_RAINFALL_URL ||
  'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en';
const TIMEOUT_MS = 15000;
/** Rainfall is refreshed roughly every 10-15 min; 10 min keeps us well inside. */
const REFRESH_MS = 10 * 60 * 1000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse into `{ districtName: mm }` plus the observation window.
 * `max` is the rainfall total in mm; `main` flags the reference station.
 */
function parse(json) {
  const rf = json?.rainfall;
  if (!rf || !Array.isArray(rf.data)) return null;

  const byDistrict = {};
  for (const row of rf.data) {
    const place = (row.place || '').trim();
    if (!place) continue;
    // HKO sends numbers, but occasionally a string. Treat unparseable as 0
    // rather than dropping the district, so every district stays selectable.
    const mm = Number.parseFloat(row.max);
    byDistrict[place] = Number.isFinite(mm) ? mm : 0;
  }

  return {
    byDistrict,
    unit: rf.data[0]?.unit || 'mm',
    startTime: rf.startTime || null,
    endTime: rf.endTime || null,
    updateTime: json.updateTime || null,
  };
}

export function useRainfall() {
  const [rainfall, setRainfall] = useState(null);
  const [loading, setLoading] = useState(true);
  /**
   * A rainfall outage must never break the recommendation card, so the error
   * is surfaced but callers are expected to degrade gracefully rather than
   * hide the card.
   */
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const json = await fetchJson(URL);
        if (cancelled) return;
        const parsed = parse(json);
        if (!parsed) throw new Error('Unexpected rainfall payload');
        setRainfall(parsed);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load rainfall');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // The feed updates every 15 minutes; refresh quietly in the background so a
    // tab left open does not show a stale figure indefinitely.
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { rainfall, loading, error };
}
