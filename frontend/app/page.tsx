'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from './hooks/useTheme'
import { AnimatePresence } from 'framer-motion'
import { useQuantumStore } from './hooks/useQuantumStore'
import { useClientStore } from './hooks/useClientStore'
import PacingHeader from './components/PacingHeader'
import WaveformViz from './components/WaveformViz'
import GoalSlider from './components/GoalSlider'
import ReasoningFeed from './components/ReasoningFeed'
import CampaignTable from './components/CampaignTable'
import ClientSwitcher from './components/ClientSwitcher'
import OnboardingModal from './components/OnboardingModal'
import StrategyModal from './components/StrategyModal'
import ReportModal from './components/ReportModal'
import type { ClientInfo } from './types'
import { API_BASE } from './config'

// Load 3D component client-side only (Three.js can't SSR)
const WaveformViz3D = dynamic(() => import('./components/WaveformViz3D'), { ssr: false })

export default function Home() {
  const { clients, activeClientId, setActiveClientId, addClient } = useClientStore()
  const { state, actions, summary, reasoningText, waveformHistory, isRunning, connected, triggerCycle, setGoal, advanceTime, advanceDay, reset } = useQuantumStore(activeClientId)
  const [show3D, setShow3D] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  const handleStrategyConfirm = async (mode: 'acquisition' | 'balanced' | 'retention') => {
    await fetch(`${API_BASE}/api/${activeClientId}/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    setShowStrategy(false)
  }

  const handleOnboardingComplete = (client: ClientInfo) => {
    addClient(client)
    setShowOnboarding(false)
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-600 text-sm">
        <div className="text-center space-y-2">
          <div className="text-2xl">⟨ψ⟩</div>
          <div>Connecting to Quantum Engine…</div>
          <div className="text-xs text-slate-700">Make sure the backend is running on :8000</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="min-h-screen p-4 space-y-3 max-w-[1600px] mx-auto" style={{ background: 'var(--bg)' }}>

        {/* Client switcher bar */}
        <div className="flex items-center justify-between">
          <ClientSwitcher
            clients={clients}
            activeClientId={activeClientId}
            onSwitch={setActiveClientId}
            onAddNew={() => setShowOnboarding(true)}
          />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            ⟨ψ⟩ Quantum Retail Media
          </span>
        </div>

        <PacingHeader
          pacing={state.pacing}
          day={state.simulated_day}
          hour={state.simulated_hour}
          monthlyBudget={state.monthly_budget}
          isRunning={isRunning}
          connected={connected}
          isDemo={state.is_demo}
          brandName={state.brand_name}
          onTrigger={triggerCycle}
          onAdvance={advanceTime}
          onAdvanceDay={advanceDay}
          onReset={reset}
          onReport={() => setShowReport(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div className="grid grid-cols-[1fr_320px] gap-4">
          {/* Waveform — click to open 3D */}
          <div
            className="rounded-xl p-4 cursor-pointer group transition"
            style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
            onClick={() => setShow3D(true)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Customer Probability Wave Function
              </span>
              <span className="text-[10px] group-hover:text-cyan-500 transition" style={{ color: 'var(--text-very-muted)' }}>
                Click to explore in 3D ↗
              </span>
            </div>
            <WaveformViz waveform={state.waveform} gmvWave={state.gmv_wave} pulsing={isRunning} theme={theme} />
          </div>

          <GoalSlider
            value={state.goal_spectrum}
            onApply={setGoal}
            disabled={isRunning}
            strategyMode={state.strategy_mode}
            strategyLocked={state.strategy_locked}
            strategyDaysRemaining={state.strategy_days_remaining}
            onOpenStrategy={() => setShowStrategy(true)}
          />
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-4" style={{ minHeight: '340px' }}>
          <CampaignTable campaigns={state.campaigns} />
          <ReasoningFeed actions={actions} summary={summary} isRunning={isRunning} reasoningText={reasoningText} />
        </div>
      </main>

      {/* 3D overlay */}
      <AnimatePresence>
        {show3D && (
          <WaveformViz3D
            history={waveformHistory}
            onClose={() => setShow3D(false)}
          />
        )}
      </AnimatePresence>

      {/* Strategy modal */}
      <AnimatePresence>
        {showStrategy && state && (
          <StrategyModal
            currentMode={state.strategy_mode}
            locked={state.strategy_locked}
            daysRemaining={state.strategy_days_remaining}
            onConfirm={handleStrategyConfirm}
            onClose={() => setShowStrategy(false)}
          />
        )}
      </AnimatePresence>

      {/* Report modal */}
      <AnimatePresence>
        {showReport && state && (
          <ReportModal
            clientId={activeClientId}
            brandName={state.brand_name}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>

      {/* Onboarding modal */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            onComplete={handleOnboardingComplete}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
