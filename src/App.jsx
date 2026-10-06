import { useState } from 'react';
import MapView from './components/MapView.jsx';
import AirQualityCard from './components/AirQualityCard.jsx';
import BeachQualityCard from './components/BeachQualityCard.jsx';
import RecommendationCard from './components/RecommendationCard.jsx';
import DataSourceFooter from './components/DataSourceFooter.jsx';
import { useAQHI } from './hooks/useAQHI.js';
import { useBeachQuality } from './hooks/useBeachQuality.js';

export default function App() {
  const { stations, loading: aqhiLoading, error: aqhiError } = useAQHI();
  const { beaches, loading: beachLoading, error: beachError } = useBeachQuality();
  const [showStations, setShowStations] = useState(true);
  const [showBeaches, setShowBeaches] = useState(true);
  const [highlight, setHighlight] = useState(null);

  const today = new Date().toLocaleDateString('en-HK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="app">
      <header className="header">
        <h1>HK Environment Watch</h1>
        <p>{today}</p>
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
              Air Quality Stations
            </label>
            <label>
              <input
                type="checkbox"
                checked={showBeaches}
                onChange={(e) => setShowBeaches(e.target.checked)}
              />{' '}
              Beaches
            </label>
          </div>
        </div>

        <aside className="panels">
          <AirQualityCard stations={stations} loading={aqhiLoading} error={aqhiError} />
          <BeachQualityCard beaches={beaches} loading={beachLoading} error={beachError} />
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