// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ url, name = '?', size = 32 }) {
  if (url) return <img src={url} alt={name} className="avatar" style={{ width: size, height: size }} />
  const letter = (name || '?')[0].toUpperCase()
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * .38 }}>
      {letter}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, type = 'gray' }) {
  return <span className={`badge badge-${type}`}>{children}</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <div className="spinner" style={{ width: size, height: size }} />
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--txt2)', fontSize: 14 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
        {page} / {pages}
      </span>
      <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  )
}

// ── Section title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.8px',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', text = 'Nothing here yet' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div>{text}</div>
    </div>
  )
}

// ── Label + Input row ─────────────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
