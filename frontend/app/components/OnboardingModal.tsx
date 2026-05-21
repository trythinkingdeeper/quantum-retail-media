'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ClientInfo } from '../types'
import { WS_BASE } from '../config'

interface Message {
  role: 'assistant' | 'user'
  text: string
}

interface Props {
  onComplete: (client: ClientInfo) => void
  onClose: () => void
}

export default function OnboardingModal({ onComplete, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [inputText, setInputText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [statusText, setStatusText] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = useCallback((data: object) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/onboard`)
    wsRef.current = ws
    setIsStreaming(true)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'onboard_chunk') {
        setStreamingText((prev) => prev + msg.text)
      } else if (msg.type === 'onboard_ready') {
        setStreamingText((prev) => {
          if (prev) {
            setMessages((m) => [...m, { role: 'assistant', text: prev }])
          }
          return ''
        })
        setIsStreaming(false)
        setTimeout(() => inputRef.current?.focus(), 50)
      } else if (msg.type === 'onboard_complete') {
        setIsComplete(true)
        setStatusText(`Setting up ${msg.name}…`)
        setTimeout(() => {
          onComplete({ id: msg.client_id, name: msg.name, is_demo: false })
        }, 1200)
      } else if (msg.type === 'onboard_error') {
        setMessages((m) => [...m, { role: 'assistant', text: `Something went wrong: ${msg.message}` }])
        setIsStreaming(false)
      }
    }

    ws.onerror = () => {
      setMessages((m) => [...m, { role: 'assistant', text: 'Connection error. Make sure the backend is running.' }])
      setIsStreaming(false)
    }

    return () => ws.close()
  }, [onComplete])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || isStreaming || isComplete) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInputText('')
    setIsStreaming(true)
    send({ type: 'onboard_message', text })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: '560px',
          maxHeight: '80vh',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
        }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Quantum Retail Media
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New Client Setup
            </div>
          </div>
          {!isComplete && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded transition"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: '300px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="rounded-xl px-4 py-2.5 text-sm max-w-[85%]"
                style={{
                  background: msg.role === 'user'
                    ? 'rgba(0,245,255,0.10)'
                    : 'var(--panel-alt, rgba(255,255,255,0.04))',
                  border: msg.role === 'user'
                    ? '1px solid rgba(0,245,255,0.25)'
                    : '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Streaming bubble */}
          {streamingText && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-2.5 text-sm max-w-[85%]"
                style={{
                  background: 'var(--panel-alt, rgba(255,255,255,0.04))',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {streamingText}
                <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: '#00f5ff', borderRadius: '1px' }} />
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--panel-alt, rgba(255,255,255,0.04))', border: '1px solid var(--border)' }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        background: 'var(--text-muted)',
                        animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Completion state */}
          {isComplete && (
            <div className="flex justify-center py-4">
              <div className="text-sm text-center space-y-1" style={{ color: '#22c55e' }}>
                <div className="text-xl">✓</div>
                <div>{statusText}</div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {!isComplete && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={isStreaming ? 'Waiting…' : 'Type your answer…'}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition"
                style={{
                  background: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  opacity: isStreaming ? 0.5 : 1,
                }}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !inputText.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition"
                style={{
                  background: isStreaming || !inputText.trim() ? 'transparent' : 'rgba(0,245,255,0.1)',
                  border: '1px solid',
                  borderColor: isStreaming || !inputText.trim() ? 'var(--border)' : '#00f5ff',
                  color: isStreaming || !inputText.trim() ? 'var(--text-muted)' : '#00f5ff',
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </motion.div>
  )
}
