// src/components/analytics-view.tsx
'use client'

import { useEffect, useState } from 'react'
import { getBotHistory } from '@/app/actions'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Activity, Zap, Flame } from 'lucide-react'

export function AnalyticsView({ botName }: { botName: string }) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    if (botName) {
      getBotHistory(botName).then((res) => {
        if (res.success && Array.isArray(res.history)) {
          const formatted = res.history
            .map((entry: any) => {
              const date = new Date(entry.timestamp)
              const timeStr = !isNaN(date.getTime())
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : entry.timestamp.slice(-8)

              return {
                time: timeStr,

                // AFFECT
                valence: entry.valence,
                arousal: entry.arousal,

                // DRIVES
                libido: entry.libido || 0,
                dominance: entry.dominance || 0,
                safety: entry.safety || 0,
                curiosity: entry.curiosity || 0,
                affiliation: entry.affiliation || 0,

                // VITALS (0-1)
                energy: (entry.energy || 0) / 100,
                attention: (entry.attention || 0) / 100,
              }
            })
            .reverse()

          setData(formatted)
        }
      })
    }
  }, [botName])

  if (data.length === 0) {
    return (
      <div className="glass-tile mt-4 p-8 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
          Analytics
        </div>
        <div className="mt-2 text-xs text-slate-400 font-mono">
          No telemetry data found. System awaiting input...
        </div>
      </div>
    )
  }

  const chartHeight = 220

  const commonYAxis = {
    stroke: '#64748b',
    fontSize: 10,
    tick: { fill: '#94a3b8', fontSize: 10 },
    tickLine: false,
    axisLine: false,
    domain: [0, 1],
    width: 28,
  }

  const affectYAxis = {
    ...commonYAxis,
    domain: [-1, 1],
    ticks: [-1, 0, 1],
  }

  const tooltipStyle = {
    backgroundColor: 'rgba(7, 11, 18, 0.94)',
    border: '1px solid rgba(34, 211, 238, 0.18)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#e2e8f0',
    boxShadow:
      '0 0 0 1px rgba(34,211,238,.08), 0 10px 30px rgba(0,0,0,.35), 0 0 20px rgba(34,211,238,.06)',
  }

  const legendStyle = {
    fontSize: '10px',
    paddingTop: '8px',
    color: '#94a3b8',
  }

  return (
    <div className="w-full space-y-4 mt-4 font-mono">
      {/* 1. DRIVES CHART */}
      <div className="glass-tile glass-tile-hover p-4 relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <Flame className="h-3 w-3 text-crimson-400" />
            Biological Drives Matrix
          </div>
          <div className="rounded-full border border-crimson-400/20 bg-crimson-500/10 px-2.5 py-1 text-[10px] text-crimson-300">
            LIVE
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-black/20 p-2">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="time" hide />
                <YAxis {...commonYAxis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={legendStyle} />

                <Line type="monotone" dataKey="libido" stroke="#fb7185" strokeWidth={2} dot={false} name="Libido" />
                <Line type="monotone" dataKey="safety" stroke="#10b981" strokeWidth={2} dot={false} name="Safety" />
                <Line type="monotone" dataKey="curiosity" stroke="#fbbf24" strokeWidth={2} dot={false} name="Curiosity" />
                <Line type="monotone" dataKey="affiliation" stroke="#22d3ee" strokeWidth={2} dot={false} name="Affil." />
                <Line type="monotone" dataKey="dominance" stroke="#a78bfa" strokeWidth={2} dot={false} name="Dominance" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. AFFECT CHART */}
        <div className="glass-tile glass-tile-hover p-4 relative">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <Activity className="h-3 w-3 text-cyan-400" />
            Emotional State
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-2">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="time" hide />
                  <YAxis {...affectYAxis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />

                  <Line type="monotone" dataKey="valence" stroke="#34d399" strokeWidth={2} dot={false} name="Mood" />
                  <Line type="monotone" dataKey="arousal" stroke="#f87171" strokeWidth={2} dot={false} name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 3. VITALS CHART */}
        <div className="glass-tile glass-tile-hover p-4 relative">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <Zap className="h-3 w-3 text-amber-400" />
            Cognitive Resources
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-2">
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 10, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tick={{ fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis {...commonYAxis} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />

                  <Line type="monotone" dataKey="energy" stroke="#fbbf24" strokeWidth={2} dot={false} name="Energy" />
                  <Line type="step" dataKey="attention" stroke="#22d3ee" strokeWidth={2} dot={false} name="Attention" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
