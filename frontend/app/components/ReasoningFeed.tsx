'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TYPE_COLORS: Record<string, string> = {
  SP: '#00f5ff', SB: '#8b5cf6', SD: '#f97316', SBV: '#ec4899',
}

export interface ActionEntry {
  tool: string
  input: Record<string, unknown>
  result: Record<string, unknown>
}

import type { CycleSummary } from '../types'
export type { CycleSummary }

function formatAction(a: ActionEntry): { icon: string; line: string; color: string } {
  const { tool, input, result } = a

  if (tool === 'update_bid') {
    if (!result.success) return { icon: '✕', line: `${input.campaign_id}  bid blocked — ${result.error}`, color: '#ef4444' }
    const old = result.old_bid as number
    const next = result.new_bid as number
    const up = next > old
    const kw = (input.keyword as string).replace('auto_targeting', 'auto targeting')
    return {
      icon: up ? '↑' : '↓',
      line: `${input.campaign_id}  "${kw}"  $${old.toFixed(2)} → $${next.toFixed(2)}`,
      color: up ? '#22c55e' : '#f97316',
    }
  }
  if (tool === 'update_daily_budget') {
    if (!result.success) return { icon: '✕', line: `${input.campaign_id}  budget blocked — ${result.error}`, color: '#ef4444' }
    const old = result.old_budget as number
    const next = result.new_budget as number
    const up = next > old
    const pct = Math.abs(((next - old) / old) * 100).toFixed(0)
    return {
      icon: up ? '↑' : '↓',
      line: `${input.campaign_id}  budget  $${old.toLocaleString()} → $${next.toLocaleString()}  (${up ? '+' : '-'}${pct}%)`,
      color: up ? '#22c55e' : '#f97316',
    }
  }
  if (tool === 'shift_funnel_budget') {
    const dir = input.direction as string
    const label = dir === 'upper_funnel' ? 'Upper funnel' : dir === 'lower_funnel' ? 'Lower funnel' : 'Balanced'
    return { icon: '⟲', line: `${label} rebalance — ${Math.round((input.magnitude as number) * 100)}% intensity`, color: '#00f5ff' }
  }
  if (tool === 'pause_campaign') {
    return { icon: '⏸', line: `${input.campaign_id} paused`, color: '#ef4444' }
  }
  return { icon: '•', line: tool, color: '#94a3b8' }
}

function MetricDelta({ label, before, after, format }: {
  label: string; before: number; after: number; format: (n: number) => string
}) {
  const delta = after - before
  const up = delta > 0
  const color = up ? '#22c55e' : delta < 0 ? '#ef4444' : 'var(--text-secondary)'
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{format(after)}</div>
      {Math.abs(delta) > 0.001 && (
        <div className="text-[10px]" style={{ color }}>{up ? '▲' : '▼'} {format(Math.abs(delta))}</div>
      )}
    </div>
  )
}

interface Props {
  actions: ActionEntry[]
  summary: CycleSummary | null
  isRunning: boolean
  reasoningText: string
}

