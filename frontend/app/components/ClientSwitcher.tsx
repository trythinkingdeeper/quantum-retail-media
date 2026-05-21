'use client'

import { useState, useRef, useEffect } from 'react'
import type { ClientInfo } from '../types'

interface Props {
  clients: ClientInfo[]
  activeClientId: string
  onSwitch: (id: string) => void
  onAddNew: () => void
}

export default function ClientSwitcher({ clients, activeClientId, onSwitch, onAddNew }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = clients.find((c) => c.id === activeClientId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: active?.is_demo ? '#8b5cf6' : '#22c55e' }}
        />
        <span style={{ color: 'var(--text-primary)' }}>{active?.name ?? 'Select client'}</span>
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden z-40 min-w-[240px]"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSwitch(c.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition"
              style={{
                background: c.id === activeClientId ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: c.id === activeClientId ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: c.is_demo ? '#8b5cf6' : '#22c55e' }}
              />
              <span className="flex-1">{c.name}</span>
              {c.is_demo && (
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  Demo
                </span>
              )}
              {c.id === activeClientId && <span style={{ color: 'var(--text-muted)' }}>✓</span>}
            </button>
          ))}

          <button
            onClick={() => { onAddNew(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition"
            style={{ color: '#00f5ff' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,245,255,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span>+ Add New Client</span>
          </button>
        </div>
      )}
    </div>
  )
}
