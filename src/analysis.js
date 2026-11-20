export function ema(values, period) {
  const result = Array(values.length).fill(null);
  if (values.length < period) return result;
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = value;
  const alpha = 2 / (period + 1);
  for (let i = period; i < values.length; i++) { value += alpha * (values[i] - value); result[i] = value; }
  return result;
}
export function analyze(candles) {
  const closes = candles.map(c => c.close);
  const averages = Object.fromEntries([20, 50, 200].map(n => [n, ema(closes, n)]));
  const tr = candles.map((c, i) => i ? Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)) : c.high - c.low);
  let atr = tr.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  let gain = 0, loss = 0;
  for (let i = 1; i <= 14; i++) { const d = closes[i] - closes[i - 1]; gain += Math.max(d, 0); loss += Math.max(-d, 0); }
  gain /= 14; loss /= 14;
  for (let i = 14; i < candles.length; i++) {
    atr = (atr * 13 + tr[i]) / 14;
    if (i > 14) { const d = closes[i] - closes[i - 1]; gain = (gain * 13 + Math.max(d, 0)) / 14; loss = (loss * 13 + Math.max(-d, 0)) / 14; }
  }
  const rsi = loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss);
  const highs = [], lows = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    if ([i - 2, i - 1, i + 1, i + 2].every(j => c.high > candles[j].high)) highs.push({ index: i, price: c.high, time: c.time });
    if ([i - 2, i - 1, i + 1, i + 2].every(j => c.low < candles[j].low)) lows.push({ index: i, price: c.low, time: c.time });
  }
  let trend = 'niejednoznaczny';
  if (highs.length >= 2 && lows.length >= 2) {
    const h = highs.slice(-2), l = lows.slice(-2);
    if (h[1].price > h[0].price && l[1].price > l[0].price) trend = 'wzrostowy';
    if (h[1].price < h[0].price && l[1].price < l[0].price) trend = 'spadkowy';
  }
  const price = closes.at(-1);
  const groups = [];
  for (const point of [...highs, ...lows].filter(p => p.index >= candles.length - 200).sort((a, b) => a.price - b.price)) {
    const group = groups.at(-1);
    if (group && point.price - group.max <= atr * 0.5) { group.max = point.price; group.points.push(point); }
    else groups.push({ min: point.price, max: point.price, points: [point] });
  }
  const levels = groups.map(g => ({ ...g, price: (g.min + g.max) / 2 })).sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price));
  const support = levels.find(g => g.max < price), resistance = levels.find(g => g.min > price);
  const swings = [...highs.map(p => ({ ...p, type: 'high' })), ...lows.map(p => ({ ...p, type: 'low' }))].sort((a, b) => a.index - b.index);
  const end = swings.at(-1), start = end && [...swings].reverse().find(p => p.index < end.index && p.type !== end.type);
  const fib = start && end && Math.abs(start.price - end.price) >= atr ? { start, end } : null;
  const fvg = [];
  for (let i = Math.max(2, candles.length - 150); i < candles.length; i++) {
    const first = candles[i - 2], last = candles[i];
    const direction = last.low > first.high ? 'wzrostowa' : last.high < first.low ? 'spadkowa' : null;
    if (!direction) continue;
    const low = direction === 'wzrostowa' ? first.high : last.high, high = direction === 'wzrostowa' ? last.low : first.low;
    const future = candles.slice(i + 1);
    const touched = future.length && (direction === 'wzrostowa' ? Math.min(...future.map(c => c.low)) : Math.max(...future.map(c => c.high)));
    const fill = !future.length ? 0 : Math.max(0, Math.min(1, direction === 'wzrostowa' ? (high - touched) / (high - low) : (touched - low) / (high - low)));
    if (fill < 1) fvg.push({ low, high, direction, fill, time: last.time });
  }
  const volumes = candles.slice(-21, -1).map(c => c.volume);
  const volumeAverage = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  return { price, atr, rsi, trend, averages, support, resistance, fib, fvg: fvg.slice(-5), volumeRatio: volumeAverage ? candles.at(-1).volume / volumeAverage : null };
}
