import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUser, updateUser, deleteUser } from '../services/api'
import { Avatar, Badge, Spinner, ConfirmModal, Field } from '../components/UI'
import { useToast } from '../services/ToastContext'

export default function UserDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [newPw,   setNewPw]   = useState('')

  useEffect(() => {
    getUser(id)
      .then(d => setUser(d.user))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleResetPassword() {
    if (!newPw.trim()) return
    setSaving(true)
    try {
      await updateUser(id, { password: newPw })
      toast('Password updated.')
      setNewPw('')
    } catch(e) { toast(e.message, 'error') }
    finally    { setSaving(false) }
  }

  async function handleBan() {
    try {
      const d = await updateUser(id, { is_banned: !user.is_banned })
      setUser(d.user)
      toast(user.is_banned ? 'User unbanned.' : 'User banned.')
    } catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  async function handleToggleAdmin() {
    try {
      const d = await updateUser(id, { is_admin: !user.is_admin })
      setUser(d.user)
      toast(user.is_admin ? 'Admin removed.' : 'Admin granted.')
    } catch(e) { toast(e.message, 'error') }
  }

  async function handleDelete() {
    try {
      await deleteUser(id)
      toast('User deleted.')
      navigate('/users')
    } catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
  if (!user)   return <div style={{ color: 'var(--danger)', padding: 20 }}>User not found.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/users')}>
        ← Back to Users
      </button>

      {/* Header card */}
      <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar url={user.avatar_url} name={user.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt1)' }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--txt3)' }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Badge type={user.level === 'advanced' ? 'success' : user.level === 'intermediate' ? 'warning' : 'gray'}>
              {user.level}
            </Badge>
            {user.is_admin  && <Badge type="blue">Admin</Badge>}
            {user.is_banned && <Badge type="danger">Banned</Badge>}
            {!user.is_admin && !user.is_banned && <Badge type="gray">Active</Badge>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleToggleAdmin}>
            {user.is_admin ? 'Remove Admin' : '★ Make Admin'}
          </button>
          <button className={`btn btn-sm ${user.is_banned ? 'btn-success' : 'btn-warning'}`}
            onClick={() => setConfirm('ban')}>
            {user.is_banned ? 'Unban' : 'Ban'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm('delete')}>
            Delete
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'User ID',       value: `#${user.id}` },
          { label: 'Joined',        value: new Date(user.created_at).toLocaleDateString() },
          { label: 'GitHub',        value: user.github_username || '—' },
          { label: 'Skills',        value: user.skills || '—' },
          { label: 'Projects owned', value: user.projects_count },
          { label: 'Collaborations', value: user.collabs_count },
        ].map(({ label, value }) => (
          <div key={label} className="card card-sm">
            <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'var(--txt1)', fontWeight: 600, wordBreak: 'break-all' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Reset password */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 14 }}>
          Reset Password
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            type="text"
            placeholder="New password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <button className="btn btn-warning" onClick={handleResetPassword} disabled={saving || !newPw.trim()}>
            {saving ? '…' : 'Set'}
          </button>
        </div>
      </div>

      {/* Projects */}
      {user.projects_owned?.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 14 }}>
            Owned Projects
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user.projects_owned.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{p.methodology}</div>
                </div>
                <Badge type={p.status === 'active' ? 'success' : p.status === 'completed' ? 'blue' : 'gray'}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modals */}
      {confirm === 'ban' && (
        <ConfirmModal
          title={user.is_banned ? 'Unban User' : 'Ban User'}
          message={user.is_banned ? `Restore access for ${user.name}?` : `Ban ${user.name}?`}
          confirmLabel={user.is_banned ? 'Unban' : 'Ban'}
          danger={!user.is_banned}
          onConfirm={handleBan}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmModal
          title="Delete User"
          message={`Permanently delete ${user.name}? All their data will be removed.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
