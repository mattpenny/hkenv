/**
 * regions.js
 * Groups Hong Kong's AQHI stations and beaches into the three customary
 * geographic regions: Hong Kong Island, Kowloon, and the New Territories.
 *
 * WHY THIS IS NOT A TRIVIAL STRING MATCH
 * --------------------------------------
 * The two data sources use different naming schemes:
 *   - AQHI  -> monitoring station names ("Central/Western", "Kwun Tong"),
 *              with no "District" suffix.
 *   - Beach -> official district names ("Islands District", "Tuen Mun District"),
 *              and only 6 of the 18 districts actually contain beaches.
 *
 * So each source gets its own explicit lookup table rather than a shared rule.
 * Anything unmatched falls back to 'other' and is still shown, just not
 * filterable — better than silently hiding a station.
 */

export const REGIONS = ['hongkong', 'kowloon', 'newterritories'];

export const REGION_LABELS = {
  hongkong: { en: 'Hong Kong', zh: '香港島' },
  kowloon: { en: 'Kowloon', zh: '九龍' },
  newterritories: { en: 'New Territories', zh: '新界' },
};

/**
 * AQHI station -> region.
 * Note two easy mistakes:
 *   - "Tung Chung" and "Tap Mun" are in the New Territories, NOT Hong Kong
 *     Island, despite feeling "outlying".
 *   - "Tseung Kwan O" is in the New Territories (Sai Kung District), although
 *     it is often lumped in with Kowloon colloquially.
 */
const STATION_REGION = {
  // Hong Kong Island
  'Central/Western': 'hongkong',
  Central: 'hongkong',
  'Causeway Bay': 'hongkong',
  Eastern: 'hongkong',
  Southern: 'hongkong',

  // Kowloon
  'Kwun Tong': 'kowloon',
  'Sham Shui Po': 'kowloon',
  'Mong Kok': 'kowloon',

  // New Territories
  'Kwai Chung': 'newterritories',
  'Tsuen Wan': 'newterritories',
  'Tseung Kwan O': 'newterritories',
  'Yuen Long': 'newterritories',
  'Tuen Mun': 'newterritories',
  'Tung Chung': 'newterritories',
  'Tai Po': 'newterritories',
  'Sha Tin': 'newterritories',
  North: 'newterritories',
  'Tap Mun': 'newterritories',
};

/** Beach district -> region. Covers all 6 districts that publish beaches. */
const DISTRICT_REGION = {
  'Southern District': 'hongkong',

  'Tsuen Wan District': 'newterritories',
  'Tuen Mun District': 'newterritories',
  'Tai Po District': 'newterritories',
  'Sai Kung District': 'newterritories',
  // Lantau, Cheung Chau, Lamma and the other outlying islands are
  // administered as part of the New Territories.
  'Islands District': 'newterritories',
};

/** Region for an AQHI station name. */
export function stationRegion(stationName) {
  return STATION_REGION[stationName] ?? 'other';
}

/** Region for a beach district name (tolerant of a missing " District"). */
export function districtRegion(districtName) {
  if (!districtName) return 'other';
  const direct = DISTRICT_REGION[districtName];
  if (direct) return direct;
  // Tolerate "Tuen Mun" vs "Tuen Mun District".
  const withSuffix = `${districtName} District`;
  return DISTRICT_REGION[withSuffix] ?? 'other';
}

/**
 * Rough centre points used to pick a default region when the browser gives us
 * coordinates but we cannot match a station/district. Approximate and only
 * used for a sensible initial tab.
 */
const REGION_CENTRES = {
  hongkong: [22.27, 114.16],
  kowloon: [22.32, 114.18],
  newterritories: [22.42, 114.12],
};

/** Nearest region to a lat/lng, by simple squared distance. */
export function regionForCoords(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const [key, [rlat, rlng]] of Object.entries(REGION_CENTRES)) {
    const d = (lat - rlat) ** 2 + (lng - rlng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best ?? 'hongkong';
}
