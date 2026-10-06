/**
 * Serverless function: GET /api/beach
 *
 * Why this exists
 * ---------------
 * The EPD beach GeoJSON host (cd.epic.epd.gov.hk) does not send
 * `Access-Control-Allow-Origin`, so a browser cannot fetch it directly — the
 * request is blocked by CORS before the response is readable. There is no
 * client-side workaround, so the feed must be fetched server-side and
 * re-served same-origin, which is what this function does.
 *
 * This is the production counterpart of the dev middleware in vite.config.js
 * (`epdBeachDevProxy`). Both use the identical upstream request so behaviour
 * matches between `npm run dev` and a deployed build.
 *
 * Deployment
 * ----------
 * Vercel picks this file up automatically from /api. No configuration needed.
 * The frontend resolves to `/api/beach` in production — see
 * src/hooks/useBeachQuality.js.
 */

const EPD_URL = 'https://cd.epic.epd.gov.hk/EPICDI/json/beach/beachgrading?lang=en';
const TIMEOUT_MS = 15000;

export default async function handler(req, res) {
  // Cache at the edge for 30 minutes. The feed updates slowly (EPD posts
  // within ~48h of sampling), so this is safe and spares EPD from repeat
  // hits. `stale-while-revalidate` keeps it responsive while refreshing.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(EPD_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Referer: 'https://cd.epic.epd.gov.hk/',
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream responded HTTP ${upstream.status}` });
      return;
    }

    const body = await upstream.text();

    // EPD's load balancer sometimes answers with an HTML error page instead of
    // JSON. Guard against passing that through, which would surface as a
    // confusing parse error in the client.
    if (!body.trimStart().startsWith('{')) {
      res.status(502).json({ error: 'Upstream returned a non-JSON payload' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(body);
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    res
      .status(timedOut ? 504 : 502)
      .json({ error: timedOut ? 'Upstream request timed out' : err.message });
  } finally {
    clearTimeout(timer);
  }
}
