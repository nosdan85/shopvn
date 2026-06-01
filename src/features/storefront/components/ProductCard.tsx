import { assetUrl, money } from '../../../api'
import type { CompatStorefrontProduct } from '../../compat/types'

export function ProductCard({
  product,
  onOpen,
}: {
  product: CompatStorefrontProduct
  onOpen: (product: CompatStorefrontProduct) => void
}) {
  return (
    <button className="compat-product-card shoptay-product-card" type="button" onClick={() => onOpen(product)}>
      <div className="compat-product-image shoptay-product-image">
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <div className="shoptay-image-fallback">NOS</div>}
      </div>
      <div className="compat-product-body shoptay-product-body">
        <h3>{product.name}</h3>
        <p>{product.shortDescription || product.categoryName || 'Roblox item'}</p>
        <div className="shoptay-card-foot">
          <strong>{money(product.price)}</strong>
          <span>View</span>
        </div>
      </div>
    </button>
  )
}
