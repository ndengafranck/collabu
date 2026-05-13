import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'

const NAV = [
  { section: 'Overview' },
  { path: '/',          icon: '◈', label: 'Dashboard' },
  { section: 'Manage' },
  { path: '/users',     icon: '◉', label: 'Users' },
  { path: '/projects',  icon: '◧', label: 'Projects' },
  { path: '/posts',     icon: '◫', label: 'Posts' },
  { section: 'Tools' },
  { path: '/broadcast', icon: '◎', label: 'Broadcast' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { admin, logout } = useAuth()

  function handleLogout() { logout(); navigate('/login') }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span style={{ fontSize: 18 }}>⬡</span>
        <div>
          <div className="sidebar-logo-text">CollabU</div>
          <div className="sidebar-logo-badge">ADMIN</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section"><div className="nav-section-label">{item.section}</div></div>
          }
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
          return (
            <div key={item.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Admin user */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
          Signed in as
        </div>
        <div style={{ fontSize: 13, color: 'var(--txt1)', fontWeight: 600, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {admin?.name}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
