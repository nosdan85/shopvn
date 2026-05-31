import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CompatAdminShell } from './layouts/CompatAdminShell'
import { CompatShell } from './layouts/CompatShell'
import { appRoutes } from './routes'
import { CompatProofsPage } from '../features/proofs/pages/CompatProofsPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={appRoutes.home} element={<Navigate to={appRoutes.shop} replace />} />
        <Route path={appRoutes.shop} element={<CompatShell />} />
        <Route path={appRoutes.proofs} element={<CompatProofsPage />} />
        <Route path={appRoutes.cart} element={<CompatShell initialPage="cart" />} />
        <Route path={appRoutes.orders} element={<CompatShell initialPage="orders" />} />
        <Route path={appRoutes.profile} element={<CompatShell initialPage="profile" />} />
        <Route path={appRoutes.admin} element={<CompatAdminShell />} />
      </Routes>
    </BrowserRouter>
  )
}
