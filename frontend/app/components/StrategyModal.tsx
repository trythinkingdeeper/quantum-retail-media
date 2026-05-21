'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type StrategyMode = 'acquisition' | 'balanced' | 'retention'

// Gaussian helper
function gaussian(x: number, center: number, sigma: number, scale: number) {
  return scale * Math.exp(-0.5 * ((x - center) / sigma) ** 2)
}

// Campaign wave shapes per mode
const MODE_WAVES: Record<StrategyMode, Array<{ center: number; sigma: number; scale: number; color: string }>> = {
  acquisition: [
    { center: 0.18, sigma: 0.13, scale: 0.90, color: '#ec4899' }, // SBV
    { center: 0.28, sigma: 0.12, scale: 0.80, color: '#f97316' }, // SD
    { center: 0.45, sigma: 0.10, scale: 0.65, color: '#8b5cf6' }, // SB
    { center: 0.63, sigma: 0.08, scale: 0.20, color: '#00f5ff' }, // SP-auto faded
    { center: 0.78, sigma: 0.07, scale: 0.10, color: '#00f5ff' }, // SP-exact faded
  ],
  balanced: [
    { center: 0.18, sigma: 0.13, scale: 0.45, color: '#ec4899' },
    { center: 0.28, sigma: 0.12, scale: 0.45, color: '#f97316' },
    { center: 0.45, sigma: 0.10, scale: 0.60, color: '#8b5cf6' },
    { center: 0.63, sigma: 0.08, scale: 0.65, color: '#00f5ff' },
    { center: 0.78, sigma: 0.07, scale: 0.55, color: '#00f5ff' },
  ],
  retention: [
    { center: 0.18, sigma: 0.13, scale: 0.10, color: '#ec4899' },
    { center: 0.28, sigma: 0.12, scale: 0.15, color: '#f97316' },
    { center: 0.45, sigma: 0.10, scale: 0.28, color: '#8b5cf6' },
    { center: 0.63, sigma: 0.08, scale: 0.75, color: '#00f5ff' },
    { center: 0.78, sigma: 0.07, scale: 0.92, color: '#00f5ff' },
  ],
}

