'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { API_BASE } from '../config'

interface Props {
  clientId: string
  brandName: string
  onClose: () => void
}

export default function ReportModal({ clientId, brandName, onClose }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    async function fetchReport() {
      try {
        const res = await fetch(`${API_BASE}/api/${clientId}/report`, {
          method: 'POST',
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error('Failed to start report')

        setLoading(false)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText((prev) => prev + decoder.decode(value, { stream: true }))
        }
      } catch (e: unknown) {
        if ((e as Error).name !== 'AbortError') {
          setError((e as Error).message || 'Unknown error')
          setLoading(false)
        }
      }
    }

    fetchReport()
    return () => controller.abort()
  }, [clientId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [text])

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
  }

  // Parse markdown-ish text into sections for styled rendering
  const lines = text.split('\n')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg)' }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Campaign Performance Report
          </div>
          <div className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {brandName}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loading && text && (
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded border transition"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Copy
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded border transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">

          {loading && (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                ●
              </motion.span>
              Generating report…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}

          {text && (
            <div className="space-y-1">
              {lines.map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h2
                      key={i}
                      className="text-sm font-bold uppercase tracking-widest mt-8 mb-3 first:mt-0"
                      style={{ color: '#00f5ff' }}
                    >
                      {line.replace('## ', '')}
                    </h2>
                  )
                }
                if (line.startsWith('# ')) {
                  return (
                    <h1
                      key={i}
                      className="text-xl font-bold tracking-tight mb-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {line.replace('# ', '')}
                    </h1>
                  )
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return (
                    <div key={i} className="flex gap-2 text-sm leading-relaxed py-0.5">
                      <span style={{ color: '#00f5ff', flexShrink: 0 }}>—</span>
                      <span style={{ color: 'var(--text-primary)' }}>{line.replace(/^[-*] /, '')}</span>
                    </div>
                  )
                }
                if (line.startsWith('|')) {
                  return (
                    <div
                      key={i}
                      className="font-mono text-xs py-1 border-b"
                      style={{
                        color: line.includes('---') ? 'transparent' : 'var(--text-secondary)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {line}
                    </div>
                  )
                }
                if (line.trim() === '') {
                  return <div key={i} className="h-2" />
                }
                return (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {line}
                  </p>
                )
              })}
              {loading && (
                <span
                  className="inline-block w-1 h-3.5 ml-0.5 align-middle animate-pulse"
                  style={{ background: '#00f5ff', borderRadius: '1px' }}
                />
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </motion.div>
  )
}
