export const ALL_TAGS = ['breakout', 'pullback', 'momentum', 'reversal', 'gap-fill', 'earnings', 'news']
export const ALL_SETUPS = ['VWAP Reclaim', 'Bull Flag', 'Bear Flag', 'ORB', 'Support Bounce', 'Resistance Break', 'Momentum']

export const ASSET_CLASSES = ['forex', 'indices', 'stocks', 'crypto', 'commodities', 'futures'] as const

export const COMMON_PAIRS: Record<string, string[]> = {
  forex: ['EURUSD', 'XAUUSD', 'NAS100', 'US30', 'GER30', 'SPX500', 'XAGUSD'],
  futures: ['MGC', 'MNQ', 'MYM'],
  indices: ['SPX500', 'NAS100', 'US30', 'GER40', 'UK100', 'JP225', 'AUS200'],
  stocks: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'COIN', 'PLTR', 'SPY', 'QQQ'],
  crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'BNB/USD', 'ADA/USD'],
  commodities: ['XAUUSD', 'XAGUSD', 'XTIUSD', 'XNGUSD'],
}

export const ALL_TICKERS = Object.values(COMMON_PAIRS).flat()
