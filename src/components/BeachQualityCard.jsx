import { useMemo } from 'react';
import {
  beachGradeColor,
  BEACH_GRADE_COLORS,
  BEACH_CLOSED_COLOR,
} from '../utils/colorScale.js';
import { BEACH_DISTRICTS } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';
import BeachDistrictTabs from './BeachDistrictTabs.jsx';

/**
 * Beach water quality: warning banner, grading legend, district tabs and a
 * grid of beaches with grade badges.
 *
 * FILTERING: by the six districts that actually have beaches, in the official
 * EPD district groupings — not the three broad regions the Air Quality card
 * uses (see BeachDistrictTabs for why).
 *
 * ORDER to be useful at a glance it is still sorted open-first, then
 * best-grade-first, then by beach code as a stable tie-break so the order
 * never jitters between renders or languages.
 *
 * Each chip is a button: clicking it pans the map to that beach.
 */
export default function BeachQualityCard({
  beaches,
  loading,
  error,
  district,
  onDistrictChange,
  onSelect,
  activeId,
}) {
  const { t, tBeach, formatDateTime } = useI18n();

  /** Beach count per district, for the tab badges. */
  const counts = useMemo(() => {
    const c = {};
    for (const b of beaches) c[b.district] = (c[b.district] || 0) + 1;
    return c;
  }, [beaches]);

  const inDistrict = useMemo(() => {
    const list = beaches.filter((b) => b.district === district);
    return [...list].sort(
      (a, b) =>
        // Open beaches first, then best grade first (a closed beach has no grade).
        Number(b.open) - Number(a.open) ||
        (a.grade ?? 99) - (b.grade ?? 99) ||
        String(a.beachCode || a.name).localeCompare(String(b.beachCode || b.name))
    );
  }, [beaches, district]);

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
    <BeachDistrictTabs
      value={district}
      onChange={onDistrictChange}
      counts={counts}
    />
  );

  if (!inDistrict.length)
    return (
      <Card title={t('beach.title')}>
        {tabs}
        <p className="muted">{t('beach.emptyInDistrict')}</p>
      </Card>
    );

  const bad = inDistrict.filter((b) => b.open && b.grade >= 3);
  const retrieved = formatDateTime(inDistrict[0]?.fetchedAt);

  return (
    <Card title={t('beach.title')}>
      {/* District tabs sit BELOW the title, full width. They used to live in
          the header's right slot alongside the title, but six district names
          (vs the three short region names they replaced) wrap into a tall
          column that squeezed the title down to "Beach Wat…". A full-width row
          gives every tab room and keeps the title intact. */}
      {tabs}
      {/* Grading legend — the same colours and wording as the official
          "Latest Beach Water Quality Grading" chart, so the badges below are
          self-explanatory without a trip to the EPD site. */}
      <div className="grade-legend" aria-label={t('beach.legend')}>
        {[1, 2, 3, 4].map((g) => (
          <span className="grade-legend-item" key={g}>
            <span
              className="grade-legend-swatch"
              style={{ background: BEACH_GRADE_COLORS[g] }}
              aria-hidden="true"
            />
            {t(`beach.grade${g}`)}
          </span>
        ))}
        <span className="grade-legend-item">
          <span
            className="grade-legend-swatch"
            style={{ background: BEACH_CLOSED_COLOR }}
            aria-hidden="true"
          />
          {t('beach.notOpen')}
        </span>
      </div>

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
        {inDistrict.map((b) => {
          const id = b.beachCode || b.name;
          return (
            <button
              type="button"
              className={`beach-chip${activeId === id ? ' is-active' : ''}${
                b.open ? '' : ' is-closed'
              }`}
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
              {b.open ? (
                <span
                  className="badge"
                  style={{ background: beachGradeColor(b.grade) }}
                  title={t(`beach.grade${b.grade}`)}
                >
                  {b.grade}
                </span>
              ) : (
                <span
                  className="badge badge-closed"
                  style={{ background: BEACH_CLOSED_COLOR }}
                  title={t('beach.notOpen')}
                >
                  —
                </span>
              )}
              <div className="beach-meta">
                <strong>{tBeach(b.name)}</strong>
                <small className="muted">
                  {b.open
                    ? t(`beach.grade${b.grade}`)
                    : t('beach.notOpenForSwimming')}
                </small>
              </div>
            </button>
          );
        })}
      </div>
      <p className="muted footnote">
        {t('beach.bestFirst')} {t('beach.retrieved', { time: retrieved })}
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

