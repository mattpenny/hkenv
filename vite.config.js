import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// IMPORTANT for GitHub Pages:
// The base must match your repository name. This repo is
// github.com/mattpenny/hkenv, so base is '/hkenv/'.
// For Vercel (root deploy) set the VITE_BASE env var to '/'.

const EPD_BEACH_PATH = '/EPICDI/json/beach/beachgrading?lang=en';
const EPD_ORIGIN = 'https://cd.epic.epd.gov.hk';

// AQHI pollutant feeds (www.aqhi.gov.hk). The host sends
// `Access-Control-Allow-Origin: https://aqhi.gov.hk` (verified with a real
// browser: a direct fetch() fails with "Failed to fetch"), so these must be
// proxied server-side just like the beach feed.
const AQHI_ORIGIN = 'https://www.aqhi.gov.hk';
const AQHI_PC_PATH = '/epd/ddata/html/out/24pc_Eng.xml';     // pollutant concentrations
const AQHI_TYPE_PATH = '/epd/ddata/html/out/24aqhi_Eng.xml'; // station type + AQHI
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * The EPD beach GeoJSON host sends no Access-Control-Allow-Origin header, so a
 * browser fetch is blocked by CORS. Vite's built-in http-proxy does NOT work
 * here: EPD's load balancer answers the proxied request with an HTML
 * "Invalid Access !!!" page (verified), even though an identical Node/curl
 * request returns valid JSON.
 *
 * This dev-only middleware fetches the feed server-side (same code path that
 * is proven to work) and re-serves it same-origin, so the browser never sees
 * a cross-origin request. For production, expose the same tiny handler as an
 * edge function and point VITE_BEACH_URL at it.
 */
function epdBeachDevProxy() {
  return {
    name: 'epd-beach-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/epic/beach', async (_req, res) => {
        try {
          const upstream = await fetch(EPD_ORIGIN + EPD_BEACH_PATH, {
            headers: {
              Accept: 'application/json, text/plain, */*',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
              Referer: EPD_ORIGIN + '/',
            },
          });
          const body = await upstream.text();
          // Guard against the load balancer's HTML rejection page.
          if (!body.trimStart().startsWith('{')) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Upstream returned non-JSON' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(body);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

/**
 * Dev-only proxy for the AQHI pollutant feeds.
 *
 * Returns a single JSON document combining both upstream XML feeds:
 *   { pollutants: "<24pc_Eng.xml>", stations: "<24aqhi_Eng.xml>" }
 *
 * The XML is passed through as a string rather than parsed here so the client
 * uses one parser in dev and in production (the serverless counterpart is
 * api/aqhi.js, which returns the exact same shape).
 */
function aqhiDevProxy() {
  // Fixture mode. Set AQHI_FIXTURES to a directory holding
  // `24pc_Eng.xml` and `24aqhi_Eng.xml` and the proxy serves those recorded
  // feeds instead of hitting the network. Used by `npm run dev:mock` so the
  // pollutant UI is fully testable where outbound HTTPS is blocked.
  // See .workbuddy-ai/tools/dev-mock.mjs.
  const fixtureDir = process.env.AQHI_FIXTURES
    ? path.resolve(process.env.AQHI_FIXTURES)
    : null;

  function readFixture(name) {
    return fs.readFileSync(path.join(fixtureDir, name), 'utf8');
  }

  async function fetchText(path) {
    const upstream = await fetch(AQHI_ORIGIN + path, {
      headers: {
        Accept: 'application/xml, text/xml, text/plain, */*',
        'User-Agent': BROWSER_UA,
        Referer: AQHI_ORIGIN + '/tc/',
      },
    });
    if (!upstream.ok) throw new Error(`Upstream ${path} -> HTTP ${upstream.status}`);
    return await upstream.text();
  }

  return {
    name: 'aqhi-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/epd/aqhi', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const [pollutants, stations] = fixtureDir
            ? [readFixture('24pc_Eng.xml'), readFixture('24aqhi_Eng.xml')]
            : await Promise.all([
                fetchText(AQHI_PC_PATH),
                fetchText(AQHI_TYPE_PATH),
              ]);
          // Sanity-check: both feeds are XML. Anything else is an error page
          // from the load balancer, which would confuse the client parser.
          if (!pollutants.includes('<') || !stations.includes('<')) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Upstream returned non-XML' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ pollutants, stations }));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), epdBeachDevProxy(), aqhiDevProxy()],
  base: process.env.VITE_BASE || '/hkenv/',
});
