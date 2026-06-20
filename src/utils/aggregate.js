'use strict';

const DEX_VENUES = ['hyperliquid', 'aster', 'lighter', 'pacifica'];
const CEX_VENUES = ['binance', 'bybit'];

function buildRecord(symbol, venueData, timestamp) {
    const record = { symbol, timestamp };

    const allApr = [];
    const dexApr = [];
    const cexApr = [];

    for (const [venue, data] of Object.entries(venueData)) {
        const apr = data?.funding_apr_pct ?? null;
        record[`${venue}_funding_apr_pct`] = apr !== null ? round(apr) : null;
        if (data?.mark_price) record[`${venue}_mark_price`] = data.mark_price;
        if (data?.next_funding_time) record['next_funding_time'] = data.next_funding_time;

        if (apr !== null) {
            allApr.push({ venue, apr });
            if (DEX_VENUES.includes(venue)) dexApr.push(apr);
            if (CEX_VENUES.includes(venue)) cexApr.push(apr);
        }
    }

    if (allApr.length === 0) return null;

    const aprValues = allApr.map((x) => x.apr);
    const maxApr = Math.max(...aprValues);
    const minApr = Math.min(...aprValues);

    record.max_abs_funding_apr_pct = round(Math.max(...aprValues.map(Math.abs)));
    record.venue_spread_apr_pct = round(maxApr - minApr);
    record.best_long_venue = allApr.find((x) => x.apr === minApr)?.venue ?? null;
    record.best_short_venue = allApr.find((x) => x.apr === maxApr)?.venue ?? null;
    record.exchanges_present = allApr.length;

    if (dexApr.length > 0 && cexApr.length > 0) {
        record.dex_cex_spread_apr_pct = round(Math.max(...dexApr) - Math.min(...cexApr));
    } else {
        record.dex_cex_spread_apr_pct = null;
    }

    return record;
}

function applyFilters(records, { minAbsFundingApr, minVenueSpreadApr }) {
    return records.filter((r) => {
        if (minAbsFundingApr > 0 && r.max_abs_funding_apr_pct < minAbsFundingApr) return false;
        if (minVenueSpreadApr > 0 && r.venue_spread_apr_pct < minVenueSpreadApr) return false;
        return true;
    });
}

function sortRecords(records, sortBy) {
    return records.sort((a, b) => {
        if (sortBy === 'abs_funding_desc') return b.max_abs_funding_apr_pct - a.max_abs_funding_apr_pct;
        if (sortBy === 'symbol_asc') return a.symbol.localeCompare(b.symbol);
        // default: spread_desc
        return b.venue_spread_apr_pct - a.venue_spread_apr_pct;
    });
}

function round(n, decimals = 4) {
    return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

module.exports = { buildRecord, applyFilters, sortRecords };
