import { createSlice, createSelector, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Trade, TradeFilters, KpiSummary } from '@/types/trade'
import type {
  CumulativePnlPoint, DailyBarPoint, ScatterPoint, RadarDataPoint, SetupStat, TickerStat,
  HourStat, DayOfWeekStat, DurationStat, RollingExpectancyPoint, StreakStats,
} from '@/types/chart'
import {
  computeKpis,
  filterTrades,
  buildCumulativePnlSeries,
  buildDailyBarSeries,
  buildScatterSeries,
  buildRadarData,
  buildSetupStats,
  buildTickerStats,
  buildPnlByHour,
  buildPnlByDayOfWeek,
  buildPnlByDuration,
  buildRollingExpectancy,
  computeStreakStats,
} from '@/lib/calculations'

// ── Async Thunks ───────────────────────────────────────────────────────────

export const fetchTrades = createAsyncThunk<Trade[], void>(
  'trades/fetchAll',
  async () => {
    const response = await fetch('/api/trades')
    if (!response.ok) throw new Error('Failed to fetch trades')
    return response.json() as Promise<Trade[]>
  }
)

export const createTrade = createAsyncThunk<Trade, Omit<Trade, 'id'>>(
  'trades/create',
  async (tradeData) => {
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    })
    if (!response.ok) throw new Error('Failed to create trade')
    return response.json() as Promise<Trade>
  }
)

