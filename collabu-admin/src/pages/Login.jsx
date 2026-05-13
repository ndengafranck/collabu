import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../services/api'
import { useAuth } from '../services/AuthContext'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const { login }  = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const d = await adminLogin(email, password)
      login(d.token, d.user)
      navigate('/')
    } catch(e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: .3,
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⬡</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
            color: 'var(--txt1)', letterSpacing: 1,
          }}>COLLABU</div>
          <div style={{
            display: 'inline-block', marginTop: 6,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            background: 'var(--accent-dim)', color: 'var(--accent)',
            border: '1px solid var(--accent)33', borderRadius: 4,
            padding: '2px 10px', letterSpacing: 2,
          }}>
            ADMIN CONSOLE
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@university.edu"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {err && (
              <div style={{
                background: 'var(--danger-dim)', color: 'var(--danger)',
                border: '1px solid var(--danger)33',
                borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13,
              }}>
                {err}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--txt3)', marginTop: 16 }}>
          Admin access only. Student accounts cannot log in here.
        </p>
      </div>
    </div>
  )
}
