import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { aqhiColor, beachGradeColor } from '../utils/colorScale.js';

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
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const stationLayerRef = useRef(null);
  const beachLayerRef = useRef(null);
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

    L.control
      .layers(
        {
          'Air Quality Stations': stationLayerRef.current,
          Beaches: beachLayerRef.current,
        },
        null,
        { position: 'topright' }
      )
      .addTo(map);

    // Legend in the bottom-right corner.
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <h4>Legend</h4>
        <div><span class="sw" style="background:#2ecc71"></span>Good / Low risk (AQHI 1-3, Grade 1)</div>
        <div><span class="sw" style="background:#f1c40f"></span>Fair / Moderate (AQHI 4-6, Grade 2)</div>
        <div><span class="sw" style="background:#e67e22"></span>Poor / High (AQHI 7, Grade 3)</div>
        <div><span class="sw" style="background:#e74c3c"></span>Very Poor / Very High (AQHI 8-10, Grade 4)</div>
        <div><span class="sw" style="background:#8e2f22"></span>Serious (AQHI 10+)</div>
      `;
      return div;
    };
    legend.addTo(map);

    // Fix rendering when the container is resized (e.g. window resize).
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
        `<strong>${s.station}</strong><br/>AQHI: <b>${s.aqhi ?? 'n/a'}</b><br/>` +
          `Health risk: <b>${s.category}</b><br/><small>${s.timestamp ?? ''}</small>`
      );
      markerIndexRef.current.station.set(s.station, marker);
      layer.addLayer(marker);
    });
  }, [stations, showStations]);

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
      const retrieved = b.fetchedAt?.toLocaleString?.() ?? 'n/a';
      marker.bindPopup(
        `<strong>${b.name}</strong><br/>${b.district}<br/>${b.desc || `Grade ${b.grade}`}<br/>` +
          `<small>Data retrieved: ${retrieved}<br/>(feed does not publish a sampling date)</small>`
      );
      markerIndexRef.current.beach.set(b.name, marker);
      layer.addLayer(marker);
    });
  }, [beaches, showBeaches]);

  // ---- Pan to, open and pulse a recommended location ----
  useEffect(() => {
    if (!highlight || !mapRef.current) return;
    const map = mapRef.current;
    map.flyTo([highlight.lat, highlight.lng], Math.max(map.getZoom(), 13), {
      duration: 0.9,
    });

    // Ensure the relevant layer is visible before opening its popup.
    const wantedLayer =
      highlight.type === 'station' ? stationLayerRef.current : beachLayerRef.current;
    const otherLayer =
      highlight.type === 'station' ? beachLayerRef.current : stationLayerRef.current;
    otherLayer?.remove();
    if (wantedLayer && !map.hasLayer(wantedLayer)) wantedLayer.addTo(map);

    const marker =
      highlight.type === 'station'
        ? markerIndexRef.current.station.get(highlight.id)
        : markerIndexRef.current.beach.get(highlight.id);
    if (marker) {
      // Delay slightly so the flyTo settles before opening the popup.
      setTimeout(() => {
        marker.openPopup();
        triggerPulse(marker, 10);
      }, 900);
    }
  }, [highlight]);

  return (
    <div
      ref={containerRef}
      className="map"
      role="application"
      aria-label="Map of Hong Kong air quality stations and beaches"
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