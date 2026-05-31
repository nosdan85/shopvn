import { api } from '../../../api'
import type { Deposit, GameCategory, Item, Order, Review, Settings, User } from '../../../types'

export type CompatAdminDashboard = {
  cards: Array<{
    key: string
    label: string
    value: number
  }>
  recentOrders: Array<{
    id: number
    orderCode: string
    username: string
    totalAmount: number
    status: string
    createdAt: string
  }>
  topProducts: Array<{
    id: number
    name: string
    revenue: number
    quantitySold: number
  }>
  proofStats: {
    totalProofs: number
    pendingProofs: number
    recentProofs: Array<{
      id: number
      username: string
      itemName: string
      status: string
      createdAt: string
    }>
  }
  modules: {
    luckyWheelEnabled: boolean
    referralEnabled: boolean
    proofsEnabled: boolean
    luckyWheelTitle: string
    luckyWheelMessage: string
  }
  referralStats: {
    totalRewards: number
    totalPaid: number
    pendingReversals: number
  }
}

export function fetchCompatAdminDashboard() {
  return api<CompatAdminDashboard>('/compat/admin/dashboard')
}

export function fetchAdminProducts() {
  return api<{ items: Item[] }>('/admin/items')
}

export function createAdminProduct(payload: Record<string, unknown>) {
  return api<{ item: Item }>('/admin/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminProduct(id: number, payload: Record<string, unknown>) {
  return api<{ item: Item }>(`/admin/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminGames() {
  return api<{ categories: GameCategory[] }>('/admin/game-categories')
}

export function createAdminGame(payload: Record<string, unknown>) {
  return api<{ category: GameCategory }>('/admin/game-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminGame(id: number, payload: Record<string, unknown>) {
  return api<{ category: GameCategory }>(`/admin/game-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminOrders() {
  return api<{ orders: Order[] }>('/admin/orders')
}

export function updateAdminOrderStatus(id: number, payload: Record<string, unknown>) {
  return api<{ order: Order }>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminUsers() {
  return api<{ users: User[] }>('/admin/users')
}

export function updateAdminUser(id: number, payload: Record<string, unknown>) {
  return api<{ user: User }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminSettings() {
  return api<{ settings: Settings }>('/admin/settings')
}

export function updateAdminSettings(payload: Record<string, unknown>) {
  return api<{ settings: Settings }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchAdminReviews() {
  return api<{ reviews: Review[] }>('/admin/reviews')
}

export function fetchAdminDeposits() {
  return api<{ deposits: Deposit[] }>('/admin/deposits')
}
