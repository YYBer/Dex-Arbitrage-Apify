'use strict';

const axios = require('axios');

async function sendTelegramAlert(botToken, chatId, records, alertAbsApr) {
    const triggered = records.filter((r) => r.max_abs_funding_apr_pct >= alertAbsApr);
    if (triggered.length === 0) return;

    const lines = triggered.map((r) => {
        const venues = [
            ['HL', r.hyperliquid_funding_apr_pct],
            ['Aster', r.aster_funding_apr_pct],
            ['Lighter', r.lighter_funding_apr_pct],
            ['Pacifica', r.pacifica_funding_apr_pct],
            ['Binance', r.binance_funding_apr_pct],
            ['Bybit', r.bybit_funding_apr_pct],
        ]
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([name, v]) => `  ${name}: ${v > 0 ? '+' : ''}${v.toFixed(2)}%`)
            .join('\n');

        return [
            `⚡ <b>${r.symbol}</b> — Spread: <code>${r.venue_spread_apr_pct.toFixed(2)}% APR</code>`,
            `📈 Long <b>${r.best_long_venue}</b> → Short <b>${r.best_short_venue}</b>`,
            ``,
            `<pre>${venues}</pre>`,
        ].join('\n');
    });

    const timestamp = new Date().toUTCString();
    const text = [
        `🚨 <b>DEX Funding Alert</b> (|APR| &gt; ${alertAbsApr}%)`,
        ``,
        lines.join('\n─────────────────\n'),
        ``,
        `<i>${timestamp}</i>`,
    ].join('\n');

    await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        { chat_id: chatId, text, parse_mode: 'HTML' },
        { timeout: 10000 },
    );
}

module.exports = { sendTelegramAlert };
