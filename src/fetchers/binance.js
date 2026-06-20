'use strict';

const axios = require('axios');
const { toApr, stripQuote } = require('../utils/normalize');

const BASE = 'https://fapi.binance.com';
const INTERVAL_H = 8;

async function fetchBinance(symbols) {
    const res = await axios.get(`${BASE}/fapi/v1/premiumIndex`, { timeout: 10000 });

    const result = {};
    for (const item of res.data) {
        const sym = stripQuote(item.symbol).toUpperCase();
        if (!symbols.includes(sym)) continue;
        if (item.lastFundingRate == null) continue;
        result[sym] = {
            funding_apr_pct: toApr(item.lastFundingRate, INTERVAL_H),
            mark_price: parseFloat(item.markPrice),
            next_funding_time: item.nextFundingTime
                ? new Date(item.nextFundingTime).toISOString()
                : null,
        };
    }

    return result;
}

module.exports = { fetchBinance };
