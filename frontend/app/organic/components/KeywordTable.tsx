'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { OrganicKeyword } from '../../types'

const HDCP_GRADIENT = 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 45%, #00f5ff 55%, #22c55e 100%)'

const SERP_COLORS: Record<string, string> = {
  aio: '#00f5ff', fsn: '#8b5cf6', stl: '#22c55e',
  kng: '#14b8a6', shp: '#f97316', img: '#64748b', rel: '#64748b',
}

const INTENT_LABELS: Record<number, string> = {
  0: 'Nav', 1: 'Info', 2: 'Comm', 3: 'Trans',
}

const CAT_COLORS: Record<string, string> = {
  brand_core:       '#00f5ff',
  product_category: '#8b5cf6',
  informational:    '#22c55e',
  long_tail:        '#eab308',
  gap_opportunity:  '#ef4444',
  aeo_geo:          '#ec4899',
}

function ovsColor(score: number): string {
  if (score >= 120) return '#22c55e'
  if (score >= 100) return '#00f5ff'
  if (score >= 80)  return '#eab308'
  if (score >= 60)  return '#f97316'
  return '#ef4444'
}

function OvsBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 200) * 100))
  const color = ovsColor(score)
  return (
    <div className="space-y-1 min-w-[64px]">
      <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{score.toFixed(1)}</span>
      <div className="relative h-1.5 rounded-full overflow-visible" style={{ background: 'var(--border)', width: 64 }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: HDCP_GRADIENT, backgroundSize: '64px 100%' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px"
          style={{ left: '50%', height: '200%', background: 'var(--text-muted)', opacity: 0.5 }}
        />
      </div>
    </div>
  )
}

type SortCol = 'keyword' | 'position' | 'volume' | 'keyword_difficulty' | 'ovs' | 'ai_exposure'

interface Props {
  keywords: OrganicKeyword[]
  selected: string | null
  onSelect: (kw: string | null) => void
}

export default function KeywordTable({ keywords, selected, onSelect }: Props) {
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'ovs', dir: 'desc' })

  const sorted = [...keywords].sort((a, b) => {
    let av = a[sort.col] as number | string
    let bv = b[sort.col] as number | string
    if (sort.col === 'keyword') return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    return sort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const toggleSort = (col: SortCol) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  const headers: { label: string; col?: SortCol }[] = [
    { label: 'Keyword', col: 'keyword' },
    { label: 'Cat' },
    { label: 'Pos', col: 'position' },
    { label: 'Vol', col: 'volume' },
    { label: 'KD', col: 'keyword_difficulty' },
    { label: 'Intent' },
    { label: 'SERP' },
    { label: 'OVS', col: 'ovs' },
    { label: 'AI' },
  ]

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Keyword Rankings</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{keywords.length} keywords</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {headers.map(({ label, col }) => (
                <th
                  key={label}
                  className={`px-3 py-2 text-left text-[10px] uppercase tracking-widest font-normal ${col ? 'cursor-pointer hover:text-white transition' : ''}`}
                  style={{ color: sort.col === col ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  onClick={() => col && toggleSort(col)}
                >
                  {label}{col && sort.col === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((kw, i) => {
              const isSelected = selected === kw.keyword
              const catColor = CAT_COLORS[kw.category] ?? '#64748b'
              const posColor = kw.position_change < 0 ? '#22c55e' : kw.position_change > 0 ? '#ef4444' : 'var(--text-muted)'
              const posArrow = kw.position_change < 0 ? '↑' : kw.position_change > 0 ? '↓' : ''

              return (
                <motion.tr
                  key={kw.keyword}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="cursor-pointer transition"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--panel-alt)' : 'transparent',
                  }}
                  onClick={() => onSelect(isSelected ? null : kw.keyword)}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--panel-alt)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Keyword */}
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</div>
                    <div className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {kw.url ? new URL(kw.url).pathname : 'not ranking'}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: catColor, background: `${catColor}18` }}>
                      {kw.category.replace('_', ' ').replace('brand core', 'brand').replace('product category', 'cat').replace('gap opportunity', 'gap').replace('long tail', 'LT').replace('aeo geo', 'AEO')}
                    </span>
                  </td>

                  {/* Position */}
                  <td className="px-3 py-2.5 font-mono">
                    <span style={{ color: 'var(--text-primary)' }}>{kw.position || '–'}</span>
                    {kw.position_change !== 0 && (
                      <span className="ml-1 text-[9px]" style={{ color: posColor }}>
                        {posArrow}{Math.abs(kw.position_change)}
                      </span>
                    )}
                  </td>

                  {/* Volume */}
                  <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {kw.volume >= 1000 ? `${(kw.volume / 1000).toFixed(0)}K` : kw.volume}
                  </td>

                  {/* KD */}
                  <td className="px-3 py-2.5 font-mono" style={{
                    color: kw.keyword_difficulty >= 70 ? '#ef4444' : kw.keyword_difficulty >= 50 ? '#eab308' : '#22c55e'
                  }}>
                    {kw.keyword_difficulty}
                  </td>

                  {/* Intent */}
                  <td className="px-3 py-2.5">
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {INTENT_LABELS[kw.intent]}
                    </span>
                  </td>

                  {/* SERP features */}
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5 flex-wrap">
                      {['aio', 'fsn', 'stl', 'kng', 'shp'].filter(f => kw.serp_features.includes(f)).map(f => (
                        <span
                          key={f}
                          className="text-[8px] px-1 py-0 rounded font-mono uppercase"
                          style={{ color: SERP_COLORS[f], background: `${SERP_COLORS[f]}20` }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* OVS */}
                  <td className="px-3 py-2.5">
                    <OvsBar score={kw.ovs} />
                  </td>

                  {/* AI indicator */}
                  <td className="px-3 py-2.5 font-mono text-center">
                    {kw.owns_aio
                      ? <span style={{ color: '#00f5ff' }} title="In AI Overview">●</span>
                      : kw.serp_features.includes('aio')
                      ? <span style={{ color: '#eab308' }} title="AI Overview present, not owned">○</span>
                      : <span style={{ color: 'var(--border)' }}>·</span>
                    }
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
