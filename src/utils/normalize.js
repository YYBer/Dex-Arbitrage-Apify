'use strict';

function toApr(rate, intervalHours) {
    return parseFloat(rate) * (24 / intervalHours) * 365 * 100;
}

function stripQuote(symbol) {
    return symbol.replace(/(USDT|USDC|USD|PERP)$/, '');
}

module.exports = { toApr, stripQuote };
