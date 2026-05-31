export type CompatShellPage = 'shop' | 'cart' | 'orders' | 'profile'

export type CompatStorefrontCategory = {
  id: number
  name: string
  slug: string
  icon: string
}

export type CompatStorefrontProduct = {
  id: number
  name: string
  slug: string
  price: number
  image: string
  shortDescription: string
  description?: string
  categorySlug?: string
  categoryName?: string
}

export type CompatProof = {
  id: number
  username: string
  itemName: string
  content: string
  rating: number
  imageUrls: string[]
  totalAmount: number
  createdAt: string
}

export type CompatStorefrontSummary = {
  banners: string[]
  bestSellerIds: number[]
  categories: CompatStorefrontCategory[]
  products: CompatStorefrontProduct[]
  recentPurchases: Array<{
    orderCode: string
    username: string
    itemNames: string
    createdAt: string
  }>
  proofs: CompatProof[]
  analytics: {
    totalOrders: number
    totalRevenue: number
    linkedDiscordUsers: number
  }
  modules: {
    luckyWheel: {
      enabled: boolean
      title: string
      message: string
      tickets: number
    }
    referral: {
      enabled: boolean
      headline: string
      details: string
    }
    proofs: {
      enabled: boolean
      total: number
      featuredCount: number
    }
  }
}

export type CompatProofList = {
  page: number
  hasMore: boolean
  items: CompatProof[]
}

export type CompatRobloxProfile = {
  userId: string
  username: string
  displayName: string
  avatar: string
}
