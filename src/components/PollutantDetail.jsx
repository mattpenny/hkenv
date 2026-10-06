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
   * Time ticks. Prefer fixed clock hours (00:00 / 06:00 / 12:00 / 18:00) so the
   * axis reads as real times rather than "every Nth point"; fall back to evenly
   * spaced samples when the data does not happen to land on those hours.
   */
  const ticks = useMemo(() => {
    if (!detail || n < 2) return [];
    const byHour = [0, 6, 12, 18]
      .map((h) => rows.findIndex((r) => r.time && r.time.getHours() === h))
      .filter((i) => i >= 0);
    if (byHour.length >= 2) return byHour;
    return [0, Math.floor((n - 1) / 2), n - 1];
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
              <text x={PAD.l - 5} y={gy + 3} className="poll-axis-text" textAnchor="end">
                {fmtAxis(v)}
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

      {/* Tooltip. Rendered in HTML (not SVG) so it inherits normal font metrics
          and can be positioned as a percentage of the figure. `left` is tied to
          the same index the marker uses, so the two never disagree. */}
      {detail && (
        <div className="poll-tip-slot" aria-live="polite">
          <output className={`poll-tip${showTip ? ' is-on' : ''}`}>
            {showTip ? (
              <>
                <span className="poll-tip-time">{clock(rows[active]?.time)}</span>
                <span className="poll-tip-val">
                  <span className="poll-swatch" style={{ background: color }} aria-hidden="true" />
                  {activeValue == null ? (
                    <span className="poll-na" title={t('poll.naHint')}>
                      {t('poll.na')}
                    </span>
                  ) : (
                    `${fmt(activeValue)} ${unit}`
                  )}
                </span>
              </>
            ) : (
              // Reserve height so the layout does not jump when the tip appears.
              <span className="poll-tip-idle">{t('poll.touchHint')}</span>
            )}
          </output>
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
