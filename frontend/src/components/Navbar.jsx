import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { useTheme } from '../services/ThemeContext'
import { useLanguage } from '../services/LanguageContext'
import { Avatar } from './FormComponents'
import NotificationBell from './NotificationBell'
import {
  IconHexLogo, IconFeed, IconProjects, IconGuide,
  IconProfile, IconSun, IconMoon, IconLogout,
} from './Icons'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()
  const navigate  = useNavigate()
  const loc       = useLocation()
  const [open, setOpen] = useState(false)

  const active    = p => loc.pathname === p || loc.pathname.startsWith(p + '/')
  const close     = () => setOpen(false)

  const links = [
    { to: '/feed',            icon: <IconFeed     size={15} />, label: t('Feed')     },
    { to: '/dashboard',       icon: <IconProjects size={15} />, label: t('Dashboard') },
    { to: '/getting-started', icon: <IconGuide    size={15} />, label: t('Guide')    },
  ]

  return (
    <>
      <nav style={navStyle}>
        <div style={innerStyle}>

          {/* Logo */}
          <Link to="/feed" style={logoStyle} onClick={close}>
            <IconHexLogo size={22} color="var(--accent)" />
            CollabU
          </Link>

          {/* Desktop nav links — hidden on mobile via CSS class */}
          <div className="nav-desktop-links" style={{ display:'flex', gap:2 }}>
            {links.map(({ to, icon, label }) => (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 7,
                fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'all .15s',
                color:      active(to) ? 'var(--txt1)'        : 'var(--txt2)',
                background: active(to) ? 'var(--bg-elevated)' : 'transparent',
                whiteSpace: 'nowrap',
              }}>
                {icon} {label}
              </Link>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Theme toggle */}
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ ...iconBtnStyle, display:'flex', alignItems:'center' }} title="Toggle theme">
            {theme === 'dark' ? <IconSun size={16} color="var(--txt2)" /> : <IconMoon size={16} color="var(--txt2)" />}
          </button>

          {/* Notifications bell */}
          {user && <NotificationBell />}

          {/* Profile chip — hides name on mobile via CSS */}
          {user ? (
          <Link to="/profile" style={profileChipStyle} onClick={close}>
            <Avatar url={user?.avatar_url} name={user?.name} size={26} />
            <span className="nav-profile-name" style={{
              fontSize: 13, color: 'var(--txt1)', fontWeight: 500,
              maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.name}
            </span>
          </Link>
          ) : (
          <div style={{display:'flex',gap:6}}>
            <Link to="/login" style={{fontSize:13,padding:'6px 12px',borderRadius:7,border:'1px solid var(--border)',color:'var(--txt2)',textDecoration:'none',background:'var(--bg-elevated)'}}>Login</Link>
            <Link to="/register" style={{fontSize:13,padding:'6px 12px',borderRadius:7,border:'1px solid var(--accent)',color:'var(--accent)',textDecoration:'none',background:'transparent',fontWeight:600}}>Sign Up</Link>
          </div>
          )}

          {/* Logout button — hidden on mobile via CSS */}
          {user && <button className="nav-logout-btn"
            onClick={() => { logout(); navigate('/login') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, background: 'transparent',
              color: 'var(--txt3)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer',
            }}>
            <IconLogout size={14} color="var(--txt3)" /> {t('Logout')}
          </button>}

          {/* Hamburger — shown only on mobile via CSS */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            style={{
              flexDirection: 'column', justifyContent: 'center',
              gap: 5, background: 'none', border: 'none',
              padding: '6px 4px', cursor: 'pointer', flexShrink: 0,
            }}>
            <span style={barStyle(open, 0)} />
            <span style={barStyle(open, 1)} />
            <span style={barStyle(open, 2)} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.55)',
            zIndex: 250,
            backdropFilter: 'blur(3px)',
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 56, left: 0, right: 0,
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
              padding: '8px 12px 20px',
              display: 'flex', flexDirection: 'column', gap: 3,
              animation: 'fadeUp .18s ease',
              boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            }}>

            {/* User row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 6px 14px',
            }}>
              <Avatar url={user?.avatar_url} name={user?.name} size={42} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--txt1)' }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 1 }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />

            {/* Nav links */}
            {links.map(({ to, icon, label }) => (
              <Link key={to} to={to} onClick={close} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 10px', borderRadius: 9,
                fontSize: 15, fontWeight: 500,
                textDecoration: 'none',
                color:      active(to) ? 'var(--txt1)'        : 'var(--txt2)',
                background: active(to) ? 'var(--bg-elevated)' : 'transparent',
              }}>
                <span style={{ width: 24, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
                {label}
              </Link>
            ))}

            <Link to="/profile" onClick={close} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 10px', borderRadius: 9,
              fontSize: 15, fontWeight: 500, textDecoration: 'none', color: 'var(--txt2)',
              background: active('/profile') ? 'var(--bg-elevated)' : 'transparent',
            }}>
              <span style={{ width: 24, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconProfile size={18} color="var(--txt2)" />
              </span>
              {t('Profile')} & Settings
            </Link>

            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 10px', borderRadius: 9,
                fontSize: 15, fontWeight: 500, background: 'none',
                border: 'none', color: 'var(--txt2)', cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ width: 24, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {theme === 'dark' ? <IconSun size={18} color="var(--txt2)" /> : <IconMoon size={18} color="var(--txt2)" />}
              </span>
              {theme === 'dark' ? t('Light') : t('Dark')}
            </button>

            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/login'); close() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 10px', borderRadius: 9, marginTop: 4,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                background: 'rgba(255,92,106,.08)',
                border: '1px solid rgba(255,92,106,.2)',
                color: 'var(--danger)',
              }}>
              <span style={{ width: 24, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconLogout size={18} color="var(--danger)" />
              </span>
              {t('Logout')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const navStyle = {
  background: 'rgba(11,11,18,.97)',
  borderBottom: '1px solid var(--border)',
  backdropFilter: 'blur(14px)',
  position: 'sticky',
  top: 0,
  zIndex: 300,
}
const innerStyle = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 14px',
  height: 56,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}
const logoStyle = {
  fontFamily: 'var(--font-d)',
  fontWeight: 800,
  fontSize: 18,
  color: 'var(--txt1)',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginRight: 8,
  flexShrink: 0,
}
const iconBtnStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '6px 9px',
  color: 'var(--txt2)',
  fontSize: 15,
  cursor: 'pointer',
  flexShrink: 0,
  lineHeight: 1,
}
const profileChipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 10px 4px 5px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  textDecoration: 'none',
  flexShrink: 0,
}
const barStyle = (open, idx) => ({
  display: 'block',
  width: 22, height: 2,
  background: 'var(--txt2)',
  borderRadius: 2,
  transition: 'transform .22s, opacity .22s',
  transformOrigin: 'center',
  transform: open
    ? idx === 0 ? 'translateY(7px) rotate(45deg)'
    : idx === 2 ? 'translateY(-7px) rotate(-45deg)'
    : 'scaleX(0)'
    : 'none',
  opacity: open && idx === 1 ? 0 : 1,
})
