import { useState } from 'react';
import { nearest } from '../utils/colorScale.js';

/**
 * RecommendationCard — "Should I go out?"
 *
 * Uses the browser's geolocation (or a manual district pick) to find the
 * nearest beach and AQHI station, then gives advice.
 *
 * RAIN NOTE: Neither of the two open datasets this app uses contains rainfall
 * figures, and this app does not call a weather API. Rather than show a
 * warning based on data it does not have, heavy rain in the last 3 days is a
 * self-reported checkbox. Swap in a real rainfall feed here if you want an
 * automatic check (e.g. HKO Open Data API 9-day rainfall forecast).
 */
export default function RecommendationCard({ stations, beaches, onHighlight }) {
  const [point, setPoint] = useState(null); // { lat, lng, label }
  const [status, setStatus] = useState('idle'); // idle | locating | denied | ready | no-data
  const [recentRain, setRecentRain] = useState(false);
  const [result, setResult] = useState(null);

  function locate() {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' });
        setStatus('ready');
      },
      () => setStatus('denied'),
      { timeout: 8000 }
    );
  }

  function useStation(s) {
    if (s.latitude == null) return;
    setPoint({ lat: s.latitude, lng: s.longitude, label: s.station });
    setStatus('ready');
  }

  function recommend() {
    if (!point) return;
    const station = nearest(stations, point.lat, point.lng);
    const beach = nearest(beaches, point.lat, point.lng);
    if (!station && !beach) {
      setStatus('no-data');
      return;
    }

    const cat = station?.category ?? 'Unknown';
    const beachGrade = beach?.grade ?? null;
    let verdict, tone;

    if (cat === 'Very High' || cat === 'Serious') {
      verdict = 'Stay indoors — air quality is too poor for outdoor activity.';
      tone = 'bad';
    } else if (beachGrade >= 3) {
      verdict = 'Skip the beach — water quality is not suitable for swimming. Try a park, pool or indoor activity instead.';
      tone = 'warn';
    } else if ((cat === 'Low' || cat === 'Moderate') && beachGrade <= 2) {
      verdict = 'Good day to go out — conditions look fine.';
      tone = 'good';
    } else {
      verdict = 'Conditions are mixed. Check the details below before heading out.';
      tone = 'warn';
    }

    if (recentRain) {
      verdict +=
        ' Heads-up: you reported heavy rain in the last 3 days — runoff can raise bacteria levels, so swimming soon after rain is not advised.';
      tone = tone === 'good' ? 'warn' : tone;
    }

    setResult({ verdict, tone, station, beach, recentRain });
    // Pan the map to the recommended spot.
    const target = beach ?? station;
    onHighlight?.({
      type: beach ? 'beach' : 'station',
      id: beach ? beach.name : station.station,
      lat: target.latitude,
      lng: target.longitude,
    });
  }

  return (
    <section className="card">
      <h3>Should I Go Out?</h3>

      <div className="row">
        <button className="btn" onClick={locate} disabled={status === 'locating'}>
          {status === 'locating' ? 'Locating…' : '📍 Use my location'}
        </button>
        <span className="muted">{point ? point.label : 'No location selected'}</span>
      </div>

      <label className="row muted">
        District / station (manual fallback):
        <select
          value={point?.label ?? ''}
          onChange={(e) => {
            const s = stations.find((x) => x.station === e.target.value);
            if (s) useStation(s);
          }}
        >
          <option value="">Choose a station…</option>
          {stations.map((s) => (
            <option key={s.station} value={s.station}>
              {s.station}
            </option>
          ))}
        </select>
      </label>

      <label className="row checkbox">
        <input
          type="checkbox"
          checked={recentRain}
          onChange={(e) => setRecentRain(e.target.checked)}
        />
        It rained heavily in the last 3 days (you tell us — this app has no rainfall feed)
      </label>

      <button className="btn primary" onClick={recommend} disabled={!point}>
        Recommend
      </button>

      {status === 'denied' && (
        <p className="error">Location unavailable or permission denied — use the manual dropdown.</p>
      )}
      {status === 'no-data' && <p className="error">No nearby data found.</p>}

      {result && (
        <div className={`verdict ${result.tone}`}>
          <p>{result.verdict}</p>
          {result.station && (
            <small>
              Nearest station: <b>{result.station.station}</b> — AQHI {result.station.aqhi} (
              {result.station.category}), {result.station.distanceKm?.toFixed(1)} km away
            </small>
          )}
          {result.beach && (
            <small>
              <br />
              Nearest beach: <b>{result.beach.name}</b> — {result.beach.desc},{' '}
              {result.beach.distanceKm?.toFixed(1)} km away
            </small>
          )}
        </div>
      )}
    </section>
  );
}