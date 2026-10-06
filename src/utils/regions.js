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

/**
 * District -> region. Covers all 18 districts.
 *
 * The beach feed only publishes 6 districts, but the HKO rainfall feed reports
 * all 18, so the table must cover every district or the rainfall panel cannot
 * be filtered by region (it would fall through to 'other').
 *
 * Note two easy mistakes, since district names do not follow the region lines:
 *   - "Kwai Tsing" and "Tsuen Wan" are New Territories, not Kowloon, even
 *     though they sit immediately north of it.
 *   - "Islands District" covers Lantau, Cheung Chau, Lamma and the outlying
 *     islands, all administered as part of the New Territories.
 */
const DISTRICT_REGION = {
  // --- Hong Kong Island ---
  'Central & Western District': 'hongkong',
  'Wan Chai': 'hongkong',
  'Wan Chai District': 'hongkong',
  'Eastern District': 'hongkong',
  'Southern District': 'hongkong',

  // --- Kowloon ---
  'Yau Tsim Mong': 'kowloon',
  'Sham Shui Po': 'kowloon',
  'Kowloon City': 'kowloon',
  'Wong Tai Sin': 'kowloon',
  'Kwun Tong': 'kowloon',

  // --- New Territories ---
  'Kwai Tsing': 'newterritories',
  'Tsuen Wan': 'newterritories',
  'Tsuen Wan District': 'newterritories',
  'Tuen Mun': 'newterritories',
  'Tuen Mun District': 'newterritories',
  'Yuen Long': 'newterritories',
  'North District': 'newterritories',
  'Tai Po': 'newterritories',
  'Tai Po District': 'newterritories',
  'Sha Tin': 'newterritories',
  'Sai Kung': 'newterritories',
  'Sai Kung District': 'newterritories',
  'Islands District': 'newterritories',
};

/** Region for an AQHI station name. */
export function stationRegion(stationName) {
  return STATION_REGION[stationName] ?? 'other';
}

/** Region for a district name (tolerant of a missing " District" suffix). */
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

/**
 * A representative rainfall district per region.
 *
 * Needed because the rainfall feed reports the **18 official districts**, while
 * this app's cards show three broad regions. An AQHI station name is NOT a
 * valid district name ("Kwun Tong" is a district, but "Central/Western" is
 * not), so a station name must never be passed to the rainfall lookup — doing
 * so silently yields `undefined` and renders 0 mm for the wrong place.
 *
 * These are the most central/populous districts of each region, chosen as a
 * sensible "what is the weather like where most people are" default. Any of
 * the region's districts would be valid; this is just a stable pick.
 */
const REGION_RAIN_DISTRICT = {
  hongkong: 'Central & Western District',
  kowloon: 'Yau Tsim Mong',
  newterritories: 'Sha Tin',
};

/** A representative rainfall-feed district name for a region. */
export function rainDistrictForRegion(region) {
  return REGION_RAIN_DISTRICT[region] ?? null;
}

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
