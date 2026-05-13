import { useState } from 'react'
import { notifyAll } from '../services/api'
import { useToast } from '../services/ToastContext'

const TEMPLATES = [
  { label: 'Maintenance',  title: '🔧 Scheduled Maintenance', body: 'CollabU will be briefly unavailable on [DATE] from [TIME] for scheduled maintenance. Thanks for your patience!' },
  { label: 'New Feature',  title: '✨ New Feature Available', body: "We've just launched [FEATURE]. Check it out and let us know what you think!" },
  { label: 'Reminder',     title: '📌 Complete Your Profile', body: "Don't forget to link your GitHub account and add your skills to get the most out of CollabU." },
  { label: 'Welcome Wave', title: '👋 Welcome to CollabU!',   body: 'Glad to have you here. Explore projects, find collaborators, and start building something great!' },
]

export default function Broadcast() {
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [link,    setLink]    = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(null)
  const toast = useToast()

  function applyTemplate(t) {
    setTitle(t.title)
    setBody(t.body)
    setLink('')
  }

  async function handleSend() {
    if (!title.trim()) { toast('Title is required.', 'error'); return }
    setSending(true)
    try {
      const d = await notifyAll({ title: title.trim(), body: body.trim(), link: link.trim() })
      setSent(d.message)
      toast(d.message)
      setTitle(''); setBody(''); setLink('')
    } catch(e) { toast(e.message, 'error') }
    finally    { setSending(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Broadcast</div>
          <div className="page-subtitle">Send a notification to all active users</div>
        </div>
      </div>

      {/* Templates */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>
          Quick Templates
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEMPLATES.map(t => (
            <button key={t.label} className="btn btn-ghost btn-sm" onClick={() => applyTemplate(t)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.7px' }}>
          Compose Message
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Title *
          </label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notification title…"
            maxLength={200}
          />
          <div style={{ fontSize: 11, color: 'var(--txt3)', textAlign: 'right' }}>{title.length}/200</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Message
          </label>
          <textarea
            className="input"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Notification body (optional)…"
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Link (optional)
          </label>
          <input
            className="input"
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="/getting-started or https://…"
          />
        </div>

        {/* Preview */}
        {title && (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Preview
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt1)', marginBottom: body ? 4 : 0 }}>{title}</div>
            {body && <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>{body}</div>}
            {link && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>{link}</div>}
          </div>
        )}

        {sent && (
          <div style={{ background: 'var(--success-dim)', color: 'var(--success)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13 }}>
            ✓ {sent}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !title.trim()}
          style={{ alignSelf: 'flex-end', minWidth: 140 }}>
          {sending ? 'Sending…' : '◎ Send to All Users'}
        </button>
      </div>

      {/* Warning */}
      <div style={{
        background: 'var(--warning-dim)', border: '1px solid var(--warning)33',
        borderRadius: 'var(--radius)', padding: '10px 14px',
        fontSize: 12, color: 'var(--warning)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span>⚠</span>
        <span>This sends a real-time notification to every non-banned user. Use sparingly — avoid sending more than once per day.</span>
      </div>
    </div>
  )
}
