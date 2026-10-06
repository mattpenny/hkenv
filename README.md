# HK Environment Watch

An interactive Leaflet map of Hong Kong's **Air Quality Health Index (AQHI)** and  
**Beach Water Quality Grading**, built from open data on data.gov.hk.

For personal, non-commercial use. Not affiliated with the Government of Hong Kong.

## Data sources (both verified live)

| Dataset                       | Endpoint                                                            | Notes                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AQHI (City Dashboard)         | `https://dashboard.data.gov.hk/api/aqhi-individual?format=json`     | Returns `[{ station, aqhi, health_risk, publish_date }]`. Sends `Access-Control-Allow-Origin: *`, so no proxy needed.                                                         |
| Beach Water Quality (spatial) | `https://cd.epic.epd.gov.hk/EPICDI/json/beach/beachgrading?lang=en` | GeoJSON `FeatureCollection`; properties `district`, `name`, `image`, `grade`, `status`, `desc`, `beachCode`. **Sends no CORS headers**, so a direct browser fetch is blocked. |

### Beach feed: why there is a dev middleware

Two things were tried before settling on the current approach, and both failed:

1. **Direct browser fetch** — blocked by CORS (no `Access-Control-Allow-Origin`).
2. **Public CORS proxies** (`api.allorigins.win`, `corsproxy.io`) — allorigins now     
   returns HTTP 522 and corsproxy.io requires an API key (401). The app sat on     
   "Loading beaches…" forever.
3. **Vite's built-in `server.proxy`** — EPD's load balancer answers the proxied     
   request with an HTML `Invalid Access !!!` page, even though an byte-identical     
   Node/curl request returns valid JSON.

The working fix is `epdBeachDevProxy()` in `vite.config.js`: a tiny Vite  
middleware that fetches the feed **server-side** (the code path proven to work)  
and re-serves it same-origin at `/epic/beach`. For production, expose the same  
handler as a Cloudflare Worker / Vercel edge function and set  
`VITE_BEACH_URL` to its URL.

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

## Deploy to GitHub Pages

Repo: https://github.com/mattpenny/hkenv — the site will be at
https://mattpenny.github.io/hkenv/

1. `base` in `vite.config.js` must match the repo name. It is set to
   `/hkenv/`. For Vercel root deploys, set `VITE_BASE=/` instead.
2. ```bash
   npm run build
   npx gh-pages -d dist
   ```
   Or let GitHub Actions deploy: add `.github/workflows/deploy.yml` running
   `npm ci && npm run build` and publishing `dist` to the `gh-pages` branch.
3. Repo -> Settings -> Pages -> Source: `gh-pages` branch / root.
4. The site will be live at https://mattpenny.github.io/hkenv/

> **Beaches will not load in production.** The beach feed is CORS-blocked and
> only works via the dev-server middleware (see above). To fix it for a
> deployed build, add a serverless function running the same fetch and set
> `VITE_BEACH_URL` to its URL. Air quality works with no backend at all.

## Deploy to Vercel

```bash
VITE_BASE=/ npx vercel   # framework preset: Vite; build `npm run build`; output `dist`
```


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
