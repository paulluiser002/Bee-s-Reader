export default function Loading() {
  return (
    <div className="stack" aria-label="Loading" role="status">
      <div className="skeleton" style={{ height: 40, width: '60%' }} />
      <div className="skeleton" style={{ height: 240 }} />
      <span className="muted">Opening your reading nook…</span>
    </div>
  );
}
