'use strict';

const axios = require('axios');
const { toApr, stripQuote } = require('../utils/normalize');

const BASE = 'https://mainnet.zklighter.elliot.ai';

// Lighter uses 8h funding intervals (same as Binance/Bybit CEX model).
// Confirmed by typical rate magnitudes (~0.0001–0.0003 per interval).
const INTERVAL_H = 8;

async function fetchLighter(symbols) {
    const res = await axios.get(`${BASE}/api/v1/funding-rates`, { timeout: 10000 });

    const rates = res.data?.funding_rates ?? [];
    const result = {};

    for (const item of rates) {
        if (item.exchange !== 'lighter') continue;
        const sym = stripQuote(item.symbol.toUpperCase());
        if (!symbols.includes(sym)) continue;
        if (item.rate == null) continue;
        result[sym] = {
            funding_apr_pct: toApr(item.rate, INTERVAL_H),
        };
    }

    return result;
}

module.exports = { fetchLighter };
