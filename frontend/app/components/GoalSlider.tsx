'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const POSITIONS = [
  {
    value: 1,
    label: 'Max Incrementality',
    sub: '70% upper funnel · NTB 75%+',
    color: '#ec4899',
    dollars: 1,
    upperPct: 70,
    reach: 'Broadest Reach',
    reachSub: 'Massive unaware audience',
    audienceCount: 9,
    ntbTarget: '75%+',
    roasTarget: '—',
  },
  {
    value: 2,
    label: 'Incremental-Lean',
    sub: '55% upper funnel',
    color: '#8b5cf6',
    dollars: 2,
    upperPct: 55,
    reach: 'Wide Reach',
    reachSub: 'Mixed awareness + interest',
    audienceCount: 7,
    ntbTarget: '60%+',
    roasTarget: '1.5x+',
  },
  {
    value: 3,
    label: 'Balanced',
    sub: 'Mixed funnel allocation',
    color: '#00f5ff',
    dollars: 3,
    upperPct: 50,
    reach: 'Balanced',
    reachSub: 'Awareness + conversion mix',
    audienceCount: 5,
    ntbTarget: '40%+',
    roasTarget: '2.5x+',
  },
  {
    value: 4,
    label: 'Efficiency-Lean',
    sub: '60% lower funnel',
    color: '#22c55e',
    dollars: 4,
    upperPct: 35,
    reach: 'Targeted',
    reachSub: 'In-market, high-intent buyers',
    audienceCount: 3,
    ntbTarget: '20%+',
    roasTarget: '4.0x+',
  },
  {
    value: 5,
    label: 'Max Efficiency',
    sub: 'ROAS target 5.0x',
    color: '#eab308',
    dollars: 5,
    upperPct: 20,
    reach: 'Precise Targeting',
    reachSub: 'Loyal + near-purchase only',
    audienceCount: 1,
    ntbTarget: '10%',
    roasTarget: '5.0x',
  },
]

function AudienceDots({ count, color }: { count: number; color: string }) {
  const maxDots = 9
  return (
    <div className="flex flex-wrap gap-0.5 justify-center" style={{ width: 52, minHeight: 28 }}>
      {Array.from({ length: maxDots }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: i < count ? 7 : 5,
            height: i < count ? 7 : 5,
            background: i < count ? color : 'var(--border)',
            opacity: i < count ? 1 : 0.3,
          }}
          animate={{ scale: i < count ? 1 : 0.7, opacity: i < count ? 1 : 0.2 }}
          transition={{ duration: 0.3, delay: i * 0.02 }}
        />
      ))}
    </div>
  )
}

function DollarSigns({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          className="text-sm font-bold"
          style={{ color: i < count ? color : 'var(--border)' }}
          animate={{ opacity: i < count ? 1 : 0.25, scale: i < count ? 1 : 0.85 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
        >
          $
        </motion.span>
      ))}
    </div>
  )
}

