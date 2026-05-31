export type CompatCartEntry = {
  productId: number
  quantity: number
}

const cartStorageKey = 'compat_shoptay_cart'

export function loadCompatCart(): CompatCartEntry[] {
  try {
    const raw = window.localStorage.getItem(cartStorageKey)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => ({
        productId: Number(entry?.productId),
        quantity: Number(entry?.quantity),
      }))
      .filter((entry) => Number.isInteger(entry.productId) && entry.productId > 0 && Number.isInteger(entry.quantity) && entry.quantity > 0)
  } catch {
    return []
  }
}

export function saveCompatCart(entries: CompatCartEntry[]) {
  window.localStorage.setItem(cartStorageKey, JSON.stringify(entries))
}

export function mergeCompatCart(entries: CompatCartEntry[], productId: number, quantity: number) {
  const nextQuantity = Math.max(1, Math.floor(quantity || 1))
  const found = entries.find((entry) => entry.productId === productId)
  if (!found) return [...entries, { productId, quantity: nextQuantity }]
  return entries.map((entry) => entry.productId === productId ? { ...entry, quantity: entry.quantity + nextQuantity } : entry)
}

export function setCompatCartQuantity(entries: CompatCartEntry[], productId: number, quantity: number) {
  const nextQuantity = Math.max(1, Math.floor(quantity || 1))
  return entries.map((entry) => entry.productId === productId ? { ...entry, quantity: nextQuantity } : entry)
}

export function removeCompatCartItem(entries: CompatCartEntry[], productId: number) {
  return entries.filter((entry) => entry.productId !== productId)
}
