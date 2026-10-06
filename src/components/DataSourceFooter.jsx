/** Mandatory data attribution and disclaimer. */
export default function DataSourceFooter() {
  return (
    <footer className="footer">
      <p>
        This app uses open data from data.gov.hk, provided by the Hong Kong Special
        Administrative Region Government and the Environmental Protection Department.
      </p>
      <p>
        The data is provided on an &ldquo;as is&rdquo; basis. The Government makes no warranty as
        to its accuracy or completeness.
      </p>
      <p>
        This app is for reference only and is not affiliated with the Government of Hong Kong.
        For personal, non-commercial use.
      </p>
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
          EPD Air Quality Health Index
        </a>{' '}
        ·{' '}
        <a
          href="https://www.beachwq.gov.hk/"
          target="_blank"
          rel="noopener noreferrer"
        >
          EPD Beach Water Quality
        </a>{' '}
        · Map tiles ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </footer>
  );
}