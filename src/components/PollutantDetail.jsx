import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext.jsx';
import { RAW_POLLUTANTS, MOVING_AVERAGE_HOURS } from '../utils/aqhiPollutants.js';

/**
 * PollutantDetail — per-station detail for the four criteria pollutants the
 * AQHI is built from (NO2, O3, SO2 and particulate matter as PM10 / PM2.5),
 * with a 24-hour chart and an equivalent table.
 *
 * Design notes
 * ------------
 * • Missing readings are drawn as GAPS, never as zero. The EPD feed publishes
 *   "-" for "no reading", and plotting that as 0 would invent a clean-air
 *   result. `parsePollutantFeed` maps it to null, and the chart breaks the line
 *   at nulls (SVG simply omits the segment) while the table prints an em dash
 *   with a tooltip explaining why.
 *
 * • The AQHI share column comes from `compositionAt`, which implements the EPD
 *   FAQ formula. EPD does not publish a per-station percentage feed, so these
 *   are explicitly labelled as recomputed by this app.
 *
 * • ONE chart at a time. The chart view is an accordion: a row of short chips
 *   (SO2 / NO2 / O3 / PM10 / PM2.5) selects which single pollutant is charted,
 *   so the panel never presents five charts at once. The picker is sticky and
 *   the detail scrolls beneath it.
 *
 * • The chart is hand-rolled inline SVG rather than a charting library: the app
 *   has no charting dependency, the shape needed (one series, full width) is
 *   simple, and this keeps the bundle small and the styling consistent.
 */

/** Stable, colour-blind-friendly palette; one hue per pollutant. */
const SERIES_COLOR = {
  NO2: '#e74c3c', // red    — combustion / traffic
  O3: '#8e44ad', // purple — photochemical
  SO2: '#e67e22', // orange — industrial
  PM10: '#2980b9', // blue
  'PM2.5': '#16a085', // teal
};

/** Nice round axis maximum so gridlines land on readable numbers. */
function axisMax(values) {
  const max = Math.max(...values.filter((v) => v != null), 0);
  if (max <= 0) return 10;
  const step = max > 200 ? 100 : max > 100 ? 50 : max > 50 ? 20 : max > 20 ? 10 : 5;
  return Math.ceil(max / step) * step;
}

/**
 * Y-axis tick values for a rounded maximum.
 *
 * The old chart labelled only `0` and the rounded max, so a series that sat
 * between gridlines was hard to read. This picks a "nice" step (1/2/2.5/5 × 10ⁿ)
 * so we land on roughly `targetTicks` intervals, and caps the count so a tall
 * axis does not turn into a wall of numbers on a phone. The result is always
 * evenly spaced and always includes 0, so the labels line up with the
 * gridlines drawn from the same fractions.
 */
function axisTicks(max, targetTicks = 5) {
  if (!(max > 0)) return [0];
  // Aim for `targetTicks` gaps, then snap the step up to a friendly number.
  const rough = max / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = nice * mag;
  const out = [];
  for (let v = 0; v <= max + step / 2 && out.length < 12; v += step) {
    // Trim floating-point dust from 2.5-based steps (0.30000000000000004).
    out.push(Math.round(v * 1000) / 1000);
  }
  return out;
}

