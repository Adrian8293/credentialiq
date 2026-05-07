export function ProviderTableSkeleton({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton skeleton-avatar" style={{ borderRadius: 6 }} />
          <div>
            <div className="skeleton skeleton-text" style={{ width: '55%' }} />
            <div className="skeleton skeleton-text sm" style={{ width: '35%', marginBottom: 0 }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          <div className="skeleton skeleton-badge" />
          <div className="skeleton skeleton-text" style={{ width: '70%' }} />
          <div className="skeleton skeleton-badge" />
        </div>
      ))}
    </div>
  )
}
 
export function KpiGridSkeleton() {
  return (
    <div className="kpi-grid" style={{ marginBottom: 20 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-kpi" />
      ))}
    </div>
  )
}
 
export function CardBodySkeleton({ lines = 4 }) {
  return (
    <div style={{ padding: '12px 16px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  )
}
 
-- Usage in ProvidersPage:
--   {isLoading ? <ProviderTableSkeleton rows={5} /> : <ProviderTable ... />}
 
-- Usage in Dashboard:
--   {isLoading ? <KpiGridSkeleton /> : <KpiGrid ... />}
 
