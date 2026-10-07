import { useEffect, useState } from 'react';
import { BEACH_GRADE_LABELS } from '../utils/colorScale.js';

/**
 * useBeachQuality — fetches the latest Beach Water Quality Grading
 * spatial data (GeoJSON, includes coordinates).
 *
 * VERIFY ENDPOINT: the EPD "Beach Water Quality Grading" GeoJSON is served by
 * the EPICDI service at:
 *   https://cd.epic.epd.gov.hk/EPICDI/json/beach/beachgrading?lang=en
 * (The older beachwq.gov.hk .geojson path now just redirects here.) If it ever
 * changes, search data.gov.hk for "Beach Water Quality Grading".
 *
 * CORS NOTE — why this never calls EPD directly from the browser:
 * The EPD host sends no Access-Control-Allow-Origin header, so a direct browser
 * fetch is blocked. Vite's built-in http-proxy does not help either: EPD's load
 * balancer answers proxied requests with an HTML "Invalid Access !!!" page.
 * So the feed is always fetched server-side and re-served same-origin:
 *   - development      -> /epic/beach  (middleware in vite.config.js)
 *   - production       -> /api/beach   (serverless function in api/beach.js)
 * Set VITE_BEACH_URL to override with your own proxy if you host elsewhere.
 */

/**
 * The previous public-CORS-proxy fallback (api.allorigins.win / corsproxy.io)
 * was removed: allorigins now returns 522 and corsproxy.io requires an API
 * key, so both simply hung. Combined with the absence of a timeout, the UI sat
 * on "Loading beaches…" forever. A timeout is now enforced. */
const DEV_URL = '/epic/beach';
const PROD_URL = '/api/beach';
const URL =
  import.meta.env.VITE_BEACH_URL || (import.meta.env.DEV ? DEV_URL : PROD_URL);
const TIMEOUT_MS = 15000;

/** Extract "Grade 2 - Fair" style labels for display. */
function gradeFromDesc(desc) {
  const m = /Grade\s*([1-4])/i.exec(desc || '');
  return m ? parseInt(m[1], 10) : null;
}

/** Never let a stalled request hang the UI forever. */
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
 * NOTE ON DATES: this GeoJSON feed does NOT include a grading/last-updated
 * date field (properties are: district, name, image, grade, status, desc,
 * beachCode). The dataset page states data is generally posted within 48
 * hours of sampling. We therefore report the time this app fetched the feed
 * and say so plainly in the UI rather than inventing a sampling date.
 *
 * NOTE ON CLOSED BEACHES: the feed lists all 43 gazetted beaches, of which a
 * few are `status: "notopen"` (out of season) and carry an empty grade. These
 * are KEPT rather than dropped: the district roster in the UI should match the
 * official beach list, and "this beach is closed for the season" is useful
 * information — silently omitting it just looks like a missing beach. They are
 * tagged `open:false` so the card can render them without a grade badge.
 */
function parseGeoJSON(geojson, fetchedAt = new Date()) {
  const features = geojson?.features ?? [];
  return features
    .map((f) => {
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry?.coordinates ?? [null, null];

      // `status` is "open" for in-service beaches, anything else (e.g.
      // "notopen") means out of season for swimming.
      const status = (p.status || '').toLowerCase();
      const open = status === '' || status === 'open';

      // A closed beach carries grade "" — keep it, but with no grade.
      const gradeNum = parseInt(p.grade, 10);
      const grade = Number.isNaN(gradeNum) || gradeNum < 1 || gradeNum > 4 ? null : gradeNum;

      // Guard against a grade/desc mismatch (a data glitch we saw once). Only
      // meaningful when both are present; a closed beach has neither.
      if (open && grade == null) return null;
      if (open && gradeFromDesc(p.desc) !== null && gradeFromDesc(p.desc) !== grade) return null;

      return {
        name: (p.name || 'Unknown beach').trim(),
        district: p.district || '',
        open,
        grade,
        gradeLabel: grade != null ? BEACH_GRADE_LABELS[grade] ?? 'Unknown' : null,
        desc: p.desc || (grade != null ? `Grade ${grade}` : ''),
        beachCode: p.beachCode || '',
        updateDate: null, // not provided by the feed — see note above
        fetchedAt,
        latitude: lat,
        longitude: lng,
      };
    })
    .filter(Boolean);
}

export function useBeachQuality() {
  const [beaches, setBeaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const geojson = await fetchJson(URL);
        if (!cancelled) setBeaches(parseGeoJSON(geojson, new Date()));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load beach data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { beaches, loading, error };
}
