import { forwardRef } from 'react'
import { TrendingUp, Trophy, Zap } from 'lucide-react'
import { formatCurrency, formatWinRate } from '@/lib/formatters'

export type PerformanceCardProps = {
  username: string
  period: string
  netPnl: number
  winRate: number
  profitFactor: number
  totalTrades: number
  totalWins: number
  totalLosses: number
  avgWin: number
  avgLoss: number
  zellaScore: number
  bestTrade: { ticker: string; direction: string; pnl: number } | null
  bestSetup: { setup: string; winRate: number } | null
}

export const PerformanceCard = forwardRef<HTMLDivElement, PerformanceCardProps>(
  function PerformanceCard({
    username, period, netPnl, winRate, profitFactor, totalTrades,
    totalWins, totalLosses, avgWin, avgLoss, zellaScore, bestTrade, bestSetup,
  }, ref) {
    const isProfit = netPnl >= 0
    const scoreColor = zellaScore >= 75 ? '#10b981' : zellaScore >= 50 ? '#f59e0b' : '#ef4444'

    return (
      <div
        ref={ref}
        style={{
          width: '480px',
          backgroundColor: '#0f0f14',
          border: '1px solid #2d2d3a',
          borderRadius: '20px',
          padding: '28px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          color: '#f1f5f9',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px', height: '30px', backgroundColor: '#8b5cf6',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>TradeJournal</span>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>@{username}</span>
        </div>

        {/* ── Period ── */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0, marginBottom: '2px' }}>Performance</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>{period}</p>
        </div>

        {/* ── Hero: Net P&L ── */}
        <div style={{
          backgroundColor: isProfit ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isProfit ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, marginBottom: '4px' }}>Net P&L</p>
            <p style={{ fontSize: '36px', fontWeight: 800, color: isProfit ? '#10b981' : '#ef4444', margin: 0, lineHeight: 1 }}>
              {formatCurrency(netPnl)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, marginBottom: '4px' }}>{totalTrades} Trades</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>
              {totalWins}W / {totalLosses}L
            </p>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Win Rate', value: formatWinRate(winRate), color: winRate >= 50 ? '#10b981' : '#ef4444' },
            { label: 'Profit Factor', value: profitFactor >= 0.01 ? profitFactor.toFixed(2) : '—', color: profitFactor >= 1.5 ? '#10b981' : profitFactor >= 1 ? '#f59e0b' : '#ef4444' },
            { label: 'Zella Score', value: `${zellaScore}`, color: scoreColor },
            { label: 'Avg Win', value: formatCurrency(avgWin, 0), color: '#10b981' },
            { label: 'Avg Loss', value: formatCurrency(avgLoss, 0), color: '#ef4444' },
            { label: 'Avg R:R', value: avgLoss !== 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : '—', color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              backgroundColor: '#16161e',
              border: '1px solid #2d2d3a',
              borderRadius: '12px',
              padding: '12px',
            }}>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0, marginBottom: '3px' }}>{label}</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Highlights ── */}
        {(bestTrade || bestSetup) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {bestTrade && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={13} color="#10b981" />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Best Trade</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>
                  {bestTrade.ticker} {bestTrade.direction} · {formatCurrency(bestTrade.pnl)}
                </span>
              </div>
            )}
            {bestSetup && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '10px', padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color="#8b5cf6" />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Best Setup</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#8b5cf6' }}>
                  {bestSetup.setup} · {bestSetup.winRate.toFixed(0)}% win rate
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Zella Score Bar ── */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Zella Score</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: scoreColor }}>{zellaScore} / 100</span>
          </div>
          <div style={{ height: '5px', backgroundColor: '#2d2d3a', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${zellaScore}%`, backgroundColor: scoreColor, borderRadius: '999px' }} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid #1e1e2a', paddingTop: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#2d2d3a', margin: 0, letterSpacing: '0.05em' }}>
            MADE WITH TRADEJOURNAL
          </p>
        </div>
      </div>
    )
  }
)
