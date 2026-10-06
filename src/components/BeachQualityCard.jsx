import { useMemo } from 'react';
import { beachGradeColor } from '../utils/colorScale.js';
import { districtRegion } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import RegionTabs from './RegionTabs.jsx';

/**
 * Beach water quality: warning banner + grid of beaches with grade badges.
 *
 * Sorted best-first (Grade 1 -> 4) so the beaches actually worth visiting are
 * at the top, with the name as a stable tie-break. Layout order is
 * row-major, so this also reads left-to-right, top-to-bottom on screen.
 *
 * Each chip is a button: clicking it pans the map to that beach.
 */
export default function BeachQualityCard({
  beaches,
  loading,
  error,
  region,
  onRegionChange,
  regionAuto,
  onSelect,
  activeId,
}) {
  const { t, tBeach, tDistrict, formatDateTime } = useI18n();

  const inRegion = useMemo(() => {
    const list = beaches.filter((b) => districtRegion(b.district) === region);
    // Grade 1 (Good) first. `beachCode` breaks ties so the order never jitters
    // between renders or languages.
    return [...list].sort(
      (a, b) =>
        (a.grade ?? 99) - (b.grade ?? 99) ||
        String(a.beachCode || a.name).localeCompare(String(b.beachCode || b.name))
    );
  }, [beaches, region]);

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
          {bad.slice(0, 3).map((b) => tBeach(b.name)).join(', ')}
          {bad.length > 3 ? '…' : ''}
        </div>
      )}
      <div className="beach-grid">
        {inRegion.map((b) => {
          const id = b.beachCode || b.name;
          return (
            <button
              type="button"
              className={`beach-chip${activeId === id ? ' is-active' : ''}`}
              key={id}
              title={t('beach.focusHint')}
              onClick={() =>
                onSelect?.({
                  type: 'beach',
                  id: b.name,
                  lat: b.latitude,
                  lng: b.longitude,
                })
              }
              disabled={b.latitude == null || b.longitude == null}
            >
              <span className="badge" style={{ background: beachGradeColor(b.grade) }}>
                {b.grade}
              </span>
              <div className="beach-meta">
                <strong>{tBeach(b.name)}</strong>
                <small className="muted">
                  {tDistrict(b.district)} · {t(`beach.grade${b.grade}`)}
                </small>
              </div>
            </button>
          );
        })}
      </div>
      <p className="muted footnote">
        {t('beach.closedExcluded')} {t('beach.bestFirst')} {t('beach.retrieved', { time: retrieved })}
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
