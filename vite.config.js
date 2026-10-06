import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT for GitHub Pages:
// The base must match your repository name. This repo is
// github.com/mattpenny/hkenv, so base is '/hkenv/'.
// For Vercel (root deploy) set the VITE_BASE env var to '/'.

const EPD_BEACH_PATH = '/EPICDI/json/beach/beachgrading?lang=en';
const EPD_ORIGIN = 'https://cd.epic.epd.gov.hk';

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

export default defineConfig({
  plugins: [react(), epdBeachDevProxy()],
  base: process.env.VITE_BASE || '/hkenv/',
});
