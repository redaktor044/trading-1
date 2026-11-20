import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import { analyze } from './analysis.js';
import { Zones } from './zones.js';
import { findSymbols } from './instruments.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
<div class="shell">
  <main>
    <div class="topbar">
      <div class="brand"><span class="brand-mark">✳</span><span>przystań</span></div>
      <div class="symbol-picker">
        <label for="symbol">Para MEXC</label>
        <div class="symbol-input-wrap"><span aria-hidden="true">⌕</span><input id="symbol" value="BTCUSDT" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="symbol-list" aria-expanded="false" aria-label="Szukaj pary MEXC"><button id="symbol-toggle" class="search-chevron" type="button" aria-label="Rozwiń listę par" aria-controls="symbol-list" aria-expanded="false">⌄</button></div>
        <div id="symbol-list" class="symbol-list" role="listbox" hidden></div>
        <div id="symbol-feedback" class="sr-only" role="status"></div>
      </div>
      <label class="top-control">Rynek<select id="market"><option value="futures">Futures</option><option value="spot">Spot</option></select></label>
      <label class="top-control">Rodzaj<select id="asset-category"><option value="all">Wszystkie</option><option value="crypto">Kryptowaluty</option><option value="stock">Powiązane z akcjami</option><option value="other">Inne / bez kategorii</option></select></label>
      <label class="top-control">Interwał<select id="interval"></select></label>
      <label class="top-control context-control">Kontekst<select id="context"></select></label>
      <button id="refresh" class="refresh-button" title="Pobierz dane" aria-label="Pobierz dane">↻</button>
      <button id="settings-open" class="settings-button" aria-label="Ustawienia OpenRouter" title="Ustawienia OpenRouter">⚙</button>
    </div>
    <div class="command-bar">
      <form id="command-form"><span class="command-spark" aria-hidden="true">✳</span><label class="sr-only" for="prompt">Polecenie analizy</label><input id="prompt" placeholder="Napisz, co chcesz zobaczyć na wykresie…" autocomplete="off"><button class="primary">Analizuj <span>↗</span></button></form>
      <div class="hint"><span>SPRÓBUJ</span><button class="example" data-prompt="Przeanalizuj BTC USDT futures M15">BTC futures · M15</button><button class="example" data-prompt="Narysuj Fibo BTC USDT H4">Fibo · H4</button><button class="example" data-prompt="Pokaż wsparcia opory i FVG">Wsparcia i FVG</button></div>
    </div>
    <div id="message" class="message" role="status"></div>
    <section class="chart-card" aria-label="Wykres ceny">
      <div class="chart-heading"><div class="instrument-heading"><h1 id="chart-title">BTC / USDT <span>Perpetual</span></h1><span class="market-source"><span class="status-dot"></span> MEXC</span></div><div class="market-summary"><span id="price">—</span><small id="quote-label">USDT</small><span id="live-status" role="status">Łączenie z MEXC…</span><span id="candle-time">Oczekiwanie na dane</span></div></div>
      <div class="layers"><span class="layers-title">NA WYKRESIE</span><label><input type="checkbox" data-layer="ema" checked><span>Średnie EMA</span></label><label><input type="checkbox" data-layer="levels" checked><span>Wsparcie i opór</span></label><label><input type="checkbox" data-layer="fib"><span>Fibo</span></label><label><input type="checkbox" data-layer="fvg"><span>FVG</span></label><label class="draw-control" for="draw-mode">Rysuj <select id="draw-mode"><option value="">Wybierz narzędzie</option><option value="support">Wsparcie</option><option value="resistance">Opór</option><option value="fib">Fibo · 2 punkty</option></select></label><button id="edit-open">✎ <span>Edytuj poziomy</span></button><span id="draw-status" role="status"></span></div>
      <div id="chart"></div>
      <details class="overlay-details"><summary>Szczegóły poziomów i stref</summary><div id="overlay-summary">Oczekiwanie na dane.</div></details>
      <div class="chart-footer"><div class="legend-items"><span><i class="legend support"></i> Wsparcie</span><span><i class="legend resistance"></i> Opór</span><span><i class="legend ema20"></i> EMA 20</span><span><i class="legend ema50"></i> EMA 50</span><span><i class="legend ema200"></i> EMA 200</span><span><i class="legend fib"></i> Fibo</span><span><i class="legend fvg-up"></i> FVG wzrostowe</span><span><i class="legend fvg-down"></i> FVG spadkowe</span></div><span id="data-status">Ostatnia zamknięta świeca</span></div>
    </section>
    <div class="below-chart">
      <section class="analysis-panel"><div class="section-head"><div><div class="section-kicker">OBRAZ RYNKU</div><h2>Na pierwszy rzut oka</h2></div><span class="quiet">Ostatnie zamknięte świece</span></div><div id="overview" class="overview"><p>Wczytywanie danych…</p></div></section>
      <section class="scenario-section"><div class="section-head"><div><div class="section-kicker">PLAN DZIAŁANIA</div><h2>Dwa możliwe scenariusze</h2></div><span class="quiet">Warunki, nie prognoza</span></div><div class="scenarios" id="scenarios"></div><div class="note">Scenariusze są orientacyjne. Sprawdź poziomy, koszty i warunki na MEXC przed podjęciem decyzji.</div></section>
      <section class="panel calculator"><div class="section-kicker">ZAPLANUJ RYZYKO</div><h2>Kalkulator pozycji</h2><p class="sub">Sprawdź, co oznaczają Twoje poziomy.</p><div class="field-grid"><label>Twój wkład <div class="input-wrap"><input id="margin" type="number" min="0" value="50"><span data-quote>USDT</span></div></label><label>Dźwignia <div class="input-wrap"><input id="leverage" type="number" min="1" value="2"><span>×</span></div></label><label>Wejście <input id="entry" type="number" min="0" step="any"></label><label>Stop-loss <input id="stop" type="number" min="0" step="any"></label><label>Take-profit <input id="target" type="number" min="0" step="any"></label><label>Kapitał <div class="input-wrap"><input id="capital" type="number" min="0" placeholder="Opcjonalnie"><span data-quote>USDT</span></div></label><label>Prowizja za stronę <div class="input-wrap"><input id="fee" type="number" min="0" step="0.01" value="0"><span>%</span></div></label><label>Kierunek <select id="direction"><option value="long">Long</option><option value="short">Short</option></select></label></div><div id="calc-result" class="calc-result"></div><p class="calc-note">Szacunek pomija funding, poślizg i likwidację. Wpisz swoją prowizję MEXC.</p></section>
    </div>
  </main>
