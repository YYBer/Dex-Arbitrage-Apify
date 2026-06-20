'use strict';

const axios = require('axios');
const { toApr, stripQuote } = require('../utils/normalize');

const BASE = 'https://api.bybit.com';
const INTERVAL_H = 8;

async function fetchBybit(symbols) {
    const res = await axios.get(`${BASE}/v5/market/tickers`, {
        params: { category: 'linear' },
        timeout: 10000,
    });

    const list = res.data?.result?.list ?? [];
    const result = {};

    for (const item of list) {
        const sym = stripQuote(item.symbol).toUpperCase();
        if (!symbols.includes(sym)) continue;
        if (item.fundingRate == null) continue;
        result[sym] = {
            funding_apr_pct: toApr(item.fundingRate, INTERVAL_H),
            mark_price: parseFloat(item.markPrice) || null,
            next_funding_time: item.nextFundingTime
                ? new Date(parseInt(item.nextFundingTime)).toISOString()
                : null,
        };
    }

    return result;
}

module.exports = { fetchBybit };
