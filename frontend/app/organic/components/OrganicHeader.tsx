'use client'

import type { OrganicDomainOverview, OrganicKeyword, OrganicAudit, OrganicHistory } from '../../types'

const HDCP_GRADIENT = 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 45%, #00f5ff 55%, #22c55e 100%)'

function ovsColor(score: number): string {
  if (score >= 120) return '#22c55e'
  if (score >= 100) return '#00f5ff'
  if (score >= 80)  return '#eab308'
  if (score >= 60)  return '#f97316'
  return '#ef4444'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

interface Props {
  overview: OrganicDomainOverview
  keywords: OrganicKeyword[]
  audit: OrganicAudit
  history: OrganicHistory | null
}

export default function OrganicHeader({ overview, keywords, audit, history }: Props) {
  const ranked = keywords.filter(k => k.position > 0)
  const avgOvs = ranked.length
    ? ranked.reduce((s, k) => s + k.ovs, 0) / ranked.length
    : 0
  const aioOwned = overview.aio_owned_count
  const aioTotal = overview.aio_present_count
  const aioPct   = aioTotal > 0 ? Math.round((aioOwned / aioTotal) * 100) : 0
  const aioBadgeColor = aioPct >= 40 ? '#00f5ff' : aioPct >= 20 ? '#eab308' : '#ef4444'

  const latestMonth = history?.history[history.history.length - 1]
  const prevMonth   = history?.history[history.history.length - 2]
  const visibilityDelta = latestMonth && prevMonth
    ? (latestMonth.visibility_index - prevMonth.visibility_index).toFixed(1)
    : null

  const ovsPct = Math.min(100, (avgOvs / 200) * 100)

  const stats = [
    { label: 'Organic Traffic',    value: fmt(overview.organic_traffic),  sub: `${overview.mom_traffic_change >= 0 ? '+' : ''}${(overview.mom_traffic_change * 100).toFixed(1)}% MoM` },
    { label: 'Ranked Keywords',    value: fmt(overview.organic_keywords),  sub: `${fmt(overview.referring_domains)} ref domains` },
    { label: 'Visibility Index',   value: latestMonth ? latestMonth.visibility_index.toFixed(1) : '--', sub: visibilityDelta ? `${Number(visibilityDelta) >= 0 ? '+' : ''}${visibilityDelta} MoM` : '' },
    { label: 'AI Overview',        value: `${aioPct}% owned`,             sub: `${fmt(aioOwned)} of ${fmt(aioTotal)} AIO terms` },
    { label: 'Site Health',        value: `${audit.health_score}/100`,    sub: `${audit.errors} errors · ${audit.warnings} warnings` },
  ]

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {overview.domain}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            Authority {overview.authority_score}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: `${aioBadgeColor}18`, color: aioBadgeColor }}>
            {aioPct}% AI Coverage
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Avg OVS</span>
          <span className="font-mono text-sm font-bold" style={{ color: ovsColor(avgOvs) }}>
            {avgOvs.toFixed(1)}
          </span>
        </div>
      </div>

      {/* OVS bar */}
      <div className="space-y-1">
        <div className="relative h-2 rounded-full overflow-visible" style={{ background: 'var(--border)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${ovsPct}%`,
              background: HDCP_GRADIENT,
              backgroundSize: '100% 100%',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px"
            style={{ left: '50%', height: '220%', background: 'var(--text-muted)', opacity: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: 'var(--text-muted)' }}>
          <span>Underperforming</span>
          <span>Par (100)</span>
          <span>Outperforming</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-5 gap-3">
        {stats.map(({ label, value, sub }) => (
          <div key={label} className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
            {sub && <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
