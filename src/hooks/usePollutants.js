import { useCallback, useEffect, useState } from 'react';
import { buildPollutantStations } from '../utils/aqhiPollutants.js';

/**
 * usePollutants — fetches hourly NO2 / O3 / SO2 / PM10 / PM2.5 for all 18 AQHI
 * stations, plus each station's General/Roadside classification, and derives
 * the AQHI pollutant-share breakdown.
 *
 * CORS NOTE — why this never calls aqhi.gov.hk directly:
 * www.aqhi.gov.hk replies with `Access-Control-Allow-Origin: https://aqhi.gov.hk`
 * (not `*`), so a browser fetch is blocked (verified: rejects with
 * "Failed to fetch"). The feeds are therefore fetched server-side and re-served
 * same-origin:
 *   - development -> /epd/aqhi   (middleware in vite.config.js)
 *   - production  -> /api/aqhi   (serverless function in api/aqhi.js)
 * Set VITE_AQHI_URL to point at your own proxy if you host elsewhere.
 *
 * On hosts without the serverless function (e.g. a plain GitHub Pages deploy),
 * the request fails. Rather than showing an empty card, the hook reports
 * `available: false` so the UI can hide the pollutant section and keep the rest
 * of the card working — the same graceful degradation used elsewhere.
 */

const DEV_URL = '/epd/aqhi';
const PROD_URL = '/api/aqhi';
const URL =
  import.meta.env.VITE_AQHI_URL || (import.meta.env.DEV ? DEV_URL : PROD_URL);
const TIMEOUT_MS = 15000;

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

export function usePollutants() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    try {
      const payload = await fetchJson(URL);
      const parsed = buildPollutantStations(payload?.pollutants, payload?.stations);
      if (!parsed.length) throw new Error('Feed contained no station data');
      setStations(parsed);
      setError(null);
      setAvailable(true);
    } catch (err) {
      // Distinguish "proxy not deployed" from a transient failure: the section
      // is hidden only when we have never successfully loaded data.
      setAvailable(false);
      setError(err.message || 'Failed to load pollutant data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    // The feeds update hourly, matching the AQHI refresh cadence.
    const timer = setInterval(() => {
      if (!cancelled) load();
    }, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  return { stations, loading, error, available, reload: load };
}
