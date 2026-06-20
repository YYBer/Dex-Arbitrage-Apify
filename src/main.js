'use strict';

const { Actor } = require('apify');
const { fetchHyperliquid } = require('./fetchers/hyperliquid');
const { fetchAster } = require('./fetchers/aster');
const { fetchLighter } = require('./fetchers/lighter');
const { fetchPacifica } = require('./fetchers/pacifica');
const { fetchBinance } = require('./fetchers/binance');
const { fetchBybit } = require('./fetchers/bybit');
const { buildRecord, applyFilters, sortRecords } = require('./utils/aggregate');
const { sendTelegramAlert } = require('./utils/telegram');

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL'];

Actor.main(async () => {
    const input = await Actor.getInput() ?? {};

    const {
        symbols = DEFAULT_SYMBOLS,
        includeHyperliquid = true,
        includeAster = true,
        includeLighter = true,
        includePacifica = true,
        includeBinance = true,
        includeBybit = true,
        minAbsFundingApr = 0,
        minVenueSpreadApr = 0,
        sortBy = 'spread_desc',
        alertAbsApr = 0,
        telegramBotToken,
        telegramChatId,
    } = input;

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    console.log(`Fetching funding rates for: ${upperSymbols.join(', ')}`);

    // Fetch all platforms in parallel
    const [hl, aster, lighter, pacifica, binance, bybit] = await Promise.allSettled([
        includeHyperliquid ? fetchHyperliquid(upperSymbols) : Promise.resolve({}),
        includeAster       ? fetchAster(upperSymbols)       : Promise.resolve({}),
        includeLighter     ? fetchLighter(upperSymbols)     : Promise.resolve({}),
        includePacifica    ? fetchPacifica(upperSymbols)    : Promise.resolve({}),
        includeBinance     ? fetchBinance(upperSymbols)     : Promise.resolve({}),
        includeBybit       ? fetchBybit(upperSymbols)       : Promise.resolve({}),
    ]);

    const get = (settled) => settled.status === 'fulfilled' ? settled.value : {};

    const timestamp = new Date().toISOString();
    const records = [];

    for (const sym of upperSymbols) {
        const venueData = {
            hyperliquid: includeHyperliquid ? get(hl)[sym] ?? null     : null,
            aster:       includeAster       ? get(aster)[sym] ?? null   : null,
            lighter:     includeLighter     ? get(lighter)[sym] ?? null : null,
            pacifica:    includePacifica    ? get(pacifica)[sym] ?? null: null,
            binance:     includeBinance     ? get(binance)[sym] ?? null : null,
            bybit:       includeBybit       ? get(bybit)[sym] ?? null   : null,
        };

        // Remove null venues so buildRecord only counts present ones
        const filtered = Object.fromEntries(
            Object.entries(venueData).filter(([, v]) => v !== null)
        );

        const record = buildRecord(sym, filtered, timestamp);
        if (record) records.push(record);
    }

    // Log fetch errors
    const fetchers = ['hyperliquid', 'aster', 'lighter', 'pacifica', 'binance', 'bybit'];
    [hl, aster, lighter, pacifica, binance, bybit].forEach((r, i) => {
        if (r.status === 'rejected') {
            console.error(`[${fetchers[i]}] fetch failed:`, r.reason?.message);
        }
    });

    const filtered = applyFilters(records, { minAbsFundingApr, minVenueSpreadApr });
    const sorted = sortRecords(filtered, sortBy);

    await Actor.pushData(sorted);

    // Summary in KV store
    const topSpread = sorted[0] ?? null;
    await Actor.setValue('SUMMARY', {
        totalSymbols: sorted.length,
        topSpreadSymbol: topSpread?.symbol ?? null,
        topSpreadApr: topSpread?.venue_spread_apr_pct ?? null,
        topBestLong: topSpread?.best_long_venue ?? null,
        topBestShort: topSpread?.best_short_venue ?? null,
        timestamp,
    });

    // Telegram alert
    if (alertAbsApr > 0 && telegramBotToken && telegramChatId) {
        try {
            await sendTelegramAlert(telegramBotToken, telegramChatId, sorted, alertAbsApr);
            console.log('Telegram alert sent.');
        } catch (e) {
            console.error('Telegram alert failed:', e.message);
        }
    }

    // PPE charging — $0.002 per record
    await Actor.charge({ eventName: 'result', count: sorted.length });

    console.log(`Done. ${sorted.length} records pushed.`);
});
