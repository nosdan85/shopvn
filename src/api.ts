const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
const publicCache = new Map<string, { expiresAt: number; data: unknown }>()
const publicCacheMs = 30_000

export class ApiError extends Error {
  status: number
  code?: string
  data?: unknown

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

function canCache(path: string, options: RequestInit) {
  const method = String(options.method || 'GET').toUpperCase()
  return method === 'GET' && (
    path === '/home' ||
    path === '/settings/public' ||
    path === '/game-categories' ||
    path === '/compat/storefront' ||
    path.startsWith('/compat/proofs') ||
    path.startsWith('/items')
  )
}

function fallbackApiMessage(status: number, path: string) {
  if (status === 0 || status === 502 || status === 503 || status === 504) {
    return `Khong ket noi duoc backend API cho ${path}. Hay chay server o cong 4000 roi thu lai.`
  }
  if (status === 404) {
    return `API ${path} khong ton tai tren backend hien tai.`
  }
  return 'Co loi xay ra, vui long thu lai.'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (canCache(path, options)) {
    const cached = publicCache.get(path)
    if (cached && cached.expiresAt > Date.now()) return cached.data as T
  }
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/api${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch (error) {
    throw new ApiError(
      fallbackApiMessage(0, path),
      0,
      'NETWORK_ERROR',
      { cause: error instanceof Error ? error.message : String(error) },
    )
  }

  const contentType = response.headers.get('content-type')
  const data = contentType?.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(data?.message || fallbackApiMessage(response.status, path), response.status, data?.code, data)
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
    throw new Error(data?.message || 'Upload anh that bai.')
  }
  return data
}

export function backendUrl(path: string) {
  return `${apiBaseUrl}/api${path}`
}

export function assetUrl(url?: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${apiBaseUrl}${value}`
  return value
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
  pending: 'Cho xu ly',
  processing: 'Dang xu ly',
  completed: 'Da giao hang',
  cancelled: 'Da huy',
  refunded: 'Da hoan tien',
}

export const depositStatus: Record<string, string> = {
  pending: 'Cho thanh toan',
  success: 'Thanh cong',
  failed: 'That bai',
  cancelled: 'Da huy',
}

export const depositMethod: Record<string, string> = {
  bank_transfer: 'Chuyen khoan ngan hang',
  viettel_card: 'The cao Viettel',
  mobifone_card: 'The cao Mobifone',
  vinaphone_card: 'The cao Vinaphone',
}