function MiniWave({ mode, active }: { mode: StrategyMode; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.offsetWidth || 220
    const h = canvas.offsetHeight || 72
    canvas.width = w * window.devicePixelRatio
    canvas.height = h * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.clearRect(0, 0, w, h)

    const N = 200
    const xs = Array.from({ length: N }, (_, i) => i / (N - 1))
    const toX = (i: number) => (i / (N - 1)) * w
    const toY = (v: number) => h - v * h * 0.82 - h * 0.06

    // Grid lines
    ctx.strokeStyle = active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ;[0, 0.25, 0.5, 0.75, 1].forEach((xv) => {
      ctx.beginPath()
      ctx.moveTo(xv * w, 0)
      ctx.lineTo(xv * w, h - 10)
      ctx.stroke()
    })
    ctx.setLineDash([])

    // Draw each campaign wave
    const waves = MODE_WAVES[mode]
    const combined = new Array(N).fill(0)

    waves.forEach((wave) => {
      const ys = xs.map((x) => gaussian(x, wave.center, wave.sigma, wave.scale))
      ys.forEach((y, i) => (combined[i] += y * 0.6))

      const [r, g, b] = wave.color.match(/\w\w/g)!.map((h) => parseInt(h, 16))
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${r},${g},${b},${wave.scale * 0.85})`
      ctx.lineWidth = 1.5
      ys.forEach((y, i) => {
        const px = toX(i), py = toY(y)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      })
      ctx.stroke()
    })

    // Portfolio envelope
    ctx.beginPath()
    ctx.strokeStyle = active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    combined.forEach((y, i) => {
      const px = toX(i), py = toY(y)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
    ctx.setLineDash([])

    // X-axis labels
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)'
    ;['Unaware', 'Consider', 'Loyal'].forEach((label, idx) => {
      ctx.fillText(label, [0.1, 0.5, 0.9][idx] * w, h - 1)
    })
  }, [mode, active])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '72px', display: 'block', borderRadius: '6px' }}
    />
  )
}

const MODES: Array<{
  id: StrategyMode
  label: string
  tagline: string
  ntb: string
  roas: string
  upper: number
  color: string
  description: string
}> = [
  {
    id: 'acquisition',
    label: 'Acquisition',
    tagline: 'Find new customers',
    ntb: '60%+',
    roas: '2.5x+',
    upper: 70,
    color: '#ec4899',
    description: 'Load upper funnel. SBV and Display lead. SP defends. Best for new launches, category entry, or Q1 build.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tagline: 'Grow and convert',
    ntb: '30%+',
    roas: '4.0x+',
    upper: 50,
    color: '#00f5ff',
    description: 'Even distribution across awareness and conversion. Default operating mode for steady-state growth.',
  },
  {
    id: 'retention',
    label: 'Retention',
    tagline: 'Maximize efficiency',
    ntb: '15%+',
    roas: '5.5x+',
    upper: 20,
    color: '#22c55e',
    description: 'SP exact and auto dominate. Upper funnel minimal. Best for peak season, budget-constrained periods, or mature categories.',
  },
]

interface Props {
  currentMode: StrategyMode
  locked: boolean
  daysRemaining: number
  onConfirm: (mode: StrategyMode) => void
  onClose: () => void
}

export default function StrategyModal({ currentMode, locked, daysRemaining, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<StrategyMode>(currentMode)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="rounded-2xl overflow-hidden"
        style={{
          width: '760px',
          maxWidth: '95vw',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
        }}
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                Monthly Strategy
              </div>
              <div className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Select your strategy for this month
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                This locks Claude's operating mode and NTB/ROAS targets for the rest of the month.
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
          </div>

          {locked && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-xs flex items-center gap-2"
              style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308' }}
            >
              <span>🔒</span>
              <span>Strategy locked — <strong>{currentMode}</strong> mode active for {daysRemaining} more day{daysRemaining !== 1 ? 's' : ''}. Resets at end of month.</span>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-4 p-6">
          {MODES.map((mode) => {
            const isSelected = selected === mode.id
            const isCurrent = currentMode === mode.id
            return (
              <motion.button
                key={mode.id}
                onClick={() => !locked && setSelected(mode.id)}
                className="rounded-xl p-4 text-left transition-all space-y-3"
                style={{
                  background: isSelected ? `${mode.color}0f` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? mode.color + '60' : 'var(--border)'}`,
                  cursor: locked ? 'default' : 'pointer',
                  opacity: locked && !isCurrent ? 0.55 : 1,
                }}
                whileHover={!locked ? { scale: 1.01 } : {}}
                whileTap={!locked ? { scale: 0.99 } : {}}
              >
                {/* Wave preview */}
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${isSelected ? mode.color + '30' : 'var(--border)'}` }}
                >
                  <MiniWave mode={mode.id} active={isSelected} />
                </div>

                {/* Mode info */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: isSelected ? mode.color : 'var(--text-primary)' }}>
                      {mode.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest"
                        style={{ background: `${mode.color}20`, color: mode.color, border: `1px solid ${mode.color}40` }}>
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{mode.tagline}</div>
                </div>

                {/* Description */}
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {mode.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>NTB%</div>
                    <div className="text-xs font-semibold" style={{ color: isSelected ? mode.color : 'var(--text-secondary)' }}>{mode.ntb}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>ROAS</div>
                    <div className="text-xs font-semibold" style={{ color: isSelected ? mode.color : 'var(--text-secondary)' }}>{mode.roas}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Upper</div>
                    <div className="text-xs font-semibold" style={{ color: isSelected ? mode.color : 'var(--text-secondary)' }}>{mode.upper}%</div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {locked
              ? 'View only — change available at the start of next month'
              : `Selecting ${selected} will lock Claude's operating mode for the rest of this month`}
          </div>
          {!locked && (
            <button
              onClick={() => onConfirm(selected)}
              disabled={selected === currentMode}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition"
              style={{
                background: selected === currentMode ? 'transparent' : `${MODES.find(m => m.id === selected)!.color}20`,
                border: `1px solid ${selected === currentMode ? 'var(--border)' : MODES.find(m => m.id === selected)!.color + '60'}`,
                color: selected === currentMode ? 'var(--text-muted)' : MODES.find(m => m.id === selected)!.color,
              }}
            >
              {selected === currentMode ? 'No change' : `Lock in ${selected.charAt(0).toUpperCase() + selected.slice(1)} →`}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
