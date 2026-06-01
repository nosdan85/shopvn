import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { assetUrl, dateTime, money } from '../../../api'
import { appRoutes } from '../../../app/routes'
import { fetchCompatProofs } from '../../compat/api/storefront'
import type { CompatProof } from '../../compat/types'

export function CompatProofsPage() {
  const [page, setPage] = useState(1)
  const [proofs, setProofs] = useState<CompatProof[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchCompatProofs(page, 12)
      .then((data) => {
        if (!active) return
        setProofs(data.items)
        setHasMore(data.hasMore)
        setError('')
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Khong tai duoc proofs.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page])

  return (
    <div className="page-section compat-proofs-page">
      <section className="panel compat-page-head">
        <div>
          <span className="eyebrow">Compat proofs</span>
          <h1>Vouches va recent proof stream</h1>
          <p>Render tu review da duyet tren backend hien tai, theo layout proof grid cua web tay.</p>
        </div>
        <Link className="ghost" to={appRoutes.shop}>Ve storefront</Link>
      </section>

      {error && <section className="panel"><p className="compat-error">{error}</p></section>}

      <section className="compat-proof-grid">
        {loading && !proofs.length ? <div className="panel"><p>Dang tai proofs...</p></div> : null}
        {!loading && !proofs.length ? <div className="panel"><p>Chua co proof nao.</p></div> : null}
        {proofs.map((proof) => (
          <article className="panel compat-proof-card" key={proof.id}>
            {proof.imageUrls[0] ? (
              <div className="compat-proof-image">
                <img src={assetUrl(proof.imageUrls[0])} alt={proof.itemName || proof.username} />
              </div>
            ) : null}
            <div className="compat-proof-body">
              <div className="compat-proof-meta">
                <strong>{proof.username}</strong>
                <span>{money(proof.totalAmount)}</span>
              </div>
              <h3>{proof.itemName || 'Proof item'}</h3>
              <p>{proof.content || 'Approved review from completed order.'}</p>
              <div className="compat-proof-foot">
                <span>{'★'.repeat(Math.max(1, Math.min(5, proof.rating || 5)))}</span>
                <span>{dateTime(proof.createdAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel compat-pagination">
        <button className="ghost" type="button" disabled={page <= 1} onClick={() => {
          setLoading(true)
          setPage((current) => Math.max(1, current - 1))
        }}>Trang truoc</button>
        <span>Trang {page}</span>
        <button className="ghost" type="button" disabled={!hasMore} onClick={() => {
          setLoading(true)
          setPage((current) => current + 1)
        }}>Trang sau</button>
      </section>
    </div>
  )
}
