import ShopApp from '../../ShopApp'
import { CompatAdminDashboardPage } from '../../features/admin/pages/CompatAdminDashboardPage'

export function CompatAdminShell() {
  if (window.location.search.includes('legacy=1')) {
    return <ShopApp initialPageOverride="admin" />
  }
  return <CompatAdminDashboardPage />
}
