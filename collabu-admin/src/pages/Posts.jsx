import { useState, useEffect, useCallback } from 'react'
import { getPosts, deletePost } from '../services/api'
import { Avatar, Spinner, Pagination, ConfirmModal, Empty } from '../components/UI'
import { useToast } from '../services/ToastContext'

export default function Posts() {
  const [data,    setData]    = useState({ posts: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [confirm, setConfirm] = useState(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await getPosts({ page, per_page: 20 }); setData(d) }
    catch(e) { toast(e.message, 'error') }
    finally  { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  async function handleDelete(post) {
    try { await deletePost(post.id); toast('Post removed.'); load() }
    catch(e) { toast(e.message, 'error') }
    setConfirm(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Posts</div>
          <div className="page-subtitle">Content moderation — {data.total} posts</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : data.posts.length === 0 ? (
        <Empty icon="📝" text="No posts yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.posts.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar url={p.author?.avatar_url} name={p.author?.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.author?.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 8 }}>
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--txt3)' }}>
                    <span>❤ {p.likes_count}</span>
                    <span>💬 {p.comments_count}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}>Remove</button>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {p.body.length > 300 ? p.body.slice(0, 300) + '…' : p.body}
                </p>
                {p.attachments?.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 4 }}>
                    📎 {p.attachments.length} attachment{p.attachments.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />

      {confirm && (
        <ConfirmModal
          title="Remove Post"
          message={`Remove this post by ${confirm.author?.name}? This cannot be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
