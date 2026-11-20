// Use MEXC's explicit tags when separating stocks and traditional markets.
export function classifyInstrument(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return 'other';
  const normalized = tags.filter(tag => typeof tag === 'string').map(tag => tag.toLowerCase());
  const stockTags = new Set(['tokenized stocks', 'mc-trade-zone-stock', 'mc-trade-zone-usstocks', 'mc-trade-zone-jpstocks', 'mc-trade-zone-twstocks', 'mc-trade-zone-hkstocks', 'mc-trade-zone-stockindex']);
  if (normalized.some(tag => stockTags.has(tag))) return 'stock';
  if (normalized.some(tag => tag === 'mc-trade-zone-etf' || /tradfi|forex|commodit|precious metals|metalsfutures|mc-trade-zone-metals/.test(tag))) return 'other';
  return 'crypto';
}

export function findSymbols(symbols, search, category) {
  const normalize = text => text.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
  const query = normalize(search);
  return symbols.filter(item => (category === 'all' || item.category === category) && (normalize(item.symbol).includes(query) || normalize(item.name).includes(query)))
    .sort((a, b) => Number(normalize(a.symbol) !== query) - Number(normalize(b.symbol) !== query) || Number(!normalize(a.base).startsWith(query)) - Number(!normalize(b.base).startsWith(query)) || Number(a.quote !== 'USDT') - Number(b.quote !== 'USDT') || a.base.localeCompare(b.base));
}