export const updateTradeAsync = createAsyncThunk<Trade, { id: string; updates: Partial<Trade> }>(
  'trades/update',
  async ({ id, updates }) => {
    const response = await fetch(`/api/trades/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update trade')
    return response.json() as Promise<Trade>
  }
)

export const deleteTradeAsync = createAsyncThunk<string, string>(
  'trades/delete',
  async (id) => {
    const response = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete trade')
    return id
  }
)

// ── State ──────────────────────────────────────────────────────────────────

type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed'

type TradesState = {
  trades: Trade[]
  filters: TradeFilters
  selectedTradeId: string | null
  status: LoadingState
  error: string | null
}

const defaultFilters: TradeFilters = {
  dateRange: { start: null, end: null },
  tickers: [],
  directions: [],
  tags: [],
  minPnl: null,
  maxPnl: null,
  setup: null,
  status: null,
}

const initialState: TradesState = {
  trades: [],
  filters: defaultFilters,
  selectedTradeId: null,
  status: 'idle',
  error: null,
}

// ── Slice ──────────────────────────────────────────────────────────────────

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    setSelectedTrade(state, action: PayloadAction<string | null>) {
      state.selectedTradeId = action.payload
    },
    setDateRange(state, action: PayloadAction<{ start: string | null; end: string | null }>) {
      state.filters.dateRange = action.payload
    },
    toggleTicker(state, action: PayloadAction<string>) {
      const idx = state.filters.tickers.indexOf(action.payload)
      if (idx >= 0) state.filters.tickers.splice(idx, 1)
      else state.filters.tickers.push(action.payload)
    },
    toggleDirection(state, action: PayloadAction<'LONG' | 'SHORT'>) {
      const idx = state.filters.directions.indexOf(action.payload)
      if (idx >= 0) state.filters.directions.splice(idx, 1)
      else state.filters.directions.push(action.payload)
    },
    toggleTag(state, action: PayloadAction<string>) {
      const idx = state.filters.tags.indexOf(action.payload)
      if (idx >= 0) state.filters.tags.splice(idx, 1)
      else state.filters.tags.push(action.payload)
    },
    setSetup(state, action: PayloadAction<string | null>) {
      state.filters.setup = action.payload
    },
    setStatusFilter(state, action: PayloadAction<'OPEN' | 'CLOSED' | null>) {
      state.filters.status = action.payload
    },
    resetFilters(state) {
      state.filters = defaultFilters
    },
  },
  extraReducers(builder) {
    builder
      // fetchTrades
      .addCase(fetchTrades.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.trades = action.payload
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load trades'
      })
      // createTrade
      .addCase(createTrade.fulfilled, (state, action) => {
        state.trades.unshift(action.payload)
      })
      // updateTradeAsync
      .addCase(updateTradeAsync.fulfilled, (state, action) => {
        const idx = state.trades.findIndex((trade) => trade.id === action.payload.id)
        if (idx !== -1) state.trades[idx] = action.payload
      })
      // deleteTradeAsync
      .addCase(deleteTradeAsync.fulfilled, (state, action) => {
        state.trades = state.trades.filter((trade) => trade.id !== action.payload)
      })
  },
})

export const {
  setSelectedTrade,
  setDateRange, toggleTicker, toggleDirection, toggleTag,
  setSetup, setStatusFilter, resetFilters,
} = tradesSlice.actions

export default tradesSlice.reducer

// ── Selectors ──────────────────────────────────────────────────────────────

export const selectAllTrades = (state: { trades: TradesState }) => state.trades.trades
export const selectFilters = (state: { trades: TradesState }) => state.trades.filters
export const selectSelectedTradeId = (state: { trades: TradesState }) => state.trades.selectedTradeId
export const selectTradesStatus = (state: { trades: TradesState }) => state.trades.status
export const selectTradesError = (state: { trades: TradesState }) => state.trades.error

export const selectFilteredTrades = createSelector(
  [selectAllTrades, selectFilters],
  (trades, filters) => filterTrades(trades, filters)
)

export const selectClosedTrades = createSelector(
  [selectFilteredTrades],
  (trades) => trades.filter((trade) => trade.status === 'CLOSED')
)

export const selectOpenTrades = createSelector(
  [selectAllTrades],
  (trades) => trades.filter((trade) => trade.status === 'OPEN')
)

export const selectKpis = createSelector(
  [selectFilteredTrades],
  (trades): KpiSummary => computeKpis(trades)
)

export const selectCumulativePnlSeries = createSelector(
  [selectFilteredTrades],
  (trades): CumulativePnlPoint[] => buildCumulativePnlSeries(trades)
)

export const selectDailyBarSeries = createSelector(
  [selectFilteredTrades],
  (trades): DailyBarPoint[] => buildDailyBarSeries(trades)
)

export const selectScatterSeries = createSelector(
  [selectFilteredTrades],
  (trades): ScatterPoint[] => buildScatterSeries(trades)
)

export const selectRadarData = createSelector(
  [selectKpis],
  (kpis): RadarDataPoint[] => buildRadarData(kpis)
)

export const selectSetupStats = createSelector(
  [selectFilteredTrades],
  (trades): SetupStat[] => buildSetupStats(trades)
)

export const selectTickerStats = createSelector(
  [selectFilteredTrades],
  (trades): TickerStat[] => buildTickerStats(trades)
)

export const selectTradeById = (id: string) =>
  createSelector([selectAllTrades], (trades) => trades.find((trade) => trade.id === id))

// ── Advanced Analytics selectors ─────────────────────────────────────────────

export const selectPnlByHour = createSelector(
  [selectFilteredTrades],
  (trades): HourStat[] => buildPnlByHour(trades)
)

export const selectPnlByDayOfWeek = createSelector(
  [selectFilteredTrades],
  (trades): DayOfWeekStat[] => buildPnlByDayOfWeek(trades)
)

export const selectPnlByDuration = createSelector(
  [selectFilteredTrades],
  (trades): DurationStat[] => buildPnlByDuration(trades)
)

export const selectRollingExpectancy = createSelector(
  [selectFilteredTrades],
  (trades): RollingExpectancyPoint[] => buildRollingExpectancy(trades)
)

export const selectStreakStats = createSelector(
  [selectFilteredTrades],
  (trades): StreakStats => computeStreakStats(trades)
)

// ── Risk selectors ───────────────────────────────────────────────────────────

export const selectRMultipleDistribution = createSelector(
  [selectClosedTrades],
  (trades) => {
    const order = ['≤-3R', '-2R', '-1R', '0R', '+1R', '+2R', '+3R', '+4R+']
    const counts = new Map<string, number>(order.map((k) => [k, 0]))
    trades.forEach((t) => {
      if (t.rMultiple == null) return
      const r = t.rMultiple
      let key: string
      if (r <= -3) key = '≤-3R'
      else if (r >= 4) key = '+4R+'
      else {
        const rounded = Math.round(r)
        key = `${rounded > 0 ? '+' : ''}${rounded}R`
      }
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return order.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }))
  }
)

export const selectExpectancy = createSelector(
  [selectClosedTrades],
  (trades) => (trades.length === 0 ? 0 : trades.reduce((s, t) => s + t.pnl, 0) / trades.length)
)
