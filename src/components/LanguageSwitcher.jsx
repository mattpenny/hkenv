import { LANGUAGES, LANGUAGE_SHORT } from '../i18n/translations.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * LanguageSwitcher — compact Eng / 中文 toggle.
 *
 * Sits in the top-right of the header on every screen size. The visible label
 * is short; the full language name stays in `title`/`aria-label` so the
 * control is still self-describing to screen readers.
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {Object.entries(LANGUAGES).map(([code, full]) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${lang === code ? ' is-active' : ''}`}
          aria-pressed={lang === code}
          aria-label={full}
          title={full}
          onClick={() => setLang(code)}
        >
          {LANGUAGE_SHORT[code] ?? full}
        </button>
      ))}
    </div>
  );
}
