/**
 * Serverless function: GET /api/aqhi
 *
 * Why this exists
 * ---------------
 * The AQHI pollutant feeds live on www.aqhi.gov.hk, which sends
 *   Access-Control-Allow-Origin: https://aqhi.gov.hk
 * — NOT `*`. A browser fetch from any other origin is therefore blocked before
 * the response is readable (verified in a real browser: `fetch()` rejects with
 * "Failed to fetch"). There is no client-side workaround, so both feeds are
 * fetched server-side and re-served same-origin.
 *
 * Two upstream feeds are needed because neither alone is sufficient:
 *   24pc_Eng.xml   -> per-station hourly NO2 / O3 / SO2 / CO / PM10 / PM2.5
 *                     (no station type)
 *   24aqhi_Eng.xml -> per-station AQHI value plus an explicit  <type>  element
 *                     (General Stations / Roadside Stations)
 * Joining them on station name gives pollutants *and* station classification.
 *
 * The XML is passed through verbatim inside a JSON envelope so the client runs
 * exactly one parser in both dev and production. This is the production
 * counterpart of `aqhiDevProxy` in vite.config.js; both return:
 *   { pollutants: "<xml>", stations: "<xml>" }
 *
 * Deployment: Vercel picks this file up automatically from /api.
 */

const AQHI_ORIGIN = 'https://www.aqhi.gov.hk';
const PC_PATH = '/epd/ddata/html/out/24pc_Eng.xml';
const TYPE_PATH = '/epd/ddata/html/out/24aqhi_Eng.xml';
const TIMEOUT_MS = 15000;

async function fetchText(path, signal) {
  const upstream = await fetch(AQHI_ORIGIN + path, {
    signal,
    headers: {
      Accept: 'application/xml, text/xml, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Referer: AQHI_ORIGIN + '/tc/',
    },
  });
  if (!upstream.ok) throw new Error(`Upstream ${path} responded HTTP ${upstream.status}`);
  return await upstream.text();
}

export default async function handler(req, res) {
  // The feed refreshes hourly; a 10-minute edge cache is comfortably safe and
  // spares EPD from repeat hits. stale-while-revalidate keeps it responsive.
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const [pollutants, stations] = await Promise.all([
      fetchText(PC_PATH, controller.signal),
      fetchText(TYPE_PATH, controller.signal),
    ]);

    // EPD's load balancer sometimes answers with an HTML error page instead of
    // XML. Guard against passing that through, which would surface client-side
    // as a confusing parse result.
    if (!pollutants.includes('<') || !stations.includes('<')) {
      res.status(502).json({ error: 'Upstream returned a non-XML payload' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ pollutants, stations }));
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    res
      .status(timedOut ? 504 : 502)
      .json({ error: timedOut ? 'Upstream request timed out' : err.message });
  } finally {
    clearTimeout(timer);
  }
}
