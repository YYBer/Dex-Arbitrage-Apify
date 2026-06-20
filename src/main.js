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

    // Fetch all platforms in parallel.
    // Binance/Bybit are sourced from Lighter's bundled endpoint to avoid
    // geo-blocks (451/403) that occur when calling them directly from cloud IPs.
    // Direct binance.js/bybit.js fetchers are kept as fallback for local use.
    const [hl, aster, lighterAll, pacifica, binanceDirect, bybitDirect] = await Promise.allSettled([
        includeHyperliquid ? fetchHyperliquid(upperSymbols) : Promise.resolve({}),
        includeAster       ? fetchAster(upperSymbols)       : Promise.resolve({}),
        (includeLighter || includeBinance || includeBybit)
            ? fetchLighter(upperSymbols)
            : Promise.resolve({ lighter: {}, binance: {}, bybit: {} }),
        includePacifica    ? fetchPacifica(upperSymbols)    : Promise.resolve({}),
        includeBinance     ? fetchBinance(upperSymbols)     : Promise.resolve({}),
        includeBybit       ? fetchBybit(upperSymbols)       : Promise.resolve({}),
    ]);

    const get = (settled) => settled.status === 'fulfilled' ? settled.value : {};

    // Lighter bundles lighter + binance + bybit; fall back to direct if available
    const lighterData  = get(lighterAll)?.lighter ?? {};
    const binanceData  = get(lighterAll)?.binance ?? {};
    const bybitData    = get(lighterAll)?.bybit   ?? {};
    const binanceDirect_ = get(binanceDirect);
    const bybitDirect_   = get(bybitDirect);

    const timestamp = new Date().toISOString();
    const records = [];

    for (const sym of upperSymbols) {
        const venueData = {
            hyperliquid: includeHyperliquid ? get(hl)[sym] ?? null    : null,
            aster:       includeAster       ? get(aster)[sym] ?? null  : null,
            lighter:     includeLighter     ? lighterData[sym] ?? null : null,
            pacifica:    includePacifica    ? get(pacifica)[sym] ?? null : null,
            // Prefer direct fetch; fall back to Lighter-bundled data
            binance: includeBinance
                ? (binanceDirect_[sym] ?? binanceData[sym] ?? null)
                : null,
            bybit: includeBybit
                ? (bybitDirect_[sym] ?? bybitData[sym] ?? null)
                : null,
        };

        const present = Object.fromEntries(
            Object.entries(venueData).filter(([, v]) => v !== null)
        );

        const record = buildRecord(sym, present, timestamp);
        if (record) records.push(record);
    }

    // Log fetch errors
    const fetchers = ['hyperliquid', 'aster', 'lighter', 'pacifica', 'binance(direct)', 'bybit(direct)'];
    [hl, aster, lighterAll, pacifica, binanceDirect, bybitDirect].forEach((r, i) => {
        if (r.status === 'rejected') {
            const status = r.reason?.response?.status;
            if (status === 451 || status === 403) {
                console.warn(`[${fetchers[i]}] geo-restricted (${status}), using Lighter-bundled data instead`);
            } else {
                console.error(`[${fetchers[i]}] fetch failed:`, r.reason?.message);
            }
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
