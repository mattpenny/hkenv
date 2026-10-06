import { aqhiColor } from '../utils/colorScale.js';

/** Air Quality card: highlights the worst AQHI station with a big number. */
export default function AirQualityCard({ stations, loading, error }) {
  if (loading) return <Card title="Air Quality Now"><p className="muted">Loading AQHI…</p></Card>;
  if (error)
    return (
      <Card title="Air Quality Now">
        <p className="error">Could not load AQHI data: {error}</p>
      </Card>
    );
  if (!stations.length) return <Card title="Air Quality Now"><p className="muted">No data.</p></Card>;

  const worst = stations.reduce((a, b) => ((b.aqhi ?? -1) > (a.aqhi ?? -1) ? b : a));
  const color = aqhiColor(worst.aqhi);
  const updated = worst.timestamp ?? worst.fetchedAt?.toLocaleString?.();

  return (
    <Card title="Air Quality Now">
      <div className="aqhi-hero" style={{ borderColor: color }}>
        <div className="aqhi-number" style={{ background: color }}>
          {worst.aqhi ?? 'n/a'}
        </div>
        <div>
          <strong>Highest: {worst.station}</strong>
          <div>Health risk: <b>{worst.category}</b></div>
          <small className="muted">Published {updated}</small>
        </div>
      </div>
      <ul className="station-list">
        {stations.map((s) => (
          <li key={s.station}>
            <span className="dot" style={{ background: aqhiColor(s.aqhi) }} />
            <span className="grow">{s.station}</span>
            <b>{s.aqhi ?? 'n/a'}</b>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Card({ title, children }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}