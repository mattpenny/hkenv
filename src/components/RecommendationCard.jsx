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
  const { t, tRisk, tStation } = useI18n();
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
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'me' });
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
        <button className="btn" onClick={locate} disabled={status === 'locating'}>
          {status === 'locating' ? t('rec.locating') : `📍 ${t('rec.useLocation')}`}
        </button>
        <span className="muted">{pointLabel}</span>
      </div>

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

      {status === 'denied' && <p className="error">{t('rec.denied')}</p>}
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
                beach: result.beach.name,
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
