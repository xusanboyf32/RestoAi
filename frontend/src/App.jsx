import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useThemeStore from './store/useThemeStore'
import useAuthStore  from './store/useAuthStore'
import CustomerPage  from './pages/CustomerPage'
import LoginPage     from './pages/LoginPage'
import WaiterPage    from './pages/WaiterPage'
import ChefPage      from './pages/ChefPage'
import AdminPage     from './pages/AdminPage'

function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { init } = useThemeStore()
  useEffect(() => { init() }, [])

  return (
    <Routes>
      <Route path="/"      element={<CustomerPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/waiter" element={
        <ProtectedRoute allowedRoles={['waiter', 'admin']}><WaiterPage /></ProtectedRoute>
      } />
      <Route path="/chef" element={
        <ProtectedRoute allowedRoles={['chef', 'admin']}><ChefPage /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>
      } />
    </Routes>
  )
}