'use client'

import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { OrganicKeyword } from '../../types'

const QUADRANTS = [
  { x: 0,   y: 50, w: 0.5, h: 0.5, color: 'rgba(34,197,94,0.05)',   label: 'Protected',       labelX: 0.25, labelY: 25 },
  { x: 0,   y: 0,  w: 0.5, h: 0.5, color: 'rgba(234,179,8,0.05)',   label: 'Organic Strength', labelX: 0.25, labelY: 75 },
  { x: 0.5, y: 50, w: 0.5, h: 0.5, color: 'rgba(139,92,246,0.05)',  label: 'AI Exposed',       labelX: 0.75, labelY: 25 },
  { x: 0.5, y: 0,  w: 0.5, h: 0.5, color: 'rgba(239,68,68,0.05)',   label: 'At Risk',          labelX: 0.75, labelY: 75 },
]

interface Tooltip {
  x: number; y: number
  keyword: string; ovs: number; ai_exposure: number; position: number; volume: number
}

interface Props {
  keywords: OrganicKeyword[]
  selected: string | null
  onSelect: (kw: string | null) => void
}

export default function OvsScatter({ keywords, selected, onSelect }: Props) {
  const svgRef   = useRef<SVGSVGElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  useEffect(() => {
    if (!svgRef.current || !keywords.length) return

    const W = svgRef.current.clientWidth || 440
    const H = 300
    const m = { top: 16, right: 16, bottom: 40, left: 44 }
    const iW = W - m.left - m.right
    const iH = H - m.top - m.bottom

    const svg = d3.select(svgRef.current)
    svg.attr('height', H)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, iW])
    const yScale = d3.scaleLinear().domain([0, 100]).range([iH, 0])
    const rScale = d3.scaleSqrt().domain([0, d3.max(keywords, k => k.volume) ?? 1]).range([3, 16])
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 50, 100, 150, 200])
      .range(['#ef4444', '#f97316', '#eab308', '#00f5ff', '#22c55e'])

    // Quadrant backgrounds
    QUADRANTS.forEach(q => {
      g.append('rect')
        .attr('x', xScale(q.x))
        .attr('y', yScale(q.y + (q.h * 100)))
        .attr('width', iW * q.w)
        .attr('height', iH * q.h)
        .attr('fill', q.color)

      g.append('text')
        .attr('x', xScale(q.labelX))
        .attr('y', yScale(q.labelY))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'rgba(148,163,184,0.4)')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('letter-spacing', '0.08em')
        .text(q.label.toUpperCase())
    })

    // Grid lines
    const xAxis = d3.axisBottom(xScale).ticks(5)
      .tickSize(-iH).tickFormat(() => '')
    const yAxis = d3.axisLeft(yScale).ticks(5)
      .tickSize(-iW).tickFormat(() => '')

    g.append('g').attr('transform', `translate(0,${iH})`).call(xAxis)
      .selectAll('line').attr('stroke', 'rgba(30,41,59,0.8)')
    g.append('g').call(yAxis)
      .selectAll('line').attr('stroke', 'rgba(30,41,59,0.8)')

    g.selectAll('.domain').attr('stroke', 'rgba(30,41,59,0.6)')

    // Axis labels
    g.append('text')
      .attr('x', iW / 2).attr('y', iH + 32)
      .attr('text-anchor', 'middle').attr('fill', '#475569')
      .attr('font-size', '9px').attr('font-family', 'monospace').attr('letter-spacing', '0.08em')
      .text('AI EXPOSURE →')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -iH / 2).attr('y', -32)
      .attr('text-anchor', 'middle').attr('fill', '#475569')
      .attr('font-size', '9px').attr('font-family', 'monospace').attr('letter-spacing', '0.08em')
      .text('POSITION STRENGTH →')

    // Tick labels
    g.append('g').attr('transform', `translate(0,${iH})`).call(
      d3.axisBottom(xScale).ticks(5).tickFormat(d => `${Math.round(Number(d) * 100)}%`)
    ).selectAll('text').attr('fill', '#475569').attr('font-size', '8px').attr('font-family', 'monospace')
    g.append('g').call(
      d3.axisLeft(yScale).ticks(5)
    ).selectAll('text').attr('fill', '#475569').attr('font-size', '8px').attr('font-family', 'monospace')
    g.selectAll('.domain').remove()

    // Dots
    const dots = g.selectAll('circle')
      .data(keywords)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.ai_exposure))
      .attr('cy', d => yScale(d.position_strength))
      .attr('r',  d => rScale(d.volume))
      .attr('fill', d => colorScale(d.ovs))
      .attr('stroke', d => selected === d.keyword ? '#ffffff' : colorScale(d.ovs))
      .attr('stroke-width', d => selected === d.keyword ? 2.5 : 0.8)
      .attr('opacity', d => selected === null || selected === d.keyword ? 0.85 : 0.3)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const rect = svgRef.current!.getBoundingClientRect()
        const wrap = wrapRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - wrap.left + 8,
          y: event.clientY - wrap.top - 8,
          keyword: d.keyword,
          ovs: d.ovs,
          ai_exposure: d.ai_exposure,
          position: d.position,
          volume: d.volume,
        })
      })
      .on('mouseout', () => setTooltip(null))
      .on('click', (_, d) => {
        onSelect(selected === d.keyword ? null : d.keyword)
      })

    // Bring selected dot to front
    if (selected) {
      dots.filter(d => d.keyword === selected).raise()
    }

    return () => { svg.selectAll('*').remove() }
  }, [keywords, selected, onSelect])

  return (
    <div
      ref={wrapRef}
      className="relative rounded-xl overflow-hidden"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          OVS Scatter
        </span>
        <div className="flex gap-2 text-[9px]" style={{ color: 'var(--text-muted)' }}>
          <span>size = volume</span>
          <span>·</span>
          <span>color = OVS</span>
        </div>
      </div>
      <div className="px-2">
        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      </div>

      {tooltip && (
        <div
          className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs space-y-0.5"
          style={{
            left: tooltip.x, top: tooltip.y,
            background: 'var(--panel)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="font-medium">{tooltip.keyword}</div>
          <div style={{ color: 'var(--text-muted)' }}>
            OVS <span style={{ color: 'var(--text-primary)' }}>{tooltip.ovs.toFixed(1)}</span>
            {' · '}Pos <span style={{ color: 'var(--text-primary)' }}>{tooltip.position || '–'}</span>
            {' · '}{(tooltip.volume / 1000).toFixed(0)}K vol
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            AI exposure <span style={{ color: '#00f5ff' }}>{Math.round(tooltip.ai_exposure * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