</div>
<dialog id="settings"><form method="dialog" class="dialog"><div class="dialog-head"><h2>Ustawienia OpenRouter</h2><button class="close" aria-label="Zamknij">×</button></div><p>Klucz służy do rozumienia swobodnych poleceń. Jest przechowywany w pamięci serwera do jego wyłączenia.</p><label>Klucz API<input id="api-key" type="password" autocomplete="off" placeholder="Wklej klucz OpenRouter"></label><label>Model<input id="model" value="openai/gpt-4o-mini"></label><div id="key-status" class="quiet"></div><div class="dialog-actions"><button type="button" id="key-delete" class="secondary">Usuń klucz</button><button type="button" id="key-save" class="primary">Zapisz klucz</button></div></form></dialog>
<dialog id="edit-dialog"><form method="dialog" class="dialog"><div class="dialog-head"><h2>Edytuj poziomy</h2><button class="close" aria-label="Zamknij">×</button></div><p>Wpisz własne ceny. Zmiany dotyczą bieżącej analizy i są oznaczone jako ręczne.</p><div class="field-grid"><label>Fibo początek<input id="fib-start" type="number" step="any"></label><label>Fibo koniec<input id="fib-end" type="number" step="any"></label><label>Wsparcie<input id="support-edit" type="number" step="any"></label><label>Opór<input id="resistance-edit" type="number" step="any"></label></div><div class="dialog-actions"><button type="button" id="edit-reset" class="secondary">Przywróć automatyczne</button><button type="button" id="edit-save" class="primary">Zastosuj</button></div></form></dialog>`;
const $ = s => document.querySelector(s);
const intervals = ['M1','M5','M15','M30','H1','H4','H8','D1','W1'];
for (const id of ['interval','context']) $(`#${id}`).innerHTML = intervals.map(i => `<option>${i}</option>`).join('');
$('#interval').value = 'M15'; $('#context').value = 'H4';
try {
  const saved = JSON.parse(localStorage.getItem('przystan:last-chart'));
  if (saved && ['spot', 'futures'].includes(saved.market) && intervals.includes(saved.interval) && intervals.includes(saved.context) && typeof saved.symbol === 'string' && saved.symbol.length <= 60) {
    $('#market').value = saved.market;
    $('#symbol').value = saved.symbol;
    $('#interval').value = saved.interval;
    $('#context').value = saved.context;
    $('#leverage').disabled = saved.market === 'spot';
  }
} catch { /* Default chart remains available if storage is unavailable. */ }
const chart = createChart($('#chart'), { layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#89938f', fontFamily: 'Inter, sans-serif', fontSize: 11 }, grid: { vertLines: { color: '#f3f5f3' }, horzLines: { color: '#edf1ee' } }, rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: true }, crosshair: { vertLine: { color: '#b9c5bf' }, horzLine: { color: '#b9c5bf' } } });
const candlesSeries = chart.addCandlestickSeries({ upColor:'#67a991', downColor:'#d88a80', borderVisible:false, wickUpColor:'#67a991', wickDownColor:'#d88a80', priceLineVisible:false });
const emaSeries = { 20: chart.addLineSeries({color:'#d99c4a',lineWidth:1,priceLineVisible:false,lastValueVisible:false}), 50: chart.addLineSeries({color:'#718fce',lineWidth:1,priceLineVisible:false,lastValueVisible:false}), 200: chart.addLineSeries({color:'#b78ac3',lineWidth:1,priceLineVisible:false,lastValueVisible:false}) };
const zones = new Zones(chart, candlesSeries);
candlesSeries.attachPrimitive(zones);
new ResizeObserver(entries => chart.applyOptions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height })).observe($('#chart'));
let state = null, manual = {}, priceLines = [], lastRequest = 0, pendingFib = null;
const fmt = n => Number.isFinite(n) ? n.toLocaleString('pl-PL', { maximumFractionDigits: Math.abs(n) < 1 ? 16 : Math.abs(n) < 100 ? 5 : 2 }) : '—';
const priceFmt = n => Number.isFinite(n) ? n.toLocaleString('pl-PL', { maximumFractionDigits: Number.isInteger(state?.instrument?.pricePrecision) && state.instrument.pricePrecision >= 0 && state.instrument.pricePrecision <= 16 ? state.instrument.pricePrecision : 12 }) : '—';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible = name => $(`[data-layer="${name}"]`).checked;
function line(price, title, color, style = LineStyle.Dashed, axisLabelVisible = true) {
  if (Number.isFinite(price) && price > 0) priceLines.push(candlesSeries.createPriceLine({price, title, color, lineWidth: 1, lineStyle: style, axisLabelVisible}));
}
function renderLines() {
  if (!state) return;
  priceLines.forEach(p => candlesSeries.removePriceLine(p)); priceLines = [];
  for (const series of Object.values(emaSeries)) series.applyOptions({visible: visible('ema')});
  const a = state.analysis ?? { fvg: [] };
  const quote = state.instrument.quote;
  const areas = [];
  if (visible('levels')) {
    const support = manual.support ?? a.support?.price;
    const resistance = manual.resistance ?? a.resistance?.price;
    line(support, manual.support != null ? 'Wsparcie · ręczne' : 'Wsparcie', '#208267', LineStyle.Solid);
    line(resistance, manual.resistance != null ? 'Opór · ręczny' : 'Opór', '#c45e5b', LineStyle.Solid);
    if (manual.support == null && a.support) areas.push({ low: a.support.min, high: a.support.max, color: 'rgba(41, 160, 122, 0.16)' });
    if (manual.resistance == null && a.resistance) areas.push({ low: a.resistance.min, high: a.resistance.max, color: 'rgba(204, 97, 89, 0.15)' });
  }
  if (visible('fib') && (a.fib || (manual.fibStart != null && manual.fibEnd != null))) {
    const start = manual.fibStart ?? a.fib.start.price, end = manual.fibEnd ?? a.fib.end.price;
    for (const ratio of [0, .382, .5, .618, .786, 1]) line(end + (start - end) * ratio, `Fibo ${ratio}`, '#8967b0', LineStyle.Dotted, false);
  }
  if (visible('fvg')) {
    for (const f of a.fvg) areas.push({ low: f.low, high: f.high, time: f.time, color: f.direction === 'wzrostowa' ? 'rgba(54, 152, 146, 0.19)' : 'rgba(220, 153, 63, 0.20)' });
  }
  zones.setZones(areas);
  const details = [];
  if (visible('levels')) {
    for (const [name, level, override] of [['Wsparcie', a.support, manual.support], ['Opór', a.resistance, manual.resistance]]) {
      if (override != null) details.push(`${name}: ${priceFmt(override)} ${quote} · poziom ręczny`);
      else if (level) details.push(`${name}: ${priceFmt(level.min)}–${priceFmt(level.max)} ${quote} · ${level.points.length} potwierdzonych punktów`);
      else details.push(`${name}: brak potwierdzonego poziomu`);
    }
  }
  if (visible('fib') && (a.fib || (manual.fibStart != null && manual.fibEnd != null))) {
    const start = manual.fibStart ?? a.fib.start.price;
    const end = manual.fibEnd ?? a.fib.end.price;
    const values = [.382, .5, .618, .786].map(ratio => `${ratio}: ${priceFmt(end + (start - end) * ratio)}`).join(' · ');
    details.push(`Fibo: ${priceFmt(start)} → ${priceFmt(end)} ${quote}${manual.fibStart != null || manual.fibEnd != null ? ' · ręczne' : ''} | ${values}`);
  }
  if (visible('fvg')) {
    if (!a.fvg.length) details.push('Brak aktywnych FVG w analizowanym zakresie.');
    for (const f of a.fvg) details.push(`FVG ${f.direction}: ${priceFmt(f.low)}–${priceFmt(f.high)} ${quote} · wypełnione ${Math.round(f.fill * 100)}% · ${new Date(f.time * 1000).toLocaleString('pl-PL')}`);
  }
  $('#overlay-summary').replaceChildren(...details.map(text => { const row = document.createElement('p'); row.textContent = text; return row; }));
  if (!details.length) $('#overlay-summary').textContent = 'Włącz warstwy, aby zobaczyć ich wartości.';
}

