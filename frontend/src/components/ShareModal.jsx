import { useState, useEffect } from 'react'
import { createInvite, listInvites, deactivateInvite } from '../services/api'
import { IconLink, IconCopy, IconCheck, IconTrash, IconX } from './Icons'
import {Button} from './FormComponents'

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin

const EXPIRY_OPTIONS = [
  { label: 'Never',   value: null },
  { label: '24 hours', value: 24 },
  { label: '3 days',   value: 72 },
  { label: '7 days',   value: 168 },
]

const USE_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '1 use',     value: 1 },
  { label: '5 uses',    value: 5 },
  { label: '10 uses',   value: 10 },
]

export default function ShareModal({ projectId, projectTitle, onClose }) {
  const [invites,    setInvites]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [creating,   setCreating]   = useState(false)
  const [expires,    setExpires]    = useState(null)
  const [maxUses,    setMaxUses]    = useState(null)
  const [copiedId,   setCopiedId]   = useState(null)
  const [err,        setErr]        = useState('')

  useEffect(() => { loadInvites() }, [])

  async function loadInvites() {
    setLoading(true)
    try { const d = await listInvites(projectId); setInvites(d.invites || []) }
    catch(e) { setErr(e.message) }
    finally  { setLoading(false) }
  }

  async function handleCreate() {
    setCreating(true); setErr('')
    try {
      await createInvite(projectId, {
        expires_hours: expires,
        max_uses:      maxUses,
      })
      loadInvites()
    } catch(e) { setErr(e.message) }
    finally    { setCreating(false) }
  }

  async function handleDeactivate(iid) {
    try { await deactivateInvite(iid); loadInvites() }
    catch(e) { setErr(e.message) }
  }

  function copyLink(token, id) {
    const url = `${FRONTEND_URL}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const activeInvites   = invites.filter(i => i.is_active)
  const inactiveInvites = invites.filter(i => !i.is_active)

  return (
    <div style={overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <IconLink size={18} color="var(--accent)" />
            <span style={{fontWeight:700,fontSize:16,color:'var(--txt1)'}}>Share Project</span>
          </div>
          <button onClick={onClose} style={closeBtn}><IconX size={16}/></button>
        </div>

        <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:16,overflowY:'auto',maxHeight:'calc(80vh - 60px)'}}>
          {/* Project name */}
          <p style={{fontSize:13,color:'var(--txt2)',margin:0}}>
            Create invite links for <strong style={{color:'var(--txt1)'}}>{projectTitle}</strong>. Anyone with the link can join directly as a collaborator.
          </p>

          {err && <div style={{background:'var(--danger-bg,#fee)',color:'var(--danger)',borderRadius:8,padding:'8px 12px',fontSize:13}}>{err}</div>}

          {/* Create new invite */}
          <div style={createBox}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--txt1)',marginBottom:10}}>New Invite Link</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <div style={selectGroup}>
                <label style={selectLabel}>Expires</label>
                <select value={expires??'null'} onChange={e=>setExpires(e.target.value==='null'?null:+e.target.value)} style={selectStyle}>
                  {EXPIRY_OPTIONS.map(o=>(
                    <option key={o.label} value={o.value??'null'}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div style={selectGroup}>
                <label style={selectLabel}>Max uses</label>
                <select value={maxUses??'null'} onChange={e=>setMaxUses(e.target.value==='null'?null:+e.target.value)} style={selectStyle}>
                  {USE_OPTIONS.map(o=>(
                    <option key={o.label} value={o.value??'null'}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={creating} style={{alignSelf:'flex-end',minWidth:130,fontSize:13}}>
                {creating ? 'Creating…' : '+ Generate Link'}
              </Button>
            </div>
          </div>

          {/* Active invite links */}
          {loading ? (
            <div style={{textAlign:'center',padding:'20px',color:'var(--txt3)',fontSize:13}}>Loading links…</div>
          ) : activeInvites.length === 0 ? (
            <div style={{textAlign:'center',padding:'16px',color:'var(--txt3)',fontSize:13,borderRadius:8,border:'1px dashed var(--border)'}}>
              No active invite links yet
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--txt3)',textTransform:'uppercase',letterSpacing:'.5px'}}>Active Links</div>
              {activeInvites.map(inv => (
                <InviteRow key={inv.id} inv={inv} copied={copiedId===inv.id}
                  onCopy={()=>copyLink(inv.token,inv.id)}
                  onDeactivate={()=>handleDeactivate(inv.id)} />
              ))}
            </div>
          )}

          {/* Inactive */}
          {inactiveInvites.length > 0 && (
            <details>
              <summary style={{fontSize:12,color:'var(--txt3)',cursor:'pointer',marginTop:4}}>
                {inactiveInvites.length} deactivated link{inactiveInvites.length>1?'s':''}
              </summary>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
                {inactiveInvites.map(inv=>(
                  <div key={inv.id} style={{...inviteRowStyle,opacity:.5}}>
                    <span style={{fontSize:12,color:'var(--txt3)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      …{inv.token.slice(-12)}
                    </span>
                    <span style={{fontSize:11,color:'var(--txt3)'}}>Deactivated · {inv.use_count} use{inv.use_count!==1?'s':''}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteRow({ inv, copied, onCopy, onDeactivate }) {
  const url       = `${FRONTEND_URL}/invite/${inv.token}`
  const expiryStr = inv.expires_at ? `Expires ${new Date(inv.expires_at).toLocaleDateString()}` : 'Never expires'
  const usesStr   = inv.max_uses   ? `${inv.use_count}/${inv.max_uses} uses` : `${inv.use_count} uses`

  return (
    <div style={inviteRowStyle}>
      {/* URL truncated */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontFamily:'monospace',color:'var(--accent)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {url}
        </div>
        <div style={{fontSize:11,color:'var(--txt3)',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
          <span>{expiryStr}</span>
          <span>·</span>
          <span>{usesStr}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{display:'flex',gap:6,flexShrink:0}}>
        <button onClick={onCopy} style={iconBtn(copied ? 'var(--success)' : 'var(--accent)')} title="Copy link">
          {copied ? <IconCheck size={14}/> : <IconCopy size={14}/>}
        </button>
        <button onClick={onDeactivate} style={iconBtn('var(--danger)')} title="Deactivate">
          <IconTrash size={14}/>
        </button>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlay = {
  position:'fixed',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(3px)',
  display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,
}
const modal = {
  background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,
  width:'100%',maxWidth:520,boxShadow:'0 20px 60px rgba(0,0,0,.3)',
  display:'flex',flexDirection:'column',maxHeight:'90vh',
}
const header = {
  display:'flex',alignItems:'center',justifyContent:'space-between',
  padding:'14px 20px',borderBottom:'1px solid var(--border)',flexShrink:0,
}
const closeBtn = {
  background:'none',border:'none',cursor:'pointer',color:'var(--txt3)',
  padding:4,borderRadius:6,display:'flex',alignItems:'center',
}
const createBox = {
  background:'var(--bg-elevated,var(--bg))',border:'1px solid var(--border)',
  borderRadius:10,padding:'14px 16px',
}
const selectGroup = { display:'flex',flexDirection:'column',gap:4,minWidth:120 }
const selectLabel = { fontSize:11,color:'var(--txt3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px' }
const selectStyle = {
  background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:7,
  color:'var(--txt1)',fontSize:13,padding:'7px 10px',cursor:'pointer',
}
const inviteRowStyle = {
  display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
  background:'var(--bg-elevated,var(--bg))',border:'1px solid var(--border)',
  borderRadius:8,
}
const iconBtn = (color) => ({
  background:'none',border:`1px solid ${color}22`,borderRadius:6,
  cursor:'pointer',color,padding:'5px 7px',display:'flex',alignItems:'center',
  transition:'background .15s',
})
