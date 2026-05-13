import { useState, useEffect } from 'react'
import { getStats } from '../services/api'
import { Spinner } from '../components/UI'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
  if (err)     return <div style={{ color: 'var(--danger)', padding: 20 }}>{err}</div>

  const s = stats

  const statCards = [
    { label: 'Total Users',    value: s.users.total,        sub: `+${s.users.new_7d} this week`,    color: 'var(--accent)' },
    { label: 'New (30d)',      value: s.users.new_30d,      sub: 'new registrations',                color: 'var(--success)' },
    { label: 'Banned',         value: s.users.banned,       sub: 'suspended accounts',               color: 'var(--danger)' },
    { label: 'Projects',       value: s.projects.total,     sub: `${s.projects.active} active`,      color: 'var(--accent)' },
    { label: 'Collaborations', value: s.collaborations.accepted, sub: `${s.collaborations.pending} pending`, color: 'var(--warning)' },
    { label: 'Tasks',          value: s.tasks.total,        sub: `${s.tasks.done} done`,             color: 'var(--success)' },
    { label: 'Posts',          value: s.posts.total,        sub: `+${s.posts.new_7d} this week`,     color: 'var(--accent)' },
    { label: 'Admins',         value: s.users.admins,       sub: 'admin accounts',                   color: 'var(--warning)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Platform overview</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--font-mono)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        <ChartCard title="User Signups — Last 14 Days" data={s.charts.signups} color="var(--accent)" />
        <ChartCard title="Projects Created — Last 14 Days" data={s.charts.projects} color="var(--success)" />
      </div>
    </div>
  )
}

function ChartCard({ title, data, color }) {
  return (
    <div className="card">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt3)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.7px' }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--txt3)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} interval={3} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--txt3)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: 'var(--txt2)' }}
            itemStyle={{ color }}
          />
          <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
