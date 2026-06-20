'use strict';

const axios = require('axios');
const { toApr } = require('../utils/normalize');

const BASE = 'https://api.pacifica.fi/api/v1';
const INTERVAL_H = 1;

async function fetchPacifica(symbols) {
    const result = {};

    await Promise.all(symbols.map(async (sym) => {
        try {
            const res = await axios.get(`${BASE}/funding_rate/history`, {
                params: { symbol: sym, limit: 1 },
                timeout: 10000,
            });

            const data = res.data?.data;
            if (!data || data.length === 0) return;

            const latest = data[0];
            const rate = parseFloat(latest.next_funding_rate ?? latest.funding_rate);
            if (isNaN(rate)) return;

            result[sym] = {
                funding_apr_pct: toApr(rate, INTERVAL_H),
                mark_price: parseFloat(latest.oracle_price) || null,
            };
        } catch {
            // symbol not available on Pacifica
        }
    }));

    return result;
}

module.exports = { fetchPacifica };
