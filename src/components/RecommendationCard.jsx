import { useMemo, useState } from 'react';
import { nearest } from '../utils/colorScale.js';
import { districtRegion, districtForCoords } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * RecommendationCard — "Should I go out?"
 *
 * Uses the browser's geolocation (or a manual station pick) to find the
 * nearest beach and AQHI station, then gives advice.
 *
 * RAIN: this card used to ask the user to self-report "heavy rain in the last
 * 3 days", because neither EPD feed carries rainfall. It now shows the real
 * HKO figure instead — see `useRainfall`. The important caveat is that HKO
 * publishes only a rolling **1-hour** window, so the UI must label that window
 * rather than imply a multi-day total it cannot compute.
 *
 * `rainfallDistrict` is supplied by App: the district from the visitor's GPS
 * when available, else a representative district for the selected region. When
 * the user presses "use my location" *here*, this card derives the district
 * from that exact fix instead — an explicit request should win over the
 * background one.
 */
/**
 * Rainfall at or above this (in mm over the past hour) is worth a warning.
 * HKO reports plenty of 0-1 mm readings that mean nothing for water quality;
 * warning on those would train the user to ignore the message.
 */
const RAIN_WARN_MM = 5;

/** Trim trailing zeros: 12 -> "12", 3.5 -> "3.5". */
function formatMm(mm) {
  if (!Number.isFinite(mm)) return '0';
  return String(Math.round(mm * 10) / 10);
}

export default function RecommendationCard({
  stations,
  beaches,
  onHighlight,
  rainfall = null,
  rainfallDistrict = null,
  /** True when `rainfallDistrict` came from the visitor's GPS fix. */
  rainfallDistrictFromGps = false,
}) {
  const { t, tRisk, tStation, tBeach, tDistrict, formatTime } = useI18n();
  const [point, setPoint] = useState(null); // { lat, lng, label }
  const [status, setStatus] = useState('idle'); // idle | locating | denied | ready | no-data
  const [geoError, setGeoError] = useState(null); // specific reason, shown to the user
  const [result, setResult] = useState(null);

  /**
   * The district to quote rainfall for.
   *
   * When the user has asked for "my location" (`point.label === 'me'`) we use
   * the district of that fix, because that is the place they actually care
   * about. Otherwise we fall back to whatever App decided (its own GPS-derived
   * district, or the region representative when GPS was refused).
   *
   * `overrideDistrict` is null for a station pick too: picking "Kwun Tong"
   * means "recommend me something near Kwun Tong", not "I am standing in Kwun
   * Tong", so it must not hijack the rainfall district.
   */
  const overrideDistrict = useMemo(
    () => (point?.label === 'me' ? districtForCoords(point.lat, point.lng) : null),
    [point]
  );
  const shownDistrict = overrideDistrict ?? rainfallDistrict;
  // "(your location)" is shown when either the card's own fix or App's
  // background fix supplied the district.
  const districtIsGps = overrideDistrict != null || rainfallDistrictFromGps;

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

    /**
     * Attempt the fix, retrying briefly on PERMISSION_DENIED.
     *
     * WHY: inside an Android WebView, geolocation does NOT wait for the user to
     * answer the system permission dialog. The WebView reports PERMISSION_DENIED
     * to the page *immediately*, while the dialog is still on screen. If we gave
     * up on that first error the button would look broken even after the user
     * tapped "Allow" — their tap would land on a call that had already failed.
     *
     * So a denial is retried a few times over ~3s. If the user allows, the next
     * attempt succeeds and the UI never shows an error. A genuine refusal simply
     * exhausts the retries and reports the permission message, which is the same
     * outcome as before for a real denial.
     */
    const MAX_ATTEMPTS = 4;
    let attempt = 0;

    const requestFix = () => {
      attempt += 1;
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
            // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
            if (err && err.code === 1 && attempt < MAX_ATTEMPTS) {
              // Likely the system dialog is still open — give the grant time.
              setTimeout(() => {
                if (!settled) requestFix();
              }, 700);
              return;
            }
            settled = true;
            clearTimeout(watchdog);
            setStatus('denied');
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
    };

    requestFix();
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

    // Live rainfall for the district the user is actually looking at. Only
    // warn on a meaningful amount — a trace of rain is not worth alarming
    // anyone over, and HKO reports sub-millimetre values freely.
    const rainMm =
      rainfall && shownDistrict && rainfall.byDistrict
        ? rainfall.byDistrict[shownDistrict]
        : null;
    const meaningfulRain = typeof rainMm === 'number' && rainMm >= RAIN_WARN_MM;

    if (meaningfulRain) {
      verdict += t('rec.verdict.rain', { mm: formatMm(rainMm) });
      tone = tone === 'good' ? 'warn' : tone;
    }

    setResult({ verdict, tone, station, beach, rainMm, meaningfulRain });
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

  // Wettest district in the feed, so the user can see whether rain is nearby
  // even when their own district is dry.
  const wettest = rainfall?.byDistrict
    ? Object.entries(rainfall.byDistrict).reduce(
        (best, entry) => (best == null || entry[1] > best[1] ? entry : best),
        null
      )
    : null;

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

      {/* Observed rainfall — replaces the old self-reported checkbox.
          HKO only publishes a rolling 1-hour window, so the panel states the
          window explicitly instead of implying a multi-day total. */}
      <div className="rain-panel">
        <div className="rain-head">
          <span>{t('rec.rainHeader')}</span>
          {rainfall?.byDistrict && shownDistrict && (
            <b>
              {formatMm(rainfall.byDistrict[shownDistrict] ?? 0)} {rainfall.unit}
            </b>
          )}
        </div>

        {rainfall?.byDistrict ? (
          <>
            <small className="muted">
              {districtIsGps
                ? t('rec.rainYourDistrict', { district: tDistrict(shownDistrict) })
                : tDistrict(shownDistrict)}{' '}
              ·{' '}
              {t('rec.rainWindow', {
                start: formatTime(rainfall.startTime),
                end: formatTime(rainfall.endTime),
              })}
            </small>
            {wettest && wettest[1] > 0 && (
              <small className="muted">
                <br />
                {t('rec.rainMax', {
                  district: tDistrict(wettest[0]),
                  mm: formatMm(wettest[1]),
                })}
              </small>
            )}
          </>
        ) : (
          <small className="muted">{t('rec.rainUnavailable')}</small>
        )}

        <p className="muted footnote">{t('rec.rainNote')}</p>
      </div>

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
