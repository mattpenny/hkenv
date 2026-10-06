import { LANGUAGES } from '../i18n/translations.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

/** LanguageSwitcher — small EN / 繁中 toggle for the header. */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {Object.entries(LANGUAGES).map(([code, label]) => (
        <button
          key={code}
          type="button"
          className={`lang-btn${lang === code ? ' is-active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
