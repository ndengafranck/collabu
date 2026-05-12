import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getProject, getTasks, createTask, updateTask, deleteTask,
  getComments, addComment, deleteComment, suggestAssignees,
} from '../services/api'
import { useAuth } from '../services/AuthContext'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import { Button, Alert, Badge, Avatar, FormGroup, Input, Textarea, Select } from '../components/FormComponents'
import {
  IconChat, IconPost, IconGallery, IconWrench,
} from '../components/Icons'

const PRIORITY      = ['low','medium','high','critical']
const PRIORITY_COLOR= { low:'success', medium:'info', high:'warning', critical:'danger' }

export default function TaskBoard() {
  const { id }   = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const dragRef  = useRef(null)

  const [project,  setProject]  = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [columns,  setColumns]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')
  const [creating, setCreating] = useState(null)   // column status string
  const [selected, setSelected] = useState(null)   // task detail

  const load = async () => {
    try {
      const [pd, td] = await Promise.all([getProject(id), getTasks(id)])
      setProject(pd.project)
      setColumns(pd.project.columns || [])
      setTasks(td.tasks)
    } catch(e) { setErr(e.message) }
    finally    { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const isOwner   = project?.owner_id === user?.id
  const myCollab  = project?.collaborators?.find(c => c.user_id === user?.id)
  const isLead    = isOwner || myCollab?.role === 'Lead'
  const colKey    = col => col.toLowerCase().replace(/\s+/g, '_')
  const tasksByCol= col => tasks.filter(t => t.status === colKey(col)).sort((a,b)=>a.position-b.position)

  // ── Drag & drop ────────────────────────────────────────────────────────────
  function onDragStart(e, task) {
    // Leads can drag any task; plain collaborators only drag their assigned tasks
    if (!isLead && task.assignee_id !== user?.id) {
      e.preventDefault(); return
    }
    dragRef.current = task
    e.target.style.opacity = '.4'
  }
  function onDragEnd(e)   { e.target.style.opacity = '1' }
  function onDragOver(e)  { e.preventDefault() }
  async function onDrop(e, col) {
    e.preventDefault()
    const task = dragRef.current; if (!task) return
    const newStatus = colKey(col)
    if (task.status === newStatus) return
    setTasks(prev => prev.map(t => t.id===task.id ? {...t, status:newStatus} : t))
    try { await updateTask(id, task.id, { status: newStatus }) }
    catch { load() }
    dragRef.current = null
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><Spinner/></div>
  if (err)     return <div style={{padding:32}}><Alert>{err}</Alert></div>

  const members = [
    project?.owner,
    ...(project?.collaborators||[]).map(c=>c.user),
  ].filter(Boolean)

  const donePct = tasks.length
    ? Math.round(tasks.filter(t=>t.status==='done'||t.status==='Done').length / tasks.length * 100)
    : 0

  return (
    <div style={{ height:'calc(100vh - 56px)', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={S.header}>
        <button onClick={()=>navigate(`/projects/${id}`)} style={S.backBtn}>←</button>
        <div style={{flex:1, minWidth:0}}>
          <h2 style={S.title}>{project?.title}</h2>
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
            <Badge color="accent">{project?.methodology}</Badge>
            <div style={{flex:1, height:6, background:'var(--bg-elevated)', borderRadius:3, maxWidth:160, overflow:'hidden'}}>
              <div style={{height:'100%', width:`${donePct}%`, background:'var(--success)', borderRadius:3, transition:'width .4s'}}/>
            </div>
            <span style={{fontSize:11, color:'var(--txt3)', fontWeight:600}}>{donePct}% done</span>
          </div>
        </div>

        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {isLead && (
            <Button style={{fontSize:13,padding:'7px 14px'}} onClick={()=>setCreating(colKey(columns[0]||'todo'))}>
              + Add Task
            </Button>
          )}
          <button onClick={()=>navigate(`/projects/${id}/chat`)}    style={S.tabBtn}><IconChat size={16}/></button>
          <button onClick={()=>navigate(`/projects/${id}/feed`)}    style={S.tabBtn}><IconPost size={16}/></button>
          <button onClick={()=>navigate(`/projects/${id}/gallery`)} style={S.tabBtn}><IconGallery size={16}/></button>
        </div>
      </div>

      {/* ── Kanban ── */}
      <div className='board-scroll-hint' style={{flex:1, overflowX:'auto', overflowY:'hidden', padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start', WebkitOverflowScrolling:'touch', scrollSnapType:'x mandatory'}}>
        {columns.map(col => (
          <KanbanColumn
            key={col} col={col} colKey={colKey(col)}
            tasks={tasksByCol(col)}
            isOwner={isOwner} isLead={isLead} userId={user?.id}
            onAddTask={isLead ? ()=>setCreating(colKey(col)) : null}
            onSelectTask={setSelected}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
            onDrop={e=>onDrop(e,col)} onDragOver={onDragOver}
          />
        ))}
      </div>

      {/* ── Create task modal (owner only) ── */}
      {creating && isLead && (
        <CreateTaskModal
          projectId={id} initialStatus={creating} columns={columns} colKey={colKey}
          members={members}
          onClose={()=>setCreating(null)}
          onCreated={t=>{ setTasks(prev=>[...prev,t]); setCreating(null) }}
        />
      )}

      {/* ── Task detail ── */}
      {selected && (
        <TaskDetailModal
          task={selected} projectId={id}
          isOwner={isOwner} isLead={isLead} userId={user?.id}
          members={members}
          onClose={()=>setSelected(null)}
          onUpdated={t=>{ setTasks(prev=>prev.map(x=>x.id===t.id?t:x)); setSelected(t) }}
          onDeleted={tid=>{ setTasks(prev=>prev.filter(x=>x.id!==tid)); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, tasks, isOwner, isLead, userId, onAddTask, onSelectTask,
                        onDragStart, onDragEnd, onDrop, onDragOver }) {
  const [over, setOver] = useState(false)
  return (
    <div style={{ width:'min(272px, 82vw)', flexShrink:0, display:'flex', flexDirection:'column', scrollSnapAlign:'start' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, padding:'0 2px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--txt1)' }}>{col}</span>
          <span style={{ background:'var(--bg-elevated)', color:'var(--txt3)', fontSize:11,
            fontWeight:700, padding:'1px 7px', borderRadius:10 }}>{tasks.length}</span>
        </div>
        {isLead && onAddTask && (
          <button onClick={onAddTask} style={{ background:'none', border:'1px solid var(--border)',
            color:'var(--txt2)', borderRadius:5, padding:'2px 9px', fontSize:16, cursor:'pointer' }}>+</button>
        )}
      </div>

      <div
        onDragOver={e=>{ onDragOver(e); setOver(true) }}
        onDragLeave={()=>setOver(false)}
        onDrop={e=>{ setOver(false); onDrop(e) }}
        style={{
          minHeight:120, borderRadius:10, padding:'6px 4px',
          background: over ? 'rgba(124,106,255,.06)' : 'transparent',
          border: `2px dashed ${over ? 'var(--accent)' : 'transparent'}`,
          transition:'all .15s', display:'flex', flexDirection:'column', gap:8,
        }}
      >
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} isOwner={isOwner} isLead={isLead} userId={userId}
            onClick={()=>onSelectTask(t)}
            onDragStart={e=>onDragStart(e,t)}
            onDragEnd={onDragEnd}
          />
        ))}
        {tasks.length===0 && (
          <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--txt3)', fontSize:12 }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, isOwner, isLead, userId, onClick, onDragStart, onDragEnd }) {
  const canDrag = isLead || task.assignee_id === userId
  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10,
        padding:13, cursor: canDrag ? 'grab' : 'pointer',
        transition:'border-color .15s, box-shadow .15s', userSelect:'none',
        opacity: 1,
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:7 }}>
        <span style={{
          fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4,
          textTransform:'uppercase', letterSpacing:'.4px',
          background: `rgba(var(--pri-${task.priority}-rgb),.15)`,
        }} className={`pri-${task.priority}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span style={{ fontSize:10, color: new Date(task.due_date) < new Date() ? 'var(--danger)' : 'var(--txt3)' }}>
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      <p style={{ fontSize:13, fontWeight:600, color:'var(--txt1)', lineHeight:1.35, marginBottom:8 }}>
        {task.title}
      </p>

      {task.required_skill && (
        <span style={{ fontSize:10, background:'var(--bg-elevated)', color:'var(--txt2)',
          padding:'2px 7px', borderRadius:4, border:'1px solid var(--border)', display:'inline-block', marginBottom:8 }}>
          <IconWrench size={13} style={{marginRight:3}}/>{task.required_skill}
        </span>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {task.assignee ? (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Avatar url={task.assignee.avatar_url} name={task.assignee.name} size={20}/>
            <span style={{ fontSize:11, color:'var(--txt2)' }}>{task.assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span style={{ fontSize:11, color:'var(--txt3)' }}>Unassigned</span>
        )}
        {task.comments_count > 0 && (
          <span style={{ fontSize:10, color:'var(--txt3)', display:'flex', alignItems:'center', gap:3 }}><IconChat size={12}/>{task.comments_count}</span>
        )}
      </div>
    </div>
  )
}

// ── Create Task Modal (owner only) ────────────────────────────────────────────
function CreateTaskModal({ projectId, initialStatus, columns, colKey, members, onClose, onCreated }) {
  const [f,    setF]    = useState({ title:'', description:'', priority:'medium',
    required_skill:'', assignee_id:'', due_date:'', status:initialStatus })
  const [sugg, setSugg] = useState(members)
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)
  const set = e => setF(p=>({...p,[e.target.name]:e.target.value}))

  async function fetchSugg(skill) {
    try { const d = await suggestAssignees(projectId, skill); setSugg(d.members) }
    catch { setSugg(members) }
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const { task } = await createTask(projectId, {
        ...f, assignee_id: f.assignee_id ? Number(f.assignee_id) : null,
      })
      onCreated(task)
    } catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal title="New Task" onClose={onClose} width={500}>
      {err && <div style={{marginBottom:12}}><Alert>{err}</Alert></div>}
      <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:14}}>
        <FormGroup label="Title *">
          <Input name="title" value={f.title} onChange={set} placeholder="Task title" required/>
        </FormGroup>
        <FormGroup label="Description">
          <Textarea name="description" value={f.description} onChange={set}
            placeholder="Details, acceptance criteria…" style={{minHeight:70}}/>
        </FormGroup>
        <div className='form-row-2' style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FormGroup label="Column">
            <Select name="status" value={f.status} onChange={set}>
              {columns.map(c=><option key={c} value={colKey(c)}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Priority">
            <Select name="priority" value={f.priority} onChange={set}>
              {PRIORITY.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
            </Select>
          </FormGroup>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FormGroup label="Required Skill" hint="Filters assignees">
            <Input name="required_skill" value={f.required_skill} placeholder="e.g. Python"
              onChange={e=>{set(e);fetchSugg(e.target.value)}}/>
          </FormGroup>
          <FormGroup label="Due Date">
            <Input type="date" name="due_date" value={f.due_date} onChange={set}/>
          </FormGroup>
        </div>
        <FormGroup label="Assign To">
          <Select name="assignee_id" value={f.assignee_id} onChange={set}>
            <option value="">— Unassigned —</option>
            {sugg.map(m=><option key={m.id} value={m.id}>{m.name}{m.match?' ✓':''}</option>)}
          </Select>
        </FormGroup>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid var(--border)'}}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={busy}>Create Task</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Task Detail Modal ──────────────────────────────────────────────────────────
function TaskDetailModal({ task, projectId, isOwner, isLead, userId, members, onClose, onUpdated, onDeleted }) {
  const [comments,  setComments]  = useState([])
  const [loadingC,  setLoadingC]  = useState(true)
  const [newBody,   setNewBody]   = useState('')
  const [replyTo,   setReplyTo]   = useState(null)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
  const [movingTo,  setMovingTo]  = useState('')

  useEffect(()=>{
    getComments(projectId, task.id)
      .then(d=>setComments(d.comments)).catch(()=>{}).finally(()=>setLoadingC(false))
  },[task.id])

  async function moveTask(status) {
    setMovingTo(status)
    try { const{task:t}=await updateTask(projectId,task.id,{status}); onUpdated(t) }
    catch(e){ setErr(e.message) }
    finally { setMovingTo('') }
  }

  async function submitComment(e) {
    e.preventDefault()
    const body=newBody.trim(); if(!body) return
    setBusy(true)
    try {
      const{comment}=await addComment(projectId,task.id,{body,parent_id:replyTo?.id||null})
      if(replyTo){
        setComments(prev=>prev.map(c=>c.id===replyTo.id?{...c,replies:[...(c.replies||[]),comment]}:c))
      } else {
        setComments(prev=>[...prev,{...comment,replies:[]}])
      }
      setNewBody(''); setReplyTo(null)
    } catch(e){ setErr(e.message) }
    finally { setBusy(false) }
  }

  async function delTask(){
    if(!confirm('Delete this task?')) return
    try{ await deleteTask(projectId,task.id); onDeleted(task.id) }
    catch(e){ setErr(e.message) }
  }

  const STATUSES = ['todo','in_progress','review','done']

  return (
    <Modal title={task.title} onClose={onClose} width={580}>
      {err && <div style={{marginBottom:10}}><Alert>{err}</Alert></div>}

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        <Badge color={PRIORITY_COLOR[task.priority]}>{task.priority}</Badge>
        <Badge color="muted">{task.status.replace(/_/g,' ')}</Badge>
        {task.required_skill && <Badge color="muted"><IconWrench size={12} style={{marginRight:3}}/>{task.required_skill}</Badge>}
        {task.due_date && <Badge color={new Date(task.due_date)<new Date()?'danger':'muted'}>
          📅 {new Date(task.due_date).toLocaleDateString()}</Badge>}
      </div>

      {task.assignee && (
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'8px 12px',
          background:'var(--bg-elevated)',borderRadius:8,border:'1px solid var(--border)'}}>
          <Avatar url={task.assignee.avatar_url} name={task.assignee.name} size={28}/>
          <div>
            <div style={{fontSize:11,color:'var(--txt3)'}}>Assigned to</div>
            <div style={{fontSize:13,fontWeight:600}}>{task.assignee.name}</div>
          </div>
        </div>
      )}

      {task.description && (
        <p style={{fontSize:14,color:'var(--txt2)',lineHeight:1.7,marginBottom:14,whiteSpace:'pre-wrap'}}>
          {task.description}
        </p>
      )}

      {/* Move task */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:'var(--txt3)',fontWeight:600,textTransform:'uppercase',
          letterSpacing:'.4px',marginBottom:6}}>Move to column</div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {STATUSES.map(s=>(
            <button key={s} onClick={()=>moveTask(s)} disabled={task.status===s||movingTo===s}
              style={{fontSize:11,padding:'4px 10px',borderRadius:5,border:'1px solid var(--border)',
                cursor:task.status===s?'default':'pointer',
                background:task.status===s?'var(--accent)':'var(--bg-elevated)',
                color:task.status===s?'#fff':'var(--txt2)',fontWeight:500}}>
              {s.replace(/_/g,' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Owner actions */}
      {(isOwner || (isLead && task.created_by === userId)) && (
        <div style={{marginBottom:14}}>
          <Button variant="danger" style={{fontSize:12,padding:'5px 12px'}} onClick={delTask}>
            🗑 Delete Task
          </Button>
        </div>
      )}

      {/* Comments */}
      <div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
        <div style={{fontSize:11,color:'var(--txt2)',fontWeight:700,textTransform:'uppercase',
          letterSpacing:'.5px',marginBottom:10}}>
          Comments
        </div>

        {loadingC ? <Spinner size={20}/> : <>
          {comments.length===0 && (
            <p style={{color:'var(--txt3)',fontSize:13,marginBottom:10}}>No comments yet.</p>
          )}
          {comments.map(c=>(
            <CommentBlock key={c.id} c={c} userId={userId} projectId={projectId} taskId={task.id}
              onReply={()=>setReplyTo(replyTo?.id===c.id?null:c)}
              onDeleted={cid=>setComments(prev=>prev.filter(x=>x.id!==cid))}/>
          ))}

          {replyTo && (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,
              padding:'5px 10px',background:'var(--bg-elevated)',borderRadius:6,
              borderLeft:'3px solid var(--accent)'}}>
              <span style={{fontSize:11,color:'var(--txt2)'}}>↩ Replying to <strong>{replyTo.author?.name}</strong></span>
              <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',
                color:'var(--danger)',cursor:'pointer',fontSize:12,marginLeft:'auto'}}>✕</button>
            </div>
          )}

          <form onSubmit={submitComment} style={{display:'flex',gap:8,marginTop:8}}>
            <textarea value={newBody} onChange={e=>setNewBody(e.target.value)} rows={2}
              placeholder={replyTo?'Write a reply…':'Add a comment…'}
              style={{flex:1,background:'var(--bg-elevated)',border:'1px solid var(--border)',
                borderRadius:8,padding:'8px 12px',color:'var(--txt1)',fontSize:13,
                resize:'none',outline:'none',fontFamily:'var(--font-b)'}}/>
            <Button type="submit" loading={busy} disabled={busy||!newBody.trim()}
              style={{alignSelf:'flex-end'}}>Send</Button>
          </form>
        </>}
      </div>
    </Modal>
  )
}

function CommentBlock({ c, userId, projectId, taskId, onReply, onDeleted }) {
  async function del() {
    try{ await deleteComment(projectId,c.id); onDeleted(c.id) } catch{}
  }
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
        <Avatar url={c.author?.avatar_url} name={c.author?.name||'?'} size={26}/>
        <div style={{flex:1,background:'var(--bg-elevated)',borderRadius:8,
          padding:'8px 12px',border:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--txt1)'}}>{c.author?.name}</span>
            <span style={{fontSize:10,color:'var(--txt3)'}}>{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <p style={{fontSize:13,color:'var(--txt2)',lineHeight:1.5}}>{c.body}</p>
          <div style={{display:'flex',gap:10,marginTop:5}}>
            <button onClick={onReply} style={{background:'none',border:'none',
              color:'var(--txt3)',fontSize:11,cursor:'pointer'}}>↩ Reply</button>
            {c.user_id===userId&&<button onClick={del} style={{background:'none',border:'none',
              color:'var(--danger)',fontSize:11,cursor:'pointer'}}>Delete</button>}
          </div>
        </div>
      </div>
      {c.replies?.length>0&&(
        <div style={{marginLeft:34,marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
          {c.replies.map(r=>(
            <div key={r.id} style={{display:'flex',gap:7}}>
              <Avatar url={r.author?.avatar_url} name={r.author?.name||'?'} size={22}/>
              <div style={{flex:1,background:'var(--bg-card)',borderRadius:7,
                padding:'7px 11px',border:'1px solid var(--border)'}}>
                <span style={{fontSize:11,fontWeight:600,color:'var(--txt1)'}}>{r.author?.name} </span>
                <span style={{fontSize:12,color:'var(--txt2)'}}>{r.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const S = {
  header:{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',
    borderBottom:'1px solid var(--border)',background:'var(--bg-card)',flexShrink:0,flexWrap:'wrap'},
  title:{fontFamily:'var(--font-d)',fontSize:'clamp(15px,4vw,18px)',fontWeight:800,margin:0,
    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  backBtn:{background:'none',border:'none',color:'var(--txt2)',fontSize:18,cursor:'pointer',padding:'4px 8px',flexShrink:0},
  tabBtn:{background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--txt2)',
    borderRadius:7,padding:'6px 10px',fontSize:16,cursor:'pointer'},
}
