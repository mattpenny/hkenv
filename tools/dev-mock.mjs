/**
 * Local development server with recorded EPD feed fixtures.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm run dev` alone will NOT show the Pollutant Detail dialog in every
 * environment. The Vite dev-server process is sometimes unable to make outbound
 * HTTPS requests — in a restricted/sandboxed shell it fails with
 * `ECONNREFUSED (os error 10061)` and the proxy returns HTTP 502, even though a
 * plain `node -e "fetch(...)"` in the very same shell succeeds. A browser
 * cannot fetch www.aqhi.gov.hk directly either (the host sends
 * `Access-Control-Allow-Origin: https://aqhi.gov.hk`, not `*`), so the dialog
 * has no data and there is nothing to test.
 *
 * This script sidesteps the network entirely: it runs Vite EXACTLY as
 * `npm run dev` does (same config, same middleware, same base), but points the
 * AQHI proxy at XML recorded from the live feed. Everything else — live AQHI
 * values, live rainfall, real map tiles — is untouched.
 *
 * HOW IT WORKS
 * ------------
 * It simply sets `AQHI_FIXTURES` before booting Vite. `aqhiDevProxy()` in
 * vite.config.js reads that env var and serves the recorded XML when present.
 * No middleware-stack surgery, so it cannot drift from real dev behaviour.
 *
 * Usage:  npm run dev:mock          (uses the fixtures in tools/fixtures/)
 *         node tools/dev-mock.mjs
 *
 * The fixtures are a point-in-time snapshot. Refresh them with the curl recipe
 * printed below if the data ever looks stale. Production is unaffected by any
 * of this: `api/aqhi.js` fetches the live feed server-side on Vercel.
 */
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURE_DIR = fileURLToPath(new URL('./fixtures', import.meta.url));
const PC = fileURLToPath(new URL('./fixtures/24pc_Eng.xml', import.meta.url));
const AQHI = fileURLToPath(new URL('./fixtures/24aqhi_Eng.xml', import.meta.url));

if (!fs.existsSync(PC) || !fs.existsSync(AQHI)) {
  console.error(
    '\n  Missing fixtures.\n' +
      '  Refresh them with, from the project root:\n\n' +
      '    curl -s -o tools/fixtures/24pc_Eng.xml \\\n' +
      '      https://www.aqhi.gov.hk/epd/ddata/html/out/24pc_Eng.xml\n' +
      '    curl -s -o tools/fixtures/24aqhi_Eng.xml \\\n' +
      '      https://www.aqhi.gov.hk/epd/ddata/html/out/24aqhi_Eng.xml\n'
  );
  process.exit(1);
}

// The single knob that switches aqhiDevProxy() into fixture mode.
process.env.AQHI_FIXTURES = FIXTURE_DIR;

const server = await createViteServer({});
await server.listen();
server.printUrls();

const ageH = Math.round((Date.now() - fs.statSync(PC).mtimeMs) / 3600000);
console.log(
  `\n  AQHI pollutant feed served from FIXTURES (recorded ${ageH}h ago).` +
    `\n  Other feeds (AQHI values, rainfall, map tiles) are LIVE.` +
    `\n  Missing values ("-") are intentional in fixture data - they prove` +
    `\n  the chart shows gaps rather than zeros.\n`
);
