import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProject, joinProject, respondRequest, getProjectProgress, getGithubStats, setCollaboratorRole } from '../services/api'
import { getSocket, joinProjectRoom, leaveProjectRoom } from '../services/socket'
import { useAuth } from '../services/AuthContext'
import Spinner from '../components/Spinner'
import { Button, Alert, Badge, Avatar } from '../components/FormComponents'
import SkillBadges from '../components/SkillBadges'
import { IconChat, IconPost, IconGallery, IconStarFilled, IconFork, IconBug } from '../components/Icons'

export default function ProjectDetail() {
  const { id }    = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [project,  setProject]  = useState(null)
  const [progress, setProgress] = useState(null)
  const [ghStats,  setGhStats]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [msg,  setMsg]  = useState('')
  const [err,  setErr]  = useState('')
  const [joining, setJoining] = useState(false)
  const [tab, setTab]   = useState('overview') // overview | contributors

  const load = () => {
    setLoading(true)
    getProject(id)
      .then(d => { setProject(d.project) })
      .catch(e => setErr(e.message))
      .finally(()=>setLoading(false))
    getProjectProgress(id).then(d=>setProgress(d)).catch(()=>{})
    getGithubStats(id).then(d=>setGhStats(d)).catch(()=>{})
  }
  useEffect(()=>{ load() }, [id])

  // ── Real-time join request notifications ─────────────────────────────────
  useEffect(() => {
    joinProjectRoom(id)
    const sock = getSocket()
    if (!sock) return
    const onRequest = () => load()   // re-fetch to show new pending request
    sock.on('new_join_request', onRequest)
    return () => { sock.off('new_join_request', onRequest); leaveProjectRoom(id) }
  }, [id])

  async function handleJoin() {
    setJoining(true); setErr(''); setMsg('')
    try { await joinProject(id); setMsg('Join request sent!'); load() }
    catch(e) { setErr(e.message) } finally { setJoining(false) }
  }

  async function handleRespond(uid, action) {
    setErr(''); setMsg('')
    try { await respondRequest(id, uid, action); setMsg(`Request ${action}ed.`); load() }
    catch(e) { setErr(e.message) }
  }

  async function handleSetRole(uid, role) {
    setErr(''); setMsg('')
    try { await setCollaboratorRole(id, uid, role); setMsg(`Role updated to ${role}.`); load() }
    catch(e) { setErr(e.message) }
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner/></div>
  if (err && !project) return <div style={{padding:32}}><Alert>{err}</Alert></div>
  if (!project) return null

  const isOwner  = project.owner_id === user?.id
  const myCollab = [...(project.collaborators||[]),...(project.pending_requests||[])].find(c=>c.user_id===user?.id)
  const pct      = progress?.completion_pct ?? 0

  return (
    <div style={{minHeight:'calc(100vh - 56px)',background:'var(--bg)',padding:'clamp(12px,3vw,28px) clamp(10px,4vw,24px)'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}} className="fade-up">
        <button onClick={()=>navigate('/dashboard')}
          style={{background:'none',border:'none',color:'var(--txt2)',fontSize:13,marginBottom:20,cursor:'pointer'}}>
          ← Back
        </button>

        {/* Cover */}
        {project.cover_image_url && (
          <div style={{width:'100%',height:'clamp(140px,25vw,220px)',borderRadius:'var(--radius)',overflow:'hidden',marginBottom:24,border:'1px solid var(--border)'}}>
            <img src={project.cover_image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
        )}

        {/* Title bar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',gap:7,marginBottom:10,flexWrap:'wrap'}}>
              <Badge color="accent">{project.methodology}</Badge>
              {isOwner && <Badge color="success">Your Project</Badge>}
              <Badge color={project.status==='active'?'info':'warning'}>{project.status}</Badge>
            </div>
            <h1 style={{fontFamily:'var(--font-d)',fontSize:'clamp(20px,5vw,30px)',fontWeight:800,lineHeight:1.2}}>{project.title}</h1>
            <p style={{color:'var(--txt2)',fontSize:13,marginTop:6}}>
              by <strong>{project.owner?.name}</strong> · {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className='project-action-btns' style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {(isOwner || myCollab?.status==='accepted') && (
              <>
                <Button variant="secondary" style={{fontSize:13,padding:'7px 14px'}} onClick={()=>navigate(`/projects/${id}/chat`)}>
                  <IconChat size={14} style={{marginRight:5}}/>Chat
                </Button>
                <Button variant="secondary" style={{fontSize:13,padding:'7px 14px'}} onClick={()=>navigate(`/projects/${id}/feed`)}>
                  <IconPost size={14} style={{marginRight:5}}/>Feed
                </Button>
                <Button variant="secondary" style={{fontSize:13,padding:'7px 14px'}} onClick={()=>navigate(`/projects/${id}/gallery`)}>
                  <IconGallery size={14} style={{marginRight:5}}/>Gallery
                </Button>
                <Button variant="secondary" style={{fontSize:13,padding:'7px 14px'}} onClick={()=>navigate(`/projects/${id}/board`)}>
                  🗂️ Board
                </Button>
              </>
            )}
            {isOwner && <Button variant="ghost" onClick={()=>{}}>Edit</Button>}
          </div>
        </div>

        {msg && <div style={{marginBottom:14}}><Alert type="success">{msg}</Alert></div>}
        {err && <div style={{marginBottom:14}}><Alert>{err}</Alert></div>}

        {/* Progress bar */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:20,marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--txt2)'}}>Project Progress</span>
            <span style={{fontFamily:'var(--font-d)',fontSize:18,fontWeight:800,color:'var(--accent-h)'}}>{pct}%</span>
          </div>
          <div style={{height:8,background:'var(--bg-elevated)',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:'var(--accent)',borderRadius:4,transition:'width .5s ease'}}/>
          </div>
          {progress && (
            <div style={{display:'flex',gap:14,marginTop:12,flexWrap:'wrap'}}>
              {Object.entries(progress.by_status||{}).map(([s,n])=>(
                <span key={s} style={{fontSize:12,color:'var(--txt2)'}}>
                  <strong style={{color:'var(--txt1)'}}>{n}</strong> {s.replace('_',' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20}}>
          {['overview','contributors'].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:'7px 16px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',
                background:tab===t?'var(--bg-elevated)':'transparent',
                color:tab===t?'var(--txt1)':'var(--txt2)'}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {tab==='overview' && (
          <div className='two-col'>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>

              <Section title="Description">
                <p style={{color:'var(--txt1)',lineHeight:1.7,fontSize:15}}>{project.description}</p>
              </Section>

              {project.required_skills && (
                <Section title="Required Skills">
                  <SkillBadges skills={project.required_skills} highlight={user?.skills?.split(',')||[]}/>
                </Section>
              )}

              <Section title="Repository">
                <a href={project.github_repo_link} target="_blank" rel="noreferrer"
                  style={{display:'flex',alignItems:'center',gap:8,color:'var(--accent-h)',fontSize:14,wordBreak:'break-all'}}>
                  <span style={{fontSize:20}}>⌥</span>{project.github_repo_link}
                </a>
              </Section>

              {/* Accepted collaborators */}
              {project.collaborators?.length>0 && (
                <Section title={`Team Members (${project.collaborators.length})`}>
                  {project.collaborators.map(c=>(
                    <MemberRow key={c.id} c={c}
                      extra={
                        <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto',flexWrap:'wrap'}}>
                          <Badge color={c.role==='Lead'?'warning':'success'}>
                            {c.role==='Lead'?'⭐ Lead':'Collaborator'}{c.github_added?' · GitHub ✓':''}
                          </Badge>
                          {isOwner && (
                            c.role==='Lead'
                              ? <Button variant="secondary" style={{padding:'4px 10px',fontSize:11}}
                                  onClick={()=>handleSetRole(c.user_id,'Collaborator')}>Remove Lead</Button>
                              : <Button variant="secondary" style={{padding:'4px 10px',fontSize:11}}
                                  onClick={()=>handleSetRole(c.user_id,'Lead')}>⭐ Make Lead</Button>
                          )}
                        </div>
                      }/>
                  ))}
                </Section>
              )}

              {/* Pending — owner only */}
              {isOwner && project.pending_requests?.length>0 && (
                <Section title={`Pending Requests (${project.pending_requests.length})`}>
                  {project.pending_requests.map(c=>(
                    <MemberRow key={c.id} c={c}
                      extra={
                        <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
                          {c.matched_skills && (
                            <span style={{fontSize:11,color:'var(--success)',marginRight:4}}>
                              ✓ {c.matched_skills}
                            </span>
                          )}
                          <Button variant="success" style={{padding:'5px 11px',fontSize:12}}
                            onClick={()=>handleRespond(c.user_id,'accept')}>Accept</Button>
                          <Button variant="danger"  style={{padding:'5px 11px',fontSize:12}}
                            onClick={()=>handleRespond(c.user_id,'reject')}>Reject</Button>
                        </div>
                      }
                    />
                  ))}
                </Section>
              )}
            </div>

            {/* Sidebar */}
            <aside style={{position:'sticky',top:70}} className='sticky-aside'>
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:20,display:'flex',flexDirection:'column',gap:14}}>
                {!isOwner && !myCollab && (
                  <>
                    <p style={{fontSize:13,color:'var(--txt2)'}}>Interested in collaborating?</p>
                    <Button onClick={handleJoin} loading={joining} disabled={joining} style={{width:'100%'}}>
                      Request to Join
                    </Button>
                  </>
                )}
                {!isOwner && myCollab && (
                  <div>
                    <p style={{fontSize:12,color:'var(--txt3)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.4px',fontWeight:600}}>Your Status</p>
                    <StatusBadge status={myCollab.status}/>
                  </div>
                )}
                {isOwner && (
                  <p style={{fontSize:13,color:'var(--txt2)'}}>You own this project. Review join requests and manage your team.</p>
                )}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:9}}>
                  {[
                    {l:'Methodology',  v:project.methodology},
                    {l:'Collaborators',v:project.collaborators?.length||0},
                    {l:'Pending',      v:project.pending_requests?.length||0},
                    {l:'Tasks Done',   v:`${pct}%`},
                  ].map(({l,v})=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:12,color:'var(--txt3)'}}>{l}</span>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--txt2)'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab==='contributors' && <ContributorsTab ghStats={ghStats}/>}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:22}}>
      <h2 style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:14}}>{title}</h2>
      {children}
    </div>
  )
}

function MemberRow({ c, extra }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
      <Avatar url={c.user?.avatar_url} name={c.user?.name||'?'} size={34}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,color:'var(--txt1)'}}>{c.user?.name}</div>
        <div style={{fontSize:11,color:'var(--txt3)',marginTop:1}}>{c.user?.email}</div>
        {c.user?.skills && <SkillBadges skills={c.user.skills} highlight={c.matched_skills?.split(',')||[]}/>}
      </div>
      {extra}
    </div>
  )
}

function StatusBadge({ status }) {
  const m = { pending:{color:'warning',label:'⏳ Pending'}, accepted:{color:'success',label:'✓ Accepted'}, rejected:{color:'danger',label:'✕ Rejected'} }
  const s = m[status]||m.pending
  return <Badge color={s.color}>{s.label}</Badge>
}

function ContributorsTab({ ghStats }) {
  if (!ghStats) return <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner/></div>
  if (ghStats.error) return <Alert>{ghStats.error}</Alert>

  const { contributors=[], weekly=[], repo={}, total_commits=0 } = ghStats
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Repo info */}
      {repo.name && (
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:20}}>
          <h3 style={{fontFamily:'var(--font-d)',fontSize:15,fontWeight:700,marginBottom:12}}>{repo.full_name}</h3>
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            {[{l:<><IconStarFilled size={14} style={{marginRight:3}}/>Stars</>,v:repo.stars},{l:<><IconFork size={14} style={{marginRight:3}}/>Forks</>,v:repo.forks},{l:<><IconBug size={14} style={{marginRight:3}}/>Issues</>,v:repo.open_issues},{l:<><IconChat size={14} style={{marginRight:3}}/>Language</>,v:repo.language||'—'}].map(({l,v})=>(
              <div key={l}><span style={{fontSize:12,color:'var(--txt3)'}}>{l} </span><strong style={{color:'var(--txt1)'}}>{v}</strong></div>
            ))}
          </div>
        </div>
      )}

      {/* Contributors */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:22}}>
        <h2 style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:16}}>
          Contribution Distribution ({total_commits} total commits)
        </h2>
        {contributors.length===0 && <p style={{color:'var(--txt3)',fontSize:13}}>No contributor data yet.</p>}
        {contributors.map(c=>(
          <div key={c.github_login} style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              {c.avatar && <img src={c.avatar} alt="" style={{width:28,height:28,borderRadius:'50%'}}/>}
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--txt1)'}}>{c.user?.name||c.github_login}</span>
                  <span style={{fontSize:12,color:'var(--txt2)'}}>{c.commits} commits · {c.percent}%</span>
                </div>
                <div style={{height:6,background:'var(--bg-elevated)',borderRadius:3,marginTop:5,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${c.percent}%`,background:'var(--accent)',borderRadius:3,transition:'width .5s'}}/>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      {weekly.length>0 && (
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:22}}>
          <h2 style={{fontSize:11,fontWeight:700,color:'var(--txt2)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:16}}>
            Weekly Activity (last 12 weeks)
          </h2>
          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:60}}>
            {weekly.map((w,i)=>{
              const max = Math.max(...weekly.map(x=>x.total),1)
              const h   = Math.max(4, (w.total/max)*56)
              return (
                <div key={i} title={`${w.total} commits`} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <div style={{width:'100%',height:h,background:'var(--accent)',borderRadius:3,opacity:.85}}/>
                  <span style={{fontSize:9,color:'var(--txt3)'}}>{w.total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
