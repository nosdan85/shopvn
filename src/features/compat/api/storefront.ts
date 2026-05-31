import { api } from '../../../api'
import type { CompatProofList, CompatRobloxProfile, CompatStorefrontSummary } from '../types'

export function fetchCompatStorefront() {
  return api<CompatStorefrontSummary>('/compat/storefront')
}

export function fetchCompatProofs(page = 1, limit = 12) {
  return api<CompatProofList>(`/compat/proofs?page=${page}&limit=${limit}`)
}

export function searchCompatRobloxUser(username: string) {
  return api<CompatRobloxProfile>(`/compat/roblox/search?username=${encodeURIComponent(username)}`)
}