export default function ReasoningFeed({ actions, summary, isRunning, reasoningText }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showRawReasoning, setShowRawReasoning] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [actions.length, reasoningText.length])

  const pacingColor = summary
    ? summary.pacing_index_after >= 0.96 && summary.pacing_index_after <= 1.04
      ? '#22c55e'
      : summary.pacing_index_after < 0.90 || summary.pacing_index_after > 1.10
        ? '#ef4444'
        : '#eab308'
    : 'var(--text-secondary)'

  return (
    <div className="rounded-xl flex flex-col h-full min-h-0" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Optimization Feed</span>
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[10px]"
              style={{ color: '#00f5ff' }}
            >
              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}>●</motion.span>
              CLAUDE REASONING
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

        {/* Empty state */}
        {!isRunning && actions.length === 0 && !summary && (
          <p className="px-4 py-4 italic text-xs" style={{ color: 'var(--text-muted)' }}>
            Run a cycle to see Claude's analysis here.
          </p>
        )}

        {/* ── LIVE REASONING STREAM ─────────────────────────────── */}
        <AnimatePresence>
          {(isRunning || (reasoningText && !summary)) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pt-4 pb-2"
            >
              <div
                className="rounded-lg p-3 text-xs leading-relaxed"
                style={{
                  background: 'rgba(0,245,255,0.04)',
                  border: '1px solid rgba(0,245,255,0.12)',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {reasoningText || (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Analysing portfolio state…
                  </motion.span>
                )}
                {isRunning && reasoningText && (
                  <span
                    className="inline-block w-1 h-3 ml-0.5 align-middle animate-pulse"
                    style={{ background: '#00f5ff', borderRadius: '1px' }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ACTION TICKER ─────────────────────────────────────── */}
        {actions.length > 0 && (
          <div className="px-4 py-2 space-y-1">
            <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Changes</div>
            <AnimatePresence initial={false}>
              {actions.map((a, i) => {
                const { icon, line, color } = formatAction(a)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-baseline gap-2 font-mono text-xs py-0.5"
                  >
                    <span className="font-bold w-4 text-center flex-shrink-0" style={{ color }}>{icon}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{line}</span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {isRunning && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-[10px] italic pl-6"
                style={{ color: 'var(--text-muted)' }}
              >
                thinking…
              </motion.div>
            )}
          </div>
        )}

        {/* ── CYCLE REPORT ──────────────────────────────────────── */}
        <AnimatePresence>
          {summary && !isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-3 my-3 rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            >
              {/* Report header */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: 'rgba(0,245,255,0.05)', borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: '#00f5ff' }}>Cycle Report</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {summary.actions_count} change{summary.actions_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold" style={{ color: pacingColor }}>
                    {summary.pacing_index_after.toFixed(3)}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>pacing</span>
                </div>
              </div>

              {/* Narrative — the strategist read */}
              {summary.cycle_narrative && (
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--text-primary)', lineHeight: '1.65' }}
                  >
                    {summary.cycle_narrative}
                  </p>
                  {summary.goal_text && (
                    <p className="text-[10px] mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>
                      Goal: "{summary.goal_text}"
                    </p>
                  )}
                </div>
              )}

              {/* Budget changes */}
              {Object.keys(summary.budget_changes).length > 0 && (
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Budget shifts</div>
                  <div className="space-y-1.5">
                    {Object.entries(summary.budget_changes)
                      .filter(([, v]) => v.pct_change !== 0)
                      .sort((a, b) => Math.abs(b[1].pct_change) - Math.abs(a[1].pct_change))
                      .map(([type, vals]) => {
                        const color = TYPE_COLORS[type] ?? '#94a3b8'
                        const up = vals.pct_change > 0
                        const barPct = Math.min(100, Math.abs(vals.pct_change) * 2)
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold w-7 flex-shrink-0" style={{ color }}>{type}</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: up ? '#22c55e' : '#ef4444' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${barPct}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] w-16 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                              ${vals.before.toLocaleString()} → ${vals.after.toLocaleString()}
                            </span>
                            <span className="text-[10px] w-9 text-right flex-shrink-0" style={{ color: up ? '#22c55e' : '#ef4444' }}>
                              {up ? '+' : ''}{vals.pct_change}%
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Portfolio metrics */}
              <div className="px-4 py-3">
                <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Portfolio averages</div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricDelta label="ROAS" before={summary.before_metrics.roas} after={summary.after_metrics.roas} format={(n) => `${n.toFixed(2)}x`} />
                  <MetricDelta label="NTB%" before={summary.before_metrics.ntb_rate} after={summary.after_metrics.ntb_rate} format={(n) => `${(n * 100).toFixed(1)}%`} />
                  <MetricDelta label="CTR" before={summary.before_metrics.ctr} after={summary.after_metrics.ctr} format={(n) => `${(n * 100).toFixed(2)}%`} />
                </div>
              </div>

              {/* Expandable raw reasoning */}
              {reasoningText && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setShowRawReasoning((v) => !v)}
                    className="w-full px-4 py-2 text-left text-[10px] flex items-center justify-between transition"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Full reasoning log</span>
                    <span>{showRawReasoning ? '▲' : '▼'}</span>
                  </button>
                  {showRawReasoning && (
                    <div
                      className="px-4 pb-3 text-[10px] leading-relaxed"
                      style={{
                        color: 'var(--text-muted)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontStyle: 'italic',
                      }}
                    >
                      {reasoningText}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