function scenario(type) {
  const a = state.analysis, long = type === 'long';
  if (!a) return `<article class="scenario"><p>Za mało spójnych danych do wyznaczenia scenariusza.</p></article>`;
  const entry = long ? (manual.resistance ?? a.resistance?.max) : (manual.support ?? a.support?.min);
  const stop = long ? (manual.support ?? a.support?.min) : (manual.resistance ?? a.resistance?.max);
  const target = Number.isFinite(entry) && Number.isFinite(stop) ? entry + (entry - stop) * 2 : null;
  const className = long ? 'bull' : 'bear';
  if (!entry || !stop || entry <= stop && long || entry >= stop && !long) return `<article class="scenario ${className}"><div class="scenario-title"><span>${long?'↗':'↘'}</span><div><small>SCENARIUSZ ${long?'WZROSTOWY':'SPADKOWY'}</small><h3>Brak czytelnych poziomów</h3></div></div><p>Za mało potwierdzonych stref, aby wyznaczyć warunki.</p></article>`;
  return `<article class="scenario ${className}"><div class="scenario-title"><span>${long?'↗':'↘'}</span><div><small>SCENARIUSZ ${long?'WZROSTOWY':'SPADKOWY'}</small><h3>${long?'Wybicie ponad opór':'Wybicie poniżej wsparcia'}</h3></div></div><p>Warunek obserwacji: zamknięcie świecy ${long?'powyżej':'poniżej'} <strong>${priceFmt(entry)}</strong>. Sygnał nie jest potwierdzony, dopóki warunek nie wystąpi.</p><div class="scenario-levels"><div><small>UNIEWAŻNIENIE / SL</small><b>${priceFmt(stop)}</b></div><div><small>CEL 2R · SZACUNEK</small><b>${priceFmt(target)}</b></div></div><div class="scenario-foot">Trend ${esc(state.interval)} ${esc(a.trend)} · kontekst ${esc(state.context)} ${esc(state.contextAnalysis?.trend ?? (state.contextPending ? 'wczytywanie…' : 'niedostępny'))}</div></article>`;
}
function render({ preserveView = false, preserveCalculator = false } = {}) {
  const {analysis: a, candles, market, instrument} = state;
  const categoryLabel = { crypto: 'Kryptowaluty', stock: 'Powiązane z akcjami', other: 'Inne / bez kategorii' }[instrument.category] || 'Inne / bez kategorii';
  $('#chart-title').innerHTML = `${esc(instrument.base)} / ${esc(instrument.quote)} <span>${market === 'spot' ? 'Spot' : 'Perpetual'}</span><span>${esc(categoryLabel)} · MEXC</span>`;
  $('#quote-label').textContent = instrument.quote;
  document.querySelectorAll('[data-quote]').forEach(label => label.textContent = instrument.quote);
  const last = state.currentCandle || candles.at(-1);
  $('#price').textContent = priceFmt(last.close);
  $('#candle-time').textContent = candles.length ? `Analiza do zamknięcia · ${new Date((candles.at(-1).time + state.seconds) * 1000).toLocaleString('pl-PL')}` : 'Brak zamkniętych świec';
  $('#data-status').textContent = `MEXC ${market} · pobrano ${new Date(state.fetchedAt).toLocaleTimeString('pl-PL')}`;
  const precision = Number.isInteger(instrument.pricePrecision) && instrument.pricePrecision >= 0 && instrument.pricePrecision <= 16 ? instrument.pricePrecision : (last.close >= 100 ? 2 : last.close >= 1 ? 4 : 10);
  candlesSeries.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } });
  const visibleCandles = state.currentCandle ? [...candles, state.currentCandle] : candles;
  candlesSeries.setData(visibleCandles);
  for (const n of [20, 50, 200]) {
    emaSeries[n].setData(a ? candles.flatMap((candle, i) => a.averages[n][i] == null ? [] : [{time: candle.time, value: a.averages[n][i]}]) : []);
  }
  if (!preserveView) chart.timeScale().fitContent();
  renderLines();
  renderOverview();
  if (!preserveCalculator) { $('#entry').value = last.close; $('#stop').value = ''; $('#target').value = ''; }
  calculate();
}
function renderOverview() {
  const { analysis: a, contextAnalysis: c, candles, interval, context, instrument } = state;
  if (a) {
    $('#overview').innerHTML = `<div class="overview-row"><span>Trend ${esc(interval)}</span><strong>${esc(a.trend)}</strong></div><div class="overview-row"><span>Trend ${esc(context)}</span><strong>${esc(c?.trend ?? (state.contextPending ? 'wczytywanie…' : 'niedostępny'))}</strong></div><div class="overview-row"><span>Cena / EMA 200</span><strong>${a.price > a.averages[200].at(-1) ? 'Powyżej' : 'Poniżej'}</strong></div><div class="overview-row"><span>RSI 14</span><strong>${fmt(a.rsi)}</strong></div><div class="overview-row"><span>ATR 14</span><strong>${priceFmt(a.atr)} ${esc(instrument.quote)}</strong></div><div class="overview-row"><span>Wolumen / średnia 20</span><strong>${fmt(a.volumeRatio)}×</strong></div><div class="overview-row"><span>Ostatnie aktywne FVG (maks. 5)</span><strong>${a.fvg.length}</strong></div><div class="insight">${!c ? (state.contextPending ? 'Pobieram dane interwału kontekstowego.' : 'Brak wystarczających danych dla interwału kontekstowego.') : a.trend === c.trend && a.trend !== 'niejednoznaczny' ? 'Struktura obu interwałów wskazuje ten sam kierunek.' : 'Kierunki interwałów nie są zgodne lub trend jest niejednoznaczny.'}</div>`;
  } else {
    const lastClosed = state.candles.at(-1);
    const stale = lastClosed && state.fetchedAt / 1000 - (lastClosed.time + state.seconds) > state.seconds * 2;
    $('#overview').textContent = stale ? 'Analiza niedostępna: ostatnia zamknięta świeca MEXC jest nieaktualna. Wykres pokazuje otrzymaną historię.' : state.hasGaps ? 'Analiza niedostępna: w historii świec MEXC występują luki. Wykres pokazuje otrzymane dane.' : 'Za mało zamkniętych świec do analizy EMA 200. Wykres pokazuje dostępną historię.';
  }
  $('#scenarios').innerHTML = scenario('long') + scenario('short');
}
async function getCandles(market, symbol, interval) {
  const res = await fetch(`/api/candles?${new URLSearchParams({market, symbol, interval})}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
function analysisFor(data) {
  const last = data?.candles.at(-1);
  const recent = last && data.fetchedAt / 1000 - (last.time + data.seconds) <= data.seconds * 2;
  return data && recent && !data.hasGaps && data.candles.length >= 220 ? analyze(data.candles) : null;
}
function manualKey(market, symbol, interval) { return `przystan:manual:${market}:${symbol}:${interval}`; }
function readManual(market, symbol, interval) {
  try { return JSON.parse(localStorage.getItem(manualKey(market, symbol, interval))) || {}; }
  catch { return {}; }
}
function storeManual() {
  if (!state) return;
  try { localStorage.setItem(manualKey(state.market, state.symbol, state.interval), JSON.stringify(manual)); }
  catch { $('#message').textContent = 'Nie udało się zapisać ręcznych poziomów w przeglądarce.'; }
}
let liveTimer;
let retryTimer;
let liveGeneration = 0;
function setLiveStatus(text, active = false) {
  $('#live-status').textContent = text;
  $('#live-status').classList.toggle('live-active', active);
}
function scheduleLive() {
  clearTimeout(liveTimer);
  if (!state) return;
  const generation = ++liveGeneration;
  liveTimer = setTimeout(async () => {
    const current = state;
    if (!current || generation !== liveGeneration) return;
    try {
      const params = new URLSearchParams({market: current.market, symbol: current.symbol, interval: current.interval});
      const response = await fetch(`/api/live?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (generation !== liveGeneration || state !== current) return;
      const now = Math.floor(data.fetchedAt / 1000);
      const latestClosed = data.candles.filter(c => c.time + data.seconds <= now).at(-1);
      const lastClosedTime = current.candles.at(-1)?.time ?? -Infinity;
      if (latestClosed && latestClosed.time > lastClosedTime) {
        await load({ preserve: true });
        return;
      }
      const forming = data.candles.find(c => c.time <= now && c.time + data.seconds > now);
      if (forming && forming.time > lastClosedTime) {
        candlesSeries.update(forming);
        current.currentCandle = forming;
        $('#price').textContent = priceFmt(forming.close);
        setLiveStatus(`Świeca bieżąca · aktualizacja ${new Date(data.fetchedAt).toLocaleTimeString('pl-PL')}`, true);
      } else {
        setLiveStatus('Brak aktualnej świecy MEXC · ponawianie');
      }
    } catch (error) {
      if (generation !== liveGeneration) return;
      setLiveStatus(`Aktualizacja przerwana · ${error.message || 'błąd połączenia'} · ponawianie`);
    }
    if (generation === liveGeneration) scheduleLive();
  }, document.hidden ? 15000 : 5000);
}
async function load({ preserve = false } = {}) {
  clearTimeout(liveTimer);
  clearTimeout(retryTimer);
  liveGeneration++;
  const request = ++lastRequest, market = $('#market').value, symbol = $('#symbol').value.toUpperCase().replace(/[-_/\s]/g, ''), interval = $('#interval').value, context = $('#context').value;
  const sameChart = preserve && state?.market === market && state.symbol === symbol && state.interval === interval;
  if (state && (state.market !== market || state.symbol !== symbol || state.interval !== interval)) {
    $('#draw-mode').value = ''; pendingFib = null; $('#draw-status').textContent = ''; $('#chart').classList.remove('drawing');
    state = null;
    candlesSeries.setData([]); Object.values(emaSeries).forEach(series => series.setData([]));
    priceLines.forEach(line => candlesSeries.removePriceLine(line)); priceLines = []; zones.setZones([]);
    $('#price').textContent = '—'; $('#chart-title').textContent = symbol;
    $('#candle-time').textContent = 'Pobieranie danych…'; $('#data-status').textContent = '';
    $('#overlay-summary').textContent = 'Pobieranie danych…'; $('#overview').textContent = 'Pobieranie danych…'; $('#scenarios').innerHTML = '';
  }
  $('#symbol').value = symbol;
  $('#message').textContent = 'Pobieram świece MEXC…';
  setLiveStatus('Łączenie z MEXC…');
  $('#refresh').disabled = true;
  try {
    const primary = getCandles(market, symbol, interval);
    const contextRequest = (interval === context ? primary : getCandles(market, symbol, context)).catch(() => null);
    const data = await primary;
    if (request !== lastRequest) return;
    state = { ...data, analysis: analysisFor(data), contextAnalysis: null, contextPending: true, market, symbol, interval, context };
    const displayedState = state;
    if (!sameChart) manual = readManual(market, symbol, interval);
    try { localStorage.setItem('przystan:last-chart', JSON.stringify({market, symbol, interval, context})); } catch { /* The chart works without storage. */ }
    render({ preserveView: sameChart, preserveCalculator: sameChart });
    if (data.currentCandle) setLiveStatus(`Świeca bieżąca · aktualizacja ${new Date(data.fetchedAt).toLocaleTimeString('pl-PL')}`, true);
    else setLiveStatus('Brak aktualnej świecy MEXC · ponawianie');
    $('#message').textContent = '';
    scheduleLive();
    contextRequest.then(contextData => {
      if (request !== lastRequest || state !== displayedState) return;
      state.contextAnalysis = analysisFor(contextData);
      state.contextPending = false;
      renderOverview();
      if (!contextData) $('#message').textContent = 'Wykres jest dostępny, ale nie udało się pobrać danych interwału kontekstowego.';
    });
  } catch (error) {
    if (request !== lastRequest) return;
    state = null;
    candlesSeries.setData([]); Object.values(emaSeries).forEach(series => series.setData([]));
    priceLines.forEach(line => candlesSeries.removePriceLine(line)); priceLines = []; zones.setZones([]);
    $('#price').textContent = '—'; $('#chart-title').textContent = `${symbol} · ${market === 'spot' ? 'Spot' : 'Perpetual'}`;
    $('#candle-time').textContent = 'Dane niedostępne'; $('#data-status').textContent = ''; $('#overlay-summary').textContent = 'Dane niedostępne.';
    $('#overview').textContent = 'Analiza niedostępna.'; $('#scenarios').innerHTML = ''; setLiveStatus('Brak danych');
    const retryable = /nie udało się połączyć|failed to fetch|networkerror|HTTP (429|5\d\d)/i.test(error.message);
    $('#message').textContent = `Nie udało się pobrać wykresu. ${error.message}${retryable ? ' Ponowię próbę za 10 sekund.' : ''}`;
    if (retryable) retryTimer = setTimeout(() => { if (request === lastRequest) load(); }, 10000);
  } finally { if (request === lastRequest) $('#refresh').disabled = false; }
}
function calculate() {
  if (state && state.market === 'futures' && !state.instrument.linear) { $('#calc-result').textContent = 'Kalkulator nie obsługuje kontraktów odwrotnych rozliczanych w kryptowalucie.'; return; }
  const quote = state?.instrument.quote || 'USDT';
  const get = id => Number($(`#${id}`).value); const margin=get('margin'), leverage=$('#market').value==='spot'?1:get('leverage'), entry=get('entry'), stop=get('stop'), target=get('target'), fee=get('fee')/100, capital=get('capital'), sign=$('#direction').value==='long'?1:-1;
  if (!(margin>0 && leverage>=1 && entry>0 && fee>=0)) { $('#calc-result').textContent='Wpisz poprawny wkład, dźwignię i cenę wejścia.'; return; }
  const notional = margin*leverage, quantity = notional/entry;
  const pnl = p => sign*quantity*(p-entry) - fee*(notional+quantity*p);
  const row = (name,p) => p>0 ? `<div><span>${name}</span><strong class="${pnl(p)>=0?'positive':'negative'}">${fmt(pnl(p))} ${esc(quote)} · ${fmt(pnl(p)/margin*100)}% wkładu${capital>0?` · ${fmt(pnl(p)/capital*100)}% konta`:''}</strong></div>` : '';
  const warning = (stop>0 && sign*(stop-entry)>=0) || (target>0 && sign*(target-entry)<=0);
  $('#calc-result').innerHTML = `<div><span>Wartość pozycji</span><strong>${fmt(notional)} ${esc(quote)}</strong></div>${row('Wynik przy SL',stop)}${row('Wynik przy TP',target)}${warning?'<p class="negative">Sprawdź kierunek SL i TP względem wejścia.</p>':''}`;
}
function setDefaultContext() { $('#context').value = ['M1','M5','M15','M30','H1'].includes($('#interval').value) ? 'H4' : 'D1'; }
$('#refresh').onclick = load;
$('#interval').onchange = () => { setDefaultContext(); load(); };
$('#context').onchange = load;
document.querySelectorAll('[data-layer]').forEach(element => {
  try {
    const saved = localStorage.getItem(`przystan:layer:${element.dataset.layer}`);
    if (saved !== null) element.checked = saved === 'true';
  } catch { /* The controls still work when browser storage is unavailable. */ }
  element.onchange = () => {
    try { localStorage.setItem(`przystan:layer:${element.dataset.layer}`, String(element.checked)); } catch { /* Keep the current session usable. */ }
    renderLines();
  };
});
document.querySelectorAll('.calculator input, .calculator select').forEach(e=>e.addEventListener('input',calculate));
$('#market').addEventListener('change', () => { $('#leverage').disabled = $('#market').value === 'spot'; calculate(); closeSymbols(); fetchSymbols(); load(); });
$('#draw-mode').addEventListener('change', () => {
  pendingFib = null;
  const mode = $('#draw-mode').value;
  $('#draw-status').textContent = !mode ? '' : mode === 'fib' ? 'Kliknij pierwszy punkt Fibo na wykresie.' : 'Kliknij cenę na wykresie, aby wyznaczyć poziom.';
  $('#chart').classList.toggle('drawing', Boolean(mode));
});
let drawStart = null;
$('#chart').addEventListener('pointerdown', event => {
  if ($('#draw-mode').value) drawStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
});
$('#chart').addEventListener('pointerup', event => {
  const mode = $('#draw-mode').value;
  if (!state || !mode || !drawStart || drawStart.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - drawStart.x, event.clientY - drawStart.y);
  drawStart = null;
  const bounds = $('#chart').getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  if (distance > 5 || x < 0 || x >= chart.timeScale().width() || y < 0 || y >= bounds.height - chart.timeScale().height()) return;
  const price = candlesSeries.coordinateToPrice(y);
  if (!Number.isFinite(price) || price <= 0) return;
  if (mode === 'fib' && pendingFib == null) {
    pendingFib = price;
    $('#draw-status').textContent = `Pierwszy punkt ${priceFmt(price)}. Kliknij drugi punkt Fibo.`;
    return;
  }
  if (mode === 'fib') {
    manual.fibStart = pendingFib;
    manual.fibEnd = price;
    pendingFib = null;
  } else manual[mode] = price;
  const layer = document.querySelector(`[data-layer="${mode === 'fib' ? 'fib' : 'levels'}"]`);
  if (!layer.checked) { layer.checked = true; layer.dispatchEvent(new Event('change')); }
  storeManual();
  renderLines();
  $('#scenarios').innerHTML = scenario('long') + scenario('short');
  $('#draw-status').textContent = `Zapisano poziom ${priceFmt(price)} ${state.instrument.quote}.`;
  $('#draw-mode').value = '';
  $('#chart').classList.remove('drawing');
});
$('#settings-open').onclick=()=>$('#settings').showModal(); $('#key-save').onclick=()=>saveKey($('#api-key').value); $('#key-delete').onclick=()=>saveKey('');
async function saveKey(key) { const res=await fetch('/api/key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})}); const data=await res.json(); $('#api-key').value=''; $('#key-status').textContent=data.configured?'Klucz zapisany na czas działania serwera.':'Klucz usunięty.'; }
$('#edit-open').onclick=()=>{ if(!state)return; $('#fib-start').value=manual.fibStart??state.analysis?.fib?.start.price??''; $('#fib-end').value=manual.fibEnd??state.analysis?.fib?.end.price??''; $('#support-edit').value=manual.support??state.analysis?.support?.price??''; $('#resistance-edit').value=manual.resistance??state.analysis?.resistance?.price??''; $('#edit-dialog').showModal(); };
$('#edit-save').onclick=()=>{ manual={}; for(const [id,key] of [['fib-start','fibStart'],['fib-end','fibEnd'],['support-edit','support'],['resistance-edit','resistance']]) {const value=Number($(`#${id}`).value); if(value>0) manual[key]=value;} storeManual(); renderLines(); $('#scenarios').innerHTML = scenario('long') + scenario('short'); $('#edit-dialog').close(); }; $('#edit-reset').onclick=()=>{manual={};storeManual();renderLines();$('#scenarios').innerHTML = scenario('long') + scenario('short');$('#edit-dialog').close();};
document.querySelectorAll('.example').forEach(b=>b.onclick=()=>{ $('#prompt').value=b.dataset.prompt; $('#command-form').requestSubmit(); });
$('#command-form').onsubmit=async e=>{ e.preventDefault(); const prompt=$('#prompt').value.trim(); if(!prompt)return; let result={};
  const keyStatus=await fetch('/api/key').then(r=>r.json());
  if(keyStatus.configured) { try { const res=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,model:$('#model').value})}); result=await res.json(); if(!res.ok)throw new Error(result.error); } catch(error) { $('#message').textContent=error.message; return; } }
  else { const symbol=prompt.toUpperCase().match(/\b([A-Z0-9]{2,12})[\s/_-]*(USDT)\b/); const interval=prompt.toUpperCase().match(/\b(M1|M5|M15|M30|H1|H4|H8|D1|W1)\b/); result={symbol:symbol?.[1]+'USDT',interval:interval?.[1],market:/\bspot\b/i.test(prompt)?'spot':/futures|perpetual/i.test(prompt)?'futures':null,layers:[]}; if(!symbol)result.symbol=null; for(const [pattern,layer] of [[/fibo/i,'fib'],[/fvg/i,'fvg'],[/wspar|opor/i,'levels'],[/ema|średni/i,'ema']])if(pattern.test(prompt))result.layers.push(layer); }
  if (typeof result.symbol === 'string' && symbolCatalog.some(item => item.symbol === result.symbol)) $('#symbol').value=result.symbol; if (['spot','futures'].includes(result.market) && result.market !== $('#market').value) { $('#market').value = result.market; $('#leverage').disabled = result.market === 'spot'; fetchSymbols(); } if(intervals.includes(result.interval)){ $('#interval').value=result.interval; setDefaultContext(); } if(Array.isArray(result.layers)&&result.layers.length) document.querySelectorAll('[data-layer]').forEach(el=>{el.checked=result.layers.includes(el.dataset.layer)}); await load();
};

