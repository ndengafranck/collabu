import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../services/api'
import { useAuth } from '../services/AuthContext'
import { FormGroup, Input, Button, Alert } from '../components/FormComponents'
import { IconHexLogo } from '../components/Icons'

export default function Login() {
  const { storeAuth } = useAuth()
  const navigate      = useNavigate()
  const location      = useLocation()
  const nextPath      = new URLSearchParams(location.search).get('next') || '/dashboard'
  const [f, setF]     = useState({ email:'', password:'' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = e => setF(p=>({...p,[e.target.name]:e.target.value}))

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try { const d = await login(f); storeAuth(d.token, d.refresh_token, d.user); navigate(nextPath) }
    catch(e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.box} className="fade-up">
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:6}}>
            <IconHexLogo size={42} color="var(--accent)" />
          </div>
          <h1 style={{fontFamily:'var(--font-d)',fontSize:26,fontWeight:800,marginTop:6}}>Welcome back</h1>
          <p style={{color:'var(--txt2)',fontSize:13,marginTop:4}}>Sign in with your university account</p>
        </div>
        <form onSubmit={submit} style={S.form}>
          {err && <Alert>{err}</Alert>}
          <FormGroup label="University Email">
            <Input type="email" name="email" placeholder="you@university.edu"
              value={f.email} onChange={set} required/>
          </FormGroup>
          <FormGroup label="Password">
            <Input type="password" name="password" placeholder="••••••••"
              value={f.password} onChange={set} required/>
          </FormGroup>
          <Button type="submit" loading={busy} disabled={busy} style={{width:'100%',marginTop:4}}>
            Sign In
          </Button>
        </form>
        <p style={{textAlign:'center',marginTop:18,color:'var(--txt2)',fontSize:13}}>
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
const S = {
  page:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
    background:'var(--bg)',padding:'24px 14px'},
  box:{width:'100%',maxWidth:400,minWidth:0},
  form:{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',
    padding:'clamp(18px,4vw,28px) clamp(16px,4vw,28px)',display:'flex',flexDirection:'column',gap:16},
}
