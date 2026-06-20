# DEX Funding Rate Aggregator

> **The first Actor on Apify Store dedicated to DEX perpetual funding rates.**  
> Aggregate live funding rates across Hyperliquid, Aster, Lighter, and Pacifica — with Binance and Bybit as CEX benchmarks — in a single call. No API key required.

---

## The Problem

DEX perpetual funding rates are scattered across 4+ different chains and APIs with no unified view. A trader trying to find carry-trade opportunities must manually check Hyperliquid (Ethereum L1), Aster (BNB Chain), Lighter (Ethereum ZK L2), and Pacifica (Solana) — all with different data formats and funding intervals.

Meanwhile, DEX funding rates routinely diverge from CEX (Binance/Bybit) by **10–20% APR** — a real, recurring arbitrage opportunity that goes undetected without cross-venue aggregation.

## The Solution

This Actor fetches, normalizes, and compares funding rates across **6 venues in one call**, surfacing:

- 🏆 **Best carry-trade pair**: which venue to long, which to short
- 📊 **Cross-venue spread**: total APR captured by holding both sides
- 📡 **DEX-vs-CEX spread**: how much DEX funding deviates from CEX baseline

**Live example output** (real data, June 20 2026):

| Symbol | Best Long | Best Short | Spread APR |
|--------|-----------|------------|------------|
| ETH | Pacifica (−9.6%) | Hyperliquid (+11.0%) | **20.5%** |
| SOL | Binance (−7.2%) | Hyperliquid (+11.0%) | **18.1%** |
| BTC | Pacifica (−7.3%) | Hyperliquid (+8.3%) | **15.6%** |

A 20% APR spread on ETH means: long ETH on Pacifica (receive 9.6% APR from shorts), short ETH on Hyperliquid (receive 11.0% APR from longs) = **20.6% annualized yield**, delta-neutral.

---

## What It Does

1. **Fetches** live funding rates from 6 venues in parallel
2. **Normalizes** all rates to APR% (accounts for different settlement intervals: 1h vs 8h)
3. **Computes** cross-venue spread, DEX-vs-CEX spread, best long/short venue per symbol
4. **Filters & sorts** by spread size or absolute funding magnitude
5. **Alerts** via Telegram when funding exceeds your threshold

---

## Platforms Covered

| Platform | Type | Chain | Funding Interval |
|----------|------|-------|-----------------|
| Hyperliquid | DEX | Own L1 | 1h |
| Aster | DEX | Multi-chain (BNB Chain + Aster Chain L1) | 8h |
| Lighter | DEX | Ethereum ZK L2 | 8h |
| Pacifica | DEX | Solana | 1h |
| Binance | CEX reference | — | 8h |
| Bybit | CEX reference | — | 8h |

*All endpoints are public. No API keys required.*

---

## Input

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `symbols` | string[] | `["BTC","ETH","SOL"]` | Symbols to track |
| `includeHyperliquid` | boolean | true | |
| `includeAster` | boolean | true | |
| `includeLighter` | boolean | true | |
| `includePacifica` | boolean | true | |
| `includeBinance` | boolean | true | CEX reference |
| `includeBybit` | boolean | true | CEX reference |
| `minAbsFundingApr` | number | 0 | Filter: skip if max \|APR\| below this |
| `minVenueSpreadApr` | number | 0 | Filter: skip if spread below this |
| `sortBy` | string | `spread_desc` | `spread_desc` / `abs_funding_desc` / `symbol_asc` |
| `alertAbsApr` | number | 0 | Telegram alert threshold (0 = disabled) |
| `telegramBotToken` | string (secret) | — | |
| `telegramChatId` | string | — | |

### Example: Find all symbols with spread > 5% APR
```json
{
  "symbols": ["BTC", "ETH", "SOL"],
  "minVenueSpreadApr": 5,
  "sortBy": "spread_desc"
}
```

### Example: Telegram alert when funding goes extreme
```json
{
  "symbols": ["BTC", "ETH", "SOL"],
  "alertAbsApr": 30,
  "telegramBotToken": "<token>",
  "telegramChatId": "<chat_id>"
}
```

---

## Output

Each record represents one symbol across all enabled venues:

```json
{
  "symbol": "ETH",
  "hyperliquid_funding_apr_pct": 10.95,
  "aster_funding_apr_pct": 0.0,
  "lighter_funding_apr_pct": -0.876,
  "pacifica_funding_apr_pct": -9.583,
  "binance_funding_apr_pct": 4.071,
  "bybit_funding_apr_pct": 9.161,
  "max_abs_funding_apr_pct": 10.95,
  "venue_spread_apr_pct": 20.533,
  "dex_cex_spread_apr_pct": 6.879,
  "best_long_venue": "pacifica",
  "best_short_venue": "hyperliquid",
  "exchanges_present": 6,
  "next_funding_time": "2026-06-20T16:00:00.000Z",
  "timestamp": "2026-06-20T11:36:24.650Z"
}
```

| Field | Description |
|-------|-------------|
| `*_funding_apr_pct` | Funding rate annualized to APR% |
| `venue_spread_apr_pct` | Max APR minus min APR — the carry-trade spread |
| `dex_cex_spread_apr_pct` | Max DEX APR minus min CEX APR — DEX premium |
| `best_long_venue` | Cheapest venue to hold long (or receive most as short) |
| `best_short_venue` | Best venue to hold short and collect funding |
| `exchanges_present` | Number of venues with data for this symbol (1–6) |

---

## Data Sources

| Venue | Endpoint |
|-------|----------|
| Hyperliquid | `POST https://api.hyperliquid.xyz/info` (`metaAndAssetCtxs`) |
| Aster | `GET https://fapi.asterdex.com/fapi/v1/premiumIndex` |
| Lighter | `GET https://mainnet.zklighter.elliot.ai/api/v1/funding-rates` |
| Pacifica | `GET https://api.pacifica.fi/api/v1/funding_rate/history` |
| Binance | via Lighter aggregated endpoint (avoids geo-restrictions) |
| Bybit | via Lighter aggregated endpoint (avoids geo-restrictions) |

---

## Why This Matters

**Carry trading** is one of the most consistent yield strategies in crypto — but it requires knowing where the rate imbalance is. CEX funding rates are well-covered. DEX rates are not.

This Actor fills that gap: one call, 6 venues, actionable spread signal.

Use cases:
- **Quant traders** — scan for entry signals, run on schedule via Apify
- **DeFi protocols** — monitor funding conditions across chains
- **Risk desks** — track DEX-vs-CEX divergence as a market stress indicator

Live Sample Run: https://console.apify.com/storage/datasets/YEeLI3ofDrd8KoV76