import { useState } from 'react';
import { nearest } from '../utils/colorScale.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * RecommendationCard — "Should I go out?"
 *
 * Uses the browser's geolocation (or a manual station pick) to find the
 * nearest beach and AQHI station, then gives advice.
 *
 * RAIN NOTE: Neither of the two open datasets this app uses contains rainfall
 * figures, and this app does not call a weather API. Rather than show a
 * warning based on data it does not have, heavy rain in the last 3 days is a
 * self-reported checkbox. Swap in a real rainfall feed here if you want an
 * automatic check (e.g. HKO Open Data API 9-day rainfall forecast).
 */
export default function RecommendationCard({ stations, beaches, onHighlight }) {
  const { t, tRisk, tStation, tBeach } = useI18n();
  const [point, setPoint] = useState(null); // { lat, lng, label }
  const [status, setStatus] = useState('idle'); // idle | locating | denied | ready | no-data
  const [geoError, setGeoError] = useState(null); // specific reason, shown to the user
  const [recentRain, setRecentRain] = useState(false);
  const [result, setResult] = useState(null);

  function locate() {
    setGeoError(null);

    // 1. Feature detection. Some browsers expose navigator.geolocation but
    //    silently refuse to call back, so also guard the insecure-context case.
    if (!navigator.geolocation) {
      setStatus('denied');
      setGeoError(t('rec.err.unsupported'));
      return;
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      // Geolocation is blocked on plain http:// (except localhost).
      setStatus('denied');
      setGeoError(t('rec.err.insecure'));
      return;
    }

    // 2. Always leave the button in a visible state, even if the browser
    //    never calls back. Without this, a hung prompt looks like a dead button.
    setStatus('locating');

    let settled = false;
    const watchdog = setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus('denied');
      setGeoError(t('rec.err.timeout'));
    }, 12000);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          setPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'me',
            accuracy: pos.coords.accuracy,
          });
          setStatus('ready');
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          setStatus('denied');
          // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          if (err && err.code === 1) setGeoError(t('rec.err.permission'));
          else if (err && err.code === 2) setGeoError(t('rec.err.unavailable'));
          else if (err && err.code === 3) setGeoError(t('rec.err.timeout'));
          else setGeoError(t('rec.err.unknown'));
        },
        // Do not cache a stale fix; give the browser a real chance to answer.
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      // Some browsers throw synchronously (rare, but it looks like a dead button).
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      setStatus('denied');
      setGeoError(t('rec.err.unknown'));
    }
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
      verdict = t('rec.verdict.stayIndoors');
      tone = 'bad';
    } else if (beachGrade >= 3) {
      verdict = t('rec.verdict.skipBeach');
      tone = 'warn';
    } else if ((cat === 'Low' || cat === 'Moderate') && beachGrade <= 2) {
      verdict = t('rec.verdict.goodDay');
      tone = 'good';
    } else {
      verdict = t('rec.verdict.mixed');
      tone = 'warn';
    }

    if (recentRain) {
      verdict += t('rec.verdict.rain');
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

  const pointLabel =
    point == null ? t('rec.noLocation') : point.label === 'me' ? t('rec.useLocation') : point.label;

  return (
    <section className="card">
      <div className="card-head">
        <h3>{t('rec.title')}</h3>
      </div>

      <div className="row">
        <button
          className="btn"
          onClick={locate}
          disabled={status === 'locating'}
          type="button"
        >
          {status === 'locating' ? t('rec.locating') : `📍 ${t('rec.useLocation')}`}
        </button>
        <span className="muted">{pointLabel}</span>
      </div>

      {geoError && (
        <p className="error" role="alert">
          {geoError}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={locate}
            hidden={status === 'locating'}
          >
            {t('rec.retry')}
          </button>
        </p>
      )}

      <label className="row muted">
        {t('rec.manualLabel')}
        <select
          value={point?.label ?? ''}
          onChange={(e) => {
            const s = stations.find((x) => x.station === e.target.value);
            if (s) useStation(s);
          }}
        >
          <option value="">{t('rec.chooseStation')}</option>
          {stations.map((s) => (
            <option key={s.station} value={s.station}>
              {tStation(s.station)}
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
        {t('rec.rainedLabel')} <span className="muted">({t('rec.rainedNote')})</span>
      </label>

      <button className="btn primary" onClick={recommend} disabled={!point}>
        {t('rec.recommend')}
      </button>

      {status === 'denied' && !geoError && <p className="error">{t('rec.denied')}</p>}
      {status === 'no-data' && <p className="error">{t('rec.noData')}</p>}

      {result && (
        <div className={`verdict ${result.tone}`}>
          <p>{result.verdict}</p>
          {result.station && (
            <small>
              {t('rec.nearestStation', {
                station: tStation(result.station.station),
                aqhi: result.station.aqhi,
                category: tRisk(result.station.category),
                distance: result.station.distanceKm?.toFixed(1),
              })}
            </small>
          )}
          {result.beach && (
            <small>
              <br />
              {t('rec.nearestBeach', {
                beach: tBeach(result.beach.name),
                // The feed's `desc` is English-only; prefer our translated grade.
                desc: result.beach.grade ? t(`beach.grade${result.beach.grade}`) : result.beach.desc,
                distance: result.beach.distanceKm?.toFixed(1),
              })}
            </small>
          )}
        </div>
      )}
    </section>
  );
}
