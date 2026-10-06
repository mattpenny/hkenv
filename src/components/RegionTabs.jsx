import { REGIONS } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * RegionTabs — the three-way Hong Kong / Kowloon / New Territories switch
 * shared by the Air Quality and Beach cards.
 *
 * Presentational only: the parent owns the selected value and decides what
 * to show. `auto` indicates the selection came from the visitor's GPS rather
 * than a tap, so we can show a small hint next to the tabs.
 */
export default function RegionTabs({ value, onChange, auto = false }) {
  const { t } = useI18n();

  return (
    <div className="region-tabs" role="tablist" aria-label={t('region.label')}>
      {REGIONS.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          className={`region-tab${value === r ? ' is-active' : ''}`}
          onClick={() => onChange(r)}
        >
          {t(`region.${r}`)}
        </button>
      ))}
      {auto && <span className="region-hint muted">{t('region.defaultFromLocation')}</span>}
    </div>
  );
}
