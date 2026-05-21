'use client'

import { useRef, useMemo, useEffect, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import type { WaveformData } from '../types'

export interface WaveformSnapshot {
  waveform: WaveformData
  day: number
  hour: number
  pacing_index: number
  actions_count: number
}

const INTENT_LABELS: [number, string][] = [
  [0,    'Unaware'],
  [0.25, 'Low Intent'],
  [0.5,  'Consideration'],
  [0.75, 'High Intent'],
  [1.0,  'Loyal'],
]

function toWorld(xNorm: number, yNorm: number, snapIdx: number, totalSnaps: number): [number, number, number] {
  const x = (xNorm - 0.5) * 14
  const y = yNorm * 5
  const z = (snapIdx / Math.max(totalSnaps - 1, 1)) * 12 - 6
  return [x, y, z]
}

function QuantumSurface({ history }: { history: WaveformSnapshot[] }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const snaps = history.length < 3
      ? Array.from({ length: 6 }, (_, i) => history[i % history.length])
      : history

    const D = snaps.length
    const W = snaps[0]?.waveform?.combined?.length ?? 0
    if (W < 2 || D < 2) return null

    const positions = new Float32Array(W * D * 3)
    const colors    = new Float32Array(W * D * 3)
    const indices: number[] = []

    for (let d = 0; d < D; d++) {
      const combined    = snaps[d]?.waveform?.combined    ?? []
      const individual  = snaps[d]?.waveform?.individual  ?? []

      for (let w = 0; w < W; w++) {
        const xNorm = w / (W - 1)
        const yVal  = combined[w] ?? 0

        let totalWeight = 0, weightedInc = 0
        individual.forEach((curve) => {
          const contrib = (curve.points?.[w] ?? 0) * curve.scale
          totalWeight   += contrib
          weightedInc   += contrib * (curve.opacity ?? 0.5)
        })
        const inc = totalWeight > 0 ? weightedInc / totalWeight : 0.5

        const [x, y, z] = toWorld(xNorm, yVal, d, D)
        const i3 = (d * W + w) * 3
        positions[i3]     = x
        positions[i3 + 1] = y
        positions[i3 + 2] = z

        // pink (NTB/incremental) → purple → cyan (ROAS/efficient)
        const t = xNorm
        const brightness  = 0.25 + inc * 0.75
        const heightMod   = 0.4 + yVal * 0.6
        const r = (t < 0.5 ? 0.93 - t * 0.5 : 0.68 - (t - 0.5) * 1.3) * brightness * heightMod
        const g = (t * 0.7 + inc * 0.15) * brightness * heightMod
        const b = (t < 0.5 ? 0.55 + t * 0.45 : 1.0)                   * brightness * heightMod
        colors[i3]     = Math.max(0, Math.min(1, r))
        colors[i3 + 1] = Math.max(0, Math.min(1, g))
        colors[i3 + 2] = Math.max(0, Math.min(1, b))
      }
    }

    for (let d = 0; d < D - 1; d++) {
      for (let w = 0; w < W - 1; w++) {
        const a = d * W + w,      b = d * W + (w + 1)
        const c = (d+1) * W + w,  e = (d+1) * W + (w + 1)
        indices.push(a, b, c, b, e, c)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [history])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.05
    }
  })

  if (!geometry) return null

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.88}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  )
}

