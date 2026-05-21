'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '../types'

const TYPE_COLORS: Record<string, string> = {
  SP:  '#00f5ff',
  SB:  '#8b5cf6',
  SD:  '#f97316',
  SBV: '#ec4899',
}

const QUANTUM_LABELS: Record<string, string> = {
  high_intent:     '⟩ High Intent',
  consideration:   '~ Consideration',
  aware_low_intent:'≈ Low Intent',
  unaware:         '∞ Unaware',
  loyal:           '● Loyal',
}

function fmt$(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// HDCP scale: 0–200, par = 100. Bar fills proportionally, gradient across the range.
// A notch at the 50% position marks par.
const HDCP_GRADIENT = 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 45%, #00f5ff 55%, #22c55e 100%)'

function hdcpTextColor(score: number): string {
  if (score >= 120) return '#22c55e'
  if (score >= 100) return '#00f5ff'
  if (score >= 80)  return '#eab308'
  if (score >= 60)  return '#f97316'
  return '#ef4444'
}

function HdcpBadge({ score, signal }: { score: number; signal: string }) {
  const clampedPct = Math.min(100, Math.max(0, (score / 200) * 100))
  const color = hdcpTextColor(score)
  return (
    <div className="space-y-1 min-w-[72px]">
      <div className="flex items-center gap-1">
        <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{score.toFixed(1)}</span>
        {signal === 'green_light' && (
          <span title="Green Light Special — scale with confidence" style={{ color: '#22c55e', fontSize: 9 }}>★</span>
        )}
        {signal === 'caution' && (
          <span title="Caution Light — high ROAS, low NTB%" style={{ color: '#eab308', fontSize: 9 }}>⚠</span>
        )}
      </div>
      {/* Gradient bar with par notch at 50% */}
      <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: 'var(--border)', width: 72 }}>
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${clampedPct}%`,
            background: HDCP_GRADIENT,
            backgroundSize: '72px 100%',
            backgroundPosition: 'left center',
          }}
        />
        {/* Par notch at 100 (50% of 200) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px"
          style={{
            left: '50%',
            height: '200%',
            background: 'var(--text-muted)',
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  )
}

function IntentBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${value * 100}%`,
            background: `linear-gradient(to right, #ec4899, #00f5ff)`,
          }}
        />
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{value.toFixed(2)}</span>
    </div>
  )
}

interface Props {
  campaigns: Campaign[]
}

export default function CampaignTable({ campaigns }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Campaign Portfolio</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Campaign', 'Type', 'Quantum State', 'Daily Budget', 'Today', 'ROAS', 'NTB%', 'HDCP', 'Intent ψ', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest font-normal" style={{ color: 'var(--text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const color = TYPE_COLORS[c.type] ?? '#94a3b8'
              return (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="transition"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--panel-alt)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{c.name.split('—')[0].trim()}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.id}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color, background: `${color}18` }}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {QUANTUM_LABELS[c.quantum_state] ?? c.quantum_state}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{fmt$(c.daily_budget)}</td>
                  <td className="px-3 py-2.5">
                    <div style={{ color: 'var(--text-primary)' }}>{fmt$(c.today_spend)}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {c.daily_budget > 0 ? `${((c.today_spend / c.daily_budget) * 100).toFixed(0)}% used` : '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono" style={{ color: c.roas >= 1 ? '#22c55e' : '#ef4444' }}>
                    {c.roas.toFixed(2)}x
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)' }}>{(c.ntb_rate * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2.5">
                    <HdcpBadge score={c.hdcp_score} signal={c.hdcp_signal} />
                  </td>
                  <td className="px-3 py-2.5">
                    <IntentBar value={c.intent_center} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