let symbolCatalog = [];
let symbolMatches = [];
let selectedSuggestion = -1;
let catalogRequest = 0;
const symbolInput = $('#symbol');
const symbolList = $('#symbol-list');
function closeSymbols() {
  symbolList.hidden = true;
  symbolInput.setAttribute('aria-expanded', 'false');
  $('#symbol-toggle').setAttribute('aria-expanded', 'false');
  symbolInput.removeAttribute('aria-activedescendant');
  selectedSuggestion = -1;
}
function showSymbols(showAll = false) {
  const query = showAll ? '' : symbolInput.value;
  symbolMatches = findSymbols(symbolCatalog, query, $('#asset-category').value);
  symbolList.replaceChildren();
  selectedSuggestion = -1;
  if (!symbolCatalog.length) return;
  if (!symbolMatches.length) {
    const empty = document.createElement('div');
    empty.className = 'symbol-empty';
    empty.textContent = 'Brak pasujących par na tym rynku.';
    symbolList.append(empty);
  } else {
    const count = document.createElement('div');
    count.className = 'symbol-count';
    count.textContent = `Wyniki: ${symbolMatches.length} · kategorie według MEXC`;
    symbolList.append(count);
    for (const [index, item] of symbolMatches.entries()) {
      const option = document.createElement('button');
      option.type = 'button';
      option.id = `symbol-option-${index}`;
      option.className = 'symbol-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const pair = document.createElement('strong');
      pair.textContent = `${item.base} / ${item.quote}`;
      const market = document.createElement('span');
      const categoryLabel = { crypto: 'Kryptowaluty', stock: 'Powiązane z akcjami', other: 'Inne / bez kategorii' }[item.category] || 'Inne / bez kategorii';
      market.textContent = `${categoryLabel} · ${$('#market').value === 'spot' ? 'Spot' : 'Perpetual'}${item.linear ? '' : ` · rozliczenie ${item.settlement}`}`;
      option.append(pair, market);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => chooseSymbol(item));
      symbolList.append(option);
    }
  }
  symbolList.hidden = false;
  symbolList.scrollTop = 0;
  symbolInput.setAttribute('aria-expanded', 'true');
  $('#symbol-toggle').setAttribute('aria-expanded', 'true');
  $('#symbol-feedback').textContent = `Liczba podpowiedzi: ${symbolMatches.length}.`;
}
function chooseSymbol(item) {
  symbolInput.value = item.symbol;
  closeSymbols();
  symbolInput.blur();
  load();
}
async function fetchSymbols() {
  const request = ++catalogRequest;
  const market = $('#market').value;
  symbolCatalog = [];
  $('#symbol-feedback').textContent = 'Pobieram listę par MEXC.';
  try {
    const response = await fetch(`/api/symbols?market=${encodeURIComponent(market)}`);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.symbols)) throw new Error(data.error || 'Nie udało się pobrać par.');
    if (request !== catalogRequest) return;
    symbolCatalog = data.symbols;
    $('#symbol-feedback').textContent = `Pobrano ${symbolCatalog.length} par.`;
    if (document.activeElement === symbolInput) showSymbols(true);
  } catch (error) {
    if (request !== catalogRequest) return;
    $('#symbol-feedback').textContent = error.message;
    $('#message').textContent = `Podpowiedzi par są niedostępne. Możesz wpisać parę ręcznie. ${error.message}`;
  }
}
$('#asset-category').addEventListener('change', closeSymbols);
symbolInput.addEventListener('focus', () => { symbolInput.select(); showSymbols(true); });
symbolInput.addEventListener('input', () => showSymbols());
$('#symbol-toggle').addEventListener('mousedown', event => event.preventDefault());
$('#symbol-toggle').addEventListener('click', () => {
  const wasOpen = !symbolList.hidden;
  if (wasOpen) closeSymbols();
  else { symbolInput.focus(); symbolInput.select(); showSymbols(true); }
});
symbolInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeSymbols(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (symbolList.hidden) showSymbols(true);
    if (!symbolMatches.length) return;
    event.preventDefault();
    selectedSuggestion = (selectedSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + symbolMatches.length) % symbolMatches.length;
    const options = symbolList.querySelectorAll('[role="option"]');
    options.forEach((option, index) => option.setAttribute('aria-selected', String(index === selectedSuggestion)));
    symbolInput.setAttribute('aria-activedescendant', options[selectedSuggestion].id);
    options[selectedSuggestion].scrollIntoView({ block: 'nearest' });
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (!symbolList.hidden && selectedSuggestion >= 0) chooseSymbol(symbolMatches[selectedSuggestion]);
    else { closeSymbols(); symbolInput.blur(); load(); }
  }
});
document.addEventListener('click', event => { if (!event.target.closest('.symbol-picker')) closeSymbols(); });
fetchSymbols();

load();