function ActionMarkers({ history }: { history: WaveformSnapshot[] }) {
  const snaps = history.length < 3
    ? Array.from({ length: 6 }, (_, i) => history[i % history.length])
    : history

  return (
    <>
      {snaps.map((snap, d) => {
        if (!snap.actions_count) return null
        const [x, , z] = toWorld(0.5, 0, d, snaps.length)
        return (
          <group key={`am-${d}`} position={[x, 6.2, z]}>
            <mesh>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color="#00f5ff" emissive="#00f5ff" emissiveIntensity={1.5} />
            </mesh>
            <Html position={[0.4, 0, 0]} style={{ pointerEvents: 'none' }}>
              <div style={{ color: '#00f5ff', fontSize: 11, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                {snap.actions_count} optimizations
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function AxisLabels({ history }: { history: WaveformSnapshot[] }) {
  const snaps = history.length < 3
    ? Array.from({ length: 6 }, (_, i) => history[i % history.length])
    : history

  return (
    <>
      {INTENT_LABELS.map(([xv, label]) => (
        <Html key={label} position={[(xv - 0.5) * 14, -0.8, 7.2]} style={{ pointerEvents: 'none' }}>
          <div style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap', transform: 'translateX(-50%)' }}>
            {label}
          </div>
        </Html>
      ))}
      {snaps.filter((_, i) => i % Math.max(1, Math.floor(snaps.length / 5)) === 0).map((snap, i) => {
        const origIdx = i * Math.max(1, Math.floor(snaps.length / 5))
        const [,, z] = toWorld(0, 0, origIdx, snaps.length)
        return (
          <Html key={`tl-${i}`} position={[-8, 0, z]} style={{ pointerEvents: 'none' }}>
            <div style={{ color: '#1e293b', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {`D${snap.day} ${String(snap.hour).padStart(2,'0')}:00`}
            </div>
          </Html>
        )
      })}
    </>
  )
}

function Scene({ history }: { history: WaveformSnapshot[] }) {
  return (
    <>
      <color attach="background" args={['#020817']} />
      <fog attach="fog" args={['#020817', 18, 38]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 10, 0]}   intensity={3}   color="#00f5ff" />
      <pointLight position={[-7, 3,  6]}  intensity={1.5} color="#ec4899" />
      <pointLight position={[ 7, 3, -6]}  intensity={1.5} color="#8b5cf6" />
      <QuantumSurface history={history} />
      <AxisLabels     history={history} />
      <ActionMarkers  history={history} />
      <gridHelper args={[22, 22, '#0c1120', '#0c1120']} position={[0, -0.05, 0]} />
      <OrbitControls
        enablePan enableZoom enableRotate
        maxPolarAngle={Math.PI * 0.82}
        minDistance={4} maxDistance={28}
        target={[0, 2, 0]}
      />
    </>
  )
}

// Error boundary so a crash doesn't kill the whole page
class R3FErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full text-slate-600 text-sm text-center p-8">
          <div>
            <div className="text-2xl mb-2">⚠</div>
            <div>3D renderer error</div>
            <div className="text-xs mt-1 text-slate-700">{this.state.error}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

interface Props {
  history: WaveformSnapshot[]
  onClose: () => void
}

export default function WaveformViz3D({ history, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const displayHistory = history.length === 0
    ? [{ waveform: { xs: [], individual: [], combined: [] } as WaveformData, day: 17, hour: 14, pacing_index: 0.91, actions_count: 0 }]
    : history

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ background: '#020817' }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[#1e293b] bg-[#020817]/90 backdrop-blur-sm">
        <div>
          <div className="text-sm font-bold text-white">⟨ψ⟩ Quantum Wave Function — 3D Explorer</div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            Drag to rotate · Scroll to zoom · {displayHistory.length} snapshot{displayHistory.length !== 1 ? 's' : ''} · Z axis = time
          </div>
        </div>
        <div className="flex items-center gap-5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded" style={{ background: 'linear-gradient(to right,#ec4899,#8b5cf6)' }} />
            High Incrementality (NTB)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded" style={{ background: 'linear-gradient(to right,#8b5cf6,#00f5ff)' }} />
            High Efficiency (ROAS)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #00f5ff' }} />
            Optimizations
          </span>
          <button
            onClick={onClose}
            className="ml-2 px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition text-xs"
          >
            ✕ ESC
          </button>
        </div>
      </div>

      <R3FErrorBoundary>
        <Canvas
          camera={{ position: [2, 10, 18], fov: 52 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true }}
        >
          <Scene history={displayHistory} />
        </Canvas>
      </R3FErrorBoundary>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="text-[10px] text-slate-800 tracking-widest uppercase">
          X: intent · Y: spend · Z: time · color: incrementality ↔ efficiency
        </div>
      </div>
    </motion.div>
  )
}
