const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const hdrs = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

async function ok(res) {
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Token storage ──────────────────────────────────────────────────────────
export const getToken  = ()    => localStorage.getItem('admin_token')
export const setToken  = (t)   => localStorage.setItem('admin_token', t)
export const clearToken= ()    => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user') }
export const getAdminUser = () => { try { return JSON.parse(localStorage.getItem('admin_user')) } catch { return null } }
export const setAdminUser = (u) => localStorage.setItem('admin_user', JSON.stringify(u))

// ── Auth ───────────────────────────────────────────────────────────────────
export const adminLogin = (email, password) =>
  fetch(`${BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(ok)

// ── Stats ──────────────────────────────────────────────────────────────────
export const getStats = () => fetch(`${BASE}/admin/stats`, { headers: hdrs() }).then(ok)

// ── Users ──────────────────────────────────────────────────────────────────
export const getUsers    = (params={}) => fetch(`${BASE}/admin/users?${new URLSearchParams(params)}`, { headers: hdrs() }).then(ok)
export const getUser     = (id)        => fetch(`${BASE}/admin/users/${id}`, { headers: hdrs() }).then(ok)
export const updateUser  = (id, data)  => fetch(`${BASE}/admin/users/${id}`, { method: 'PATCH',  headers: hdrs(), body: JSON.stringify(data) }).then(ok)
export const deleteUser  = (id)        => fetch(`${BASE}/admin/users/${id}`, { method: 'DELETE', headers: hdrs() }).then(ok)

// ── Projects ───────────────────────────────────────────────────────────────
export const getProjects    = (params={}) => fetch(`${BASE}/admin/projects?${new URLSearchParams(params)}`, { headers: hdrs() }).then(ok)
export const updateProject  = (id, data)  => fetch(`${BASE}/admin/projects/${id}`, { method: 'PATCH',  headers: hdrs(), body: JSON.stringify(data) }).then(ok)
export const deleteProject  = (id)        => fetch(`${BASE}/admin/projects/${id}`, { method: 'DELETE', headers: hdrs() }).then(ok)

// ── Posts ──────────────────────────────────────────────────────────────────
export const getPosts   = (params={}) => fetch(`${BASE}/admin/posts?${new URLSearchParams(params)}`, { headers: hdrs() }).then(ok)
export const deletePost = (id)        => fetch(`${BASE}/admin/posts/${id}`, { method: 'DELETE', headers: hdrs() }).then(ok)

// ── Broadcast ──────────────────────────────────────────────────────────────
export const notifyAll = (data) => fetch(`${BASE}/admin/notify-all`, { method: 'POST', headers: hdrs(), body: JSON.stringify(data) }).then(ok)
