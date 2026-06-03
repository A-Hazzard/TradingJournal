# P&L Display & Formatting Guidelines

This rule defines how financial numbers, P&L calculations, and trading metrics should be formatted and colored across the TradeJournal platform.

## Standard Formatting Functions
All formatting of numeric trading data must use functions exported from `lib/formatters.ts`:
- **Currency**: `formatCurrency(value: number, decimals?: number)` — Formats values as USD `$X.XX` or `$X` depending on parameters.
- **Percentages**: `formatPercent(value: number)` — Formats percentage returns as `+X.XX%` or `-X.XX%`.
- **R-Multiples**: `formatRMultiple(value: number | null)` — Formats risk multiples as `+X.XXR` or `-X.XXR`.

## Color Classes
Never hardcode color values (e.g. `#10b981` or `text-green-500`) directly on elements based on positive/negative metrics. Always use standard Tailwind helper classes:
- **P&L Color Class**: `getPnlColorClass(pnl: number)` 
  - Profit (`pnl > 0`): `text-profit`
  - Loss (`pnl < 0`): `text-loss`
  - Flat (`pnl === 0`): `text-text-muted`
- **P&L Background Class**: `getPnlBgClass(pnl: number)`
  - Profit (`pnl > 0`): `bg-profit/10 text-profit`
  - Loss (`pnl < 0`): `bg-loss/10 text-loss`
  - Flat (`pnl === 0`): `bg-surface-alt text-text-muted`

## Example Usage
```tsx
import { formatCurrency, getPnlColorClass } from '@/lib/formatters'

export function TradeRow({ trade }) {
  return (
    <tr>
      <td>{trade.ticker}</td>
      <td className={getPnlColorClass(trade.pnl)}>
        {formatCurrency(trade.pnl)}
      </td>
    </tr>
  )
}
```
