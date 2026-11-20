import test from 'node:test';
import assert from 'node:assert/strict';
import { ema, analyze } from './analysis.js';

test('EMA is seeded with a simple average and updated from subsequent prices', () => {
  assert.deepEqual(ema([1, 2, 3, 4], 3), [null, null, 2, 3]);
});
test('constant candles have neutral RSI and no invented pivots or scenarios', () => {
  const candles = Array.from({length: 250}, (_, i) => ({time: i * 900, open: 10, high: 11, low: 9, close: 10, volume: 5}));
  const result = analyze(candles);
  assert.equal(result.rsi, 50);
  assert.equal(result.atr, 2);
  assert.equal(result.trend, 'niejednoznaczny');
  assert.equal(result.support, undefined);
  assert.equal(result.resistance, undefined);
  assert.equal(result.fib, null);
  assert.equal(result.fvg.length, 0);
});
