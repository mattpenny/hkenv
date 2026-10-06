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

Neither dataset contains rainfall data and this app calls no weather API. The  
"rained heavily in the last 3 days" warning is therefore an explicitly  
**self-reported checkbox**, not an automatic check. To automate it, call the  
HKO Open Data API 9-day rainfall forecast in `RecommendationCard.jsx`.

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

### Optional: GitHub Pages

Pages is static-only, so beaches will not load there. If you want to use it
anyway (air quality only):

```bash
npm run build        # with the default base of /hkenv/
npx gh-pages -d dist
```

Then **Settings → Pages → Source: `gh-pages` branch / root**. The site appears
at `https://mattpenny.github.io/hkenv/`. To restore beaches, point
`VITE_BEACH_URL` at a beach proxy hosted elsewhere.

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
