export const appRoutes = {
  home: '/',
  shop: '/shop',
  proofs: '/proofs',
  cart: '/cart',
  orders: '/orders',
  profile: '/profile',
  admin: '/admin',
} as const

export type AppRouteKey = keyof typeof appRoutes
