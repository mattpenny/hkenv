# HK Environment Watch

An interactive Leaflet map of Hong Kong's **Air Quality Health Index (AQHI)** and  
**Beach Water Quality Grading**, built from open data on data.gov.hk.

For personal, non-commercial use. Not affiliated with the Government of Hong Kong.

## Data sources (both verified live)

| Dataset                       | Endpoint                                                            | Notes                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AQHI (City Dashboard)         | `https://dashboard.data.gov.hk/api/aqhi-individual?format=json`     | Returns `[{ station, aqhi, health_risk, publish_date }]`. Sends `Access-Control-Allow-Origin: *`, so no proxy needed.                                                         |
| Beach Water Quality (spatial) | `https://cd.epic.epd.gov.hk/EPICDI/json/beach/beachgrading?lang=en` | GeoJSON `FeatureCollection`; properties `district`, `name`, `image`, `grade`, `status`, `desc`, `beachCode`. **Sends no CORS headers**, so a direct browser fetch is blocked. |

### Beach feed: why it is proxied through a server

Two things were tried before settling on the current approach, and both failed:

1. **Direct browser fetch** — blocked by CORS (no `Access-Control-Allow-Origin`).
2. **Public CORS proxies** (`api.allorigins.win`, `corsproxy.io`) — allorigins now     
   returns HTTP 522 and corsproxy.io requires an API key (401). The app sat on     
   "Loading beaches…" forever.
3. **Vite's built-in `server.proxy`** — EPD's load balancer answers the proxied     
   request with an HTML `Invalid Access !!!` page, even though an byte-identical     
   Node/curl request returns valid JSON.

The working fix is to fetch the feed **server-side** (the code path proven to
work) and re-serve it same-origin. There are two small handlers, one per
environment:

- `epdBeachDevProxy()` in `vite.config.js` - Vite middleware, serves
  `/epic/beach` during `npm run dev`.
- `api/beach.js` - a serverless function, serves `/api/beach` in production.

Both issue an identical upstream request. See **Deployment** below.

The hook also enforces a 15 s timeout, so a stalled request can never hang the  
UI again.

### Two honest caveats about the data

1. **The AQHI feed has no coordinates.** Station coordinates are hard-coded in     
   `src/hooks/useAQHI.js` (`STATION_COORDS`) and joined on station name. If EPD ever     
   adds a station, it will appear in the list but not on the map until a coordinate     
   is added there.
2. **The beach feed publishes no sampling date.** EPD only states that data is posted     
   within 48 hours of sampling. The UI therefore shows the *retrieval* time and says so,     
   rather than inventing a date.

