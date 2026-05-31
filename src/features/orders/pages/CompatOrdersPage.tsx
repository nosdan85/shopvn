import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { dateTime, money, orderStatus } from '../../../api'
import { appRoutes } from '../../../app/routes'
import type { Order, User } from '../../../types'
import { api } from '../../../api'

export function CompatOrdersPage() {
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ user: User }>('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null))
    api<{ orders: Order[] }>('/orders').then((data) => setOrders(data.orders)).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Khong tai duoc don.'))
  }, [])

  return (
    <div className="page-section compat-orders-page">
      <section className="panel compat-page-head">
        <div>
          <span className="eyebrow">Compat orders</span>
          <h1>Don hang cua ban</h1>
          <p>{user ? `Dang dang nhap voi ${user.username}` : 'Hay dang nhap bang giao dien cu neu can.'}</p>
          {location.state && 'createdOrderId' in (location.state as Record<string, unknown>) ? <p className="compat-success">Don moi da duoc tao thanh cong.</p> : null}
        </div>
        <Link className="ghost" to={appRoutes.shop}>Ve shop</Link>
      </section>
      <section className="panel">
        {error && <p className="compat-error">{error}</p>}
        <div className="compat-admin-order-list">
          {orders.map((order) => (
            <article className="compat-admin-order-row" key={order.id}>
              <strong>{order.order_code}</strong>
              <span>{order.item_names || 'Item'}</span>
              <span>{money(order.total_amount)}</span>
              <span>{orderStatus[order.status] || order.status}</span>
              <span>{dateTime(order.created_at)}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
