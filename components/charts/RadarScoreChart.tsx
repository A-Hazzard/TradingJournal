'use client'

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import type { RadarDataPoint } from '@/types/chart'

interface Props { data: RadarDataPoint[]; score: number; height?: number }

export function RadarScoreChart({ data, score, height = 260 }: Props) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#2d2d3a" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 3 }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold text-accent">{score}</div>
          <div className="text-xs text-text-secondary font-medium mt-0.5">Zella Score</div>
        </div>
      </div>
    </div>
  )
}
