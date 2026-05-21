'use client'

import { motion } from 'framer-motion'
import type { PacingInfo } from '../types'
import type { Theme } from '../hooks/useTheme'

const SEVERITY_COLORS = {
  healthy:  { bar: '#22c55e', text: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  moderate: { bar: '#eab308', text: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  critical: { bar: '#ef4444', text: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function fmt$(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`
}

interface Props {
  pacing: PacingInfo
  day: number
  hour: number
  monthlyBudget: number
  isRunning: boolean
  connected: boolean
  isDemo: boolean
  brandName: string
  onTrigger: () => void
  onAdvance: () => void
  onAdvanceDay: () => void
  onReset: () => void
  onReport: () => void
  theme: Theme
  onToggleTheme: () => void
}

export default function PacingHeader({
  pacing, day, hour, monthlyBudget, isRunning, connected,
  isDemo, brandName, onTrigger, onAdvance, onAdvanceDay, onReset, onReport, theme, onToggleTheme,
}: Props) {
  const colors = SEVERITY_COLORS[pacing.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.healthy
  const pct = Math.min(100, (pacing.actual_spend / monthlyBudget) * 100)

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>QUANTUM RETAIL MEDIA</div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {brandName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: connected ? '#22c55e' : '#ef4444', background: connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}
          >
            {connected ? '● LIVE' : '○ OFFLINE'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Day {day} / 30 &nbsp;·&nbsp; {String(hour).padStart(2, '0')}:00
          </span>
          {isDemo && (
            <>
              <button
                onClick={onAdvance}
                className="text-xs px-3 py-1 rounded transition"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                +1h
              </button>
              <button
                onClick={onAdvanceDay}
                className="text-xs px-3 py-1 rounded transition"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                +1d
              </button>
              <button
                onClick={onReset}
                className="text-xs px-3 py-1 rounded transition"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#ef4444' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-muted)' }}
              >
                ↺ Reset
              </button>
            </>
          )}
          <button
            onClick={onToggleTheme}
            className="text-xs px-3 py-1 rounded transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            onClick={onReport}
            className="text-xs px-4 py-1.5 rounded border transition"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            Report
          </button>
          <button
            onClick={onTrigger}
            disabled={isRunning}
            className="text-xs px-4 py-1.5 rounded border font-semibold transition"
            style={{
              borderColor: isRunning ? 'var(--border)' : '#00f5ff',
              color: isRunning ? 'var(--text-muted)' : '#00f5ff',
              background: isRunning ? 'transparent' : 'rgba(0,245,255,0.05)',
            }}
          >
            {isRunning ? '⟳ Running…' : '▶ Run Cycle'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {[
          { label: 'MTD Spend',  value: fmt$(pacing.actual_spend) },
          { label: 'Expected',   value: fmt$(pacing.expected_spend) },
          { label: 'Remaining',  value: fmt$(pacing.remaining_budget) },
          { label: 'Req. Daily', value: fmt$(pacing.required_daily_rate) },
          { label: 'Days Left',  value: String(pacing.days_remaining) },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Pacing bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold" style={{ color: colors.text }}>
            {pacing.status}
          </span>
          <span style={{ color: colors.text }}>
            {pacing.pacing_index.toFixed(3)} pacing index
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: colors.bar }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          <span>$0</span>
          <span>Target ${(monthlyBudget / 1000).toFixed(0)}k</span>
        </div>
      </div>
    </div>
  )
}
