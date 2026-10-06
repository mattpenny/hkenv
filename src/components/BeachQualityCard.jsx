import { beachGradeColor } from '../utils/colorScale.js';

/** Beach water quality: warning banner + grid of beaches with grade badges. */
export default function BeachQualityCard({ beaches, loading, error }) {
  if (loading) return <Card title="Beach Water Quality"><p className="muted">Loading beaches…</p></Card>;
  if (error)
    return (
      <Card title="Beach Water Quality">
        <p className="error">Could not load beach data: {error}</p>
      </Card>
    );
  if (!beaches.length)
    return <Card title="Beach Water Quality"><p className="muted">No beaches in service.</p></Card>;

  const bad = beaches.filter((b) => b.grade >= 3);
  const retrieved = beaches[0]?.fetchedAt?.toLocaleString?.();

  return (
    <Card title="Beach Water Quality">
      {bad.length > 0 && (
        <div className="banner banner-warn">
          ⚠️ {bad.length} beach{bad.length > 1 ? 'es' : ''} at Grade 3 or 4 — avoid swimming:
          {bad.slice(0, 3).map((b) => b.name).join(', ')}
          {bad.length > 3 ? '…' : ''}
        </div>
      )}
      <div className="beach-grid">
        {beaches.map((b) => (
          <div className="beach-chip" key={b.beachCode || b.name}>
            <span className="badge" style={{ background: beachGradeColor(b.grade) }}>
              {b.grade}
            </span>
            <div className="beach-meta">
              <strong>{b.name}</strong>
              <small className="muted">
                {b.district} · {b.gradeLabel}
              </small>
            </div>
          </div>
        ))}
      </div>
      <p className="muted footnote">
        Beaches closed for the season are excluded. Data retrieved {retrieved}.
      </p>
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