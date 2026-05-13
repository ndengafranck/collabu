import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/AuthContext'
import { ToastProvider } from './services/ToastContext'
import Sidebar  from './components/Sidebar'
import Login    from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users    from './pages/Users'
import UserDetail from './pages/UserDetail'
import Projects from './pages/Projects'
import Posts    from './pages/Posts'
import Broadcast from './pages/Broadcast'

function Protected({ children }) {
  const { admin } = useAuth()
  if (!admin) return <Navigate to="/login" replace />
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-area">
        <div className="page-content">{children}</div>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"        element={<Protected><Dashboard /></Protected>} />
      <Route path="/users"   element={<Protected><Users /></Protected>} />
      <Route path="/users/:id" element={<Protected><UserDetail /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/posts"   element={<Protected><Posts /></Protected>} />
      <Route path="/broadcast" element={<Protected><Broadcast /></Protected>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
