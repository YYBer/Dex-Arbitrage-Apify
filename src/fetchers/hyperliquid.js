'use strict';

const axios = require('axios');
const { toApr } = require('../utils/normalize');

const BASE = 'https://api.hyperliquid.xyz';
const INTERVAL_H = 1;

async function fetchHyperliquid(symbols) {
    const res = await axios.post(`${BASE}/info`, { type: 'metaAndAssetCtxs' }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
    });

    const [meta, ctxs] = res.data;
    const result = {};

    meta.universe.forEach((asset, i) => {
        const sym = asset.name.toUpperCase();
        if (!symbols.includes(sym)) return;
        const ctx = ctxs[i];
        if (!ctx || ctx.funding == null) return;
        result[sym] = {
            funding_apr_pct: toApr(ctx.funding, INTERVAL_H),
            mark_price: parseFloat(ctx.markPx),
        };
    });

    return result;
}

module.exports = { fetchHyperliquid };