/** Axis labels are integers when the step is whole, else one decimal. */
function fmtAxis(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function fmt(v, digits = 1) {
  if (v == null) return null;
  return Number(v).toFixed(digits);
}

/**
 * A single pollutant's 24-hour series, drawn at full width.
 * Returns an inline SVG that scales to its container via viewBox.
 *
 * `detail` adds a slightly taller plot with more gridlines and time ticks; the
 * compact form is used nowhere now that only one chart shows at a time, but the
 * flag keeps the two modes explicit rather than hard-coding one.
 */
function Sparkline({ channel, rows, label, unit, latestText, detail = false, t }) {
  const W = 640;
  const H = detail ? 210 : 96;
  const PAD = detail
    ? { l: 44, r: 12, t: 14, b: 26 }
    : { l: 34, r: 8, t: 10, b: 18 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const svgRef = useRef(null);
  // Index of the point under the pointer / last tapped. `null` hides the tooltip.
  const [active, setActive] = useState(null);

  const values = rows.map((r) => r[channel]);
  const max = axisMax(values);
  const n = rows.length;

  const x = (i) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => PAD.t + plotH - (v / max) * plotH;

  // Build the polyline, breaking the path wherever a reading is missing so a
  // gap is visibly a gap. Nulls are never plotted as 0.
  const segments = [];
  let current = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([x(i), y(v)]);
    }
  });
  if (current.length) segments.push(current);

  const lastIdx = values.reduce((acc, v, i) => (v != null ? i : acc), -1);
  const hasData = lastIdx >= 0;
  const color = SERIES_COLOR[channel];

  // Y gridlines + labels come from the same tick list, so a label always sits
  // exactly on its line.
  const ticksY = useMemo(() => axisTicks(max), [max]);

  /**
   * Time ticks, every 2 hours.
   *
   * The feed is one reading per hour, so a 2-hour step yields ~12 labels across
   * the day — enough to read the shape without the labels colliding. We look for
   * the exact clock hours (00:00, 02:00, … 22:00) rather than taking every 2nd
   * index, so the labels stay truthful even if a reading is missing from the
   * feed and the rows are not perfectly hourly. If the feed does not contain
   * those hours at all, fall back to an even 2-index stride.
   */
  const ticks = useMemo(() => {
    if (!detail || n < 2) return [];
    const byClock = [];
    for (let h = 0; h < 24; h += 2) {
      const i = rows.findIndex((r) => r.time && r.time.getHours() === h);
      if (i >= 0) byClock.push(i);
    }
    if (byClock.length >= 4) return byClock;
    // Fallback: every second sample, always including the last point.
    const stride = [];
    for (let i = 0; i < n; i += 2) stride.push(i);
    if (stride[stride.length - 1] !== n - 1) stride.push(n - 1);
    return stride;
  }, [detail, rows, n]);

  const clock = (d) =>
    d ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` : '';

  /**
   * Map a viewport x-coordinate to the nearest data index.
   *
   * The SVG is scaled by `viewBox` with `preserveAspectRatio="none"`, so the
   * on-screen rect is NOT square with the viewBox — we must convert through the
   * bounding rect rather than assume 1 unit = 1 px. Clamping inside the plot
   * means a drag that leaves the chart keeps the last valid selection instead of
   * throwing it away.
   */
  const indexFromClientX = useCallback(
    (clientX) => {
      const svg = svgRef.current;
      if (!svg || n < 1) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return null;
      const vx = ((clientX - rect.left) / rect.width) * W;
      const frac = (vx - PAD.l) / plotW;
      const i = Math.round(frac * (n - 1));
      return Math.min(n - 1, Math.max(0, i));
    },
    [n, plotW]
  );

  // While dragging (mouse) or after a tap (touch) the tooltip follows the finger.
  const dragging = useRef(false);

  const handlePointerDown = (e) => {
    if (!detail) return;
    const i = indexFromClientX(e.clientX);
    if (i == null) return;
    dragging.current = true;
    setActive(i);
    // Capture so a drag that leaves the SVG still reports positions.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!detail) return;
    // Mouse hovers (no button held) and captured drags both update.
    if (e.pointerType !== 'mouse' && !dragging.current) return;
    const i = indexFromClientX(e.clientX);
    if (i != null) setActive(i);
  };

  const handlePointerUp = (e) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handlePointerLeave = (e) => {
    // A touch tap should persist (there is no hover to follow); a mouse leaving
    // the plot should dismiss the tooltip.
    if (e.pointerType === 'mouse') setActive(null);
  };

  // Keyboard access: arrows step through the series, Escape dismisses.
  const handleKeyDown = (e) => {
    if (!detail) return;
    if (e.key === 'Escape') {
      // Dismiss the tooltip only. Without stopPropagation the dialog's own
      // Escape handler also fires and closes the whole modal — so a user who
      // just wanted the readout gone would lose their place entirely.
      if (active != null) {
        e.stopPropagation();
        setActive(null);
      }
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    // Stepping with nothing selected starts from the first reading, so ArrowRight
    // walks forward through the day. (Starting at `lastIdx` would make the first
    // ArrowRight a no-op, which reads as a broken key.)
    const step = e.key === 'ArrowLeft' ? -1 : 1;
    setActive((prev) => {
      const base = prev == null ? (step > 0 ? 0 : n - 1) : prev;
      return Math.min(n - 1, Math.max(0, base + step));
    });
  };

  // A selection that points at a gap (or a chart that just changed pollutant)
  // must not leave a phantom tooltip behind.
  useEffect(() => {
    setActive(null);
  }, [channel]);

  const activeValue = active == null ? null : values[active];
  const showTip = detail && active != null;

  return (
    <figure className={`poll-spark${detail ? ' is-detail' : ''}`}>
      <figcaption>
        <span className="poll-swatch" style={{ background: color }} aria-hidden="true" />
        <span className="poll-spark-label">{label}</span>
        {/* Hint that the plot is interactive. Lives in the caption row (and
            hides itself once a tooltip is showing) so appearing/disappearing
            never shifts the chart below it. */}
        {detail && !showTip && (
          <span className="poll-touch-hint">{t('poll.touchHint')}</span>
        )}
        <span className="poll-spark-latest">
          {hasData ? `${fmt(values[lastIdx])} ${unit}` : '—'}
        </span>
      </figcaption>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="poll-spark-svg"
        role={detail ? 'application' : 'img'}
        aria-label={`${label}: ${latestText}`}
        preserveAspectRatio="none"
        tabIndex={detail ? 0 : undefined}
        // Tells the enclosing dialog that Escape here is ours to consume — but
        // only while a tooltip is showing; otherwise Escape should close the
        // dialog as usual. `active` is the single source of truth for that.
        data-esc-local={detail && active != null ? '' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Horizontal gridlines and their value labels, one per tick. */}
        {ticksY.map((v) => {
          const gy = PAD.t + plotH - (v / max) * plotH;
          return (
            <g key={v}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={gy}
                y2={gy}
                className={v === 0 ? 'poll-axis' : 'poll-grid'}
              />
              <text
                x={PAD.l - 5}
                y={gy + 3}
                className="poll-axis-text poll-axis-y"
                textAnchor="end"
              >                {fmtAxis(v)}
              </text>
            </g>
          );
        })}

        {/* Vertical guide for the selected point. */}
        {showTip && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.t}
            y2={PAD.t + plotH}
            className="poll-cursor-line"
          />
        )}

        {segments.map((seg, si) =>
          seg.length === 1 ? (
            // A lone reading still deserves a mark.
            <circle key={si} cx={seg[0][0]} cy={seg[0][1]} r={2} fill={color} />
          ) : (
            <polyline
              key={si}
              points={seg.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )
        )}

        {/* Emphasise the most recent reading, unless it is the selected one. */}
        {hasData && active !== lastIdx && (
          <circle
            cx={x(lastIdx)}
            cy={y(values[lastIdx])}
            r={3}
            stroke="#fff"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            fill={color}
          />
        )}

        {/* Marker for the selected point. A missing reading shows a hollow dot
            pinned to the baseline so the tap is still acknowledged. */}
        {showTip && (
          <circle
            cx={x(active)}
            cy={activeValue == null ? PAD.t + plotH : y(activeValue)}
            r={4}
            stroke="#fff"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            fill={activeValue == null ? '#fff' : color}
            className={activeValue == null ? 'poll-marker-na' : undefined}
          />
        )}

        {/* No transparent hit-rect here: the <svg> element itself receives the
            pointer events (see onPointerDown/Move on the root). An overlay rect
            would swallow clicks aimed at the chips and footnotes beneath the
            chart, which Playwright flags as "intercepts pointer events". */}

        {/* Tooltip, drawn inside the plot next to the selected point rather than
            below the chart, so the eye never has to leave the line. Rendered as
            SVG (not HTML) so it scales with the figure and can be positioned in
            the same viewBox coordinates as the marker it describes.

            `textLength`-style metrics are unavailable in SVG, so the bubble is
            sized from a character-count estimate; that estimate only needs to be
            generous, never exact, because the bubble is anchored away from the
            point and clamped to the plot. */}
        {showTip && (() => {
          const valText = activeValue == null ? t('poll.na') : `${fmt(activeValue)} ${unit}`;
          const timeText = clock(rows[active]?.time);

          /**
           * Estimate text width in viewBox units.
           *
           * SVG has no measuring API, so we approximate: digits/latin at the
           * value font are ~7px, and CJK glyphs are full-width (~13px). The old
           * single 6.2px factor was fine for the latin time but let the CJK
           * unit ("微克／立方米") overflow the bubble, so width is now summed per
           * character class. Being slightly generous is safe — the bubble is
           * clamped to the plot either way.
           */
          const textW = (s, latinPx, cjkPx) =>
            [...s].reduce((w, ch) => w + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(ch) ? cjkPx : latinPx), 0);

          const padX = 9;
          const timeW = textW(timeText, 6.5, 11);
          const valW = textW(valText, 7.6, 13);
          const boxW = Math.max(timeW, valW) + padX * 2;
          const boxH = 36;
          const gap = 12;

          // Prefer the right of the point; flip left when it would overflow.
          const pointX = x(active);
          const pointY = activeValue == null ? PAD.t + plotH : y(activeValue);
          const rightEdge = W - PAD.r;
          const leftEdge = PAD.l;
          const placeLeft = pointX + gap + boxW > rightEdge;
          const rawX = placeLeft ? pointX - gap - boxW : pointX + gap;
          const boxX = Math.min(Math.max(rawX, leftEdge), rightEdge - boxW);

          // Vertically centre on the point, kept inside the plot.
          const rawY = pointY - boxH / 2;
          const boxY = Math.min(Math.max(rawY, PAD.t), PAD.t + plotH - boxH);

          return (
            <g className="poll-tipbox" pointerEvents="none">
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={6}
                className="poll-tipbox-bg"
              />
              <text x={boxX + padX} y={boxY + 15} className="poll-tipbox-time">
                {timeText}
              </text>
              <text x={boxX + padX} y={boxY + 29} className="poll-tipbox-val">
                {valText}
              </text>
            </g>
          );
        })()}

        {/* Time axis. */}
        {detail
          ? ticks.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                className="poll-axis-text"
                textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              >
                {clock(rows[i]?.time)}
              </text>
            ))
          : n > 1 && (
              <>
                <text x={PAD.l} y={H - 5} className="poll-axis-text" textAnchor="start">
                  {clock(rows[0].time)}
                </text>
                <text x={W - PAD.r} y={H - 5} className="poll-axis-text" textAnchor="end">
                  {clock(rows[n - 1].time)}
                </text>
              </>
            )}
      </svg>

      {/* The readout now lives inside the plot (above). Screen readers cannot
          see SVG text change reliably, so the same value is mirrored into a
          visually-hidden live region — the visual tooltip needs no accessible
          name, and this keeps the announcement working. */}
      {detail && (
        <div className="sr-only" aria-live="polite">
          {showTip
            ? `${clock(rows[active]?.time)} ${
                activeValue == null ? t('poll.na') : `${fmt(activeValue)} ${unit}`
              }`
            : ''}
        </div>
      )}
    </figure>
  );
}

export default function PollutantDetail({
  stations,
  loading,
  error,
  available,
  stationName,
  onStationChange,
  headerExtra,
}) {
  const { t, tStation, formatDateTime } = useI18n();
  const [view, setView] = useState('chart');
  // Which single pollutant the chart shows. Defaults to NO2, the pollutant the
  // app's own data shows is usually decisive at roadside stations.
  const [channel, setChannel] = useState('NO2');

  // Resolve the selected station, defaulting to the first with data. Falling
  // back inside a memo (rather than an effect) keeps this a pure derivation.
  const selected = useMemo(() => {
    if (!stations.length) return null;
    return (
      stations.find((s) => s.station === stationName) ??
      stations.find((s) => !s.incomplete) ??
      stations[0]
    );
  }, [stations, stationName]);

  // Per-channel 24-hour statistics for the table.
  const stats = useMemo(() => {
    if (!selected) return null;
    const out = {};
    for (const p of RAW_POLLUTANTS) {
      const vals = selected.rows.map((r) => r[p]).filter((v) => v != null);
      out[p] = {
        latest: selected.values[p],
        // 3-hour moving average, matching the AQHI's averaging window.
        avg3: selected.composition?.concentrations?.[p] ?? null,
        share: selected.composition?.shares?.[p] ?? null,
        min: vals.length ? Math.min(...vals) : null,
        max: vals.length ? Math.max(...vals) : null,
        avg24: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        count: vals.length,
      };
    }
    return out;
  }, [selected]);

  if (loading)
    return (
      <section className="card poll-card">
        <div className="card-head">
          <h3>{t('poll.title')}</h3>
        </div>
        <p className="muted">{t('poll.loading')}</p>
      </section>
    );

  // The proxy is missing (e.g. a static-only deploy) — hide the section rather
  // than showing an error the user cannot act on.
  if (!available)
    return (
      <section className="card poll-card">
        <div className="card-head">
          <h3>{t('poll.title')}</h3>
        </div>
        <p className="muted">{t('poll.unavailable')}</p>
      </section>
    );

  if (error)
    return (
      <section className="card poll-card">
        <div className="card-head">
          <h3>{t('poll.title')}</h3>
        </div>
        <p className="error">{t('poll.error', { error })}</p>
      </section>
    );

  if (!stations.length || !selected)
    return (
      <section className="card poll-card">
        <div className="card-head">
          <h3>{t('poll.title')}</h3>
        </div>
        <p className="muted">{t('poll.none')}</p>
      </section>
    );

  const comp = selected.composition;
  const latestAt = selected.latestTime ? formatDateTime(selected.latestTime) : '';

  return (
    <section className="card poll-card">
      <div className="card-head poll-card-head">
        <h3>{t('poll.title')}</h3>
        <div className="poll-head-actions">
          <div className="poll-toggle" role="group" aria-label={t('poll.aria.viewToggle')}>
            <button
              type="button"
              className={view === 'chart' ? 'is-active' : ''}
              aria-pressed={view === 'chart'}
              onClick={() => setView('chart')}
            >
              {t('poll.viewChart')}
            </button>
            <button
              type="button"
              className={view === 'table' ? 'is-active' : ''}
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
            >
              {t('poll.viewTable')}
            </button>
          </div>
          {headerExtra}
        </div>
      </div>

      <div className="poll-station-picker">
        <label htmlFor="poll-station">{t('poll.stationPicker')}</label>
        <select
          id="poll-station"
          value={selected.station}
          onChange={(e) => onStationChange?.(e.target.value)}
        >
          {stations.map((s) => (
            <option key={s.station} value={s.station}>
              {tStation(s.station)} — {t(s.type === 'Roadside' ? 'station.roadside' : 'station.general')}
            </option>
          ))}
        </select>
      </div>

      <p className="muted poll-meta">
        {latestAt && <span>{t('poll.latestAt', { time: latestAt })}</span>}
        {comp?.pmBasis && (
          <span>
            {' · '}
            {t('poll.pmBasis', { basis: t(`poll.short.${comp.pmBasis}`) })}
          </span>
        )}
      </p>

      {view === 'chart' ? (
        <>
          <p className="muted poll-caption">
            {t('poll.chartCaption', { station: tStation(selected.station) })}
          </p>

          {/* One chart at a time. The chips are the accordion: picking one
              swaps the single series below rather than adding another chart. */}
          <div
            className="poll-chips"
            role="group"
            aria-label={t('poll.aria.chartPicker')}
          >
            {RAW_POLLUTANTS.map((p) => {
              const st = stats[p];
              return (
                <button
                  key={p}
                  type="button"
                  className={`poll-chip${channel === p ? ' is-active' : ''}`}
                  style={channel === p ? { borderColor: SERIES_COLOR[p], color: SERIES_COLOR[p] } : undefined}
                  aria-pressed={channel === p}
                  onClick={() => setChannel(p)}
                >
                  <span
                    className="poll-swatch"
                    style={{ background: SERIES_COLOR[p] }}
                    aria-hidden="true"
                  />
                  <span className="poll-chip-name">{t(`poll.chip.${p}`)}</span>
                  <b>{st.latest == null ? t('poll.na') : fmt(st.latest)}</b>
                </button>
              );
            })}
          </div>

          <Sparkline
            channel={channel}
            rows={selected.rows}
            label={t(`poll.legend.${channel}`)}
            unit={t('poll.unit')}
            latestText={`${t('poll.range.hours')}, ${t(`poll.legend.${channel}`)}`}
            detail
            t={t}
          />
        </>
      ) : (
        <div className="table-scroll">
          <table className="poll-table">
            <caption className="sr-only">{t('poll.chartTitle')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('poll.colPollutant')}</th>
                <th scope="col">
                  {t('poll.colLatest')}
                  <span className="poll-th-unit">{t('poll.unit')}</span>
                </th>
                <th scope="col">
                  {t('poll.colAvg')}
                  <span className="poll-th-unit">{t('poll.unit')}</span>
                </th>
                <th scope="col">{t('poll.colMin')}</th>
                <th scope="col">{t('poll.colMax')}</th>
                <th scope="col">{t('poll.colAvg24')}</th>
              </tr>
            </thead>
            <tbody>
              {RAW_POLLUTANTS.map((p) => {
                const st = stats[p];
                // "-" is "not published", so render an em dash with an
                // explanation rather than a misleading 0.
                const cell = (v, digits = 1) =>
                  v == null ? (
                    <span className="poll-na" title={t('poll.naHint')}>
                      {t('poll.na')}
                    </span>
                  ) : (
                    fmt(v, digits)
                  );
                return (
                  <tr key={p}>
                    <th scope="row">
                      <span
                        className="poll-swatch"
                        style={{ background: SERIES_COLOR[p] }}
                        aria-hidden="true"
                      />
                      {t(`poll.name.${p}`)}
                    </th>
                    <td>{cell(st.latest)}</td>
                    <td>{cell(st.avg3)}</td>
                    <td>{cell(st.min)}</td>
                    <td>{cell(st.max)}</td>
                    <td>{cell(st.avg24)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted footnote">
        {t('poll.averaging', {
          window: t(`poll.window${MOVING_AVERAGE_HOURS}h`),
        })}
      </p>

      {comp ? (
        <div className="poll-composition">
          <h4>{t('poll.composedTitle')}</h4>
          <p className="muted poll-caption">{t('poll.composedCaption')}</p>

          {/* Stacked bar: each pollutant's share of summed added health risk. */}
          <div
            className="poll-stack"
            role="img"
            aria-label={t('poll.arValue', {
              ar: comp.addedRisk.toFixed(1),
              aqhi: comp.aqhi === 11 ? '10+' : comp.aqhi,
            })}
          >
            {['SO2', 'NO2', 'O3', 'PM'].map((k) => (
              <span
                key={k}
                style={{
                  width: `${comp.shares[k]}%`,
                  background: k === 'PM' ? SERIES_COLOR[comp.pmBasis] : SERIES_COLOR[k],
                }}
                title={`${t(`poll.short.${k === 'PM' ? comp.pmBasis : k}`)} ${comp.shares[k].toFixed(1)}%`}
              />
            ))}
          </div>

          <ul className="poll-share-list">
            {['SO2', 'NO2', 'O3', 'PM'].map((k) => {
              const chan = k === 'PM' ? comp.pmBasis : k;
              return (
                <li key={k}>
                  <span
                    className="poll-swatch"
                    style={{ background: SERIES_COLOR[chan] }}
                    aria-hidden="true"
                  />
                  <span className="grow">{t(`poll.short.${chan}`)}</span>
                  <b>{comp.shares[k].toFixed(1)}%</b>
                </li>
              );
            })}
          </ul>

          <p className="muted poll-ar">
            {t('poll.arValue', {
              ar: comp.addedRisk.toFixed(1),
              aqhi: comp.aqhi === 11 ? '10+' : comp.aqhi,
            })}
          </p>
          <p className="muted footnote">{t('poll.computedNotice')}</p>
        </div>
      ) : (
        <p className="muted poll-incomplete">{t('poll.noComposition')}</p>
      )}

      <p className="muted footnote">{t('poll.pmNote')}</p>
      <p className="muted footnote">{t('poll.source')}</p>
    </section>
  );
}
