import test from 'node:test';
import assert from 'node:assert/strict';
import { fibonacciLevels } from './fibonacci.js';

test('Fibonacci prices and golden zone are correct for an upward swing', () => {
  const levels = fibonacciLevels(100, 200);
  assert.equal(levels.find(level => level.ratio === 0).price, 200);
  assert.equal(levels.find(level => level.ratio === 0.618).price, 138.2);
  assert.equal(levels.find(level => level.ratio === 0.65).price, 135);
  assert.equal(levels.find(level => level.ratio === 1).price, 100);
});

test('Fibonacci prices and golden zone are correct for a downward swing', () => {
  const levels = fibonacciLevels(200, 100);
  assert.equal(levels.find(level => level.ratio === 0).price, 100);
  assert.equal(levels.find(level => level.ratio === 0.618).price, 161.8);
  assert.equal(levels.find(level => level.ratio === 0.65).price, 165);
  assert.equal(levels.find(level => level.ratio === 1).price, 200);
});

test('identical or invalid anchor prices do not generate a Fibonacci overlay', () => {
  assert.deepEqual(fibonacciLevels(100, 100), []);
  assert.deepEqual(fibonacciLevels(0, 100), []);
  assert.deepEqual(fibonacciLevels(null, 100), []);
});
