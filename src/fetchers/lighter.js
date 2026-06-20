'use strict';

const axios = require('axios');
const { toApr, stripQuote } = require('../utils/normalize');

const BASE = 'https://mainnet.zklighter.elliot.ai';

// Lighter uses 8h funding intervals. Binance/Bybit reference rates from
// Lighter's API also use 8h intervals.
const INTERVAL_BY_EXCHANGE = {
    lighter: 8,
    binance: 8,
    bybit: 8,
    hyperliquid: 1,
};

// Returns { lighter: {BTC: {...}}, binance: {BTC: {...}}, bybit: {BTC: {...}} }
// Lighter's /funding-rates endpoint bundles all exchanges in one call,
// so we use it as the source for Binance/Bybit too — avoiding direct calls
// that get geo-blocked (451/403) on cloud servers.
async function fetchLighter(symbols) {
    const res = await axios.get(`${BASE}/api/v1/funding-rates`, { timeout: 10000 });

    const rates = res.data?.funding_rates ?? [];
    const result = { lighter: {}, binance: {}, bybit: {} };

    for (const item of rates) {
        const exchange = item.exchange;
        if (!result[exchange]) continue;
        const sym = stripQuote(item.symbol.toUpperCase());
        if (!symbols.includes(sym)) continue;
        if (item.rate == null) continue;
        const intervalH = INTERVAL_BY_EXCHANGE[exchange] ?? 8;
        result[exchange][sym] = {
            funding_apr_pct: toApr(item.rate, intervalH),
        };
    }

    return result;
}

module.exports = { fetchLighter };
