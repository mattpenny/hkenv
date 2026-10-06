import { useMemo } from 'react';
import { beachGradeColor } from '../utils/colorScale.js';
import { districtRegion } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import RegionTabs from './RegionTabs.jsx';

/** Beach water quality: warning banner + grid of beaches with grade badges. */
export default function BeachQualityCard({
  beaches,
  loading,
  error,
  region,
  onRegionChange,
  regionAuto,
}) {
  const { t, tDistrict, formatDateTime } = useI18n();

  const inRegion = useMemo(
    () => beaches.filter((b) => districtRegion(b.district) === region),
    [beaches, region]
  );

  if (loading)
    return (
      <Card title={t('beach.title')}>
        <p className="muted">{t('beach.loading')}</p>
      </Card>
    );
  if (error)
    return (
      <Card title={t('beach.title')}>
        <p className="error">{t('beach.error', { error })}</p>
      </Card>
    );
  if (!beaches.length)
    return (
      <Card title={t('beach.title')}>
        <p className="muted">{t('beach.none')}</p>
      </Card>
    );

  const tabs = (
    <RegionTabs value={region} onChange={onRegionChange} auto={regionAuto} />
  );

  if (!inRegion.length)
    return (
      <Card title={t('beach.title')} headerExtra={tabs}>
        <p className="muted">{t('beach.emptyInRegion')}</p>
      </Card>
    );

  const bad = inRegion.filter((b) => b.grade >= 3);
  const retrieved = formatDateTime(inRegion[0]?.fetchedAt);

  return (
    <Card title={t('beach.title')} headerExtra={tabs}>
      {bad.length > 0 && (
        <div className="banner banner-warn">
          ⚠️{' '}
          {t('beach.warning', {
            count: bad.length,
            plural: bad.length > 1 ? 'es' : '',
          })}{' '}
          {bad.slice(0, 3).map((b) => b.name).join(', ')}
          {bad.length > 3 ? '…' : ''}
        </div>
      )}
      <div className="beach-grid">
        {inRegion.map((b) => (
          <div className="beach-chip" key={b.beachCode || b.name}>
            <span className="badge" style={{ background: beachGradeColor(b.grade) }}>
              {b.grade}
            </span>
            <div className="beach-meta">
              <strong>{b.name}</strong>
              <small className="muted">
                {tDistrict(b.district)} · {t(`beach.grade${b.grade}`)}
              </small>
            </div>
          </div>
        ))}
      </div>
      <p className="muted footnote">
        {t('beach.closedExcluded')} {t('beach.retrieved', { time: retrieved })}
      </p>
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
