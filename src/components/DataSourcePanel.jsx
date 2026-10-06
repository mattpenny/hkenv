import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext.jsx';

/**
 * DataSourcePanel — mandatory data attribution and disclaimer, moved out of
 * the page footer and into a small popover that opens from the header.
 *
 * Why a popover: the attribution must stay reachable (it is a licensing
 * requirement), but as a permanent block at the bottom of the page it pushed
 * the three data cards up and out of view. Here it collapses to a single
 * button and expands on demand.
 */
export default function DataSourcePanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close on outside click / Escape so it behaves like a normal menu.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`data-source${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="data-source-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="data-source-btn-icon" aria-hidden="true">
          ⓘ
        </span>
        <span className="data-source-btn-label">{t('footer.toggle')}</span>
        <span className="data-source-chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="data-source-pop" role="dialog" aria-label={t('footer.toggle')}>
          <p>{t('footer.attribution')}</p>
          <p>{t('footer.disclaimer')}</p>
          <p>{t('footer.reference')}</p>
          <p className="links">
            <a href="https://data.gov.hk" target="_blank" rel="noopener noreferrer">
              data.gov.hk
            </a>{' '}
            ·{' '}
            <a
              href="https://www.aqhi.gov.hk/en/index.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.aqhiLink')}
            </a>{' '}
            ·{' '}
            <a
              href="https://www.beachwq.gov.hk/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('footer.beachLink')}
            </a>{' '}
            · {t('footer.mapTiles')}{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap
            </a>{' '}
            {t('footer.contributors')}
          </p>
        </div>
      )}
    </div>
  );
}
