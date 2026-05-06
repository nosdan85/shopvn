export type Role = 'user' | 'admin' | 'super_admin'

export type User = {
  id: number
  username: string
  email: string
  balance: number
  role: Role
  status: string
  full_name?: string
  phone?: string
  total_deposited: number
  total_spent: number
  created_at: string
}

export type Item = {
  id: number
  name: string
  slug: string
  item_code?: string
  image: string
  gallery: string[]
  short_description: string
  description: string
  price: number
  original_price?: number
  sale_price?: number | null
  current_price: number
  discount_percent: number
  stock: number
  sold_count: number
  is_featured: number
  is_best_seller: number
  is_sale: number
  status: string
  sort_order: number
  seo_title?: string
  seo_description?: string
  created_at: string
  updated_at: string
}

export type Order = {
  id: number
  order_code: string
  user_id: number
  username?: string
  email?: string
  total_amount: number
  status: string
  roblox_username: string
  roblox_profile?: string
  roblox_display_name?: string
  customer_note?: string
  admin_note?: string
  internal_note?: string
  refund_reason?: string
  completed_at?: string
  created_at: string
  updated_at: string
  item_names?: string
}

export type Deposit = {
  id: number
  transaction_code: string
  user_id: number
  username?: string
  email?: string
  method: string
  amount: number
  transfer_content: string
  bank_transaction_id?: string
  status: string
  admin_note?: string
  created_at: string
  completed_at?: string
}

export type BalanceLog = {
  id: number
  user_id: number
  username?: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  reference_id?: number
  reference_type?: string
  note?: string
  created_by?: number
  created_at: string
}

export type Review = {
  id: number
  user_id: number
  username?: string
  item_id: number
  item_name?: string
  order_id: number
  rating: number
  content: string
  image?: string
  status: string
  admin_reply?: string
  created_at: string
}

export type Notification = {
  id: number
  user_id: number
  title: string
  content: string
  type: string
  is_read: number
  created_at: string
}

export type ChatMessage = {
  id: number
  user_id: number
  sender_id: number
  sender_username?: string
  sender_role?: Role
  message: string
  is_read: number
  created_at: string
}

export type AdminChat = {
  user_id: number
  username: string
  email: string
  last_message?: string
  last_message_at?: string
  unread_count: number
}

export type Settings = Record<string, string>
