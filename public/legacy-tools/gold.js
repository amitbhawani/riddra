/* ═══════════════════════════════════════════════════════════════════════
   Gold Price Calculator by MasterGadgets.com
   Made by @AmitBhawani in India
   
   Self-mounting JS file. Requires:
   - mg-design.css loaded at /tools/mg-design.css
   - Chart.js loaded separately
   - Mount target: <div id="mg-gold-root"></div>
   ═══════════════════════════════════════════════════════════════════════ */

(function(){
'use strict';

// ─── CONSTANTS ───
const TROY = 31.1035;
const BCD = 0.05;
const AIDC = 0.01;
const GST = 0.03;
const KF = { 24: 1, 22: 0.916, 18: 0.75 };
const HKEY = 'gold_ph_v6';
const CKEY = 'gold_cts';
const CACHE_MINUTES = 5;
const REQUEST_TIMEOUT_MS = 1500;
const CITY_TIMEOUT_MS = 1200;
const BACKEND_SAVE_MINUTES = 30;
const MAX_HIST = 90;
const FB_XAU = 4700;
const FB_INR = 93.5;

// ─── STATE ───
const S = {
  xauusd: 0, usdinr: 0,
  g24: 0, g22: 0, g18: 0,
  base: 0, duty: 0, landed24: 0,
  src: 'Loading', city: '', updated: null, xauUpdatedAt: '',
  history: [], charts: {},
  cd: { 24: 14, 22: 14, 18: 14 }, n: 0,
  isSeeded: false
};

// ─── MOUNT ───
const root = document.getElementById('mg-gold-root');
if (!root) return;

// Determine initial theme
const savedTheme = localStorage.getItem('mg_gold_theme') || 'light';

root.innerHTML = buildHTML();
root.className = 'mg-app ' + (savedTheme === 'dark' ? 'mg-dark' : 'mg-light');

// ─── INIT ───
(async function initGold() {
  try {
    await loadDBHistory();
    updateUI();
  } catch (e) {
    loadHistory();
    updateUI();
  }

  detectCity();
  fetchRates();
})();

setupChartButtons();
updateHeaderDate();
setupThemeToggle();

// ═══════════════════════════════════════════════════════════════
// HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════
function buildHTML() {
  return `
<!-- THEME BAR -->
<div class="mg-theme-bar">
  <div class="mg-theme-switch" id="goldThemeSwitch">
    <span>Theme</span>
    <div class="mg-theme-pill"><div class="mg-theme-dot">&#9789;</div></div>
  </div>
</div>

<!-- HERO -->
<div class="mg-hero">
  <div class="mg-hero-badge">Live Gold Rates</div>
  <h1>Gold <em>Price</em> Calculator</h1>
  <p>Live landed rates in <strong id="goldCityName">India</strong> with transparent duty breakdown</p>
  <div class="mg-gold-hero-pills" id="goldHeroPills">
    <a href="#goldSec24" class="mg-gold-hero-pill gold"><span class="mg-gold-hp-label">24K</span><span class="mg-gold-hp-price" id="hp24">...</span></a>
    <a href="#goldSec22" class="mg-gold-hero-pill"><span class="mg-gold-hp-label">22K</span><span class="mg-gold-hp-price" id="hp22">...</span></a>
    <a href="#goldSec18" class="mg-gold-hero-pill"><span class="mg-gold-hp-label">18K</span><span class="mg-gold-hp-price" id="hp18">...</span></a>
  </div>
</div>

<!-- HEADER BAR -->
<div class="mg-container">
  <div class="mg-gold-header-bar">
    <div class="mg-gold-header-left">
      <div class="mg-gold-header-title"><span class="mg-gold-live-dot"></span>Gold Rate Today <span id="goldHeaderCity"></span></div>
      <div class="mg-gold-header-date" id="goldHeaderDate"></div>
    </div>
    <div class="mg-gold-header-right">
      <span class="mg-gold-source-badge" id="goldSourceBadge"><span class="mg-gold-sdot"></span> Loading</span>
    </div>
  </div>
</div>

<div class="mg-container">

${buildKaratSection('24', '24K Pure Gold', 'k24')}
${buildKaratSection('22', '22K Jewellery Gold', 'k22')}
${buildKaratSection('18', '18K Standard Gold', 'k18')}

<!-- INSIGHTS -->
<div class="mg-section mg-animate-in" style="margin-top:8px;">
  <div class="mg-section-header">
    <div class="mg-section-icon">&#128161;</div>
    <div><div class="mg-section-title">Insights</div><div class="mg-section-subtitle">Market intelligence at a glance</div></div>
  </div>
  <div class="mg-section-body">
    <div class="mg-gold-insights-grid" id="goldInsights"></div>
  </div>
</div>

<!-- BREAKDOWN + MARKET DATA -->
<div class="mg-row-2 mg-animate-in">
  <div class="mg-section">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128209;</div>
      <div><div class="mg-section-title">Price Breakdown</div><div class="mg-section-subtitle">24K per gram calculation</div></div>
    </div>
    <div class="mg-section-body" id="goldBreakdown"></div>
  </div>
  <div class="mg-section">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#127760;</div>
      <div><div class="mg-section-title">Market Data</div><div class="mg-section-subtitle">International rates & premiums</div></div>
    </div>
    <div class="mg-section-body" id="goldMarketData"></div>
  </div>
</div>

<!-- INVESTMENT CALCULATOR -->
<div class="mg-section mg-animate-in">
  <div class="mg-section-header">
    <div class="mg-section-icon">&#128176;</div>
    <div><div class="mg-section-title">Gold Investment Calculator</div><div class="mg-section-subtitle">Calculate total cost including making charges & GST</div></div>
  </div>
  <div class="mg-section-body">
    <div class="mg-row-2">
      <div class="mg-subcard">
        <label class="mg-input-label">Gold Purity</label>
        <select class="mg-input-text" id="goldInvKarat" onchange="window._goldPrefill()">
          <option value="24">24K Pure Gold</option>
          <option value="22" selected>22K Jewellery Gold</option>
          <option value="18">18K Standard Gold</option>
        </select>
      </div>
      <div class="mg-subcard">
        <label class="mg-input-label">Current Rate / gram (auto)</label>
        <div class="mg-input-field"><input class="mg-input" id="goldInvRate" readonly style="opacity:.65;cursor:default;"></div>
      </div>
    </div>
    <div class="mg-row-2">
      <div class="mg-subcard">
        <label class="mg-input-label">Weight (grams)</label>
        <div class="mg-input-field"><input type="number" class="mg-input" id="goldInvWeight" placeholder="e.g. 10" value="10"></div>
      </div>
      <div class="mg-subcard">
        <label class="mg-input-label">Making Charges %</label>
        <select class="mg-input-text" id="goldInvMaking">
          <option value="0">0% (Gold Bars / Bullion)</option>
          <option value="5" selected>5% (Gold Coins)</option>
          <option value="8">8% (Plain Jewellery)</option>
          <option value="12">12% (Designer Jewellery)</option>
          <option value="18">18% (Antique / Kundan)</option>
        </select>
      </div>
    </div>
    <div style="text-align:center;padding-top:8px;">
      <button class="mg-btn-primary" onclick="window._goldCalcInvest()">Calculate Total Cost</button>
    </div>
    <div class="mg-gold-invest-result" id="goldInvResult">
      <div class="mg-gold-ir-row"><span class="mg-gold-ir-label">Gold Value</span><span class="mg-gold-ir-value" id="irGold"></span></div>
      <div class="mg-gold-ir-row"><span class="mg-gold-ir-label">Making Charges</span><span class="mg-gold-ir-value" id="irMaking"></span></div>
      <div class="mg-gold-ir-row"><span class="mg-gold-ir-label">Sub Total</span><span class="mg-gold-ir-value" id="irSub"></span></div>
      <div class="mg-gold-ir-row"><span class="mg-gold-ir-label">GST (3% on Gold + Making)</span><span class="mg-gold-ir-value" id="irGST"></span></div>
      <div class="mg-gold-ir-row mg-gold-ir-total"><span class="mg-gold-ir-label">Grand Total</span><span class="mg-gold-ir-value" id="irTotal"></span></div>
    </div>
  </div>
</div>

</div><!-- /mg-container -->

<!-- STATUS BANNER -->
<div class="mg-gold-status-banner" id="goldStatusBanner" style="display:none;"></div>

<!-- FOOTER -->
<div class="mg-footer">
  <strong>Gold Price Calculator</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with &#10084;&#65039; by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India
  <br><br>
  <div style="max-width:700px;margin:0 auto;line-height:1.7;">
    <strong>Disclaimer:</strong> This calculator is for educational and informational purposes only. It does not constitute financial advice. Gold prices shown are indicative landed rates based on international market data (XAU/USD) converted to INR with import duties (BCD 5% + AIDC 1%) and GST (3%). Actual prices at local jewellers may vary due to making charges, wastage, and local market conditions. Past price trends do not guarantee future performance. Please verify rates with your jeweller before making any purchase or investment decisions.
  </div>
  <br>BCD: 5% | AIDC: 1% | GST on Gold: 3% | GST on Making: 5% | All rates subject to govt revision.
</div>
`;
}

function buildKaratSection(k, label, tagClass) {
  return `
<div class="mg-gold-karat-section mg-animate-in" id="goldSec${k}" style="scroll-margin-top:20px;">
  <div class="mg-gold-karat-header">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="mg-gold-karat-tag ${tagClass}">${label}</span>
      <span class="mg-gold-karat-change" id="goldChg${k}">...</span>
    </div>
    <div class="mg-gold-karat-price"><span class="mg-gold-kp-cur">&#8377;</span><span id="goldLp${k}">...</span><span class="mg-gold-kp-unit">/ gram</span></div>
  </div>
  <div class="mg-table-wrap mg-gold-table-wrap">
    <table class="mg-table mg-gold-table">
      <thead><tr><th>Date</th><th>1 Gram</th><th>10 Grams</th><th>100 Grams</th><th>Change (100g)</th></tr></thead>
      <tbody id="goldTb${k}"></tbody>
    </table>
  </div>
  <div class="mg-gold-chart-wrap">
    <div class="mg-gold-chart-top">
      <div class="mg-pill-row" data-karat="${k}">
        <button class="mg-pill active" data-days="14">14D</button>
        <button class="mg-pill" data-days="30">30D</button>
        <button class="mg-pill" data-days="90">90D</button>
      </div>
      <div class="mg-gold-chart-watermark">${k}K Gold Price Tracker by MasterGadgets.com</div>
    </div>
    <div class="mg-gold-chart-canvas"><canvas id="goldChart${k}"></canvas></div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════
function setupThemeToggle() {
  const sw = document.getElementById('goldThemeSwitch');
  if (!sw) return;
  sw.addEventListener('click', () => {
    const isDark = root.classList.contains('mg-dark');
    root.classList.toggle('mg-dark', !isDark);
    root.classList.toggle('mg-light', isDark);
    localStorage.setItem('mg_gold_theme', isDark ? 'light' : 'dark');
    const dot = sw.querySelector('.mg-theme-dot');
    if (dot) dot.innerHTML = isDark ? '&#9789;' : '&#9788;';
    Object.keys(S.charts).forEach(k => { if (S.charts[k]) renderChart(k); });
  });
  // Set initial dot
  const dot = sw.querySelector('.mg-theme-dot');
  if (dot) dot.innerHTML = savedTheme === 'dark' ? '&#9788;' : '&#9789;';
}

// ═══════════════════════════════════════════════════════════════
// HEADER DATE
// ═══════════════════════════════════════════════════════════════
function updateHeaderDate() {
  const el = document.getElementById('goldHeaderDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════
// CITY DETECTION
// ═══════════════════════════════════════════════════════════════
async function detectCity() {
  try {
    const d = await fetchJSON('https://ipapi.co/json/', CITY_TIMEOUT_MS);
    const c = d && d.city;
    if (c) {
      S.city = c;
      const cn = document.getElementById('goldCityName');
      const hc = document.getElementById('goldHeaderCity');
      if (cn) cn.textContent = c;
      if (hc) hc.textContent = c;
      return;
    }
  } catch (e) {}
  const fallbackCity = '';
  const hc = document.getElementById('goldHeaderCity');
  if (hc) hc.textContent = fallbackCity;
  const cn = document.getElementById('goldCityName');
  if (cn && !S.city) cn.textContent = 'India';
}

function calcSpotGold(xauusd, usdinr, factor) {
  const base = (xauusd / TROY) * usdinr;
  return Math.round(base * factor);
}

function calcLandedGold(base) {
  return Math.round(base * (1 + BCD + AIDC) * (1 + GST));
}

function normalizedHistoryEntry(item) {
  const xauusd = Number(item.xauusd);
  const usdinr = Number(item.usdinr);
  const canRecalc = isFiniteRate(xauusd) && isFiniteRate(usdinr);
  const base = canRecalc ? (xauusd / TROY) * usdinr : 0;
  const gold24 = canRecalc ? calcLandedGold(base) : Number(item.gold24);
  if (isNaN(gold24)) return null;
  return {
    date: item.date,
    gold24,
    gold22: canRecalc ? Math.round(gold24 * KF[22]) : Number(item.gold22) || Math.round(gold24 * KF[22]),
    gold18: canRecalc ? Math.round(gold24 * KF[18]) : Number(item.gold18) || Math.round(gold24 * KF[18]),
    xauusd: canRecalc ? xauusd : FB_XAU,
    usdinr: canRecalc ? usdinr : FB_INR
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════
function shouldFetch() {
  try {
    const t = localStorage.getItem(CKEY);
    return !t || (Date.now() - parseInt(t, 10)) / 6e4 >= CACHE_MINUTES;
  } catch (e) { return true; }
}

async function fetchRates() {
S.n++;

const isFirstLoad = S.n === 1;
const today = getTodayISO();
const last = S.history.length ? S.history[S.history.length - 1] : null;

if (
  !shouldFetch() &&
  !isFirstLoad &&
  last &&
  last.date === today
) {
  const l = last;
    S.xauusd = l.xauusd; S.usdinr = l.usdinr; S.src = 'Cached';
calc();
updateUI();

if (S.src === 'Live' || S.src === 'Partial') {
  maybeSaveToBackend();
}

updBanner();
    setTimeout(fetchRates, CACHE_MINUTES * 6e4);
    return;
  }
  let gX = false, gI = false;
  const inrCandidates = [];
  const xauCandidates = [];
  const res = await Promise.allSettled([
    fj('https://api.exchangerate-api.com/v4/latest/USD'),
    fj('https://open.er-api.com/v6/latest/USD'),
    fj('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
  ]);
  for (let i = 0; i < 3; i++) {
    if (res[i].status !== 'fulfilled' || !res[i].value) continue;
    const d = res[i].value;
    if (i < 2 && isFiniteRate(d.rates?.INR)) {
      inrCandidates.push(Number(d.rates.INR));
    } else if (i === 2 && isFiniteRate(d.usd?.inr)) {
      inrCandidates.push(Number(d.usd.inr));
    }
  }
  try {
    const goldApi = await fetchJSON('https://api.gold-api.com/price/XAU', 1200);
    if (goldApi && isFiniteRate(goldApi.price)) {
      S.xauusd = Number(goldApi.price);
      S.xauUpdatedAt = goldApi.updatedAt || '';
      gX = true;
    }
  } catch (e) {}

  if (!gX) {
    try {
      const data2 = await fetchJSON('https://api.metals.live/v1/spot/gold', 1200);
      if (data2 && data2.length) {
        const liveXau = Number(data2[0].price || data2[0].gold || data2[0].xau);
        if (isFiniteRate(liveXau)) {
          xauCandidates.push(liveXau);
        }
      }
    } catch (e) {}
  }

  if (!gX) {
    try {
      const goldData = await fetchJSON('https://data-asg.goldprice.org/dbXRates/USD', 1200);
      if (goldData?.items?.length && isFiniteRate(goldData.items[0].xauPrice)) {
        xauCandidates.push(Number(goldData.items[0].xauPrice));
      }
    } catch (e) {}
  }

  const prevXau = last?.xauusd || FB_XAU;
  const prevInr = last?.usdinr || FB_INR;
  const stableXau = chooseStableRate(xauCandidates, prevXau, 1.25);
  const stableInr = chooseStableRate(inrCandidates, prevInr, 0.75);

  if (!gX && isFiniteRate(stableXau)) {
    S.xauusd = stableXau;
    gX = true;
  }
  if (isFiniteRate(stableInr)) {
    S.usdinr = stableInr;
    gI = true;
  }

  if (!gX) { const l = S.history.at(-1); S.xauusd = l ? l.xauusd : FB_XAU; }
  if (!gI) { const l = S.history.at(-1); S.usdinr = l ? l.usdinr : FB_INR; }
if (!(S.xauusd > 2000 && S.xauusd < 15000)) {
  S.xauusd = FB_XAU;
  S.xauUpdatedAt = '';
  gX = false;
}

  if (S.usdinr < 70 || S.usdinr > 120) {
  S.usdinr = FB_INR;
  gI = false;
}

if (gX && gI) S.src = 'Live';
else if (gX || gI) S.src = 'Partial';
else S.src = 'Cached';
if (gX) {
  try { localStorage.setItem(CKEY, Date.now() + ''); } catch (e) {}
}
calc();
storeHistory();
updateUI();

if (S.src === 'Live' || S.src === 'Partial') {
  maybeSaveToBackend();
}

updBanner();
  setTimeout(fetchRates, CACHE_MINUTES * 6e4);
}

async function fj(u) {
  return fetchJSON(u, REQUEST_TIMEOUT_MS);
}

async function fetchJSON(u, timeoutMs) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(u, { signal: c.signal, cache: 'no-store' });
    clearTimeout(t);
    return r.ok ? await r.json() : null;
  }
  catch (e) { clearTimeout(t); return null; }
}

function updBanner() {
  const b = document.getElementById('goldStatusBanner');
  if (!b) return;
  if (S.src === 'Live' || S.src === 'Partial') { b.style.display = 'none'; return; }
  b.style.display = 'block';
  b.textContent = S.src === 'Estimated'
    ? 'Showing estimated prices based on recent market data.'
    : 'Latest data, updated a few hours ago.';
}

// ═══════════════════════════════════════════════════════════════
// FORMULA ENGINE
// ═══════════════════════════════════════════════════════════════
function calc() {
  S.base = (S.xauusd / TROY) * S.usdinr;
  S.duty = S.base * (BCD + AIDC);
  S.landed24 = calcLandedGold(S.base);
  S.g24 = S.landed24;
  S.g22 = Math.round(S.g24 * KF[22]);
  S.g18 = Math.round(S.g24 * KF[18]);
  S.updated = new Date();
  prefillPrice();
}

// ═══════════════════════════════════════════════════════════════
// UI UPDATE
// ═══════════════════════════════════════════════════════════════
function updateUI() {
  updateHeaderDate();
  updSourceBadge();
  updHero();
  ['24', '22', '18'].forEach(k => updKarat(k));
  updBreakdown();
  updMarket();
  updInsights();
  ['24', '22', '18'].forEach(k => renderChart(k));
}

function updSourceBadge() {
  const b = document.getElementById('goldSourceBadge');
  if (!b) return;
  const live = S.src === 'Live' || S.src === 'Partial';
  b.className = 'mg-gold-source-badge ' + (live ? 'live' : 'cached');
  b.innerHTML = '<span class="mg-gold-sdot"></span> ' + (live ? 'Live' : 'Cached');
}

function updHero() {
  const e = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  e('hp24', '\u20B9' + fN(S.g24));
  e('hp22', '\u20B9' + fN(S.g22));
  e('hp18', '\u20B9' + fN(S.g18));
}

function updKarat(k) {
  const p = { 24: S.g24, 22: S.g22, 18: S.g18 }[k], key = 'gold' + k;
  const lp = document.getElementById('goldLp' + k);
  if (lp) lp.textContent = fN(p);

  const hist = S.history.slice().reverse().slice(0, 15);
  const today = getTodayISO();
  const tb = document.getElementById('goldTb' + k);
  if (tb) {
    tb.innerHTML = hist.map((e, i) => {
      const prev = i < hist.length - 1 ? hist[i + 1] : null;
      const chg = prev ? (e[key] - prev[key]) * 100 : 0;
      const isT = e.date === today;
      const color = chg > 0 ? 'var(--mg-green)' : chg < 0 ? 'var(--mg-red)' : 'var(--mu)';
      return '<tr class="' + (isT ? 'mg-gold-today-row' : '') + '">' +
        '<td>' + (isT ? 'Today' : fD(e.date)) + '</td>' +
        '<td>\u20B9' + e[key].toLocaleString('en-IN') + '</td>' +
        '<td>\u20B9' + (e[key] * 10).toLocaleString('en-IN') + '</td>' +
        '<td>\u20B9' + (e[key] * 100).toLocaleString('en-IN') + '</td>' +
        '<td style="color:' + color + '">' + (chg === 0 ? '-' : (chg > 0 ? '+' : '') + '\u20B9' + Math.abs(chg).toLocaleString('en-IN')) + '</td></tr>';
    }).join('');
  }

  const ch = document.getElementById('goldChg' + k);
  if (ch && S.history.length >= 2) {
    const pv = S.history[S.history.length - 2][key];
    const d = p - pv, pc = pv > 0 ? ((d / pv) * 100).toFixed(2) : '0';
    ch.className = 'mg-gold-karat-change ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'flat');
    ch.innerHTML = (d > 0 ? '&#9650; ' : d < 0 ? '&#9660; ' : '') + (d === 0 ? 'No change' : '\u20B9' + Math.abs(d) + ' (' + (d > 0 ? '+' : '') + pc + '%)');
  }
}

function updBreakdown() {
  const el = document.getElementById('goldBreakdown');
  if (!el) return;
  const afterDuty = Math.round(S.base + S.duty);
  el.innerHTML = [
    { l: 'Spot price / gram', v: '\u20B9' + Math.round(S.base).toLocaleString('en-IN') },
    { l: '+ Import duty (BCD 5% + AIDC 1%)', v: '\u20B9' + afterDuty.toLocaleString('en-IN') },
    { l: '+ GST 3% = Final landed price', v: '\u20B9' + S.landed24.toLocaleString('en-IN'), f: true }
  ].map(s => '<div class="mg-gold-bk-row' + (s.f ? ' final' : '') + '"><span class="mg-gold-bk-label">' + s.l + '</span><span class="mg-gold-bk-value">' + s.v + '</span></div>').join('');
}

function updMarket() {
  const el = document.getElementById('goldMarketData');
  if (!el) return;
  const gl = Math.round(S.base), df = S.landed24 - gl, pc = gl > 0 ? ((df / gl) * 100).toFixed(1) : '0';
  const xauLabel = S.xauUpdatedAt ? 'XAU / USD (live)' : 'XAU / USD';
  el.innerHTML = [
    { l: xauLabel, v: '$' + S.xauusd.toFixed(2) },
    { l: 'USD / INR', v: '\u20B9' + S.usdinr.toFixed(2) },
    { l: 'Spot Price / gram', v: '\u20B9' + gl.toLocaleString('en-IN') },
    { l: 'Duty & Tax Premium', v: '+\u20B9' + df.toLocaleString('en-IN') + ' (+' + pc + '%)' }
  ].map(m => '<div class="mg-gold-mkt-row"><span class="mg-gold-mkt-label">' + m.l + '</span><span class="mg-gold-mkt-value">' + m.v + '</span></div>').join('');
}

function updInsights() {
  const el = document.getElementById('goldInsights');
  if (!el) return;
  const h = S.history, ins = [];
  if (h.length >= 7) { const w = h[h.length - 7].gold24, p = w > 0 ? (((S.g24 - w) / w) * 100).toFixed(1) : '0'; ins.push({ i: p > 0 ? '&#128200;' : '&#128201;', t: 'Gold is ' + (p > 0 ? 'up' : 'down') + ' ' + Math.abs(p) + '% in the last 7 days' }); }
  if (h.length >= 20) { const m = h[0].gold24, p = m > 0 ? (((S.g24 - m) / m) * 100).toFixed(1) : '0'; ins.push({ i: p > 0 ? '&#128640;' : '&#128203;', t: Math.abs(p) + '% ' + (p > 0 ? 'gain' : 'decline') + ' over the last ' + h.length + ' days' }); }
  if (h.length >= 2) { const ps = h.map(x => x.gold24), mx = Math.max(...ps); ins.push({ i: '&#128293;', t: 'Highest: \u20B9' + mx.toLocaleString('en-IN') + ' on ' + fD(h[ps.indexOf(mx)].date) }); }
  if (h.length >= 2) { const ps = h.map(x => x.gold24), mn = Math.min(...ps); ins.push({ i: '&#10052;', t: 'Lowest: \u20B9' + mn.toLocaleString('en-IN') + ' on ' + fD(h[ps.indexOf(mn)].date) }); }
  if (h.length >= 5) { let tm = 0; for (let i = 1; i < h.length; i++) tm += Math.abs(h[i].gold24 - h[i - 1].gold24); ins.push({ i: '&#9878;', t: 'Avg. daily swing: \u20B9' + Math.round(tm / (h.length - 1)).toLocaleString('en-IN') + ' per gram' }); }
  if (h.length >= 5) { const oi = h[0].usdinr, c = oi > 0 ? (((S.usdinr - oi) / oi) * 100).toFixed(1) : '0'; ins.push({ i: '&#128177;', t: 'Rupee ' + (c > 0 ? 'weakened' : 'strengthened') + ' ' + Math.abs(c) + '% in ' + h.length + ' days, ' + (c > 0 ? 'pushing' : 'easing') + ' gold prices' }); }
  if (!ins.length) ins.push({ i: '&#128161;', t: 'Price history building. Check back tomorrow.' });
  el.innerHTML = ins.map(i => '<div class="mg-gold-insight-item"><span class="mg-gold-insight-icon">' + i.i + '</span><span>' + i.t + '</span></div>').join('');
}

// ═══════════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════════
function setupChartButtons() {
  root.querySelectorAll('.mg-pill-row[data-karat]').forEach(cp => {
    const k = cp.dataset.karat;
    cp.addEventListener('click', e => {
      const b = e.target.closest('.mg-pill');
      if (!b || !b.dataset.days) return;
      S.cd[k] = parseInt(b.dataset.days);
      cp.querySelectorAll('.mg-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderChart(k);
    });
  });
}

function renderChart(k) {
  if (typeof Chart === 'undefined') { setTimeout(() => renderChart(k), 500); return; }
  const hist = S.history.slice(-(S.cd[k] || 7));
  if (!hist.length) return;
  const key = 'gold' + k, labels = hist.map(h => fD(h.date)), data = hist.map(h => h[key]);
  const dk = root.classList.contains('mg-dark');
  const col = { 24: '#D4853B', 22: '#2b6cb0', 18: '#2d8a4e' }[k];
  if (S.charts[k]) S.charts[k].destroy();
  const ctx = document.getElementById('goldChart' + k);
  if (!ctx) return;
  const c2d = ctx.getContext('2d');
  const gd = c2d.createLinearGradient(0, 0, 0, 220);
  gd.addColorStop(0, col + '30'); gd.addColorStop(1, col + '00');
  S.charts[k] = new Chart(c2d, {
    type: 'line',
    data: { labels, datasets: [{ label: k + 'K', data, borderColor: col, backgroundColor: gd, borderWidth: 2.5, pointBackgroundColor: col, pointBorderColor: dk ? '#161616' : '#FFF', pointBorderWidth: 2, pointRadius: 3, pointHoverRadius: 6, fill: true, tension: 0.4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: dk ? '#222' : '#fff', titleColor: dk ? '#f0ece8' : '#1a1a1a', bodyColor: dk ? '#a09890' : '#706a62', borderColor: dk ? '#2c2c2c' : '#d1ccc4', borderWidth: 1, padding: 12, displayColors: false, titleFont: { family: "'DM Sans'", weight: '600' }, bodyFont: { family: "'JetBrains Mono'", size: 13 }, callbacks: { label: c => '\u20B9' + c.parsed.y.toLocaleString('en-IN') } }
      },
      scales: {
        x: { grid: { color: dk ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dk ? '#706860' : '#9b9590', font: { family: "'DM Sans'", size: 10 }, maxRotation: 45 } },
        y: { grid: { color: dk ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dk ? '#706860' : '#9b9590', font: { family: "'JetBrains Mono'", size: 10 }, callback: v => '\u20B9' + v.toLocaleString('en-IN') } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// LOCAL STORAGE
// ═══════════════════════════════════════════════════════════════

function getSaveSignature() {
  return [
    getTodayISO(),
    S.g24,
    S.g22,
    S.g18,
    S.xauusd.toFixed(2),
    S.usdinr.toFixed(2),
    S.src
  ].join('|');
}

function shouldSaveToBackend() {
  try {
    const now = Date.now();
    const lastAt = parseInt(localStorage.getItem('gold_last_backend_save_at') || '0', 10);
    const lastSig = localStorage.getItem('gold_last_backend_save_sig') || '';
    const sig = getSaveSignature();
    if (sig !== lastSig) return true;
    return !lastAt || (now - lastAt) / 6e4 >= BACKEND_SAVE_MINUTES;
  } catch (e) {
    return true;
  }
}

function markBackendSaved() {
  try {
    localStorage.setItem('gold_last_backend_save_at', String(Date.now()));
    localStorage.setItem('gold_last_backend_save_sig', getSaveSignature());
  } catch (e) {}
}

function maybeSaveToBackend() {
  if (!shouldSaveToBackend()) return;
  saveToBackend();
}

function saveToBackend() {
  fetch('/tools/save-data.php?key=MG_SECURE_2026', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tool: 'gold',
data: {
  date: getTodayISO(),
  gold24: S.g24,
  gold22: S.g22,
  gold18: S.g18,
  xauusd: S.xauusd,
  usdinr: S.usdinr,
  source: S.src
}
    })
  })
  .then(async res => {
    const text = await res.text();
    if (!res.ok || !/saved successfully/i.test(text)) {
      throw new Error(text || 'Backend save failed');
    }
    markBackendSaved();
  })
  .catch(() => {});
}

async function loadDBHistory() {
  try {
    const res = await fetch('/tools/get-data.php?tool=gold&limit=90');
    const data = await res.json();

    if (!data || !data.length) {
      loadHistory();
      return;
    }

    S.history = data.map(normalizedHistoryEntry).filter(item => item !== null);

    S.isSeeded = false;

    const today = getTodayISO();
    const hasToday = S.history.some(h => h.date === today);
    if (!hasToday && S.g24 > 0) {
      storeHistory();
    }
  } catch (err) {
    loadHistory();
  }
}

function loadHistory() {
  try {
    let r = localStorage.getItem(HKEY);
    if (!r) {
      const oldKeys = ['gold_ph_v4', 'gold_ph_v3', 'gold_price_history_v2', 'gold_price_history'];
      for (const ok of oldKeys) { const old = localStorage.getItem(ok); if (old) { r = old; localStorage.setItem(HKEY, old); break; } }
    }
    S.history = (r ? JSON.parse(r) : []).map(normalizedHistoryEntry).filter(Boolean);
    S.history = S.history.filter(h => h.gold24 >= 8000 && h.gold24 <= 50000);
  } catch (e) { S.history = []; }
}

function storeHistory() {
  const today = getTodayISO();

  const existingIndex = S.history.findIndex(h => h.date === today);

  const entry = {
    date: today,
    xauusd: +S.xauusd.toFixed(2),
    usdinr: +S.usdinr.toFixed(2),
    gold24: S.g24,
    gold22: S.g22,
    gold18: S.g18
  };

  if (existingIndex >= 0) {
    S.history[existingIndex] = entry;
  } else {
    S.history.push(entry);
  }

  S.history.sort((a, b) => a.date.localeCompare(b.date));

  while (S.history.length > MAX_HIST) {
    S.history.shift();
  }

  try {
    localStorage.setItem(HKEY, JSON.stringify(S.history));
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
// INVESTMENT CALCULATOR (exposed globally)
// ═══════════════════════════════════════════════════════════════
function prefillPrice() {
  const sel = document.getElementById('goldInvKarat');
  if (!sel) return;
  const k = sel.value;
  const p = { 24: S.g24, 22: S.g22, 18: S.g18 }[k] || S.g22;
  const inp = document.getElementById('goldInvRate');
  if (inp) inp.value = p > 0 ? '\u20B9' + fN(p) + ' / gram' : '...';
}
window._goldPrefill = prefillPrice;

window._goldCalcInvest = function() {
  const sel = document.getElementById('goldInvKarat');
  const k = sel ? sel.value : '22';
  const rate = { 24: S.g24, 22: S.g22, 18: S.g18 }[k] || S.g22;
  const wt = parseFloat((document.getElementById('goldInvWeight') || {}).value) || 0;
  const mkSel = document.getElementById('goldInvMaking');
  const mkPct = parseFloat(mkSel ? mkSel.value : '5') || 0;
  if (wt <= 0 || rate <= 0) return;

  const goldVal = rate * wt;
  const making = goldVal * (mkPct / 100);
  const sub = goldVal + making;
  const gst = sub * 0.03;
  const grand = sub + gst;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('irGold', '\u20B9' + fN(Math.round(goldVal)));
  s('irMaking', '\u20B9' + fN(Math.round(making)));
  s('irSub', '\u20B9' + fN(Math.round(sub)));
  s('irGST', '\u20B9' + fN(Math.round(gst)));
  s('irTotal', '\u20B9' + fN(Math.round(grand)));
  const res = document.getElementById('goldInvResult');
  if (res) res.classList.add('visible');
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function fN(n) { return n.toLocaleString('en-IN'); }
function fD(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function getTodayISO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
function isFiniteRate(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}
function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function chooseStableRate(values, last, maxDeltaPct) {
  const clean = values.map(v => Number(v)).filter(v => Number.isFinite(v));
  if (!clean.length) return 0;
  if (!Number.isFinite(last) || last <= 0) return median(clean);
  const preferred = clean.filter(v => Math.abs((v - last) / last) * 100 <= maxDeltaPct);
  return median(preferred.length ? preferred : clean);
}

})();
