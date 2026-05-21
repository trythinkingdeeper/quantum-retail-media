'use client'

import { useRef, useEffect, useState } from 'react'
import type { WaveformData, GmvWaveData } from '../types'

type WaveView = 'spend' | 'gmv' | 'both'

const COLORS: Record<string, string> = {
  SP:  '#00f5ff',
  SB:  '#8b5cf6',
  SD:  '#f97316',
  SBV: '#ec4899',
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function growthColor(rate: number): string {
  if (rate >= 1.10) return '#22c55e'
  if (rate >= 0.95) return '#00f5ff'
  return '#ef4444'
}

interface Props {
  waveform: WaveformData
  gmvWave?: GmvWaveData
  pulsing?: boolean
  theme?: 'dark' | 'light'
}

export default function WaveformViz({ waveform, gmvWave, pulsing, theme = 'dark' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>()
  const waveformRef = useRef(waveform)
  const gmvRef = useRef(gmvWave)
  const pulsingRef = useRef(pulsing)
  const themeRef = useRef(theme)
  const viewRef = useRef<WaveView>('spend')
  const [view, setView] = useState<WaveView>('spend')

  useEffect(() => { waveformRef.current = waveform }, [waveform])
  useEffect(() => { gmvRef.current = gmvWave }, [gmvWave])
  useEffect(() => { pulsingRef.current = pulsing }, [pulsing])
  useEffect(() => { themeRef.current = theme }, [theme])
  useEffect(() => { viewRef.current = view }, [view])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = (ts: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.clearRect(0, 0, w, h)

      const isLight   = themeRef.current === 'light'
      const labelColor = isLight ? '#94a3b8' : '#334155'
      const gridColor  = isLight ? '#e2e8f0' : '#0f172a'
      const spendWaveColor = isLight ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.7)'
      const currentView = viewRef.current

      const breath = pulsingRef.current
        ? 1 + 0.06 * Math.sin(ts / 800)
        : 1 + 0.02 * Math.sin(ts / 2000)

      const { xs, individual, combined } = waveformRef.current
      const N = xs.length
      const toX = (i: number) => (i / (N - 1)) * w
      const toY = (v: number) => h - v * h * 0.82 * breath - h * 0.06

      // Grid + labels (shared across all views)
      const labels: [number, string][] = [
        [0, 'Unaware'], [0.25, 'Low Intent'], [0.5, 'Consideration'],
        [0.75, 'High Intent'], [1, 'Loyal'],
      ]
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      labels.forEach(([xv, label]) => {
        ctx.fillStyle = labelColor
        ctx.fillText(label, xv * w, h - 4)
        ctx.beginPath()
        ctx.strokeStyle = gridColor
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.moveTo(xv * w, 0)
        ctx.lineTo(xv * w, h - 16)
        ctx.stroke()
        ctx.setLineDash([])
      })

      // ── SPEND view ──────────────────────────────────────────────────────
      if (currentView === 'spend' || currentView === 'both') {
        if (currentView === 'spend') {
          // Individual campaign waves
          individual.forEach((curve) => {
            const color = COLORS[curve.type] ?? '#94a3b8'
            const [r, g, b] = hexToRgb(color)
            const alpha = (curve.opacity ?? 0.7) * 0.75
            const maxSigma = 0.20, minSigma = 0.05
            const sigmaFraction = Math.max(0, Math.min(1, ((curve.sigma ?? 0.10) - minSigma) / (maxSigma - minSigma)))

            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
            ctx.lineWidth = 1.2 + sigmaFraction * 1.2
            curve.points.forEach((y, i) => {
              const px = toX(i), py = toY(y)
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
            })
            ctx.stroke()

            if ((curve.opacity ?? 0) > 0.6 && (curve.sigma ?? 1) < 0.10) {
              const grad = ctx.createLinearGradient(0, toY(1), 0, h)
              grad.addColorStop(0, `rgba(${r},${g},${b},0.12)`)
              grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
              ctx.beginPath()
              ctx.fillStyle = grad
              curve.points.forEach((y, i) => {
                const px = toX(i), py = toY(y)
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
              })
              ctx.lineTo(toX(N - 1), h)
              ctx.lineTo(toX(0), h)
              ctx.closePath()
              ctx.fill()
            }

            const dotIdx = Math.round((curve.intent_center ?? 0.5) * (N - 1))
            const dotY = toY(curve.points[dotIdx] ?? 0)
            const sigFrac = Math.max(0, Math.min(1, ((curve.sigma ?? 0.10) - minSigma) / (maxSigma - minSigma)))
            const dotR = 3 + (1 - sigFrac) * 3
            ctx.beginPath()
            ctx.arc((curve.intent_center ?? 0.5) * w, dotY, dotR, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha + 0.2})`
            ctx.fill()
          })
        }

        // Spend portfolio envelope
        ctx.beginPath()
        ctx.strokeStyle = spendWaveColor
        ctx.lineWidth = currentView === 'both' ? 1.5 : 2
        ctx.setLineDash([8, 4])
        combined.forEach((y, i) => {
          const px = toX(i), py = toY(y)
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.setLineDash([])
      }

      // ── GMV view ────────────────────────────────────────────────────────
      if ((currentView === 'gmv' || currentView === 'both') && gmvRef.current) {
        const gmv = gmvRef.current

        if (currentView === 'gmv') {
          // Individual item waves colored by growth rate
          gmv.items.forEach((item) => {
            const color = growthColor(item.growth_rate)
            const [r, g, b] = hexToRgb(color)
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`
            ctx.lineWidth = 1.5
            item.points.forEach((y, i) => {
              const px = toX(i), py = toY(y)
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
            })
            ctx.stroke()

            // Glow fill for growing items
            if (item.growth_rate >= 1.10) {
              const grad = ctx.createLinearGradient(0, toY(1), 0, h)
              grad.addColorStop(0, `rgba(${r},${g},${b},0.10)`)
              grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
              ctx.beginPath()
              ctx.fillStyle = grad
              item.points.forEach((y, i) => {
                const px = toX(i), py = toY(y)
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
              })
              ctx.lineTo(toX(N - 1), h)
              ctx.lineTo(toX(0), h)
              ctx.closePath()
              ctx.fill()
            }

            // Peak dot
            const dotIdx = Math.round(item.intent_center * (N - 1))
            const dotY = toY(item.points[dotIdx] ?? 0)
            ctx.beginPath()
            ctx.arc(item.intent_center * w, dotY, 3.5, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
          })
        }

        // GMV portfolio envelope — gold
        ctx.beginPath()
        ctx.strokeStyle = currentView === 'both' ? 'rgba(234,179,8,0.9)' : 'rgba(234,179,8,0.85)'
        ctx.lineWidth = currentView === 'both' ? 2 : 2
        ctx.setLineDash(currentView === 'both' ? [] : [])
        gmv.combined.forEach((y, i) => {
          const px = toX(i), py = toY(y)
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.setLineDash([])

        // Glow under GMV envelope in gmv view
        if (currentView === 'gmv') {
          const grad = ctx.createLinearGradient(0, toY(1), 0, h)
          grad.addColorStop(0, 'rgba(234,179,8,0.08)')
          grad.addColorStop(1, 'rgba(234,179,8,0)')
          ctx.beginPath()
          ctx.fillStyle = grad
          gmv.combined.forEach((y, i) => {
            const px = toX(i), py = toY(y)
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
          })
          ctx.lineTo(toX(N - 1), h)
          ctx.lineTo(toX(0), h)
          ctx.closePath()
          ctx.fill()
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} style={{ width: '100%', height: '260px', display: 'block' }} />

      {/* Legend */}
      <div className="absolute top-2 right-3 flex flex-col gap-1.5 text-[10px]">
        {view === 'spend' && (
          <div className="flex gap-3">
            {Object.entries(COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1" style={{ color }}>
                <span className="inline-block w-4 h-0.5" style={{ background: color }} />
                {type}
              </span>
            ))}
            <span className="flex items-center gap-1 opacity-60" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: 'var(--text-primary)' }} />
              Portfolio
            </span>
          </div>
        )}
        {view === 'gmv' && (
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-green-400"><span className="inline-block w-4 h-0.5 bg-green-400" /> Growing</span>
            <span className="flex items-center gap-1 text-cyan-400"><span className="inline-block w-4 h-0.5 bg-cyan-400" /> Flat</span>
            <span className="flex items-center gap-1 text-red-400"><span className="inline-block w-4 h-0.5 bg-red-400" /> Declining</span>
            <span className="flex items-center gap-1" style={{ color: '#eab308' }}><span className="inline-block w-4 h-0.5" style={{ background: '#eab308' }} /> GMV</span>
          </div>
        )}
        {view === 'both' && (
          <div className="flex gap-3">
            <span className="flex items-center gap-1 opacity-60" style={{ color: 'var(--text-primary)' }}>
              <span className="inline-block w-4 border-t border-dashed" style={{ borderColor: 'var(--text-primary)' }} />
              Spend
            </span>
            <span className="flex items-center gap-1" style={{ color: '#eab308' }}>
              <span className="inline-block w-4 h-0.5" style={{ background: '#eab308' }} />
              GMV Growth
            </span>
          </div>
        )}
        {view === 'spend' && (
          <div className="text-right space-y-0.5" style={{ color: 'var(--text-muted)' }}>
            <div>width → efficiency (narrow = high ROAS)</div>
            <div>opacity → incrementality (bright = high NTB)</div>
          </div>
        )}
        {view === 'gmv' && (
          <div className="text-right space-y-0.5" style={{ color: 'var(--text-muted)' }}>
            <div>height → YoY GMV growth rate per item</div>
            <div>position → inferred from campaign spend mix</div>
          </div>
        )}
        {view === 'both' && (
          <div className="text-right" style={{ color: 'var(--text-muted)' }}>
            <div>aligned peaks = spend matches growth</div>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="absolute top-2 left-0 flex gap-1 text-[10px]">
        {(['spend', 'gmv', 'both'] as WaveView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-2 py-0.5 rounded transition uppercase tracking-widest"
            style={{
              background: view === v ? 'var(--border)' : 'transparent',
              color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
