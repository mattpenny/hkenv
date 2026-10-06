import { useI18n } from '../i18n/LanguageContext.jsx';

/** Mandatory data attribution and disclaimer. */
export default function DataSourceFooter() {
  const { t } = useI18n();

  return (
    <footer className="footer">
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
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        {t('footer.contributors')}
      </p>
    </footer>
  );
}
