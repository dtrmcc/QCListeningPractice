import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

export default function PrivateRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
