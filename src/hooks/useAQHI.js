import { useEffect, useState } from 'react';
import { aqhiRiskCategory } from '../utils/colorScale.js';

/**
 * useAQHI — fetches the latest Air Quality Health Index (AQHI) data.
 *
 * VERIFY ENDPOINT: The data.gov.hk city-dashboard AQHI API is
 *   https://dashboard.data.gov.hk/api/aqhi?type=individual&lang=en
 * If that ever changes, search data.gov.hk for
 * "Air Quality Health Index - AQHI (JSON)" to find the current URL.
 *
 * The dataset does NOT include coordinates, so we join station names
 * against the well-known fixed station coordinates below.
 */

const AQHI_URL = 'https://dashboard.data.gov.hk/api/aqhi-individual?format=json';

// Approximate coordinates of the AQHI monitoring stations (fixed sites).
const STATION_COORDS = {
  'Central/Western': [22.2856, 114.1444],
  'Southern':        [22.2497, 114.1658],
  'Eastern':         [22.2832, 114.2233],
  'Kwun Tong':       [22.3150, 114.2239],
  'Sham Shui Po':    [22.3310, 114.1615],
  'Kwai Chung':      [22.3628, 114.1306],
  'Tsuen Wan':       [22.3713, 114.1112],
  'Tseung Kwan O':   [22.3098, 114.2606],
  'Yuen Long':       [22.4446, 114.0229],
  'Tuen Mun':        [22.4023, 113.9766],
  'Tung Chung':      [22.2887, 113.9432],
  'Tai Po':          [22.4512, 114.1647],
  'Sha Tin':         [22.3815, 114.1903],
  'North':           [22.4954, 114.1392],
  'Tap Mun':         [22.4719, 114.3603],
  'Causeway Bay':    [22.2802, 114.1831],
  'Central':         [22.2819, 114.1582],
  'Mong Kok':        [22.3219, 114.1681],
};

function parseAQHI(json, fetchedAt = new Date()) {
  // Verified payload: [{ station, aqhi, health_risk, publish_date }, ...]
  // Be defensive in case the endpoint is ever wrapped in { data: [...] }.
  const rows = Array.isArray(json) ? json : json?.data ?? [];
  return rows
    .map((row) => {
      const station = row.station || row.name || '';
      const aqhi = parseFloat(row.aqhi ?? row.AQHI);
      const coords = STATION_COORDS[station] || [null, null];
      // Prefer the EPD-published risk label; fall back to our own banding.
      const category =
        row.health_risk || (isNaN(aqhi) ? 'Unknown' : aqhiRiskCategory(aqhi));
      return {
        station,
        district: station, // station names map 1:1 to districts here
        aqhi: isNaN(aqhi) ? null : aqhi,
        category,
        timestamp: row.publish_date || row.publish_time || null,
        latitude: coords[0],
        longitude: coords[1],
      };
    })
    .filter((s) => s.station)
    .map((s) => ({ ...s, fetchedAt }));
}

export function useAQHI() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(AQHI_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setStations(parseAQHI(json, new Date()));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load AQHI data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Refresh every hour (the AQHI feed updates hourly).
    const timer = setInterval(load, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { stations, loading, error };
}
