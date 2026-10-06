/**
 * colorScale.js
 * Maps AQHI values and beach grades to colors, and provides helpers
 * for labels, haversine distance, and nearest-feature lookup.
 */

// ---- AQHI ----

/** AQHI health risk category from numeric value. */
export function aqhiRiskCategory(aqhi) {
  if (aqhi == null || isNaN(aqhi)) return 'Unknown';
  const v = Number(aqhi);
  if (v >= 10.5) return 'Serious';       // 10+
  if (v >= 8) return 'Very High';        // 8 - 10
  if (v >= 7) return 'High';             // 7
  if (v >= 4) return 'Moderate';         // 4 - 6
  return 'Low';                          // 1 - 3
}

/** Fill color for an AQHI value. */
export function aqhiColor(aqhi) {
  const cat = aqhiRiskCategory(aqhi);
  switch (cat) {
    case 'Low':       return '#2ecc71'; // green
    case 'Moderate':  return '#f1c40f'; // yellow
    case 'High':      return '#e67e22'; // orange
    case 'Very High': return '#e74c3c'; // red
    case 'Serious':   return '#8e2f22'; // dark red
    default:          return '#95a5a6'; // grey (unknown)
  }
}

// ---- Beach grades ----

export const BEACH_GRADE_LABELS = {
  1: 'Good',
  2: 'Fair',
  3: 'Poor',
  4: 'Very Poor',
};

export function beachGradeColor(grade) {
  switch (Number(grade)) {
    case 1: return '#2ecc71'; // green
    case 2: return '#f1c40f'; // yellow
    case 3: return '#e67e22'; // orange
    case 4: return '#e74c3c'; // red
    default: return '#95a5a6';
  }
}

// ---- Geo helpers ----

/** Haversine distance in kilometres between two [lat, lng] points. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Find nearest item in a list that has .latitude/.longitude to a point. */
export function nearest(items, lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const item of items) {
    if (item.latitude == null || item.longitude == null) continue;
    const d = haversineKm(lat, lng, item.latitude, item.longitude);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best ? { ...best, distanceKm: bestDist } : null;
}