The AQHI endpoint is `aqhi-individual`, not the older `api/aqhi?type=...` form — if the  
app ever shows an empty air-quality card, re-check the URL on the  
[City Dashboard AQHI dataset page](https://data.gov.hk/en-data/dataset/hk-dpo-datagovhk2-city-dashboard-aqhi).

### Rainfall

Rainfall comes from the Hong Kong Observatory's **"Rainfall in the past hour
from Automatic Weather Station"** dataset
([data.gov.hk](https://data.gov.hk/en-data/dataset/hk-hko-rss-rainfall-in-the-past-hour)),
consumed through its API resource - see `src/hooks/useRainfall.js`.

Two HKO products were evaluated. The dataset page advertises
`hourlyRainfall.php`, which returns **36 individual automatic weather stations
as point readings** and would need a coordinate table. The app instead uses the
`rainfall` block of the general current-weather endpoint
(`weather.php?dataType=rhrread`), which carries the same rolling 1-hour window
but already aggregates to the **18 official districts by name** - the same
naming the rest of the app uses, with no coordinates to maintain.

Unlike the EPD feeds, this host sends `Access-Control-Allow-Origin: *`, so the
browser calls it **directly - no serverless proxy is needed**.

**Important limitation:** HKO publishes *only* a rolling 1-hour window. There is
no 24-hour or multi-day accumulated product (`rainfall24hr.php` 404s, and the
`r` parameter is ignored), so "did it rain heavily in the last 3 days?" is not
answerable from this feed. A true 3-day total would require accumulating samples
server-side over time. The UI therefore states the measured window explicitly
and never implies a multi-day total. The card shows the reading for the
currently selected region's district, and warns only at or above
`RAIN_WARN_MM` (5 mm/hour) so trace readings do not cause false alarms.

If the rainfall feed is unavailable the card says so and the rest of the app is
unaffected.

## Layout

**Desktop** (>= 1180px)
- Header: title on the left, language toggle and a **Data sources** popover button
  on the right.
- The **map spans the full page width** and is the hero element.
- The three cards - Air Quality Now, Beach Water Quality, Should I Go Out? - sit
  in a **single row underneath the map**.
- The attribution is no longer a page footer; it opens from the header.

**Tablet / mobile** (< 1180px)
- The cards stack full-width under the map.
- The header collapses to about 43-50px: the language toggle becomes **Eng /
  中文** (short labels, full names kept as the accessible name), the
  Data sources button becomes icon-only, and the date switches to a compact form
  with the descriptive tagline dropped so the header never wraps to two lines.

The layout was checked at 390 / 560 / 700 / 820 / 900 / 980 / 1000 / 1200 / 1600px
with no horizontal overflow and a monotonic header height.

## Interface

- **Language** - English / 繁體中文 toggle in the header. The choice is saved to
  `localStorage`; on a first visit it is inferred from the browser locale.
- **Area tabs** - Hong Kong Island / Kowloon / New Territories, on both data
  cards. The selection is shared, so the two cards can never disagree. It
  defaults to the visitor's GPS region (see `src/utils/regions.js`); tapping a
  tab switches off the "set from your location" hint.
- **Beach ordering** - beaches are sorted **best water quality first**
  (Grade 1 to 4), with the beach code as a stable tie-break.
- **Click to focus** - clicking a station row, the AQHI headline, or a beach
  chip pans the map to that point and opens its popup, outlining the active
  item. This respects the layer checkboxes: with the beach layer hidden,
  clicking a beach still pans there but does not force the layer back on.
  The page also **scrolls the map to the top of the viewport** unless the whole
  map is already visible, so focus follows the map rather than the card the user
  tapped. On a phone the cards sit below the map, so this is what lets the zoom
  animation paint - Leaflet's `flyTo` runs on `requestAnimationFrame`, which
  browsers suspend for off-screen content, otherwise leaving a half-drawn map.
  After the animation the map re-measures and forces a fresh tile pass.
- **Legend** - collapsed by default and expands on tap, so it does not cover
  the map on a phone.
- **Data sources** - the attribution/disclaimer popover in the header. Closes on
  outside click or Escape.

### Both feeds are English-only

Neither feed publishes Chinese names, so the app keeps translation tables in
`src/i18n/translations.js` (`STATION_NAMES_ZH`, `DISTRICT_NAMES_ZH`,
`BEACH_NAMES_ZH`). The English name stays the internal key and the table
supplies the display name. Anything missing falls back to the English name, so
a newly added station, district, or beach never renders a blank label - it just
shows in English until a translation is added.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build locally
```

## Deployment

**Deployment target: Vercel.** GitHub Pages cannot host this app, because it can
only serve static files and the beach feed needs a server (see below).

### Why a server is required

The EPD beach host sends no `Access-Control-Allow-Origin` header, so the browser
cannot fetch it directly. The feed is therefore always fetched server-side and
re-served same-origin:

| Environment | Endpoint | Handler |
| --- | --- | --- |
| `npm run dev` | `/epic/beach` | Vite middleware in `vite.config.js` |
| Production | `/api/beach` | Serverless function in `api/beach.js` |

Both issue an identical upstream request, so behaviour is the same either way.
Air quality needs no server at all — that endpoint is CORS-enabled.

### Deploy to Vercel

1. Push this repo to GitHub (already done for `mattpenny/hkenv`).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel reads `vercel.json`, which sets the framework to Vite and
   `VITE_BASE=/` (root deploy — the `/hkenv/` subpath is only for Pages).
   No other configuration is needed; `api/beach.js` is detected automatically.
4. Deploy. Air quality and beaches both work from the single deployed URL.

Or from the command line:

```bash
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

### GitHub Pages is not used

GitHub Pages was tried and then **deliberately disabled**. Two independent
blockers make it unsuitable, and only one of them is fixable:

1. **No build step by default.** Pointing Pages at the `main` branch root
   publishes the raw source tree. The live HTML still referenced
   `/src/main.jsx` (uncompiled JSX, which browsers cannot run) while
   `/assets/index-*.js` returned 404, so the page rendered completely blank.
   This one *is* fixable, by publishing a built `dist/` to a `gh-pages`
   branch instead.
2. **No server.** Even with a correct build, Pages cannot run `api/beach.js`,
   so beaches would still fail to load. Fixing this needs a *second* service
   (a Cloudflare Worker, or the function redeployed elsewhere) plus
   `VITE_BEACH_URL` pointing at it.

Vercel solves both in one service, so Pages was removed to avoid maintaining
two deploy pipelines for a strictly worse result.

If you ever do want the `github.io` URL, you must handle **both** points above —
publishing a built `dist/` alone will still leave beaches broken.

### Continuous integration

`.github/workflows/build.yml` runs `npm ci --include=optional && npm run build`
on every push and pull request to `main`. It does **not** deploy — Vercel's own
GitHub integration handles that. The workflow exists to catch build breakage.

## Leaflet marker-icon 404

The classic bundler problem: Leaflet's CSS points at `marker-icon.png` relative to  
the stylesheet, which 404s on GitHub Pages/Vercel because the assets aren't copied.  
This app **avoids it entirely** by using `L.circleMarker` (a plain SVG path) for  
every station and beach instead of `L.marker`. If you ever add a real `L.marker`,  
fix it with:

```js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: '...' });
```

## Attribution

Data from data.gov.hk, the Hong Kong SAR Government and the Environmental  
Protection Department, on an "as is" basis with no warranty as to accuracy or  
completeness. Map tiles © OpenStreetMap contributors.
