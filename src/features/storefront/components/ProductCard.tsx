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
    <button className="compat-product-card" type="button" onClick={() => onOpen(product)}>
      <div className="compat-product-image">
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <div className="hero-banner-fallback">No image</div>}
      </div>
      <div className="compat-product-body">
        <small>{product.categoryName || 'Imported catalog'}</small>
        <h3>{product.name}</h3>
        <p>{product.shortDescription || 'Compat storefront item.'}</p>
        <strong>{money(product.price)}</strong>
      </div>
    </button>
  )
}
