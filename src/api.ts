const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
const publicCache = new Map<string, { expiresAt: number; data: unknown }>()
const publicCacheMs = 30_000

function canCache(path: string, options: RequestInit) {
  const method = String(options.method || 'GET').toUpperCase()
  return method === 'GET' && (path === '/home' || path === '/settings/public' || path.startsWith('/items'))
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (canCache(path, options)) {
    const cached = publicCache.get(path)
    if (cached && cached.expiresAt > Date.now()) return cached.data as T
  }
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type')
  const data = contentType?.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.message || 'Có lỗi xảy ra, vui lòng thử lại.')
  }

  if (canCache(path, options)) {
    publicCache.set(path, { data, expiresAt: Date.now() + publicCacheMs })
  }

  return data as T
}

export async function uploadImage(file: File, path = '/uploads/image'): Promise<{ url: string }> {
  const body = new FormData()
  body.append('image', file)
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.message || 'Upload ảnh thất bại.')
  }
  return data
}

export function money(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function dateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const orderStatus: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Đã giao hàng',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
}

export const depositStatus: Record<string, string> = {
  pending: 'Chờ thanh toán',
  success: 'Thành công',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
}

export const depositMethod: Record<string, string> = {
  bank_transfer: 'Chuyển khoản ngân hàng',
  viettel_card: 'Thẻ cào Viettel',
  mobifone_card: 'Thẻ cào Mobifone',
  vinaphone_card: 'Thẻ cào Vinaphone',
}
