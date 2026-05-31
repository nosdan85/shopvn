import { CompatCartPage } from '../../features/cart/pages/CompatCartPage'
import { CompatOrdersPage } from '../../features/orders/pages/CompatOrdersPage'
import { CompatProfilePage } from '../../features/profile/pages/CompatProfilePage'
import { ShopLandingPage } from '../../features/storefront/pages/ShopLandingPage'
import ShopApp from '../../ShopApp'
import type { CompatShellPage } from '../../features/compat/types'

export function CompatShell(props: { initialPage?: CompatShellPage }) {
  if (window.location.search.includes('legacy=1')) {
    const pageMap = {
      cart: 'cart',
      orders: 'orders',
      profile: 'profile',
      shop: 'home',
    } as const
    return <ShopApp initialPageOverride={pageMap[props.initialPage || 'shop']} />
  }

  if (props.initialPage && props.initialPage !== 'shop') {
    if (props.initialPage === 'cart') return <CompatCartPage />
    if (props.initialPage === 'orders') return <CompatOrdersPage />
    if (props.initialPage === 'profile') return <CompatProfilePage />
  }
  return <ShopLandingPage />
}
