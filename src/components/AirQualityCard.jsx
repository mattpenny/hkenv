import { useMemo } from 'react';
import { aqhiColor } from '../utils/colorScale.js';
import { stationRegion } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import RegionTabs from './RegionTabs.jsx';

/**
 * AirQualityCard — highlights the worst AQHI station in the selected region.
 *
 * Region state is owned by App (so both cards + GPS default share one
 * source of truth) and received here via `region` / `onRegionChange`.
 */
export default function AirQualityCard({
  stations,
  loading,
  error,
  region,
  onRegionChange,
  regionAuto,
}) {
  const { t, tRisk, tStation, formatDateTime } = useI18n();

  // Filter to the selected region. Stations we could not map ('other') are
  // still shown so nothing silently disappears.
  const inRegion = useMemo(
    () => stations.filter((s) => stationRegion(s.station) === region),
    [stations, region]
  );

  if (loading)
    return (
      <Card title={t('aqhi.title')}>
        <p className="muted">{t('aqhi.loading')}</p>
      </Card>
    );
  if (error)
    return (
      <Card title={t('aqhi.title')}>
        <p className="error">{t('aqhi.error', { error })}</p>
      </Card>
    );
  if (!stations.length)
    return (
      <Card title={t('aqhi.title')}>
        <p className="muted">{t('aqhi.none')}</p>
      </Card>
    );

  const tabs = (
    <RegionTabs value={region} onChange={onRegionChange} auto={regionAuto} />
  );

  if (!inRegion.length)
    return (
      <Card title={t('aqhi.title')} headerExtra={tabs}>
        <p className="muted">{t('aqhi.emptyInRegion')}</p>
      </Card>
    );

  const worst = inRegion.reduce((a, b) => ((b.aqhi ?? -1) > (a.aqhi ?? -1) ? b : a));
  const color = aqhiColor(worst.aqhi);
  // The feed publishes an ISO timestamp; format it for the active locale,
  // falling back to the fetch time when it is missing.
  const updated = worst.timestamp
    ? formatDateTime(worst.timestamp)
    : formatDateTime(worst.fetchedAt);

  return (
    <Card title={t('aqhi.title')} headerExtra={tabs}>
      <div className="aqhi-hero" style={{ borderColor: color }}>
        <div className="aqhi-number" style={{ background: color }}>
          {worst.aqhi ?? t('aqhi.na')}
        </div>
        <div>
          <strong>{t('aqhi.highest', { station: tStation(worst.station) })}</strong>
          <div>
            {t('aqhi.healthRisk')}: <b>{tRisk(worst.category)}</b>
          </div>
          <small className="muted">{t('aqhi.published', { time: updated })}</small>
        </div>
      </div>
      <ul className="station-list">
        {inRegion.map((s) => (
          <li key={s.station}>
            <span className="dot" style={{ background: aqhiColor(s.aqhi) }} />
            <span className="grow">{tStation(s.station)}</span>
            <b>{s.aqhi ?? t('aqhi.na')}</b>
          </li>
        ))}
      </ul>
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
