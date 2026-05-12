// Base URL: empty string in dev (Vite proxy), full URL in production
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

const tok  = () => localStorage.getItem('token')
const hdrs = (json = true) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}),
})

async function ok(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register       = p     => fetch(`${BASE}/register`,  { method:'POST', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const login          = p     => fetch(`${BASE}/login`,     { method:'POST', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const refreshToken   = ()    => fetch(`${BASE}/refresh`,   { method:'POST', headers:hdrs() }).then(ok)

// ── Users ─────────────────────────────────────────────────────────────────────
export const getProfile     = ()    => fetch(`${BASE}/profile`,                   { headers:hdrs() }).then(ok)
export const updateProfile  = p     => fetch(`${BASE}/profile`,   { method:'PATCH',  headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const changePassword = p     => fetch(`${BASE}/profile/password`, { method:'POST', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const uploadAvatar   = fd    => fetch(`${BASE}/profile/avatar`,   { method:'POST', headers:hdrs(false), body:fd }).then(ok)
export const getUser        = id    => fetch(`${BASE}/users/${id}`,      { headers:hdrs() }).then(ok)
export const saveGithubPat  = pat   => fetch(`${BASE}/profile/github-pat`, { method:'POST',   headers:hdrs(), body:JSON.stringify({ pat }) }).then(ok)
export const removeGithubPat= ()    => fetch(`${BASE}/profile/github-pat`, { method:'DELETE', headers:hdrs() }).then(ok)

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects    = ()    => fetch(`${BASE}/projects`,           { headers:hdrs() }).then(ok)
export const getProject     = id    => fetch(`${BASE}/projects/${id}`,     { headers:hdrs() }).then(ok)
export const createProject  = p     => fetch(`${BASE}/projects`,  { method:'POST',  headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const updateProject  = (id,p)=> fetch(`${BASE}/projects/${id}`, { method:'PATCH', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const uploadCover    = (id,fd)=> fetch(`${BASE}/projects/${id}/cover`, { method:'POST', headers:hdrs(false), body:fd }).then(ok)
export const joinProject    = id    => fetch(`${BASE}/projects/${id}/join`,   { method:'POST', headers:hdrs() }).then(ok)
export const setCollaboratorRole = (pid,uid,role) => fetch(`${BASE}/projects/${pid}/collaborators/${uid}/role`, { method:'PATCH', headers:hdrs(), body:JSON.stringify({ role }) }).then(ok)
export const respondRequest = (id,uid,action) => fetch(`${BASE}/projects/${id}/accept`, { method:'POST', headers:hdrs(), body:JSON.stringify({ user_id:uid, action }) }).then(ok)

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const getTasks          = pid        => fetch(`${BASE}/projects/${pid}/tasks`,          { headers:hdrs() }).then(ok)
export const createTask        = (pid,p)    => fetch(`${BASE}/projects/${pid}/tasks`,          { method:'POST',  headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const updateTask        = (pid,tid,p)=> fetch(`${BASE}/projects/${pid}/tasks/${tid}`,   { method:'PATCH', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const deleteTask        = (pid,tid)  => fetch(`${BASE}/projects/${pid}/tasks/${tid}`,   { method:'DELETE',headers:hdrs() }).then(ok)
export const suggestAssignees  = (pid,skill)=> fetch(`${BASE}/projects/${pid}/tasks/suggest-assignees`, { method:'POST', headers:hdrs(), body:JSON.stringify({ required_skill:skill }) }).then(ok)

// ── Task Comments ─────────────────────────────────────────────────────────────
export const getComments    = (pid,tid) => fetch(`${BASE}/projects/${pid}/tasks/${tid}/comments`, { headers:hdrs() }).then(ok)
export const addComment     = (pid,tid,p)=> fetch(`${BASE}/projects/${pid}/tasks/${tid}/comments`, { method:'POST', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const deleteComment  = (pid,cid) => fetch(`${BASE}/projects/${pid}/tasks/comments/${cid}`,  { method:'DELETE', headers:hdrs() }).then(ok)

// ── GitHub ────────────────────────────────────────────────────────────────────
export const getGithubStats     = pid => fetch(`${BASE}/projects/${pid}/github/stats`,    { headers:hdrs() }).then(ok)
export const getProjectProgress = pid => fetch(`${BASE}/projects/${pid}/github/progress`, { headers:hdrs() }).then(ok)

// ── Chat ──────────────────────────────────────────────────────────────────────
export const getChatMessages   = (pid,page=1) => fetch(`${BASE}/projects/${pid}/chat?page=${page}`, { headers:hdrs() }).then(ok)
export const sendChatMessage   = (pid,p)      => fetch(`${BASE}/projects/${pid}/chat`,      { method:'POST',  headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const sendChatFile      = (pid,fd)     => fetch(`${BASE}/projects/${pid}/chat/file`, { method:'POST',  headers:hdrs(false), body:fd }).then(ok)
export const editChatMessage   = (pid,mid,p)  => fetch(`${BASE}/projects/${pid}/chat/${mid}`, { method:'PATCH', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const deleteChatMessage = (pid,mid)    => fetch(`${BASE}/projects/${pid}/chat/${mid}`, { method:'DELETE', headers:hdrs() }).then(ok)

// ── Project Posts + Gallery ───────────────────────────────────────────────────
export const getPosts     = (pid,page=1) => fetch(`${BASE}/projects/${pid}/posts?page=${page}`, { headers:hdrs() }).then(ok)
export const createPost   = (pid,fd)     => fetch(`${BASE}/projects/${pid}/posts`, { method:'POST', headers:hdrs(false), body:fd }).then(ok)
export const deletePost   = (pid,postId) => fetch(`${BASE}/projects/${pid}/posts/${postId}`, { method:'DELETE', headers:hdrs() }).then(ok)
export const getGallery   = pid          => fetch(`${BASE}/projects/${pid}/gallery`, { headers:hdrs() }).then(ok)

// ── Global Feed ───────────────────────────────────────────────────────────────
export const getFeed          = (page=1) => fetch(`${BASE}/feed?page=${page}`,      { headers:hdrs() }).then(ok)
export const createFeedPost   = fd       => fetch(`${BASE}/feed`,  { method:'POST',   headers:hdrs(false), body:fd }).then(ok)
export const editFeedPost     = (id,p)   => fetch(`${BASE}/feed/${id}`, { method:'PATCH', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const deleteFeedPost   = id       => fetch(`${BASE}/feed/${id}`, { method:'DELETE',headers:hdrs() }).then(ok)
export const toggleLike       = id       => fetch(`${BASE}/feed/${id}/like`,         { method:'POST', headers:hdrs() }).then(ok)
export const getFeedComments  = id       => fetch(`${BASE}/feed/${id}/comments`,      { headers:hdrs() }).then(ok)
export const addFeedComment   = (id,p)   => fetch(`${BASE}/feed/${id}/comments`,     { method:'POST', headers:hdrs(), body:JSON.stringify(p) }).then(ok)
export const deleteFeedComment= id       => fetch(`${BASE}/feed/comments/${id}`,     { method:'DELETE', headers:hdrs() }).then(ok)

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications  = (p={}) => {
  const q = new URLSearchParams(p).toString()
  return fetch(`${BASE}/notifications${q ? '?'+q : ''}`, { headers:hdrs() }).then(ok)
}
export const getUnreadCount    = ()         => fetch(`${BASE}/notifications/unread-count`, { headers:hdrs() }).then(ok)
export const markRead          = id         => fetch(`${BASE}/notifications/${id}/read`,   { method:'PATCH',  headers:hdrs() }).then(ok)
export const markAllRead       = ()         => fetch(`${BASE}/notifications/read-all`,     { method:'PATCH',  headers:hdrs() }).then(ok)
export const deleteNotification= id         => fetch(`${BASE}/notifications/${id}`,        { method:'DELETE', headers:hdrs() }).then(ok)
export const clearNotifications= ()         => fetch(`${BASE}/notifications`,              { method:'DELETE', headers:hdrs() }).then(ok)

// ── Web Push ───────────────────────────────────────────────────────────────────
export const getVapidPublicKey = ()    => fetch(`${BASE}/push/vapid-public-key`, { headers: hdrs() }).then(ok)
export const subscribePush     = (sub) => fetch(`${BASE}/push/subscribe`,   { method: 'POST',   headers: hdrs(), body: JSON.stringify({ subscription: sub }) }).then(ok)
export const unsubscribePush   = (ep)  => fetch(`${BASE}/push/unsubscribe`, { method: 'DELETE', headers: hdrs(), body: JSON.stringify({ endpoint: ep }) }).then(ok)
