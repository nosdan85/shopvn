import { useState } from 'react'
import { assetUrl, money } from '../../../api'
import type { CompatStorefrontProduct } from '../../compat/types'

export function ProductModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}: {
  product: CompatStorefrontProduct | null
  onClose: () => void
  onAddToCart: (product: CompatStorefrontProduct, quantity: number) => void
  onBuyNow: (product: CompatStorefrontProduct, quantity: number) => void
}) {
  const [quantity, setQuantity] = useState(1)

  if (!product) return null

  return (
    <div className="toast-backdrop" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="toast compat-product-modal">
        <div className="compat-modal-head">
          <div>
            <small>{product.categoryName || 'Compat item'}</small>
            <h3>{product.name}</h3>
          </div>
          <button className="ghost" type="button" onClick={onClose}>Dong</button>
        </div>
        <div className="compat-modal-grid">
          <div className="compat-modal-image">
            {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <div className="hero-banner-fallback">No image</div>}
          </div>
          <div className="compat-modal-body">
            <p>{product.description || product.shortDescription || 'Compat imported item.'}</p>
            <strong>{money(product.price)}</strong>
            <label className="compat-field">
              <span>So luong</span>
              <input type="number" min={1} max={999} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))} />
            </label>
            <div className="compat-action-row">
              <button className="ghost" type="button" onClick={() => onAddToCart(product, quantity)}>Them vao gio</button>
              <button className="primary" type="button" onClick={() => onBuyNow(product, quantity)}>Mua ngay</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
