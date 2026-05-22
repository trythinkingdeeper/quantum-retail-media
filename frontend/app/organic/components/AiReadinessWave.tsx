'use client'

import { useRef, useEffect } from 'react'
import type { OrganicKeyword } from '../../types'

const CAT_COLORS: Record<string, string> = {
  brand_core:       '#00f5ff',
  product_category: '#8b5cf6',
  informational:    '#22c55e',
  long_tail:        '#eab308',
  gap_opportunity:  '#ef4444',
  aeo_geo:          '#ec4899',
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

interface Props {
  keywords: OrganicKeyword[]
  selected: string | null
}

export default function AiReadinessWave({ keywords, selected }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const frameRef   = useRef<number>()
  const kwRef      = useRef(keywords)
  const selRef     = useRef(selected)

  useEffect(() => { kwRef.current = keywords }, [keywords])
  useEffect(() => { selRef.current = selected }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = (ts: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width  = w * window.devicePixelRatio
      canvas.height = h * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.clearRect(0, 0, w, h)

      const breath = 1 + 0.02 * Math.sin(ts / 2000)

      // Grid
      const labels: [number, string][] = [
        [0.1, 'Navigational'], [0.4, 'Informational'], [0.7, 'Commercial'], [0.9, 'Transactional'],
      ]
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      labels.forEach(([xv, label]) => {
        ctx.fillStyle = '#334155'
        ctx.fillText(label, xv * w, h - 4)
        ctx.beginPath()
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.moveTo(xv * w, 0)
        ctx.lineTo(xv * w, h - 16)
        ctx.stroke()
        ctx.setLineDash([])
      })

      const N = 300
      const toX = (v: number) => v * w
      const toY = (v: number) => h - v * h * 0.80 * breath - h * 0.08

      kwRef.current.forEach(kw => {
        const isSelected = selRef.current === kw.keyword
        const color = CAT_COLORS[kw.category] ?? '#64748b'
        const [r, g, b] = hexToRgb(color)
        const sigma = Math.max(0.03, kw.wave_width * 0.07)
        const opacity = (kw.ai_readiness / 100) * (isSelected ? 1.0 : 0.65)
        const lw = isSelected ? 2.2 : 1.2

        // Gaussian curve
        const points: [number, number][] = []
        for (let i = 0; i <= N; i++) {
          const x = i / N
          const exponent = -0.5 * Math.pow((x - kw.wave_position) / sigma, 2)
          const y = kw.wave_amplitude * Math.exp(exponent)
          points.push([toX(x), toY(y)])
        }

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`
        ctx.lineWidth = lw
        points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
        ctx.stroke()

        // Glow fill for AI-ready keywords
        if (kw.ai_readiness >= 60 || isSelected) {
          const grad = ctx.createLinearGradient(0, toY(1), 0, h)
          grad.addColorStop(0, `rgba(${r},${g},${b},${opacity * 0.18})`)
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
          ctx.beginPath()
          ctx.fillStyle = grad
          points.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py))
          ctx.lineTo(toX(1), h)
          ctx.lineTo(toX(0), h)
          ctx.closePath()
          ctx.fill()
        }

        // Peak dot
        const dotX = toX(kw.wave_position)
        const dotY = toY(kw.wave_amplitude)
        const dotR = isSelected ? 4.5 : 2.5
        ctx.beginPath()
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity + 0.2})`
        ctx.fill()
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          AI Readiness Wave
        </span>
        <div className="flex gap-3 text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {Object.entries({ brand_core: 'Brand', product_category: 'Category', informational: 'Info', aeo_geo: 'AEO', gap_opportunity: 'Gap' }).map(([k, label]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: CAT_COLORS[k] }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} style={{ width: '100%', height: '200px', display: 'block' }} />
        <div className="absolute top-2 right-3 text-right space-y-0.5 text-[9px]" style={{ color: 'var(--text-muted)' }}>
          <div>height → search volume</div>
          <div>opacity → AI readiness score</div>
        </div>
      </div>
    </div>
  )
}
