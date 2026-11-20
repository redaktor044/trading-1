import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyInstrument } from './instruments.js';

test('MEXC asset tags separate stock, cryptocurrency and traditional commodities', () => {
  assert.equal(classifyInstrument(['mc-trade-zone-Stock', 'mc-trade-zone-tradfi']), 'stock');
  assert.equal(classifyInstrument(['Tokenized Stocks']), 'stock');
  assert.equal(classifyInstrument(['Stock Meme Tokens']), 'crypto');
  assert.equal(classifyInstrument(['mc-trade-zone-metals', 'mc-trade-zone-tradfi']), 'other');
  assert.equal(classifyInstrument(['mc-trade-zone-Forex']), 'other');
  assert.equal(classifyInstrument(['mc-trade-zone-ETF']), 'other');
  assert.equal(classifyInstrument(['mc-trade-zone-pow']), 'crypto');
  assert.equal(classifyInstrument([]), 'other');
  assert.equal(classifyInstrument(null), 'other');
});

test('pair search prioritizes exact symbols and retains all matching results', async () => {
  const { findSymbols } = await import('./instruments.js');
  const symbols = [
    { symbol: 'ARCSOLUSDT', base: 'ARCSOL', quote: 'USDT', name: 'Arcsol', category: 'crypto' },
    { symbol: 'SOLUSDC', base: 'SOL', quote: 'USDC', name: 'Solana', category: 'crypto' },
    { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', name: 'Solana', category: 'crypto' },
    ...Array.from({ length: 20 }, (_, i) => ({ symbol: `S${i}USDT`, base: `S${i}`, quote: 'USDT', name: `Asset ${i}`, category: 'stock' }))
  ];
  assert.equal(findSymbols(symbols, 'sol/usdt', 'all')[0].symbol, 'SOLUSDT');
  assert.equal(findSymbols(symbols, '', 'stock').length, 20);
  assert.equal(findSymbols(symbols, 'sol', 'crypto').length, 3);
});
