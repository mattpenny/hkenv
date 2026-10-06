import { useCallback, useEffect, useState } from 'react';
import MapView from './components/MapView.jsx';
import AirQualityCard from './components/AirQualityCard.jsx';
import BeachQualityCard from './components/BeachQualityCard.jsx';
import RecommendationCard from './components/RecommendationCard.jsx';
import DataSourceFooter from './components/DataSourceFooter.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import { useAQHI } from './hooks/useAQHI.js';
import { useBeachQuality } from './hooks/useBeachQuality.js';
import { useI18n } from './i18n/LanguageContext.jsx';
import {
  stationRegion,
  districtRegion,
  regionForCoords,
} from './utils/regions.js';

export default function App() {
  const { t, formatLongDate } = useI18n();
  const { stations, loading: aqhiLoading, error: aqhiError } = useAQHI();
  const { beaches, loading: beachLoading, error: beachError } = useBeachQuality();

  const [showStations, setShowStations] = useState(true);
  const [showBeaches, setShowBeaches] = useState(true);
  const [highlight, setHighlight] = useState(null);

  // Region tabs are shared by both data cards so they always agree.
  const [region, setRegion] = useState('hongkong');
  const [regionAuto, setRegionAuto] = useState(false);

  // Default the area from the visitor's GPS once (no prompt storm: we ask a
  // single time, silently ignore denial, and never override a manual pick).
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setRegion(regionForCoords(pos.coords.latitude, pos.coords.longitude));
        setRegionAuto(true);
      },
      () => {
        /* denied or unavailable — keep the default area */
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Once the data arrives, prefer a region that actually has content when we
  // are still on the auto-selected value and it turned out to be empty.
  useEffect(() => {
    if (!regionAuto) return;
    if (aqhiLoading || beachLoading) return;
    const hasAqhi = stations.some((s) => stationRegion(s.station) === region);
    const hasBeach = beaches.some((b) => districtRegion(b.district) === region);
    if (hasAqhi || hasBeach) return;
    // Fall back to any region that has stations, in a stable order.
    for (const candidate of ['hongkong', 'kowloon', 'newterritories']) {
      if (stations.some((s) => stationRegion(s.station) === candidate)) {
        setRegion(candidate);
        return;
      }
    }
  }, [regionAuto, region, stations, beaches, aqhiLoading, beachLoading]);

  // A manual tap clears the "auto" hint.
  const handleRegionChange = useCallback((next) => {
    setRegion(next);
    setRegionAuto(false);
  }, []);

  const today = formatLongDate(new Date());

  return (
    <div className="app">
      <header className="header">
        <div className="header-text">
          <h1>{t('app.title')}</h1>
          <p>
            {today} · {t('app.subtitle')}
          </p>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="main">
        <div className="map-wrap">
          <MapView
            stations={stations}
            beaches={beaches}
            showStations={showStations}
            showBeaches={showBeaches}
            highlight={highlight}
          />
          <div className="layer-toggles">
            <label>
              <input
                type="checkbox"
                checked={showStations}
                onChange={(e) => setShowStations(e.target.checked)}
              />{' '}
              {t('map.layerStations')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={showBeaches}
                onChange={(e) => setShowBeaches(e.target.checked)}
              />{' '}
              {t('map.layerBeaches')}
            </label>
          </div>
        </div>

        <aside className="panels">
          <AirQualityCard
            stations={stations}
            loading={aqhiLoading}
            error={aqhiError}
            region={region}
            onRegionChange={handleRegionChange}
            regionAuto={regionAuto}
          />
          <BeachQualityCard
            beaches={beaches}
            loading={beachLoading}
            error={beachError}
            region={region}
            onRegionChange={handleRegionChange}
            regionAuto={regionAuto}
          />
          <RecommendationCard
            stations={stations}
            beaches={beaches}
            onHighlight={(h) => setHighlight({ ...h, nonce: Date.now() })}
          />
        </aside>
      </main>

      <DataSourceFooter />
    </div>
  );
}
