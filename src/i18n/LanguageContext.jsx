import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  STRINGS,
  RISK_LABELS,
  stationLabel as stationLabelFor,
  districtLabel as districtLabelFor,
} from './translations.js';

/**
 * Language context + `useI18n()` hook.
 *
 * Deliberately dependency-free (no i18next) — the app only needs two
 * languages and a flat key lookup, so a small context is less code and less
 * to go wrong than a framework.
 *
 * Resolution order for the initial language:
 *   1. Saved choice in localStorage
 *   2. Browser language (zh* -> Chinese)
 *   3. English
 */

const STORAGE_KEY = 'hkenv.lang';
const LangContext = createContext(null);

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    // localStorage can throw in private mode — fall through.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  if (/^zh/i.test(nav)) return 'zh';
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures — language still works for this session.
    }
    // Keep the document language in sync for accessibility / screen readers.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'zh' ? 'zh-Hant-HK' : 'en';
    }
  }, [lang]);

  /**
   * Translate a key, substituting {placeholders}.
   * Falls back to the key itself so a missing translation is obvious.
   */
  const t = useCallback(
    (key, vars) => {
      const table = STRINGS[lang] || STRINGS.en;
      let text = table[key] ?? STRINGS.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [lang]
  );

  /** Translate a raw health-risk category produced by the API. */
  const tRisk = useCallback(
    (category) => {
      const table = RISK_LABELS[lang] || RISK_LABELS.en;
      return table[category] ?? category ?? '';
    },
    [lang]
  );

  /** Translate an AQHI station name (falls back to the English name). */
  const tStation = useCallback((name) => stationLabelFor(name, lang), [lang]);

  /** Translate a beach district name (falls back to the English name). */
  const tDistrict = useCallback((name) => districtLabelFor(name, lang), [lang]);

  /** Format a date/time in the active locale. */
  const formatDateTime = useCallback(
    (value) => {
      if (!value) return '';
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleString(lang === 'zh' ? 'zh-HK' : 'en-HK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [lang]
  );

  /** Format a long date (used in the header). */
  const formatLongDate = useCallback(
    (date) => {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString(lang === 'zh' ? 'zh-HK' : 'en-HK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, tRisk, tStation, tDistrict, formatDateTime, formatLongDate }),
    [lang, t, tRisk, tStation, tDistrict, formatDateTime, formatLongDate]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
