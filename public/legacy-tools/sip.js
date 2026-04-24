(function () {
'use strict';

const root = document.getElementById('mg-sip-root');
if (!root) return;

const S = {
  theme: 'light',
  monthly: 10000,
  annualReturn: 12,
  years: 20,
  stepUpPct: 10,
  stepUpFreq: 'yearly',
  inflation: 6,
  annualBonus: 0,
  applyTax: false,
  charts: { donut: null, growth: null },
  rows: [],
  totals: null,
  isReady: true,
  preview: null
};

const PREVIEW = {
  monthly: 10000,
  annualReturn: 12,
  years: 20,
  stepUpPct: 10,
  stepUpFreq: 'yearly',
  inflation: 6,
  annualBonus: 25000,
  applyTax: false
};

const HERO_ANIMATION_MS = 900;
const animatedValues = Object.create(null);

root.innerHTML = buildHTML();
root.className = 'mg-app mg-light';

setupTheme();
bindInputs();
bindStickyBar();
bindPdfExport();
recalculate();

function buildHTML() {
  return `
<div class="mg-sip-sticky-bar" id="sipStickyBar" aria-hidden="true">
  <div class="mg-sip-sticky-inner">
    <div class="mg-sip-sticky-item">
      <span class="mg-sip-sticky-label" id="sipStickyCorpusLabel">Corpus</span>
      <span class="mg-sip-sticky-value" id="sipStickyCorpus">...</span>
    </div>
    <div class="mg-sip-sticky-item">
      <span class="mg-sip-sticky-label">Invested</span>
      <span class="mg-sip-sticky-value" id="sipStickyInvested">...</span>
    </div>
    <div class="mg-sip-sticky-item">
      <span class="mg-sip-sticky-label" id="sipStickyGainLabel">Gain</span>
      <span class="mg-sip-sticky-value" id="sipStickyGain">...</span>
    </div>
  </div>
</div>

<div class="mg-theme-bar">
  <div class="mg-theme-switch" id="sipThemeSwitch">
    <span>Theme</span>
    <div class="mg-theme-pill"><div class="mg-theme-dot">&#9789;</div></div>
  </div>
</div>

<div class="mg-hero">
  <div class="mg-hero-badge">Smart SIP Planner</div>
  <h1>SIP <em>Calculator</em></h1>
  <p>See how disciplined investing, step-ups and compounding can build wealth over time.</p>
  <div class="mg-sip-hero-pills">
    <div class="mg-sip-hero-pill primary">
      <span class="mg-sip-hp-label" id="sipHeroCorpusLabel">Maturity Corpus</span>
      <span class="mg-sip-hp-price" id="sipHeroCorpus">...</span>
      <span class="mg-sip-hp-unit">at maturity</span>
    </div>
    <div class="mg-sip-hero-pill">
      <span class="mg-sip-hp-label">Total Invested</span>
      <span class="mg-sip-hp-price" id="sipHeroInvested">...</span>
      <span class="mg-sip-hp-unit">your capital</span>
    </div>
    <div class="mg-sip-hero-pill">
      <span class="mg-sip-hp-label" id="sipHeroGainLabel">Estimated Returns</span>
      <span class="mg-sip-hp-price" id="sipHeroGain">...</span>
      <span class="mg-sip-hp-unit">compounding benefit</span>
    </div>
  </div>
</div>

<div class="mg-container">
  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128200;</div>
      <div>
        <div class="mg-section-title">SIP Inputs</div>
        <div class="mg-section-subtitle">Adjust your investment plan and step-up assumptions</div>
      </div>
    </div>
    <div class="mg-section-body">
      <div class="mg-sip-row-main">
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipMonthly">Monthly investment (INR)</label>
          <div class="mg-input-field"><input class="mg-input" id="sipMonthly" type="number" min="500" step="500" value="10000"></div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipYears">Total tenure (years)</label>
          <div class="mg-input-field"><input class="mg-input" id="sipYears" type="number" min="1" max="40" step="1" value="20"></div>
          <div class="mg-sip-field-note">Maximum supported tenure: 40 years</div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipBonus">Annual lump sum top-up (INR)</label>
          <div class="mg-input-field"><input class="mg-input" id="sipBonus" type="number" min="0" step="1000" value="0"></div>
          <div class="mg-sip-field-note">Adds a fixed extra investment at the end of each year.</div>
        </div>
      </div>
      <div class="mg-sip-row-meta">
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipReturn">Expected annual return %</label>
          <div class="mg-input-field"><input class="mg-input" id="sipReturn" type="number" min="1" max="100" step="0.1" value="12"></div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipStepUpPct">SIP step-up %</label>
          <div class="mg-input-field"><input class="mg-input" id="sipStepUpPct" type="number" min="0" max="100" step="0.5" value="10"></div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipStepUpFreq">Step-up frequency</label>
          <select class="mg-input-text" id="sipStepUpFreq">
            <option value="none">No step-up</option>
            <option value="half-yearly">Half-yearly</option>
            <option value="yearly" selected>Yearly</option>
          </select>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label" for="sipInflation">Inflation assumption %</label>
          <div class="mg-input-field"><input class="mg-input" id="sipInflation" type="number" min="0" max="15" step="0.5" value="6"></div>
        </div>
      </div>
      <div class="mg-row-3">
        <div class="mg-subcard">
          <label class="mg-input-label">Step-up impact</label>
          <div class="mg-sip-empty" id="sipStepupHint">Your final SIP will scale automatically as you increase the step-up percentage.</div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label">Quick presets</label>
          <div class="mg-sip-preset-card">
            <div class="mg-pill-row" style="justify-content:center;">
              <button class="mg-pill active" data-sip-preset="starter">Starter</button>
              <button class="mg-pill" data-sip-preset="growth">Growth</button>
              <button class="mg-pill" data-sip-preset="aggressive">Aggressive</button>
            </div>
            <button class="mg-btn-secondary mg-sip-pdf-btn" id="sipPdfBtn" type="button">Download PDF Report</button>
            <div class="mg-sip-field-note">Use these as quick planning baselines, then fine-tune the inputs above.</div>
          </div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label">Tax estimation layer</label>
          <div class="mg-toggle-row mg-sip-tax-toggle-row">
            <div>
              <div class="mg-sip-toggle-title">Apply LTCG tax</div>
              <div class="mg-sip-field-note">10% on gains above ₹1L to show a post-tax projection.</div>
            </div>
            <button class="mg-toggle-track" id="sipTaxToggle" type="button" role="switch" aria-checked="false" aria-label="Apply LTCG tax">
              <span class="mg-toggle-thumb"></span>
            </button>
          </div>
          <div class="mg-sip-empty" id="sipTaxHint">Turn this on if you want to estimate the corpus after LTCG tax.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="mg-sip-summary-grid mg-animate-in" style="margin-bottom:20px;">
    <div class="mg-sip-summary-card">
      <span class="mg-sip-summary-label" id="sipCorpusLabel">Maturity Corpus</span>
      <span class="mg-sip-summary-value" id="sipCorpus">...</span>
      <span class="mg-sip-summary-note" id="sipCorpusNote">...</span>
    </div>
    <div class="mg-sip-summary-card">
      <span class="mg-sip-summary-label">Total Invested</span>
      <span class="mg-sip-summary-value" id="sipInvested">...</span>
      <span class="mg-sip-summary-note" id="sipInvestedNote">...</span>
    </div>
    <div class="mg-sip-summary-card">
      <span class="mg-sip-summary-label" id="sipReturnsLabel">Estimated Returns</span>
      <span class="mg-sip-summary-value" id="sipReturns">...</span>
      <span class="mg-sip-summary-note" id="sipReturnsNote">...</span>
    </div>
  </div>

  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128202;</div>
      <div>
        <div class="mg-section-title">Growth Visuals</div>
        <div class="mg-section-subtitle">Portfolio breakup and year-on-year compounding</div>
      </div>
      <div class="mg-section-badge">Charts</div>
    </div>
    <div class="mg-section-body">
      <div class="mg-sip-chart-grid">
        <div class="mg-sip-donut-wrap">
          <div class="mg-sip-chart-top">
            <div class="mg-sip-chart-title">Corpus Split</div>
            <div class="mg-sip-chart-watermark">SIP Calculator by MasterGadgets.com</div>
          </div>
          <div class="mg-sip-donut-canvas"><canvas id="sipDonutChart"></canvas></div>
          <div class="mg-sip-legend">
            <div class="mg-sip-legend-row">
              <div class="mg-sip-legend-left"><span class="mg-sip-dot invested"></span><span>Total invested</span></div>
              <span class="mg-sip-legend-value" id="sipLegendInvested">...</span>
            </div>
            <div class="mg-sip-legend-row">
              <div class="mg-sip-legend-left"><span class="mg-sip-dot returns"></span><span id="sipLegendGainLabel">Estimated returns</span></div>
              <span class="mg-sip-legend-value" id="sipLegendReturns">...</span>
            </div>
          </div>
        </div>
        <div class="mg-sip-growth-wrap">
          <div class="mg-sip-chart-top">
            <div class="mg-sip-chart-title">Growth Path</div>
            <div class="mg-sip-chart-watermark">SIP Calculator by MasterGadgets.com</div>
          </div>
          <div class="mg-sip-growth-canvas"><canvas id="sipGrowthChart"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128176;</div>
      <div>
        <div class="mg-section-title">Snapshot</div>
        <div class="mg-section-subtitle">Useful checkpoints for planning and comparison</div>
      </div>
      <div class="mg-section-badge">Milestones</div>
    </div>
    <div class="mg-section-body">
      <div class="mg-sip-stat-grid" id="sipStatGrid"></div>
    </div>
  </div>

  <div class="mg-row-2 mg-animate-in mg-sip-bottom-grid">
    <div class="mg-section mg-sip-table-section">
      <div class="mg-section-header">
        <div class="mg-section-icon">&#128221;</div>
        <div>
          <div class="mg-section-title">Yearly Breakdown</div>
          <div class="mg-section-subtitle">How your SIP scales every year</div>
        </div>
        <div class="mg-section-badge">Projection</div>
      </div>
      <div class="mg-section-body">
        <div class="mg-sip-table-wrap">
          <table class="mg-table mg-sip-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Monthly SIP</th>
                <th>Yearly Invested</th>
                <th>Total Invested</th>
                <th>Projected Value</th>
                <th>Gain</th>
              </tr>
            </thead>
            <tbody id="sipTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="mg-section mg-sip-notes-section">
      <div class="mg-section-header">
        <div class="mg-section-icon">&#129504;</div>
        <div>
          <div class="mg-section-title">Planner Notes</div>
          <div class="mg-section-subtitle">Extra context that makes the calculator more useful</div>
        </div>
        <div class="mg-section-badge">Assumptions</div>
      </div>
      <div class="mg-section-body">
        <div class="mg-sip-assump-list" id="sipAssumptions"></div>
      </div>
    </div>
  </div>

  <div class="mg-footer">
    <div class="mg-sip-footer-stack">
      <div><strong>SIP Calculator</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with &#10084;&#65039; by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India</div>
      <div class="mg-sip-footer-notes">
        <div class="mg-disclaimer">
          <span class="mg-disclaimer-icon">&#9888;&#65039;</span>
          <span><strong>Disclaimer:</strong> This SIP calculator is an educational planning tool, not investment, tax or financial advice.</span>
        </div>
        <div class="mg-disclaimer">
          <span class="mg-disclaimer-icon">&#128200;</span>
          <span>Actual returns can vary because of market conditions, taxation, expense ratios, exit loads and the timing of investments. Please consult a SEBI-registered investment adviser or your financial planner before acting on these projections.</span>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function setupTheme() {
  const sw = document.getElementById('sipThemeSwitch');
  if (!sw) return;
  const dot = sw.querySelector('.mg-theme-dot');
  if (dot) dot.innerHTML = '&#9789;';
  sw.addEventListener('click', function () {
    const dark = root.classList.contains('mg-dark');
    root.classList.toggle('mg-dark', !dark);
    root.classList.toggle('mg-light', dark);
    if (dot) dot.innerHTML = dark ? '&#9789;' : '&#9788;';
    renderCharts();
  });
}

function bindInputs() {
  ['sipMonthly', 'sipReturn', 'sipYears', 'sipStepUpPct', 'sipInflation', 'sipBonus', 'sipStepUpFreq'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', recalculate);
    el.addEventListener('change', recalculate);
  });

  root.querySelectorAll('[data-sip-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-sip-preset');
      const presets = {
        starter: { monthly: 5000, annualReturn: 11, years: 15, stepUpPct: 5, stepUpFreq: 'yearly', inflation: 6, annualBonus: 0, applyTax: false },
        growth: { monthly: 10000, annualReturn: 12, years: 20, stepUpPct: 10, stepUpFreq: 'yearly', inflation: 6, annualBonus: 25000, applyTax: false },
        aggressive: { monthly: 20000, annualReturn: 14, years: 25, stepUpPct: 12, stepUpFreq: 'half-yearly', inflation: 6, annualBonus: 50000, applyTax: true }
      };
      applyState(presets[key] || presets.growth);
      root.querySelectorAll('[data-sip-preset]').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active');
      recalculate();
    });
  });

  const taxToggle = document.getElementById('sipTaxToggle');
  if (taxToggle) {
    taxToggle.addEventListener('click', function () {
      S.applyTax = !S.applyTax;
      syncTaxToggle();
      recalculate();
    });
  }
}

function bindPdfExport() {
  const btn = document.getElementById('sipPdfBtn');
  if (!btn) return;
  btn.addEventListener('click', exportPdfReport);
}

function bindStickyBar() {
  syncStickyBar();
  window.addEventListener('scroll', syncStickyBar, { passive: true });
  window.addEventListener('resize', syncStickyBar);
}

function syncStickyBar() {
  const bar = document.getElementById('sipStickyBar');
  if (!bar || !root) return;
  const hero = root.querySelector('.mg-hero');
  if (!hero) return;
  const heroRect = hero.getBoundingClientRect();
  const shouldShow = heroRect.bottom < 48 && root.getBoundingClientRect().bottom > 160;
  bar.classList.toggle('visible', shouldShow);
  bar.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
}

function syncTaxToggle() {
  const el = document.getElementById('sipTaxToggle');
  if (!el) return;
  el.classList.toggle('on', !!S.applyTax);
  el.setAttribute('aria-checked', S.applyTax ? 'true' : 'false');
}

function applyState(next) {
  S.monthly = num(next.monthly, S.monthly);
  S.annualReturn = num(next.annualReturn, S.annualReturn);
  S.years = Math.max(1, Math.round(num(next.years, S.years)));
  S.stepUpPct = Math.max(0, num(next.stepUpPct, S.stepUpPct));
  S.stepUpFreq = next.stepUpFreq || S.stepUpFreq;
  S.inflation = Math.max(0, num(next.inflation, S.inflation));
  S.annualBonus = Math.max(0, num(next.annualBonus, S.annualBonus));
  S.applyTax = !!next.applyTax;

  setInputValue('sipMonthly', S.monthly);
  setInputValue('sipReturn', S.annualReturn);
  setInputValue('sipYears', S.years);
  setInputValue('sipStepUpPct', S.stepUpPct);
  setInputValue('sipInflation', S.inflation);
  setInputValue('sipBonus', S.annualBonus);
  setInputValue('sipStepUpFreq', S.stepUpFreq);
  syncTaxToggle();
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = String(value);
}

function recalculate() {
  const monthlyRaw = getInputValue('sipMonthly').trim();
  const returnRaw = getInputValue('sipReturn').trim();
  const yearsRaw = getInputValue('sipYears').trim();
  const ready = monthlyRaw !== '' && returnRaw !== '' && yearsRaw !== '';

  S.monthly = monthlyRaw === '' ? 0 : clamp(num(monthlyRaw, 10000), 500, 10000000);
  S.annualReturn = returnRaw === '' ? 0 : clamp(num(returnRaw, 12), 1, 100);
  S.years = yearsRaw === '' ? 0 : clamp(Math.round(num(yearsRaw, 20)), 1, 40);
  S.stepUpPct = clamp(num(getInputValue('sipStepUpPct'), 10), 0, 100);
  S.stepUpFreq = getInputValue('sipStepUpFreq') || 'yearly';
  S.inflation = clamp(num(getInputValue('sipInflation'), 6), 0, 15);
  S.annualBonus = clamp(num(getInputValue('sipBonus'), 0), 0, 10000000);
  if (returnRaw !== '' && Number(returnRaw) > 100) setInputValue('sipReturn', S.annualReturn);
  if (yearsRaw !== '' && Number(yearsRaw) > 40) setInputValue('sipYears', S.years);
  S.isReady = ready;

  if (!ready) {
    const previewResult = buildProjection(PREVIEW);
    S.rows = previewResult.rows;
    S.totals = previewResult.totals;
    S.preview = PREVIEW;
    updateHint();
    renderSummary();
    renderStats();
    renderTable();
    renderAssumptions();
    renderCharts();
    return;
  }

  const result = buildProjection();
  S.rows = result.rows;
  S.totals = result.totals;
  S.preview = null;

  updateHint();
  renderSummary();
  renderStats();
  renderTable();
  renderAssumptions();
  renderCharts();
}

function updateHint() {
  const hint = document.getElementById('sipStepupHint');
  if (!hint) return;
  if (!S.isReady) {
    hint.textContent = 'Showing a sample SIP projection for preview. Add your own SIP amount, expected return and tenure to personalize it.';
    updateTaxHint();
    return;
  }
  const freqText = S.stepUpFreq === 'none' ? 'without any step-up' : (S.stepUpFreq === 'half-yearly' ? 'every 6 months' : 'every year');
  const topUpText = S.annualBonus > 0 ? ' plus a fixed annual top-up of ' + money(S.annualBonus) : '';
  hint.textContent = 'Based on your inputs, the SIP can grow to ' + money(S.totals.lastSip) + ' per month ' + freqText + topUpText + '.';
  updateTaxHint();
}

function updateTaxHint() {
  const hint = document.getElementById('sipTaxHint');
  if (!hint) return;
  if (!S.totals) {
    hint.textContent = 'Turn this on if you want to estimate the corpus after LTCG tax.';
    return;
  }
  if (!S.applyTax) {
    hint.textContent = 'Tax view is off. Turn it on to estimate the corpus after a simple LTCG adjustment.';
    return;
  }
  hint.textContent = 'Estimated LTCG tax: ' + money(S.totals.taxAmount) + '. Post-tax corpus: ' + money(S.totals.postTaxCorpus) + '.';
}

function buildProjection(source) {
  const cfg = source || S;
  const monthlyRate = cfg.annualReturn / 12 / 100;
  const months = cfg.years * 12;
  const stepPeriod = cfg.stepUpFreq === 'half-yearly' ? 6 : cfg.stepUpFreq === 'yearly' ? 12 : 0;
  let sip = cfg.monthly;
  let invested = 0;
  let value = 0;
  let rows = [];
  let currentYearContribution = 0;
  let latestAnnualTopUp = 0;

  for (let month = 1; month <= months; month++) {
    value += sip;
    invested += sip;
    currentYearContribution += sip;

    if (cfg.annualBonus > 0 && month % 12 === 0) {
      latestAnnualTopUp = Math.round(cfg.annualBonus);
      value += latestAnnualTopUp;
      invested += latestAnnualTopUp;
      currentYearContribution += latestAnnualTopUp;
    }

    value *= 1 + monthlyRate;

    if (month % 12 === 0) {
      const year = month / 12;
      rows.push({
        year: year,
        monthlySip: sip,
        yearlyInvested: Math.round(currentYearContribution),
        totalInvested: Math.round(invested),
        value: Math.round(value),
        gain: Math.round(value - invested)
      });
      currentYearContribution = 0;
    }

    if (stepPeriod && month < months && month % stepPeriod === 0) {
      sip = Math.round(sip * (1 + cfg.stepUpPct / 100));
    }
  }

  const corpus = Math.round(value);
  const totalInvested = Math.round(invested);
  const estimatedReturns = Math.max(0, corpus - totalInvested);
  const taxableGain = Math.max(0, estimatedReturns - 100000);
  const taxAmount = Math.round(taxableGain * 0.10);
  const postTaxCorpus = Math.max(totalInvested, corpus - taxAmount);
  const postTaxGain = Math.max(0, postTaxCorpus - totalInvested);
  const realCorpus = Math.round(corpus / Math.pow(1 + (cfg.inflation / 100), cfg.years));
  const postTaxRealCorpus = Math.round(postTaxCorpus / Math.pow(1 + (cfg.inflation / 100), cfg.years));
  const wealthMultiple = totalInvested > 0 ? corpus / totalInvested : 0;
  const postTaxMultiple = totalInvested > 0 ? postTaxCorpus / totalInvested : 0;

  return {
    rows: rows,
    totals: {
      corpus: corpus,
      totalInvested: totalInvested,
      estimatedReturns: estimatedReturns,
      taxableGain: taxableGain,
      taxAmount: taxAmount,
      postTaxCorpus: postTaxCorpus,
      postTaxGain: postTaxGain,
      realCorpus: realCorpus,
      postTaxRealCorpus: postTaxRealCorpus,
      wealthMultiple: wealthMultiple,
      postTaxMultiple: postTaxMultiple,
      averageMonthly: Math.round(totalInvested / months),
      lastSip: rows.length ? rows[rows.length - 1].monthlySip : cfg.monthly,
      latestAnnualTopUp: latestAnnualTopUp
    }
  };
}

function renderSummary() {
  if (!S.totals) {
    text('sipHeroCorpus', '—');
    text('sipHeroInvested', '—');
    text('sipHeroGain', '—');
    text('sipStickyCorpus', '—');
    text('sipStickyInvested', '—');
    text('sipStickyGain', '—');
    text('sipCorpus', '—');
    text('sipCorpusNote', 'Enter your SIP details to calculate the maturity corpus');
    text('sipInvested', '—');
    text('sipInvestedNote', 'Total invested amount will appear here');
    text('sipReturns', '—');
    text('sipReturnsNote', 'Estimated returns will appear here');
    text('sipLegendInvested', '—');
    text('sipLegendReturns', '—');
    return;
  }
  const corpusLabel = S.applyTax ? 'Post-Tax Corpus' : 'Maturity Corpus';
  const gainLabel = S.applyTax ? 'Post-Tax Gain' : 'Estimated Returns';
  const displayCorpus = S.applyTax ? S.totals.postTaxCorpus : S.totals.corpus;
  const displayGain = S.applyTax ? S.totals.postTaxGain : S.totals.estimatedReturns;
  const displayRealCorpus = S.applyTax ? S.totals.postTaxRealCorpus : S.totals.realCorpus;
  const displayMultiple = S.applyTax ? S.totals.postTaxMultiple : S.totals.wealthMultiple;

  text('sipCorpusLabel', corpusLabel);
  text('sipReturnsLabel', gainLabel);
  text('sipStickyCorpusLabel', corpusLabel);
  text('sipStickyGainLabel', gainLabel.replace('Estimated ', ''));
  text('sipLegendGainLabel', gainLabel);
  text('sipHeroCorpusLabel', corpusLabel);
  text('sipHeroGainLabel', gainLabel);

  animateCurrency('sipHeroCorpus', displayCorpus);
  animateCurrency('sipHeroInvested', S.totals.totalInvested);
  animateCurrency('sipHeroGain', displayGain);
  animateCurrency('sipStickyCorpus', displayCorpus);
  animateCurrency('sipStickyInvested', S.totals.totalInvested);
  animateCurrency('sipStickyGain', displayGain);
  animateCurrency('sipCorpus', displayCorpus);
  animateCurrency('sipInvested', S.totals.totalInvested);
  animateCurrency('sipReturns', displayGain);

  text('sipCorpusNote', (S.preview ? 'Sample plan. ' : '') + 'Inflation-adjusted value: ' + money(displayRealCorpus));
  text('sipInvestedNote', (S.preview ? 'Preview only. ' : '') + 'Average monthly outgo: ' + money(S.totals.averageMonthly));
  text('sipReturnsNote', (S.preview ? 'Sample projection. ' : '') + (S.applyTax ? 'After estimated LTCG of ' + money(S.totals.taxAmount) : 'Wealth multiple: ' + displayMultiple.toFixed(2) + 'x'));

  text('sipLegendInvested', money(S.totals.totalInvested));
  text('sipLegendReturns', money(S.applyTax ? S.totals.postTaxGain : S.totals.estimatedReturns));
}

function renderStats() {
  const statGrid = document.getElementById('sipStatGrid');
  if (!statGrid) return;
  if (!S.totals) {
    statGrid.innerHTML = [
      statCard('10Y milestone', '—', 'Appears after valid inputs'),
      statCard('Midpoint value', '—', 'Appears after valid inputs'),
      statCard('Final SIP size', '—', 'Appears after valid inputs'),
      statCard('Real buying power', '—', 'Appears after valid inputs')
    ].join('');
    return;
  }
  const rows = S.rows;
  const year10 = rows[Math.min(9, rows.length - 1)];
  const mid = rows[Math.max(0, Math.floor(rows.length / 2) - 1)];
  const fourthTitle = S.applyTax ? 'Tax-adjusted corpus' : 'Real buying power';
  const fourthValue = S.applyTax ? money(S.totals.postTaxCorpus) : money(S.totals.realCorpus);
  const fourthNote = S.applyTax ? 'After estimated LTCG of ' + money(S.totals.taxAmount) : 'Adjusted for ' + S.inflation + '% inflation';
  const html = [
    statCard('10Y milestone', year10 ? money(year10.value) : money(S.totals.corpus), year10 ? 'Projected corpus by year ' + year10.year : 'Projected final corpus'),
    statCard('Midpoint value', mid ? money(mid.value) : money(S.totals.corpus), mid ? 'At year ' + mid.year : 'Based on full tenure'),
    statCard('Final SIP size', money(S.totals.lastSip), 'Monthly SIP after all step-ups'),
    statCard(fourthTitle, fourthValue, fourthNote)
  ].join('');
  statGrid.innerHTML = html;
}

function statCard(title, value, note) {
  return '<div class="mg-sip-stat-card"><div class="mg-sip-stat-title">' + title + '</div><div class="mg-sip-stat-value">' + value + '</div><div class="mg-sip-stat-note">' + note + '</div></div>';
}

function renderTable() {
  const body = document.getElementById('sipTableBody');
  if (!body) return;
  if (!S.rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="mg-sip-empty">Enter the main SIP inputs to generate the yearly breakdown.</td></tr>';
    return;
  }
  body.innerHTML = S.rows.map(function (row) {
    return '<tr>' +
      '<td>Year ' + row.year + '</td>' +
      '<td>' + money(row.monthlySip) + '</td>' +
      '<td>' + money(row.yearlyInvested) + '</td>' +
      '<td>' + money(row.totalInvested) + '</td>' +
      '<td>' + money(row.value) + '</td>' +
      '<td style="color:' + (row.gain >= 0 ? 'var(--mg-green)' : 'var(--mg-red)') + '">' + money(row.gain) + '</td>' +
      '</tr>';
  }).join('');
}

function renderAssumptions() {
  const wrap = document.getElementById('sipAssumptions');
  if (!wrap) return;
  if (!S.totals) {
    wrap.innerHTML = [
      assump('&#128161;', 'Monthly investment, expected return and tenure are the three key inputs that drive the final corpus.'),
      assump('&#9203;', 'Use the step-up options to model salary growth and annual SIP increases.'),
      assump('&#127919;', 'Once you fill the inputs, this section will explain your plan in simple terms.'),
      assump('&#128200;', 'The charts and yearly table will update automatically for every change you make.')
    ].join('');
    return;
  }
  const cfg = S.preview || S;
  const stepLabel = cfg.stepUpFreq === 'none' ? 'No SIP step-up' : cfg.stepUpPct + '% ' + (cfg.stepUpFreq === 'half-yearly' ? 'every 6 months' : 'every year');
  const topUpLabel = cfg.annualBonus > 0 ? 'Fixed annual lump sum top-up of ' + money(cfg.annualBonus) : 'No annual lump sum top-up applied';
  wrap.innerHTML = [
    assump('&#128161;', (S.preview ? 'Sample plan: ' : 'Your plan: ') + 'SIP starts at ' + money(cfg.monthly) + ' per month and grows with ' + stepLabel + '.'),
    assump('&#128176;', topUpLabel + '.'),
    assump('&#128200;', 'At ' + cfg.annualReturn.toFixed(1) + '% expected annual return, compounding becomes more visible in later years.'),
    assump('&#127919;', 'A total of ' + money(S.totals.totalInvested) + ' could grow into ' + money(S.applyTax ? S.totals.postTaxCorpus : S.totals.corpus) + ' over ' + cfg.years + ' years.'),
    assump('&#9203;', S.applyTax ? 'With LTCG enabled, estimated tax is ' + money(S.totals.taxAmount) + ' and post-tax buying power is near ' + money(S.totals.postTaxRealCorpus) + '.' : 'Inflation-adjusted buying power is estimated near ' + money(S.totals.realCorpus) + ' at ' + cfg.inflation.toFixed(1) + '% inflation.')
  ].join('');
}

function assump(icon, textValue) {
  return '<div class="mg-sip-assump-item"><span class="mg-sip-assump-icon">' + icon + '</span><span>' + textValue + '</span></div>';
}

function renderCharts() {
  if (typeof Chart === 'undefined') {
    setTimeout(renderCharts, 400);
    return;
  }
  if (!S.totals) {
    if (S.charts.donut) { S.charts.donut.destroy(); S.charts.donut = null; }
    if (S.charts.growth) { S.charts.growth.destroy(); S.charts.growth = null; }
    return;
  }
  renderDonut();
  renderGrowth();
}

function exportPdfReport() {
  const win = window.open('', '_blank');
  if (!win || !S.totals) return;
  const cfg = S.preview || S;
  const displayCorpus = S.applyTax ? S.totals.postTaxCorpus : S.totals.corpus;
  const displayGain = S.applyTax ? S.totals.postTaxGain : S.totals.estimatedReturns;
  const donutImg = S.charts.donut ? S.charts.donut.toBase64Image() : '';
  const growthImg = S.charts.growth ? S.charts.growth.toBase64Image() : '';
  const generatedAt = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  const rows = S.rows.slice(0, 20).map(function (row) {
    return '<tr>' +
      '<td>Year ' + row.year + '</td>' +
      '<td>' + money(row.monthlySip) + '</td>' +
      '<td>' + money(row.totalInvested) + '</td>' +
      '<td>' + money(row.value) + '</td>' +
      '<td>' + money(row.gain) + '</td>' +
    '</tr>';
  }).join('');
  win.document.open();
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>SIP Report</title><style>' +
    'body{margin:0;padding:28px;background:#f7f3ee;font-family:Arial,sans-serif;color:#1a1510;}' +
    '.sheet{max-width:920px;margin:0 auto;background:#fff;border:1px solid #e4dacd;border-radius:18px;padding:30px;}' +
    '.tag{display:inline-block;margin-bottom:14px;padding:6px 12px;border-radius:999px;border:1px solid rgba(212,133,59,.35);background:rgba(212,133,59,.07);color:#D4853B;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;}' +
    'h1{margin:0 0 8px;font-size:32px;line-height:1.1;}h1 em{font-style:normal;color:#D4853B;}.muted{color:#726960;font-size:13px;line-height:1.6;}' +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0;}.card,.ibox{background:#fbf8f4;border:1px solid #e4dacd;border-radius:14px;padding:16px;}' +
    '.vizgrid{display:grid;grid-template-columns:300px 1fr;gap:14px;margin:20px 0 26px;}.viz{background:#fbf8f4;border:1px solid #e4dacd;border-radius:14px;padding:16px;}.viz img{width:100%;height:auto;display:block;border-radius:10px;}.vizhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}.viztitle{font-weight:700;font-size:16px;}.watermark{color:#726960;font-size:10px;text-align:right;line-height:1.4;}' +
    '.label{display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#726960;}.value{font-size:28px;font-weight:800;line-height:1.1;letter-spacing:-.03em;}' +
    '.inputs{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 24px;}.ibox strong{display:block;margin-bottom:6px;font-size:12px;color:#726960;}' +
    'table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:10px 12px;border-bottom:1px solid #efe6db;text-align:left;white-space:nowrap;font-size:13px;}th{font-size:11px;color:#726960;text-transform:uppercase;letter-spacing:.06em;}' +
    '.foot{margin-top:24px;padding-top:18px;border-top:1px solid #efe6db;}button{padding:12px 18px;border:none;border-radius:999px;background:#D4853B;color:#fff;font-weight:700;cursor:pointer;}' +
    '@media print{body{background:#fff;padding:0}.sheet{max-width:none;border:none;border-radius:0;padding:18px}.print-hide{display:none}}@media (max-width:760px){.grid,.inputs,.vizgrid{grid-template-columns:1fr;}}' +
    '</style></head><body><div class="sheet">' +
    '<div class="tag">' + (S.preview ? 'Sample projection report' : 'Personalized SIP report') + '</div>' +
    '<h1>SIP <em>Calculator</em> Report</h1>' +
    '<div class="muted">Generated on ' + escapeHtml(generatedAt) + ' | MasterGadgets.com</div>' +
    '<div class="grid">' +
      pdfMetric(S.applyTax ? 'Post-Tax Corpus' : 'Maturity Corpus', money(displayCorpus)) +
      pdfMetric('Total Invested', money(S.totals.totalInvested)) +
      pdfMetric(S.applyTax ? 'Post-Tax Gain' : 'Estimated Returns', money(displayGain)) +
    '</div>' +
    '<div class="inputs">' +
      pdfInput('Monthly investment (INR)', money(cfg.monthly)) +
      pdfInput('Expected annual return', cfg.annualReturn.toFixed(1) + '%') +
      pdfInput('Total tenure', cfg.years + ' years') +
      pdfInput('Annual lump sum top-up', money(cfg.annualBonus)) +
      pdfInput('SIP step-up', cfg.stepUpPct.toFixed(1) + '%') +
      pdfInput('Step-up frequency', titleCase(cfg.stepUpFreq === 'none' ? 'No step-up' : cfg.stepUpFreq)) +
      pdfInput('Inflation assumption', cfg.inflation.toFixed(1) + '%') +
      pdfInput('Inflation-adjusted corpus', money(S.applyTax ? S.totals.postTaxRealCorpus : S.totals.realCorpus)) +
      pdfInput('LTCG tax view', S.applyTax ? 'Enabled' : 'Disabled') +
      pdfInput('Estimated tax impact', money(S.totals.taxAmount)) +
    '</div>' +
    '<div class="vizgrid">' +
      pdfChart('Corpus Split', donutImg) +
      pdfChart('Growth Path', growthImg) +
    '</div>' +
    '<h2 style="margin:0 0 6px;font-size:19px;">Yearly Breakdown Snapshot</h2>' +
    '<div class="muted">Showing up to the first 20 yearly rows for easy printing and sharing.</div>' +
    '<table><thead><tr><th>Year</th><th>Monthly SIP</th><th>Total Invested</th><th>Projected Value</th><th>Gain</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="foot">' +
      '<div class="muted"><strong>Disclaimer:</strong> This report is for educational planning only and should not be treated as investment advice, assured returns or a recommendation for any mutual fund scheme. Actual outcomes can differ due to market movements, taxation, fund expenses, exit load and timing of investments. Mutual fund investments are subject to market risks. Please read all scheme related documents carefully and consult a SEBI-registered investment adviser if required.</div>' +
      '<div class="muted" style="margin-top:12px;">SIP Calculator by MasterGadgets.com | Made with ❤️ by @AmitBhawani in India</div>' +
      '<div class="print-hide" style="margin-top:18px;"><button onclick="window.print()">Print / Save as PDF</button></div>' +
    '</div></div></body></html>');
  win.document.close();
}

function pdfMetric(label, value) {
  return '<div class="card"><span class="label">' + label + '</span><div class="value">' + value + '</div></div>';
}

function pdfInput(label, value) {
  return '<div class="ibox"><strong>' + label + '</strong><span>' + value + '</span></div>';
}

function pdfChart(title, src) {
  if (!src) return '';
  return '<div class="viz"><div class="vizhead"><div class="viztitle">' + title + '</div><div class="watermark">SIP Calculator by MasterGadgets.com</div></div><img src="' + src + '" alt="' + title + ' chart"></div>';
}

function renderDonut() {
  const ctx = document.getElementById('sipDonutChart');
  if (!ctx) return;
  if (S.charts.donut) S.charts.donut.destroy();
  const dark = root.classList.contains('mg-dark');
  const displayGain = S.applyTax ? S.totals.postTaxGain : S.totals.estimatedReturns;
  S.charts.donut = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Total invested', S.applyTax ? 'Post-tax gain' : 'Estimated returns'],
      datasets: [{
        data: [S.totals.totalInvested, Math.max(0, displayGain)],
        backgroundColor: ['#D4853B', '#2b6cb0'],
        borderColor: dark ? '#161616' : '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: getChartDevicePixelRatio(),
      cutout: '66%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? '#222' : '#fff',
          titleColor: dark ? '#f0ece8' : '#1a1a1a',
          bodyColor: dark ? '#a09890' : '#706a62',
          borderColor: dark ? '#2c2c2c' : '#d1ccc4',
          borderWidth: 1,
          displayColors: false,
          callbacks: { label: function (c) { return c.label + ': ' + money(c.parsed); } }
        }
      }
    }
  });
}

function renderGrowth() {
  const ctx = document.getElementById('sipGrowthChart');
  if (!ctx) return;
  if (S.charts.growth) S.charts.growth.destroy();
  const dark = root.classList.contains('mg-dark');
  const c2d = ctx.getContext('2d');
  const gradient = c2d.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(212,133,59,0.26)');
  gradient.addColorStop(1, 'rgba(212,133,59,0.02)');
  S.charts.growth = new Chart(c2d, {
    type: 'line',
    data: {
      labels: S.rows.map(function (r) { return 'Y' + r.year; }),
      datasets: [
        {
          label: 'Total invested',
          data: S.rows.map(function (r) { return r.totalInvested; }),
          borderColor: '#2b6cb0',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 2
        },
        {
          label: 'Projected corpus',
          data: S.rows.map(function (r) { return r.value; }),
          borderColor: '#D4853B',
          backgroundColor: gradient,
          fill: true,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      devicePixelRatio: getChartDevicePixelRatio(),
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: dark ? '#f0ece8' : '#1a1a1a', boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: dark ? '#222' : '#fff',
          titleColor: dark ? '#f0ece8' : '#1a1a1a',
          bodyColor: dark ? '#a09890' : '#706a62',
          borderColor: dark ? '#2c2c2c' : '#d1ccc4',
          borderWidth: 1,
          callbacks: { label: function (c) { return c.dataset.label + ': ' + money(c.parsed.y); } }
        }
      },
      scales: {
        x: {
          grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' },
          ticks: { color: dark ? '#8a8580' : '#706a62' }
        },
        y: {
          grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' },
          ticks: {
            color: dark ? '#8a8580' : '#706a62',
            callback: function (v) { return compact(v); }
          }
        }
      }
    }
  });
}

function getChartDevicePixelRatio() {
  return Math.min(3, Math.max(2, window.devicePixelRatio || 1));
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function animateCurrency(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = Math.round(value || 0);
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    animatedValues[id] = target;
    el.textContent = money(target);
    return;
  }
  const startValue = typeof animatedValues[id] === 'number' ? animatedValues[id] : 0;
  if (startValue === target) {
    el.textContent = money(target);
    return;
  }
  const startedAt = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - startedAt) / HERO_ANIMATION_MS);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startValue + (target - startValue) * eased);
    el.textContent = money(current);
    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      animatedValues[id] = target;
      el.textContent = money(target);
    }
  }
  animatedValues[id] = target;
  window.requestAnimationFrame(frame);
}

function money(value) {
  return '₹' + Math.round(value).toLocaleString('en-IN');
}

function compact(value) {
  const n = Number(value) || 0;
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + Math.round(n);
}

function titleCase(value) {
  return String(value).replace(/-/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
})();
