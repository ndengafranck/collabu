import { useState, useEffect, useCallback } from 'react'
import { getProjects, updateProject, deleteProject } from '../services/api'
import { Badge, Spinner, Pagination, ConfirmModal, Avatar, Empty } from '../components/UI'
import { useToast } from '../services/ToastContext'

const STATUSES = ['', 'active', 'completed', 'paused']

export default function Projects() {
  const [data,    setData]    = useState({ projects: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [confirm, setConfirm] = useState(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getProjects({ page, per_page: 20, q: search, status })
      setData(d)
    } catch(e) { toast(e.message, 'error') }
    finally    { setLoading(false) }
  }, [page, search, status])

  useEffect(() => { setPage(1) }, [search, status])
  useEffect(() => { load() }, [load])

  async function handleStatusChange(p, newStatus) {
    try {
      await updateProject(p.id, { status: newStatus })
      toast('Status updated.')
      load()
    } catch(e) { toast(e.message, 'error') }
  }

  async function handleDelete(p) {
    try {
      await deleteProject(p.id)
      toast('Project deleted.')
      load()
    } catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  const statusBadge = (s) => {
    if (s === 'active')    return <Badge type="success">active</Badge>
    if (s === 'completed') return <Badge type="blue">completed</Badge>
    return <Badge type="gray">paused</Badge>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{data.total} total projects</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span style={{ color: 'var(--txt3)' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" />
        </div>
        <select
          className="input"
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ width: 'auto', padding: '7px 10px' }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : data.projects.length === 0 ? (
          <Empty icon="📁" text="No projects found" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Owner</th>
                <th>Members</th>
                <th>Tasks</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{p.methodology}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Avatar url={p.owner?.avatar_url} name={p.owner?.name} size={24} />
                      <span style={{ fontSize: 12 }}>{p.owner?.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt2)' }}>
                    {p.member_count}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt2)' }}>
                    {p.task_count}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--txt3)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select
                        className="input"
                        style={{ width: 'auto', padding: '3px 7px', fontSize: 12 }}
                        value={p.status}
                        onChange={e => handleStatusChange(p, e.target.value)}>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                      </select>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} pages={data.pages} onChange={setPage} />

      {confirm && (
        <ConfirmModal
          title="Delete Project"
          message={`Delete "${confirm.title}"? All tasks, collaborations and posts will be removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
