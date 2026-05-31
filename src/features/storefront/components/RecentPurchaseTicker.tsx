import type { CompatStorefrontSummary } from '../../compat/types'

export function RecentPurchaseTicker({ purchases }: { purchases: CompatStorefrontSummary['recentPurchases'] }) {
  if (!purchases.length) return null
  return (
    <section className="panel compat-ticker">
      <div className="compat-section-head">
        <div>
          <span className="eyebrow">Live feed</span>
          <h2>Recent purchases</h2>
        </div>
      </div>
      <div className="compat-ticker-track">
        {purchases.map((entry) => (
          <span key={`${entry.orderCode}-${entry.createdAt}`}>{entry.username} mua {entry.itemNames || 'item'}.</span>
        ))}
      </div>
    </section>
  )
}
