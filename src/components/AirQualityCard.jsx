import { useMemo, useState } from 'react';
import { aqhiColor } from '../utils/colorScale.js';
import { stationRegion } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import RegionTabs from './RegionTabs.jsx';
import PollutantButton from './PollutantButton.jsx';

/**
 * AirQualityCard — highlights the worst AQHI station in the selected region.
 *
 * Region state is owned by App (so both cards + GPS default share one
 * source of truth) and received here via `region` / `onRegionChange`.
 *
 * Station rows are buttons: clicking one pans the map to that station.
 *
 * `stationTypes` is an optional map of station name -> 'General' | 'Roadside',
 * supplied by usePollutants (the AQHI pollutant feed is the only source that
 * publishes the classification). When it is absent — e.g. the proxy is not
 * deployed — the badges and the type filter are simply omitted rather than
 * showing a guessed type.
 */
export default function AirQualityCard({
  stations,
  loading,
  error,
  region,
  onRegionChange,
  regionAuto,
  onSelect,
  activeId,
  stationTypes,
  onOpenPollutants,
  pollutantCount = 0,
  pollutantsReady = false,
}) {
  const { t, tRisk, tStation, formatDateTime } = useI18n();
  const [typeFilter, setTypeFilter] = useState('All');

  // Filter to the selected region. Stations we could not map ('other') are
  // still shown so nothing silently disappears.
  const inRegion = useMemo(
    () => stations.filter((s) => stationRegion(s.station) === region),
    [stations, region]
  );

  // Type filtering only applies once we actually know the station types.
  const hasTypes = Boolean(stationTypes && Object.keys(stationTypes).length);
  const typeOf = (name) => stationTypes?.[name] ?? null;

  const shown = useMemo(() => {
    if (typeFilter === 'All' || !hasTypes) return inRegion;
    return inRegion.filter((s) => typeOf(s.station) === typeFilter);
  }, [inRegion, typeFilter, hasTypes, stationTypes]);

  const tabs = (
    <RegionTabs value={region} onChange={onRegionChange} auto={regionAuto} />
  );

  // The pollutant icon sits in the header, to the right of the region tabs.
  // It is rendered in every state (loading, error, empty) so the user always
  // has a way in — the dialog itself explains when there is nothing to show.
  const pollButton = onOpenPollutants ? (
    <PollutantButton onClick={onOpenPollutants} count={pollutantCount} disabled={!pollutantsReady} />
  ) : null;
  const headerExtra = (
    <div className="card-head-extra">
      {tabs}
      {pollButton}
    </div>
  );

  if (loading)
    return (
      <Card title={t('aqhi.title')} headerExtra={headerExtra}>
        <p className="muted">{t('aqhi.loading')}</p>
      </Card>
    );
  if (error)
    return (
      <Card title={t('aqhi.title')} headerExtra={headerExtra}>
        <p className="error">{t('aqhi.error', { error })}</p>
      </Card>
    );
  if (!stations.length)
    return (
      <Card title={t('aqhi.title')} headerExtra={headerExtra}>
        <p className="muted">{t('aqhi.none')}</p>
      </Card>
    );

  if (!inRegion.length)
    return (
      <Card title={t('aqhi.title')} headerExtra={headerExtra}>
        <p className="muted">{t('aqhi.emptyInRegion')}</p>
      </Card>
    );

  // The "worst" hero is computed across the whole region, not the filtered
  // subset, so switching the filter never hides the headline risk.
  const worst = inRegion.reduce((a, b) => ((b.aqhi ?? -1) > (a.aqhi ?? -1) ? b : a));
  const color = aqhiColor(worst.aqhi);
  // The feed publishes an ISO timestamp; format it for the active locale,
  // falling back to the fetch time when it is missing.
  const updated = worst.timestamp
    ? formatDateTime(worst.timestamp)
    : formatDateTime(worst.fetchedAt);

  const focus = (s) =>
    onSelect?.({
      type: 'station',
      id: s.station,
      lat: s.latitude,
      lng: s.longitude,
    });

  /** Small General/Roadside pill. Renders nothing when the type is unknown. */
  const TypeBadge = ({ name }) => {
    const type = typeOf(name);
    if (!type) return null;
    const isRoad = type === 'Roadside';
    return (
      <span
        className={`type-badge${isRoad ? ' is-roadside' : ' is-general'}`}
        title={t(isRoad ? 'station.roadsideHint' : 'station.generalHint')}
      >
        {t(isRoad ? 'station.roadside' : 'station.general')}
      </span>
    );
  };

  // Count per type, for the filter labels.
  const counts = { General: 0, Roadside: 0 };
  for (const s of inRegion) {
    const ty = typeOf(s.station);
    if (ty && counts[ty] != null) counts[ty] += 1;
  }

  return (
    <Card title={t('aqhi.title')} headerExtra={headerExtra}>
      <button
        type="button"
        className="aqhi-hero"
        style={{ borderColor: color }}
        title={t('aqhi.focusHint')}
        onClick={() => focus(worst)}
        disabled={worst.latitude == null || worst.longitude == null}
      >
        <div className="aqhi-number" style={{ background: color }}>
          {worst.aqhi ?? t('aqhi.na')}
        </div>
        <div className="aqhi-hero-text">
          <strong>{t('aqhi.highest', { station: tStation(worst.station) })}</strong>
          <div className="aqhi-hero-badge">
            <TypeBadge name={worst.station} />
          </div>
          <div>
            {t('aqhi.healthRisk')}: <b>{tRisk(worst.category)}</b>
          </div>
          <small className="muted">{t('aqhi.published', { time: updated })}</small>
        </div>
      </button>

      {hasTypes && (
        <div className="type-filter" role="group" aria-label={t('station.typeLabel')}>
          <span className="type-filter-label muted">{t('station.typeLabel')}</span>
          {['All', 'General', 'Roadside'].map((key) => {
            const label =
              key === 'All'
                ? t('station.filterAll')
                : `${t(key === 'Roadside' ? 'station.roadside' : 'station.general')} (${counts[key]})`;
            return (
              <button
                key={key}
                type="button"
                className={typeFilter === key ? 'is-active' : ''}
                aria-pressed={typeFilter === key}
                onClick={() => setTypeFilter(key)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <ul className="station-list">
        {shown.map((s) => {
          const clickable = s.latitude != null && s.longitude != null;
          const type = typeOf(s.station);
          return (
            <li key={s.station}>
              <button
                type="button"
                className={`station-row${activeId === s.station ? ' is-active' : ''}${
                  type === 'Roadside' ? ' is-roadside' : ''
                }`}
                onClick={() => focus(s)}
                disabled={!clickable}
                title={clickable ? t('aqhi.focusHint') : undefined}
              >
                <span className="dot" style={{ background: aqhiColor(s.aqhi) }} />
                <span className="grow">{tStation(s.station)}</span>
                <TypeBadge name={s.station} />
                <b>{s.aqhi ?? t('aqhi.na')}</b>
              </button>
            </li>
          );
        })}
      </ul>
      {!shown.length && <p className="muted">{t('aqhi.emptyInRegion')}</p>}
      <p className="muted footnote">{t('aqhi.focusHintCard')}</p>
    </Card>
  );
}

function Card({ title, children, headerExtra }) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {headerExtra}
      </div>
      {children}
    </section>
  );
}
