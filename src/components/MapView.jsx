import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { aqhiColor, beachGradeColor } from '../utils/colorScale.js';
import { useI18n } from '../i18n/LanguageContext.jsx';

const HK_CENTER = [22.35, 114.15];
const DEFAULT_ZOOM = 11;

/**
 * MapView — Leaflet map with two toggleable layers:
 *   1. Air Quality Stations (AQHI) — coloured circle markers
 *   2. Beaches (water quality grade) — coloured circle markers
 *
 * We use L.circleMarker everywhere instead of L.marker, so there is no
 * dependency on Leaflet's default icon PNGs. That completely avoids the
 * classic "marker-icon.png 404" problem that breaks bundler-based deploys.
 */
export default function MapView({
  stations,
  beaches,
  showStations,
  showBeaches,
  highlight, // { type: 'station'|'beach', id, lat, lng }
}) {
  const { t, tRisk, tStation, tDistrict, tBeach, formatDateTime, lang } = useI18n();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const stationLayerRef = useRef(null);
  const beachLayerRef = useRef(null);
  const legendRef = useRef(null);
  const markerIndexRef = useRef({ station: new Map(), beach: new Map() });
  // Keep the latest highlight in a ref so click handlers can read it.
  const highlightRef = useRef(highlight);
  highlightRef.current = highlight;

  // ---- Create the map once ----
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: HK_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: false, // friendlier on mobile scrolling
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    stationLayerRef.current = L.layerGroup();
    beachLayerRef.current = L.layerGroup();

    // Fix rendering when the container is resized (e.g. window resize).
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- Layer switcher (labels follow the active language) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stationLayerRef.current) return;
    const control = L.control
      .layers(
        {
          [t('map.layerStations')]: stationLayerRef.current,
          [t('map.layerBeaches')]: beachLayerRef.current,
        },
        null,
        { position: 'topright' }
      )
      .addTo(map);
    return () => control.remove();
  }, [lang, t]);

  // ---- Collapsible legend (bottom-right) ----
  // Rebuilt whenever the language changes so the text stays current.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      // Start collapsed so it never covers the map on small screens.
      div.classList.add('is-collapsed');

      const rows = [
        ['#2ecc71', 'legend.good', 'legend.goodDetail'],
        ['#f1c40f', 'legend.fair', 'legend.fairDetail'],
        ['#e67e22', 'legend.poor', 'legend.poorDetail'],
        ['#e74c3c', 'legend.veryPoor', 'legend.veryPoorDetail'],
        ['#8e2f22', 'legend.serious', 'legend.seriousDetail'],
      ];

      div.innerHTML =
        `<button type="button" class="map-legend-toggle" aria-expanded="false">` +
        `<span class="map-legend-title">${t('map.legend')}</span>` +
        `<span class="map-legend-chevron" aria-hidden="true">▾</span>` +
        `</button>` +
        `<div class="map-legend-body">` +
        rows
          .map(
            ([color, key, detailKey]) =>
              `<div class="map-legend-row"><span class="sw" style="background:${color}"></span>` +
              `<span><b>${t(key)}</b><br/><small>${t(detailKey)}</small></span></div>`
          )
          .join('') +
        `</div>`;

      // Leaflet would otherwise let clicks fall through to the map and
      // drag the view — stop that entirely inside the legend.
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      const toggle = div.querySelector('.map-legend-toggle');
      const chevron = div.querySelector('.map-legend-chevron');
      toggle.addEventListener('click', () => {
        const collapsed = div.classList.toggle('is-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.title = collapsed ? t('map.legend.show') : t('map.legend.hide');
        chevron.textContent = collapsed ? '▾' : '▴';
      });
      toggle.title = t('map.legend.show');

      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;

    return () => legend.remove();
  }, [lang, t]);

  // ---- Render AQHI station markers ----
  useEffect(() => {
    const layer = stationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markerIndexRef.current.station = new Map();
    if (!showStations) {
      layer.remove();
      return;
    }
    if (!mapRef.current.hasLayer(layer)) layer.addTo(mapRef.current);

    stations.forEach((s) => {
      if (s.latitude == null || s.longitude == null) return;
      const marker = L.circleMarker([s.latitude, s.longitude], {
        radius: 10,
        color: '#ffffff',
        weight: 2,
        fillColor: aqhiColor(s.aqhi),
        fillOpacity: 0.9,
      });
      marker.bindPopup(
        `<strong>${tStation(s.station)}</strong><br/>${t('popup.aqhi')}: <b>${s.aqhi ?? t('aqhi.na')}</b><br/>` +
          `${t('popup.healthRisk')}: <b>${tRisk(s.category)}</b><br/>` +
          `<small>${formatDateTime(s.timestamp ?? s.fetchedAt)}</small>`
      );
      markerIndexRef.current.station.set(s.station, marker);
      layer.addLayer(marker);
    });
  }, [stations, showStations, lang, t, tRisk, tStation, formatDateTime]);

  // ---- Render beach markers ----
  useEffect(() => {
    const layer = beachLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markerIndexRef.current.beach = new Map();
    if (!showBeaches) {
      layer.remove();
      return;
    }
    if (!mapRef.current.hasLayer(layer)) layer.addTo(mapRef.current);

    beaches.forEach((b) => {
      if (b.latitude == null || b.longitude == null) return;
      const marker = L.circleMarker([b.latitude, b.longitude], {
        radius: 9,
        color: '#1a5276',
        weight: 2,
        fillColor: beachGradeColor(b.grade),
        fillOpacity: 0.85,
      });
      const retrieved = formatDateTime(b.fetchedAt);
      // The feed's `desc` is English-only, so prefer the translated grade.
      const gradeText = b.grade ? t(`beach.grade${b.grade}`) : b.desc || `Grade ${b.grade}`;
      marker.bindPopup(
        `<strong>${tBeach(b.name)}</strong><br/>${tDistrict(b.district)}<br/>${gradeText}<br/>` +
          `<small>${t('popup.beachRetrieved', { time: retrieved })}<br/>${t('beach.noSamplingDate')}</small>`
      );
      markerIndexRef.current.beach.set(b.name, marker);
      layer.addLayer(marker);
    });
  }, [beaches, showBeaches, lang, t, tBeach, tDistrict, formatDateTime]);

  // ---- Pan to, open and pulse a selected location ----
  // Triggered by clicking a station row or a beach chip in the side panels.
  useEffect(() => {
    if (!highlight || !mapRef.current) return;
    const map = mapRef.current;

    const isStation = highlight.type === 'station';
    const wantedLayer = isStation ? stationLayerRef.current : beachLayerRef.current;
    const wantedShown = isStation ? showStations : showBeaches;

    // Respect the layer checkboxes: make sure the layer holding the target is
    // actually on, but never force-hide the other one — the user's own toggles
    // must survive (previously the *other* layer was removed and stayed gone).
    if (wantedLayer && wantedShown && !map.hasLayer(wantedLayer)) {
      wantedLayer.addTo(map);
    }

    map.flyTo([highlight.lat, highlight.lng], Math.max(map.getZoom(), 14), {
      duration: 0.9,
    });

    const marker = isStation
      ? markerIndexRef.current.station.get(highlight.id)
      : markerIndexRef.current.beach.get(highlight.id);

    // The marker only exists if its layer is currently rendered. If the user
    // hid that layer, still pan there — just skip the popup.
    if (marker && map.hasLayer(wantedLayer)) {
      // Delay slightly so the flyTo settles before opening the popup.
      const timer = setTimeout(() => {
        marker.openPopup();
        triggerPulse(marker, isStation ? 10 : 9);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [highlight, showStations, showBeaches]);

  return (
    <div
      ref={containerRef}
      className="map"
      role="application"
      aria-label={t('map.aria')}
    />
  );
}

/** Briefly grow a marker's radius to draw the eye to it. */
function triggerPulse(marker, baseRadius = 10) {
  const start = Date.now();
  const tick = () => {
    const t = (Date.now() - start) / 1400;
    if (t >= 1) {
      marker.setRadius(baseRadius);
      return;
    }
    marker.setRadius(baseRadius + 14 * (1 - t) ** 2); // ease-out pulse
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
