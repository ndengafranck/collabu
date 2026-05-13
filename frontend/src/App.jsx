import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/AuthContext'
import { ThemeProvider } from './services/ThemeContext'
import { LanguageProvider } from './services/LanguageContext'
import { NotificationProvider } from './services/NotificationContext'
import Navbar          from './components/Navbar'
import Spinner         from './components/Spinner'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Dashboard       from './pages/Dashboard'
import CreateProject   from './pages/CreateProject'
import ProjectDetail   from './pages/ProjectDetail'
import TaskBoard       from './pages/TaskBoard'
import Chat            from './pages/Chat'
import ProjectFeed     from './pages/ProjectFeed'
import Gallery         from './pages/Gallery'
import GlobalFeed      from './pages/GlobalFeed'
import Profile         from './pages/Profile'
import GithubCallback  from './pages/GithubCallback'
import GettingStarted  from './pages/GettingStarted'
import InviteAccept    from './pages/InviteAccept'

function Private({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner fullPage />
  return user ? children : <Navigate to="/login" replace />
}
function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner fullPage />
  return !user ? children : <Navigate to="/dashboard" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                     element={<Navigate to={user ? '/feed' : '/login'} replace />} />
        <Route path="/login"                element={<Public><Login /></Public>} />
        <Route path="/register"             element={<Public><Register /></Public>} />
        <Route path="/feed"                 element={<Private><GlobalFeed /></Private>} />
        <Route path="/dashboard"            element={<Private><Dashboard /></Private>} />
        <Route path="/projects/new"         element={<Private><CreateProject /></Private>} />
        <Route path="/projects/:id"         element={<Private><ProjectDetail /></Private>} />
        <Route path="/projects/:id/board"   element={<Private><TaskBoard /></Private>} />
        <Route path="/projects/:id/chat"    element={<Private><Chat /></Private>} />
        <Route path="/projects/:id/feed"    element={<Private><ProjectFeed /></Private>} />
        <Route path="/projects/:id/gallery" element={<Private><Gallery /></Private>} />
        <Route path="/profile"              element={<Private><Profile /></Private>} />
        <Route path="/github/callback"      element={<Private><GithubCallback /></Private>} />
        <Route path="/getting-started"      element={<GettingStarted />} />
        <Route path="/invite/:token"          element={<InviteAccept />} />
        <Route path="*"                     element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