function FunnelBar({ upperPct, color }: { upperPct: number; color: string }) {
  const lowerPct = 100 - upperPct
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="w-14" style={{ color: 'var(--text-muted)' }}>Upper funnel</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            animate={{ width: `${upperPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span style={{ color }} className="w-6 text-right">{upperPct}%</span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="w-14" style={{ color: 'var(--text-muted)' }}>Lower funnel</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--text-muted)' }}
            animate={{ width: `${lowerPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className="w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{lowerPct}%</span>
      </div>
    </div>
  )
}

const MODE_META = {
  acquisition: { label: 'Acquisition', color: '#ec4899' },
  balanced:    { label: 'Balanced',    color: '#00f5ff' },
  retention:   { label: 'Retention',   color: '#22c55e' },
}

interface Props {
  value: number
  onApply: (text: string, slider: number) => void
  disabled: boolean
  strategyMode: 'acquisition' | 'balanced' | 'retention'
  strategyLocked: boolean
  strategyDaysRemaining: number
  onOpenStrategy: () => void
}

export default function GoalSlider({ value, onApply, disabled, strategyMode, strategyLocked, strategyDaysRemaining, onOpenStrategy }: Props) {
  const [local, setLocal] = useState(value)
  const [goalText, setGoalText] = useState('')
  const current = POSITIONS[local - 1]
  const modeMeta = MODE_META[strategyMode]

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>

      {/* Strategy mode bar */}
      <div
        className="rounded-lg px-3 py-2.5 flex items-center justify-between"
        style={{ background: `${modeMeta.color}0a`, border: `1px solid ${modeMeta.color}30` }}
      >
        <div>
          <div className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Monthly Strategy</div>
          <div className="text-sm font-semibold" style={{ color: modeMeta.color }}>{modeMeta.label}</div>
        </div>
        <div className="flex items-center gap-2">
          {strategyLocked ? (
            <div className="text-right">
              <div className="text-[9px] flex items-center gap-1 justify-end" style={{ color: '#eab308' }}>
                <span>🔒</span><span>Locked</span>
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{strategyDaysRemaining}d remaining</div>
            </div>
          ) : (
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Unlocked</div>
          )}
          <button
            onClick={onOpenStrategy}
            className="text-[10px] px-2.5 py-1 rounded transition"
            style={{
              border: `1px solid ${modeMeta.color}50`,
              color: modeMeta.color,
              background: `${modeMeta.color}10`,
            }}
          >
            {strategyLocked ? 'View' : 'Change'}
          </button>
        </div>
      </div>

      <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Intensity</div>

      {/* Audience visualization across spectrum */}
      <div className="flex items-end justify-between px-1">
        {POSITIONS.map((p) => (
          <div key={p.value} className="flex flex-col items-center gap-1">
            <AudienceDots count={p.audienceCount} color={local === p.value ? p.color : 'var(--border)'} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.value}</span>
          </div>
        ))}
      </div>

      {/* Reach label */}
      <div className="flex justify-between text-[9px] -mt-2 px-1" style={{ color: 'var(--text-muted)' }}>
        <span>← Broad audience</span>
        <span>Precise targeting →</span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={1} max={5} step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${current.color} 0%, ${current.color} ${(local - 1) * 25}%, var(--border) ${(local - 1) * 25}%, var(--border) 100%)`,
        }}
        disabled={disabled}
      />

      {/* Current position card */}
      <motion.div
        key={local}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg p-3 space-y-3"
        style={{ background: `${current.color}10`, border: `1px solid ${current.color}30` }}
      >
        {/* Title + dollar signs */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-sm" style={{ color: current.color }}>
              {local}/5 — {current.label}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{current.reach} · {current.reachSub}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <DollarSigns count={current.dollars} color={current.color} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>ROAS returns</span>
          </div>
        </div>

        {/* Funnel split */}
        <FunnelBar upperPct={current.upperPct} color={current.color} />

        {/* KPI targets */}
        <div className="flex gap-3 text-[10px]">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>NTB target  </span>
            <span style={{ color: current.color }}>{current.ntbTarget}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>ROAS target  </span>
            <span style={{ color: current.color }}>{current.roasTarget}</span>
          </div>
        </div>
      </motion.div>

      {/* Natural language input */}
      <div>
        <div className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Natural language goal (optional)</div>
        <textarea
          className="w-full rounded-lg p-2.5 text-sm resize-none focus:outline-none"
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          rows={2}
          placeholder="e.g. We're launching a new flavor, push hard for new customers"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={disabled}
        />
      </div>

      <button
        onClick={() => onApply(goalText, local)}
        disabled={disabled}
        className="w-full py-2 rounded-lg text-sm font-semibold transition"
        style={{
          background: disabled ? 'var(--border)' : `${current.color}20`,
          color: disabled ? 'var(--text-muted)' : current.color,
          border: `1px solid ${disabled ? 'var(--border)' : current.color + '50'}`,
        }}
      >
        {disabled ? 'Running…' : 'Apply Goal & Run Claude'}
      </button>
    </div>
  )
}
