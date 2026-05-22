'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '../config'
import type {
  OrganicDomainOverview,
  OrganicKeyword,
  OrganicCompetitors,
  OrganicHistory,
  OrganicAudit,
} from '../types'
import OrganicHeader from './components/OrganicHeader'
import KeywordTable from './components/KeywordTable'
import AiReadinessWave from './components/AiReadinessWave'
import OvsScatter from './components/OvsScatter'

export default function OrganicPage() {
  const [overview, setOverview]       = useState<OrganicDomainOverview | null>(null)
  const [keywords, setKeywords]       = useState<OrganicKeyword[]>([])
  const [competitors, setCompetitors] = useState<OrganicCompetitors | null>(null)
  const [history, setHistory]         = useState<OrganicHistory | null>(null)
  const [audit, setAudit]             = useState<OrganicAudit | null>(null)
  const [selected, setSelected]       = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/organic/overview`).then(r => r.json()),
      fetch(`${API_BASE}/api/organic/keywords`).then(r => r.json()),
      fetch(`${API_BASE}/api/organic/competitors`).then(r => r.json()),
      fetch(`${API_BASE}/api/organic/history`).then(r => r.json()),
      fetch(`${API_BASE}/api/organic/audit`).then(r => r.json()),
    ]).then(([ov, kw, comp, hist, aud]) => {
      setOverview(ov)
      setKeywords(kw)
      setCompetitors(comp)
      setHistory(hist)
      setAudit(aud)
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span className="text-xs uppercase tracking-widest animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Loading organic data...
        </span>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-4 space-y-4" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest">
          <a href="/" style={{ color: 'var(--text-muted)' }} className="hover:text-white transition">Media</a>
          <span style={{ color: 'var(--text-primary)' }}>Organic</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          ⟨ψ⟩ Quantum Retail Media
        </span>
      </div>

      {/* Header */}
      {overview && audit && (
        <OrganicHeader overview={overview} keywords={keywords} audit={audit} history={history} />
      )}

      {/* Main grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 460px' }}>
        {/* Left — keyword table */}
        <KeywordTable
          keywords={keywords}
          selected={selected}
          onSelect={setSelected}
        />

        {/* Right — visualizations */}
        <div className="space-y-4">
          <AiReadinessWave keywords={keywords} selected={selected} />
          <OvsScatter keywords={keywords} selected={selected} onSelect={setSelected} />
        </div>
      </div>
    </main>
  )
}
