'use strict';

const axios = require('axios');

async function sendTelegramAlert(botToken, chatId, records, alertAbsApr) {
    const triggered = records.filter((r) => r.max_abs_funding_apr_pct >= alertAbsApr);
    if (triggered.length === 0) return;

    const lines = triggered.map((r) => {
        return `⚡ *${r.symbol}* | max |APR|: ${r.max_abs_funding_apr_pct}% | spread: ${r.venue_spread_apr_pct}%\n` +
            `  Long: ${r.best_long_venue} | Short: ${r.best_short_venue}`;
    });

    const text = `*DEX Funding Alert* (|APR| > ${alertAbsApr}%)\n\n${lines.join('\n\n')}`;

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
    }, { timeout: 10000 });
}

module.exports = { sendTelegramAlert };
