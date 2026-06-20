# DEX Funding Rate Aggregator

Aggregate perpetual swap funding rates across **4 DEX platforms** (Hyperliquid, Aster, Lighter, Pacifica) with **Binance and Bybit as CEX reference** — in a single call. Spot DEX-vs-CEX funding spreads, cross-venue carry-trade signals, and extreme funding outliers. No API key required.

## What It Does

Pulls live funding rates for perpetual swaps from 4 decentralized exchanges and 2 major CEX references, normalizes them to annualized percentages (APR), and surfaces cross-venue arbitrage opportunities. Use it to:

- **Find DEX-CEX funding spreads** — DEX perps often carry higher funding than CEX due to thinner liquidity, creating carry-trade opportunities
- **Detect cross-DEX spreads** — long the cheapest-funded DEX, short the most expensive one, collect the spread
- **Spot extreme funding** — symbols with high |APR| signal over-leveraged positioning
- **Get Telegram alerts** when any symbol's |funding APR| crosses your threshold

## Why DEX Funding Rates Matter

DEX perpetuals (Hyperliquid, Aster, Lighter, Pacifica) often deviate significantly from CEX funding rates due to:

- **Thinner liquidity** → larger funding swings
- **Isolated user bases** → different long/short skew per chain
- **Different settlement intervals** — 1h (Hyperliquid, Pacifica) vs 8h (Aster, Lighter, Binance, Bybit)

Real example from a live run:

| Symbol | Best Long | Best Short | Spread APR |
|--------|-----------|------------|------------|
| SOL | Binance (−7.1%) | Hyperliquid (+11.0%) | **18.0%** |
| ETH | Pacifica (−6.4%) | Hyperliquid (+11.0%) | **17.4%** |
| BTC | Pacifica (−3.8%) | Aster (+6.2%) | **10.0%** |

## Platforms

| Platform | Type | Chain | Funding Interval |
|----------|------|-------|-----------------|
| Hyperliquid | DEX | Own L1 | 1h |
| Aster | DEX | Ethereum ecosystem | 8h |
| Lighter | DEX | Ethereum ZK L2 | 8h |
| Pacifica | DEX | Solana | 1h |
| Binance | CEX reference | — | 8h |
| Bybit | CEX reference | — | 8h |

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `symbols` | string[] | `["BTC","ETH","SOL"]` | Base symbols to track |
| `includeHyperliquid` | boolean | true | Include Hyperliquid |
| `includeAster` | boolean | true | Include Aster |
| `includeLighter` | boolean | true | Include Lighter |
| `includePacifica` | boolean | true | Include Pacifica |
| `includeBinance` | boolean | true | Include Binance (CEX ref) |
| `includeBybit` | boolean | true | Include Bybit (CEX ref) |
| `minAbsFundingApr` | number | 0 | Filter: only return symbols where \|APR\| exceeds this |
| `minVenueSpreadApr` | number | 0 | Filter: only return symbols where spread exceeds this |
| `sortBy` | string | `spread_desc` | `spread_desc` / `abs_funding_desc` / `symbol_asc` |
| `alertAbsApr` | number | 0 | Telegram alert threshold (0 = disabled) |
| `telegramBotToken` | string (secret) | — | Telegram bot token |
| `telegramChatId` | string | — | Telegram chat ID |

### Example: Hunt for cross-venue spread opportunities

```json
{
  "symbols": ["BTC", "ETH", "SOL"],
  "minVenueSpreadApr": 5,
  "sortBy": "spread_desc"
}
```

### Example: Daily Telegram alert when any DEX funding exceeds 20% APR

```json
{
  "symbols": ["BTC", "ETH", "SOL"],
  "alertAbsApr": 20,
  "telegramBotToken": "<bot_token>",
  "telegramChatId": "<chat_id>"
}
```

## Output

Each record represents one symbol across all enabled venues:

```json
{
  "symbol": "SOL",
  "hyperliquid_funding_apr_pct": 10.95,
  "aster_funding_apr_pct": 0.0,
  "lighter_funding_apr_pct": 0.0,
  "pacifica_funding_apr_pct": -2.628,
  "binance_funding_apr_pct": -7.079,
  "bybit_funding_apr_pct": 6.718,
  "max_abs_funding_apr_pct": 10.95,
  "venue_spread_apr_pct": 18.03,
  "dex_cex_spread_apr_pct": 18.03,
  "best_long_venue": "binance",
  "best_short_venue": "hyperliquid",
  "exchanges_present": 6,
  "next_funding_time": "2026-06-20T16:00:00.000Z",
  "timestamp": "2026-06-20T10:53:26.531Z"
}
```

| Field | Description |
|-------|-------------|
| `*_funding_apr_pct` | Funding rate annualized to APR% (rate × periods_per_year × 100) |
| `max_abs_funding_apr_pct` | Largest \|APR\| across all present venues |
| `venue_spread_apr_pct` | Max APR venue minus min APR venue — total carry-trade spread |
| `dex_cex_spread_apr_pct` | Max DEX APR minus min CEX APR — DEX premium signal |
| `best_long_venue` | Venue with the lowest rate (cheapest to hold long / best to receive funding short) |
| `best_short_venue` | Venue with the highest rate (best to hold short and receive funding) |
| `exchanges_present` | Number of venues that returned data for this symbol (1–6) |

## Pricing

Pay-Per-Event (PPE): **$0.002 per symbol returned**

- Default 3 symbols (BTC, ETH, SOL): **$0.006 per run**

## Data Sources

All endpoints are public — no API keys required:

- **Hyperliquid**: `POST https://api.hyperliquid.xyz/info` (`metaAndAssetCtxs`)
- **Aster**: `GET https://fapi.asterdex.com/fapi/v1/premiumIndex`
- **Lighter**: `GET https://mainnet.zklighter.elliot.ai/api/v1/funding-rates`
- **Pacifica**: `GET https://api.pacifica.fi/api/v1/funding_rate/history`
- **Binance**: `GET https://fapi.binance.com/fapi/v1/premiumIndex`
- **Bybit**: `GET https://api.bybit.com/v5/market/tickers?category=linear`
