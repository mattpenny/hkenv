import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import AirQualityCard from './components/AirQualityCard.jsx';
import BeachQualityCard from './components/BeachQualityCard.jsx';
import RecommendationCard from './components/RecommendationCard.jsx';
import PollutantDetail from './components/PollutantDetail.jsx';
import PollutantModal from './components/PollutantModal.jsx';
import DataSourcePanel from './components/DataSourcePanel.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import { useAQHI } from './hooks/useAQHI.js';
import { useBeachQuality } from './hooks/useBeachQuality.js';
import { useRainfall } from './hooks/useRainfall.js';
import { usePollutants } from './hooks/usePollutants.js';
import { useI18n } from './i18n/LanguageContext.jsx';
import {
  stationRegion,
  districtRegion,
  regionForCoords,
  rainDistrictForRegion,
  districtForCoords,
} from './utils/regions.js';

export default function App() {
  const { t, formatLongDate, formatShortDate } = useI18n();
  const { stations, loading: aqhiLoading, error: aqhiError } = useAQHI();
  const { beaches, loading: beachLoading, error: beachError } = useBeachQuality();
  const { rainfall } = useRainfall();
  const {
    stations: pollutantStations,
    loading: pollLoading,
    error: pollError,
    available: pollAvailable,
  } = usePollutants();

  const [showStations, setShowStations] = useState(true);
  const [showBeaches, setShowBeaches] = useState(true);
  const [highlight, setHighlight] = useState(null);
  // What the user last picked in a card, so that card can show it as selected.
  const [activeId, setActiveId] = useState(null);
  // Which station the pollutant detail is showing. Kept here so the map focus
  // and the detail panel can stay in step when a station row is clicked.
  const [pollStation, setPollStation] = useState(null);
  // The pollutant detail lives in a dialog opened from the Air Quality card's
  // header icon, rather than occupying a full-width row of its own.
  const [pollOpen, setPollOpen] = useState(false);

  // Region tabs are shared by both data cards so they always agree.
  const [region, setRegion] = useState('hongkong');
  const [regionAuto, setRegionAuto] = useState(false);
  // The district the visitor is actually in, from GPS. `null` until we have a
  // fix (or if it is denied/unavailable).
  const [gpsDistrict, setGpsDistrict] = useState(null);

  /**
   * Which district the rainfall panel reports on.
   *
   * Prefer the district the user is physically in, because "how much did it
   * rain here in the last hour" is only meaningful for a place they are
   * standing in — the old behaviour quoted a fixed representative district for
   * the whole region (e.g. Central & Western for all of Hong Kong Island), which
   * quietly reported another district's gauge to anyone not in it.
   *
   * Falls back to the region representative when GPS is denied or unavailable,
   * so the panel always has something truthful to show.
   *
   * NOTE: either branch must yield a real district name from the rainfall feed —
   * an AQHI station name like "Central/Western" is not one, and passing it would
   * look up `undefined` and report a false 0 mm.
   */
  const rainDistrict = gpsDistrict ?? rainDistrictForRegion(region);

  /**
   * Ask the map to focus a feature and remember it as the active selection.
   * `nonce` guarantees the MapView effect re-runs even when the user clicks
   * the same item twice (it would otherwise be an identical value).
   */
  const focusOnMap = useCallback((target) => {
    if (!target || target.lat == null || target.lng == null) return;
    setActiveId(target.id ?? null);
    setHighlight({ ...target, nonce: Date.now() });
    // Clicking a station also drives the pollutant detail, so the two panels
    // never disagree about which station is being discussed.
    if (target.type === 'station' && target.id) setPollStation(target.id);
  }, []);

  /**
   * Station name -> 'General' | 'Roadside', taken from the AQHI pollutant feed
   * (the only source that publishes the classification). Empty when the feed
   * is unavailable, which makes the cards fall back to no badge at all rather
   * than guessing.
   */
  const stationTypes = useMemo(() => {
    const out = {};
    for (const s of pollutantStations) out[s.station] = s.type;
    return out;
  }, [pollutantStations]);

  // Default the area from the visitor's GPS once (no prompt storm: we ask a
  // single time, silently ignore denial, and never override a manual pick).
  // The same fix also tells us which of the 18 rainfall districts they are in.
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setRegion(regionForCoords(latitude, longitude));
        setRegionAuto(true);
        setGpsDistrict(districtForCoords(latitude, longitude));
      },
      () => {
        /* denied or unavailable — keep the default area and region district */
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
  const todayShort = formatShortDate(new Date());

  return (
    <div className="app">
      <header className="header">
        <div className="header-text">
          <h1>{t('app.title')}</h1>
          {/* The date and the descriptive subtitle are separate elements so the
              long description can be dropped on a narrow phone, where it would
              otherwise wrap and make the header two lines tall. Two date forms
              are rendered; CSS shows whichever fits. */}
          <p className="header-sub">
            <span className="header-date-long">{today}</span>
            <span className="header-date-short">{todayShort}</span>
            <span className="header-tagline"> · {t('app.subtitle')}</span>
          </p>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <DataSourcePanel />
        </div>
      </header>

      <main className="main">
        {/* Map spans the full width of the page; the three cards sit in a
            single row beneath it on desktop and stack on mobile. */}
        <section className="map-panel">
          <MapView
            stations={stations}
            beaches={beaches}
            showStations={showStations}
            showBeaches={showBeaches}
            highlight={highlight}
            stationTypes={stationTypes}
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
        </section>

        <section className="panels">
          <AirQualityCard
            stations={stations}
            loading={aqhiLoading}
            error={aqhiError}
            region={region}
            onRegionChange={handleRegionChange}
            regionAuto={regionAuto}
            onSelect={focusOnMap}
            activeId={activeId}
            stationTypes={stationTypes}
            onOpenPollutants={() => setPollOpen(true)}
            pollutantCount={pollutantStations.length}
            pollutantsReady={pollAvailable}
          />
          <BeachQualityCard
            beaches={beaches}
            loading={beachLoading}
            error={beachError}
            region={region}
            onRegionChange={handleRegionChange}
            regionAuto={regionAuto}
            onSelect={focusOnMap}
            activeId={activeId}
          />
          <RecommendationCard
            stations={stations}
            beaches={beaches}
            onHighlight={focusOnMap}
            rainfall={rainfall}
            rainfallDistrict={rainDistrict}
            rainfallDistrictFromGps={gpsDistrict != null}
          />
        </section>

        {/* The three cards span the page; the pollutant detail no longer sits
            below them. It opens in a dialog from the icon in the Air Quality
            card's header, so the page stays short and the charts get the full
            width of the dialog instead of a single card column. */}
      </main>

      <PollutantModal open={pollOpen} onClose={() => setPollOpen(false)}>
        <PollutantDetail
          stations={pollutantStations}
          loading={pollLoading}
          error={pollError}
          available={pollAvailable}
          stationName={pollStation}
          onStationChange={setPollStation}
        />
      </PollutantModal>
    </div>
  );
}
