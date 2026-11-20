import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(express.json({ limit: '32kb' }));
let openRouterKey = '';
const intervals = { 'M1': ['1m', 'Min1', 60], 'M5': ['5m', 'Min5', 300], 'M15': ['15m', 'Min15', 900], 'M30': ['30m', 'Min30', 1800], 'H1': ['60m', 'Min60', 3600], 'H4': ['4h', 'Hour4', 14400], 'H8': ['8h', 'Hour8', 28800], 'D1': ['1d', 'Day1', 86400], 'W1': ['1w', 'Week1', 604800] };

async function getJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Usługa odpowiedziała kodem HTTP ${response.status}`);
  return response.json();
}


const symbolCache = new Map();

async function getSymbols(market) {
  if (!['spot', 'futures'].includes(market)) throw new Error('Nieprawidłowy rynek.');
  const cached = symbolCache.get(market);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached;
  let symbols;
  if (market === 'spot') {
    const data = await getJson('https://api.mexc.com/api/v3/exchangeInfo');
    if (!Array.isArray(data.symbols)) throw new Error('Nie można odczytać par spot z MEXC.');
    symbols = data.symbols.filter(item => item.status === '1' && item.isSpotTradingAllowed === true)
      .map(item => ({ symbol: item.symbol, exchangeSymbol: item.symbol, base: item.baseAsset, quote: item.quoteAsset,
        name: item.fullName || item.baseAsset, category: (item.conceptPlates || []).some(tag => /stock/i.test(tag)) ? 'stock' : 'other',
        settlement: item.quoteAsset, linear: true, pricePrecision: item.quotePrecision }));
  } else {
    const data = await getJson('https://contract.mexc.com/api/v1/contract/detail');
    if (!data.success || !Array.isArray(data.data)) throw new Error('Nie można odczytać kontraktów MEXC.');
    symbols = data.data.filter(item => item.state === 0 && item.futureType === 1)
      .map(item => ({ symbol: item.baseCoin + item.quoteCoin, exchangeSymbol: item.symbol, base: item.baseCoin, quote: item.quoteCoin,
        name: item.baseCoinName || item.baseCoin, category: (item.conceptPlate || []).some(tag => /stock|ETF/i.test(tag)) ? 'stock' : 'other',
        settlement: item.settleCoin, linear: item.quoteCoin === item.settleCoin, pricePrecision: item.priceScale }));
  }
  if (!symbols.length) throw new Error('MEXC zwrócił pustą listę instrumentów.');
  const result = { symbols, fetchedAt: Date.now() };
  symbolCache.set(market, result);
  return result;
}

app.get('/api/symbols', async (req, res) => {
  try { res.json(await getSymbols(req.query.market || 'futures')); }
  catch (error) { res.status(502).json({ error: error.message }); }
});

async function getCandles(market, symbol, interval, liveOnly = false) {
  if (typeof symbol !== 'string' || symbol.length < 2 || symbol.length > 60 || !intervals[interval]) throw new Error('Nieprawidłowy instrument lub interwał.');
  const catalog = await getSymbols(market);
  const instrument = catalog.symbols.find(item => item.symbol === symbol);
  if (!instrument) throw new Error('MEXC nie udostępnia tej aktywnej pary na wybranym rynku.');
  const [spotInterval, futuresInterval, seconds] = intervals[interval];
  let candles;
  if (market === 'spot') {
    const data = await getJson(`https://api.mexc.com/api/v3/klines?symbol=${encodeURIComponent(instrument.exchangeSymbol)}&interval=${spotInterval}&limit=${liveOnly ? 3 : 500}`);
    if (!Array.isArray(data)) throw new Error(data.msg || 'Nieprawidłowa odpowiedź MEXC spot.');
    candles = data.map(row => ({ time: row[0] / 1000, open: +row[1], high: +row[2], low: +row[3], close: +row[4], volume: +row[5] }));
  } else {
    const start = liveOnly ? `&start=${Math.floor(Date.now() / 1000) - seconds * 4}` : '';
    const data = await getJson(`https://contract.mexc.com/api/v1/contract/kline/${encodeURIComponent(instrument.exchangeSymbol)}?interval=${futuresInterval}${start}`);
    if (!data.success || !data.data?.time) throw new Error(data.message || 'Nieprawidłowa odpowiedź MEXC futures.');
    const d = data.data;
    candles = d.time.map((time, i) => ({ time, open: +d.open[i], high: +d.high[i], low: +d.low[i], close: +d.close[i], volume: +d.vol[i] })).slice(-500);
  }
  if (!candles.length || candles.some(c => !Object.values(c).every(Number.isFinite) || c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.high < Math.max(c.open, c.close, c.low) || c.low > Math.min(c.open, c.close, c.high))) throw new Error('MEXC nie zwrócił poprawnych świec dla tej pary.');
  const gap = candles.findIndex((c, i) => i > 0 && c.time - candles[i - 1].time !== seconds);
  const fetchedAt = Date.now();
  return { candles, seconds, fetchedAt, instrument, hasGaps: gap !== -1 };
}

app.get('/api/candles', async (req, res) => {
  try {
    const data = await getCandles(req.query.market || 'futures', req.query.symbol || 'BTCUSDT', req.query.interval || 'M15');
    const now = Math.floor(Date.now() / 1000);
    data.currentCandle = data.candles.find(c => c.time <= now && c.time + data.seconds > now) || null;
    data.candles = data.candles.filter(c => c.time + data.seconds <= now);
    if (!data.candles.length && !data.currentCandle) throw new Error('Brak świec dla tej pary i interwału.');
    res.json(data);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.get('/api/live', async (req, res) => {
  try { res.json(await getCandles(req.query.market || 'futures', req.query.symbol || 'BTCUSDT', req.query.interval || 'M15', true)); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
app.get('/api/key', (_req, res) => res.json({ configured: Boolean(openRouterKey) }));
app.post('/api/key', (req, res) => {
  if (typeof req.body.key !== 'string' || req.body.key.length > 500) return res.status(400).json({ error: 'Nieprawidłowy klucz.' });
  openRouterKey = req.body.key.trim();
  res.json({ configured: Boolean(openRouterKey) });
});
app.post('/api/interpret', async (req, res) => {
  try {
    if (!openRouterKey) throw new Error('Dodaj klucz OpenRouter w ustawieniach.');
    const { prompt, model = 'openai/gpt-4o-mini' } = req.body;
    if (typeof prompt !== 'string' || prompt.length > 1000 || typeof model !== 'string' || !/^[\w.\/-]{1,100}$/.test(model)) throw new Error('Nieprawidłowe polecenie lub model.');
    const data = await getJson('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'system', content: 'Extract chart request. Return only JSON with keys symbol (e.g. BTCUSDT or null), market (spot, futures or null), interval (M1,M5,M15,M30,H1,H4,H8,D1,W1 or null), layers (array from ema, levels, fib, fvg). Never invent trading prices.' }, { role: 'user', content: prompt }] }) });
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    res.json(parsed);
  } catch (error) { res.status(400).json({ error: `OpenRouter: ${error.message}` }); }
});
if (process.env.NODE_ENV === 'production') app.use(express.static('dist'));
else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Dashboard listening on ${host}:${port}`));
