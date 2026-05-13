import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, updateUser, deleteUser } from '../services/api'
import { Avatar, Badge, Spinner, Pagination, ConfirmModal, Empty } from '../components/UI'
import { useToast } from '../services/ToastContext'

const FILTERS = [
  { label: 'All',     val: 'all' },
  { label: 'Banned',  val: 'banned' },
  { label: 'Admins',  val: 'admin' },
]

export default function Users() {
  const [data,    setData]    = useState({ users: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [confirm, setConfirm] = useState(null)  // { type, user }
  const toast    = useToast()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getUsers({ page, per_page: 20, q: search, filter })
      setData(d)
    } catch(e) { toast(e.message, 'error') }
    finally    { setLoading(false) }
  }, [page, search, filter])

  useEffect(() => { setPage(1) }, [search, filter])
  useEffect(() => { load() }, [load])

  async function handleBan(user) {
    try {
      await updateUser(user.id, { is_banned: !user.is_banned })
      toast(user.is_banned ? 'User unbanned.' : 'User banned.')
      load()
    } catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  async function handleDelete(user) {
    try {
      await deleteUser(user.id)
      toast('User deleted.')
      load()
    } catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  async function handleToggleAdmin(user) {
    try {
      await updateUser(user.id, { is_admin: !user.is_admin })
      toast(user.is_admin ? 'Admin removed.' : 'Admin granted.')
      load()
    } catch(e) { toast(e.message, 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-subtitle">{data.total} total accounts</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span style={{ color: 'var(--txt3)' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.val}
              className={`btn btn-sm ${filter === f.val ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.val)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : data.users.length === 0 ? (
          <Empty icon="👤" text="No users found" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Level</th>
                <th>Projects</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar url={u.avatar_url} name={u.name} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge type={u.level === 'advanced' ? 'success' : u.level === 'intermediate' ? 'warning' : 'gray'}>
                      {u.level}
                    </Badge>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt2)' }}>
                    {u.projects_count}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--txt3)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {u.is_admin  && <Badge type="blue">Admin</Badge>}
                      {u.is_banned && <Badge type="danger">Banned</Badge>}
                      {!u.is_admin && !u.is_banned && <Badge type="gray">Active</Badge>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/users/${u.id}`)}>View</button>
                      <button
                        className={`btn btn-sm ${u.is_banned ? 'btn-success' : 'btn-warning'}`}
                        onClick={() => setConfirm({ type: 'ban', user: u })}>
                        {u.is_banned ? 'Unban' : 'Ban'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={u.is_admin ? 'Remove admin' : 'Make admin'}
                        onClick={() => handleToggleAdmin(u)}>
                        {u.is_admin ? '★' : '☆'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ type: 'delete', user: u })}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} pages={data.pages} onChange={setPage} />

      {/* Confirm modals */}
      {confirm?.type === 'ban' && (
        <ConfirmModal
          title={confirm.user.is_banned ? 'Unban User' : 'Ban User'}
          message={confirm.user.is_banned
            ? `Restore access for ${confirm.user.name}?`
            : `Ban ${confirm.user.name}? They will not be able to log in.`}
          confirmLabel={confirm.user.is_banned ? 'Unban' : 'Ban'}
          danger={!confirm.user.is_banned}
          onConfirm={() => handleBan(confirm.user)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          title="Delete User"
          message={`Permanently delete ${confirm.user.name}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirm.user)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
