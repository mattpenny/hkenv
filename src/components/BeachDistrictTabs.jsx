import { BEACH_DISTRICTS } from '../utils/regions.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * BeachDistrictTabs — the six-way district switch for the Beach card.
 *
 * WHY DISTRICTS, NOT REGIONS: only six of Hong Kong's 18 districts contain
 * gazetted beaches, and they do not line up with the three broad regions the
 * Air Quality card uses. A "Kowloon" tab would always be empty, so the beach
 * card filters by district directly — six tabs that each have content beats
 * three where one can never show anything.
 *
 * Presentational only; the parent owns the selected district.
 */
export default function BeachDistrictTabs({ value, onChange, counts = {} }) {
  const { t, tDistrict } = useI18n();

  return (
    <div className="district-tabs" role="tablist" aria-label={t('beach.districtLabel')}>
      {BEACH_DISTRICTS.map((d) => {
        const n = counts[d] ?? 0;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={value === d}
            className={`district-tab${value === d ? ' is-active' : ''}`}
            onClick={() => onChange(d)}
          >
            {tDistrict(d)}
            {n > 0 && <span className="district-tab-count">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
