import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../services/AuthContext'
import { previewInvite, acceptInvite } from '../services/api'
import { Button, Alert } from '../components/FormComponents'
import Spinner from '../components/Spinner'
import { IconLink, IconRocket, IconProjects } from '../components/Icons'

export default function InviteAccept() {
  const { token }                = useParams()
  const { user }                 = useAuth()
  const navigate                 = useNavigate()
  const [preview,  setPreview]   = useState(null)   // { project, valid }
  const [loading,  setLoading]   = useState(true)
  const [joining,  setJoining]   = useState(false)
  const [joined,   setJoined]    = useState(false)
  const [err,      setErr]       = useState('')

  useEffect(() => {
    previewInvite(token)
      .then(d  => setPreview(d))
      .catch(e => setErr(e.message))
      .finally(()=> setLoading(false))
  }, [token])

  async function handleJoin() {
    if (!user) {
      // Redirect to login, come back after
      navigate(`/login?next=/invite/${token}`)
      return
    }
    setJoining(true); setErr('')
    try {
      const d = await acceptInvite(token)
      setJoined(true)
      setTimeout(() => navigate(`/projects/${d.project_id}`), 1800)
    } catch(e) {
      setErr(e.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={card}>
        {/* Icon header */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
          <div style={{
            width:56,height:56,borderRadius:'50%',background:'var(--accent)22',
            display:'flex',alignItems:'center',justifyContent:'center',
          }}>
            <IconLink size={26} color="var(--accent)"/>
          </div>
        </div>

        {loading && (
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <Spinner/>
            <p style={{color:'var(--txt3)',fontSize:13,marginTop:12}}>Checking invite link…</p>
          </div>
        )}

        {!loading && err && (
          <>
            <h2 style={headingStyle}>Invalid Invite</h2>
            <Alert>{err}</Alert>
            <div style={{display:'flex',justifyContent:'center',marginTop:20}}>
              <Link to="/dashboard" style={{fontSize:14,color:'var(--accent)'}}>← Go to Dashboard</Link>
            </div>
          </>
        )}

        {!loading && !err && preview && !joined && (
          <>
            <p style={{fontSize:12,color:'var(--txt3)',textAlign:'center',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600}}>
              You've been invited to join
            </p>
            <h2 style={headingStyle}>{preview.project.title}</h2>
            {preview.project.description && (
              <p style={{fontSize:14,color:'var(--txt2)',lineHeight:1.6,textAlign:'center',marginBottom:20}}>
                {preview.project.description.slice(0, 180)}{preview.project.description.length > 180 ? '…' : ''}
              </p>
            )}

            {err && <Alert style={{marginBottom:12}}>{err}</Alert>}

            {!user && (
              <p style={{fontSize:13,color:'var(--txt3)',textAlign:'center',marginBottom:14}}>
                You need to be signed in to join this project.
              </p>
            )}

            <Button
              onClick={handleJoin}
              disabled={joining}
              style={{width:'100%',justifyContent:'center',gap:8,fontSize:15,padding:'12px 0'}}
            >
              <IconRocket size={16}/>
              {joining ? 'Joining…' : user ? 'Join Project' : 'Sign in to Join'}
            </Button>

            {user && (
              <Link to="/dashboard" style={{display:'block',textAlign:'center',fontSize:13,color:'var(--txt3)',marginTop:14}}>
                Not now — go to Dashboard
              </Link>
            )}
          </>
        )}

        {joined && (
          <>
            <div style={{textAlign:'center',fontSize:36,marginBottom:8}}>🎉</div>
            <h2 style={{...headingStyle,color:'var(--success)'}}>You joined!</h2>
            <p style={{fontSize:14,color:'var(--txt2)',textAlign:'center'}}>
              Taking you to the project…
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const card = {
  background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,
  padding:'32px 28px',width:'100%',maxWidth:420,
  boxShadow:'0 12px 40px rgba(0,0,0,.15)',
}
const headingStyle = {
  fontSize:22,fontWeight:700,color:'var(--txt1)',textAlign:'center',
  margin:'0 0 12px',fontFamily:'var(--font-d,inherit)',
}
