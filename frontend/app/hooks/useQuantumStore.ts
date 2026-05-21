'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppState, WsMessage, CycleSummary } from '../types'
import { API_BASE, WS_BASE } from '../config'
import type { ActionEntry } from '../components/ReasoningFeed'
import type { WaveformSnapshot } from '../components/WaveformViz3D'


export function useQuantumStore(clientId: string) {
  const [state, setState] = useState<AppState | null>(null)
  const [actions, setActions] = useState<ActionEntry[]>([])
  const [summary, setSummary] = useState<CycleSummary | null>(null)
  const [reasoningText, setReasoningText] = useState('')
  const [waveformHistory, setWaveformHistory] = useState<WaveformSnapshot[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [connected, setConnected] = useState(false)
  const lastActionsCount = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const clientIdRef = useRef(clientId)

  useEffect(() => { clientIdRef.current = clientId }, [clientId])

  const connect = useCallback(() => {
    const id = clientIdRef.current
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}/ws/${id}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      clearTimeout(reconnectRef.current)
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as Record<string, unknown>

      if (msg.type === 'state_update') {
        const newState = msg.state as AppState
        setState(newState)
        setIsRunning(false)
        setWaveformHistory((prev) => {
          const snap: WaveformSnapshot = {
            waveform: newState.waveform,
            day: newState.simulated_day,
            hour: newState.simulated_hour,
            pacing_index: newState.pacing.pacing_index,
            actions_count: lastActionsCount.current,
          }
          lastActionsCount.current = 0
          return [...prev, snap].slice(-48)
        })
      } else if (msg.type === 'reasoning_chunk') {
        setReasoningText((prev) => prev + (msg.text as string))
      } else if (msg.type === 'cycle_start') {
        setActions([])
        setSummary(null)
        setReasoningText('')
        setIsRunning(true)
      } else if (msg.type === 'action') {
        setActions((prev) => [...prev, {
          tool: msg.tool as string,
          input: msg.input as Record<string, unknown>,
          result: msg.result as Record<string, unknown>,
        }])
      } else if (msg.type === 'cycle_complete') {
        const s = msg as unknown as CycleSummary
        setSummary(s)
        lastActionsCount.current = s.actions_count
        setIsRunning(false)
      } else if (msg.type === 'error') {
        setActions((prev) => [...prev, { tool: 'error', input: {}, result: { message: msg.message } }])
        setIsRunning(false)
      } else if (msg.type === 'reset') {
        setActions([])
        setSummary(null)
        setReasoningText('')
        setWaveformHistory([])
        setIsRunning(false)
      }
    }
  }, [])

  // Reconnect whenever clientId changes
  useEffect(() => {
    setState(null)
    setActions([])
    setSummary(null)
    setReasoningText('')
    setWaveformHistory([])
    setIsRunning(false)
    clearTimeout(reconnectRef.current)
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [clientId, connect])

  useEffect(() => {
    const id = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping')
    }, 20000)
    return () => clearInterval(id)
  }, [])

  const triggerCycle = useCallback(async () => {
    setActions([])
    setSummary(null)
    setIsRunning(true)
    await fetch(`${API_BASE}/api/${clientIdRef.current}/trigger`, { method: 'POST' })
  }, [])

  const setGoal = useCallback(async (text: string, slider: number) => {
    setActions([])
    setSummary(null)
    setIsRunning(true)
    await fetch(`${API_BASE}/api/${clientIdRef.current}/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, slider }),
    })
  }, [])

  const advanceTime = useCallback(async () => {
    await fetch(`${API_BASE}/api/${clientIdRef.current}/advance`, { method: 'POST' })
  }, [])

  const advanceDay = useCallback(async () => {
    await fetch(`${API_BASE}/api/${clientIdRef.current}/advance-day`, { method: 'POST' })
  }, [])

  const reset = useCallback(async () => {
    await fetch(`${API_BASE}/api/${clientIdRef.current}/reset`, { method: 'POST' })
  }, [])

  return { state, actions, summary, reasoningText, waveformHistory, isRunning, connected, triggerCycle, setGoal, advanceTime, advanceDay, reset }
}
