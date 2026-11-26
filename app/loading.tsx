export default function Loading() {
  return (
    <main className="shell loading-page" aria-busy="true" aria-label="Chargement">
      <div className="loading-head">
        <span className="skeleton" style={{ width: 180, height: 12 }} />
        <span className="skeleton" style={{ width: 360, height: 42 }} />
      </div>
      <div className="loading-hero">
        <span className="skeleton" style={{ width: '100%', height: 420 }} />
        <div className="loading-rail">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="loading-rail-row" key={i}>
              <span className="skeleton" style={{ width: 116, height: 84 }} />
              <span className="skeleton" style={{ width: '70%', height: 16 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="loading-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <span className="skeleton" style={{ width: '100%', height: 180 }} />
            <span className="skeleton" style={{ width: '90%', height: 18 }} />
            <span className="skeleton" style={{ width: '60%', height: 14 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
