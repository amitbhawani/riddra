(function () {
'use strict';

const root = document.getElementById('mg-swp-root');
if (!root) return;

const PREVIEW = {
  corpus: 20000000,
  withdraw: 70000,
  years: 16,
  currentAge: 45,
  retirementAge: 61,
  frequency: 'monthly',
  stepUpPct: 8,
  mixEquity: 50,
  mixDebt: 30,
  mixFd: 20,
  returnEquity: 12,
  returnDebt: 8,
  returnFd: 7,
  taxSlab: 30,
  inflationAdjusted: false
};

const S = {
  mode: 'standard',
  corpus: PREVIEW.corpus,
  withdraw: PREVIEW.withdraw,
  years: PREVIEW.years,
  currentAge: PREVIEW.currentAge,
  retirementAge: PREVIEW.retirementAge,
  frequency: PREVIEW.frequency,
  stepUpPct: PREVIEW.stepUpPct,
  mixEquity: PREVIEW.mixEquity,
  mixDebt: PREVIEW.mixDebt,
  mixFd: PREVIEW.mixFd,
  returnEquity: PREVIEW.returnEquity,
  returnDebt: PREVIEW.returnDebt,
  returnFd: PREVIEW.returnFd,
  taxSlab: PREVIEW.taxSlab,
  inflationAdjusted: PREVIEW.inflationAdjusted,
  lockedMixId: 'swpMixEquity',
  tableSort: { key: 'year', dir: 1 },
  charts: { corpus: null, payout: null, mix: null, waterfall: null, stepup: null },
  rows: [],
  totals: null,
  preview: null,
  reverseSuite: null,
  reverseTier: 'recommended'
};

root.innerHTML = buildHTML();
root.className = 'mg-app mg-light';

loadStateFromUrl();
setupTheme();
bindInputs();
bindPdfExport();
bindSharePlan();
bindTableSorting();
bindTableExport();
bindTableExpand();
bindQuickActions();
applyState(S);
recalculate();

function buildHTML() {
  return `
<div class="mg-theme-bar">
  <div class="mg-theme-switch" id="swpThemeSwitch">
    <span>Theme</span>
    <div class="mg-theme-pill"><div class="mg-theme-dot">&#9789;</div></div>
  </div>
</div>

<div class="mg-hero">
  <div class="mg-hero-badge">Smart SWP Planner</div>
  <h1>SWP <em>Calculator</em></h1>
  <p id="swpHeroIntro">Plan post-tax withdrawals from equity, debt and fixed deposits while tracking how long your corpus can last.</p>
  <div class="mg-swp-hero-pills">
    <div class="mg-swp-hero-pill primary">
      <span class="mg-swp-hp-label" id="swpHeroCorpusLabel">Starting Corpus</span>
      <span class="mg-swp-hp-price" id="swpHeroCorpus" aria-live="polite">...</span>
      <span class="mg-swp-hp-unit" id="swpHeroCorpusUnit">investment base</span>
    </div>
    <div class="mg-swp-hero-pill">
      <span class="mg-swp-hp-label" id="swpHeroIncomeLabel">Net Withdrawal</span>
      <span class="mg-swp-hp-price" id="swpHeroIncome" aria-live="polite">...</span>
      <span class="mg-swp-hp-unit" id="swpHeroIncomeUnit">annualized post-tax payout</span>
    </div>
    <div class="mg-swp-hero-pill">
      <span class="mg-swp-hp-label" id="swpHeroEndingLabel">Ending Corpus</span>
      <span class="mg-swp-hp-price" id="swpHeroEnding" aria-live="polite">...</span>
      <span class="mg-swp-hp-unit" id="swpHeroEndingUnit">after full tenure</span>
    </div>
  </div>
  <div class="mg-swp-health-wrap">
    <div class="mg-swp-health-meter">
      <div class="mg-swp-health-bar" id="swpHealthBar"></div>
    </div>
    <div class="mg-swp-health-note" id="swpHealthNote">Corpus health will appear here.</div>
  </div>
</div>

<div class="mg-container">
  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128184;</div>
      <div>
        <div class="mg-section-title">SWP INPUTS</div>
        <div class="mg-section-subtitle" id="swpInputsSubtitle">Build a blended withdrawal plan in just three rows</div>
      </div>
      <div class="mg-swp-mode-toggle">
        <button class="mg-pill active" data-swp-mode="standard" type="button" aria-pressed="true">Standard</button>
        <button class="mg-pill" data-swp-mode="reverse" type="button" aria-pressed="false">Reverse</button>
      </div>
    </div>
    <div class="mg-section-body" id="swpInputsBody">
      <div class="mg-swp-top-shell">
        <div class="mg-swp-left-grid">
          <div class="mg-subcard">
            <label class="mg-input-label" for="swpCorpus" id="swpCorpusLabel">Initial Corpus</label>
            <div class="mg-input-field"><input class="mg-input" id="swpCorpus" type="text" inputmode="numeric" aria-describedby="swpCorpusHelp swpCorpusModeNote" value="${formatIndianNumber(PREVIEW.corpus)}"></div>
            <div class="mg-swp-field-note" id="swpCorpusHelp">Your starting investment pool before withdrawals begin.</div>
            <div class="mg-swp-field-note" id="swpCorpusModeNote"></div>
          </div>
          <div class="mg-subcard">
            <label class="mg-input-label" for="swpWithdraw" id="swpWithdrawLabel">Monthly Withdrawal</label>
            <div class="mg-input-field"><input class="mg-input" id="swpWithdraw" type="text" inputmode="numeric" aria-describedby="swpWithdrawHelp swpWithdrawModeNote" value="${formatIndianNumber(PREVIEW.withdraw)}"></div>
            <div class="mg-swp-field-note" id="swpWithdrawHelp">Gross amount you plan to withdraw every payout cycle.</div>
            <div class="mg-swp-field-note" id="swpWithdrawModeNote"></div>
          </div>
          <div class="mg-subcard">
            <label class="mg-input-label" for="swpYears" id="swpDurationLabel">Duration</label>
            <div class="mg-swp-standard-only" id="swpDurationWrap">
              <div class="mg-input-field"><input class="mg-input" id="swpYears" type="number" min="1" max="40" step="1" aria-describedby="swpYearsHelp" value="${PREVIEW.years}"></div>
              <div class="mg-swp-field-note" id="swpYearsHelp">How long you want the withdrawals to continue. Maximum supported duration: 40 years.</div>
            </div>
            <div class="mg-swp-reverse-only" id="swpAgeWrap">
              <div class="mg-swp-assump-grid mg-swp-age-grid">
                <div class="mg-swp-mini-box">
                  <span class="mg-swp-mini-label">Current Age</span>
                  <div class="mg-input-field mg-swp-mini-field no-suffix">
                    <input class="mg-input" id="swpCurrentAge" type="number" min="18" max="80" step="1" aria-label="Current age" value="${PREVIEW.currentAge}">
                  </div>
                </div>
                <div class="mg-swp-mini-box">
                  <span class="mg-swp-mini-label">Retirement Age</span>
                  <div class="mg-input-field mg-swp-mini-field no-suffix">
                    <input class="mg-input" id="swpRetirementAge" type="number" min="19" max="90" step="1" aria-label="Retirement age" value="${PREVIEW.retirementAge}">
                  </div>
                </div>
              </div>
              <div class="mg-swp-field-note" id="swpReverseYearsNote">Retirement window will be used as the SWP duration.</div>
            </div>
          </div>
          <div class="mg-subcard">
            <label class="mg-input-label" for="swpFreq">Withdrawal Frequency</label>
            <select class="mg-input-text" id="swpFreq" aria-describedby="swpFreqImpact">
              <option value="monthly"${PREVIEW.frequency === 'monthly' ? ' selected' : ''}>Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <div class="mg-swp-field-note">Choose whether the plan should model monthly, quarterly or yearly payouts.</div>
            <div class="mg-swp-field-note" id="swpFreqImpact"></div>
          </div>
          <div class="mg-subcard">
            <label class="mg-input-label" for="swpStepUp">Annual Step-Up</label>
            <div class="mg-input-field"><input class="mg-input" id="swpStepUp" type="number" min="0" max="25" step="0.5" aria-describedby="swpStepUpHelp" value="${PREVIEW.stepUpPct}"></div>
            <div class="mg-swp-field-note" id="swpStepUpHelp">Use this if you want withdrawals to rise every year with inflation or lifestyle increases.</div>
            <div class="mg-swp-action-row"><button class="mg-btn-ghost" id="swpNoStepUpBtn" type="button">No step-up</button></div>
          </div>
          <div class="mg-subcard">
            <label class="mg-input-label">Return Assumptions</label>
            <div class="mg-swp-assump-grid mg-swp-return-grid">
              <div class="mg-swp-mini-box">
                <span class="mg-swp-mini-label">Equity %</span>
                <div class="mg-input-field mg-swp-mini-field">
                  <input class="mg-input" id="swpReturnEquity" type="text" inputmode="decimal" placeholder="12" value="${PREVIEW.returnEquity}">
                </div>
              </div>
              <div class="mg-swp-mini-box">
                <span class="mg-swp-mini-label">Debt %</span>
                <div class="mg-input-field mg-swp-mini-field">
                  <input class="mg-input" id="swpReturnDebt" type="text" inputmode="decimal" placeholder="8" value="${PREVIEW.returnDebt}">
                </div>
              </div>
              <div class="mg-swp-mini-box">
                <span class="mg-swp-mini-label">FD %</span>
                <div class="mg-input-field mg-swp-mini-field">
                  <input class="mg-input" id="swpReturnFd" type="text" inputmode="decimal" placeholder="7" value="${PREVIEW.returnFd}">
                </div>
              </div>
              <div class="mg-swp-mini-box">
                <span class="mg-swp-mini-label">Tax slab %</span>
                <div class="mg-input-field mg-swp-mini-field">
                  <input class="mg-input" id="swpTaxSlab" type="text" inputmode="decimal" placeholder="30" value="${PREVIEW.taxSlab}">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mg-subcard mg-swp-mix-card">
          <label class="mg-input-label">Investment mix</label>
          <div class="mg-swp-mix-row">
            <div class="mg-swp-mix-label"><span>Equity</span><button class="mg-swp-lock on" type="button" data-mix-lock="swpMixEquity" aria-label="Lock Equity allocation">Lock</button></div>
            <input class="mg-slider" id="swpMixEquity" type="range" min="0" max="100" step="1" value="${PREVIEW.mixEquity}">
            <strong id="swpMixEquityVal">${PREVIEW.mixEquity}%</strong>
          </div>
          <div class="mg-swp-mix-row">
            <div class="mg-swp-mix-label"><span>Debt</span><button class="mg-swp-lock" type="button" data-mix-lock="swpMixDebt" aria-label="Lock Debt allocation">Lock</button></div>
            <input class="mg-slider" id="swpMixDebt" type="range" min="0" max="100" step="1" value="${PREVIEW.mixDebt}">
            <strong id="swpMixDebtVal">${PREVIEW.mixDebt}%</strong>
          </div>
          <div class="mg-swp-mix-row">
            <div class="mg-swp-mix-label"><span>Fixed Deposit</span><button class="mg-swp-lock" type="button" data-mix-lock="swpMixFd" aria-label="Lock Fixed Deposit allocation">Lock</button></div>
            <input class="mg-slider" id="swpMixFd" type="range" min="0" max="100" step="1" value="${PREVIEW.mixFd}">
            <strong id="swpMixFdVal">${PREVIEW.mixFd}%</strong>
          </div>
          <div class="mg-swp-field-note" id="swpMixNote">Locked: Equity | Weighted return: 9.8%</div>
          <div class="mg-swp-mix-chart"><canvas id="swpMixChart" aria-label="Investment mix donut chart" role="img"></canvas></div>
        </div>
      </div>

      <div class="mg-row-3">
        <div class="mg-subcard">
          <label class="mg-input-label mg-swp-card-heading">Interesting Insight</label>
          <div class="mg-swp-empty" id="swpInsight">Your plan will estimate the year in which the corpus may run out, or show how much legacy corpus can survive.</div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label mg-swp-card-heading">Best SWP Options</label>
        <div class="mg-swp-preset-card">
            <div class="mg-swp-preset-row" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
              <button class="mg-pill active" data-swp-preset="pension" type="button" aria-pressed="true">Pension</button>
              <button class="mg-pill" data-swp-preset="balanced" type="button" aria-pressed="false">Balanced</button>
              <button class="mg-pill" data-swp-preset="legacy" type="button" aria-pressed="false">Legacy</button>
            </div>
            <div class="mg-swp-preset-copy" id="swpPresetCopy">Pension: steady monthly income with a moderately defensive mix.</div>
            <div class="mg-swp-card-divider"></div>
            <div class="mg-swp-share-row">
              <button class="mg-btn-ghost mg-swp-share-btn" id="swpShareBtn" type="button">Copy Shareable URL</button>
              <button class="mg-btn-secondary mg-swp-pdf-btn" id="swpPdfBtn" type="button">Download PDF Report</button>
            </div>
          </div>
        </div>
        <div class="mg-subcard">
          <label class="mg-input-label mg-swp-card-heading">Portfolio Logic</label>
          <div class="mg-swp-empty" id="swpPortfolioLogic"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="mg-swp-summary-grid mg-animate-in" style="margin-bottom:20px;">
    <div class="mg-swp-summary-card">
      <span class="mg-swp-summary-label" id="swpGrossLabel">Total Gross Withdrawn</span>
      <span class="mg-swp-summary-value" id="swpGross" aria-live="polite">...</span>
      <span class="mg-swp-summary-note" id="swpGrossNote">...</span>
    </div>
    <div class="mg-swp-summary-card">
      <span class="mg-swp-summary-label" id="swpTaxLabel">Estimated Tax</span>
      <span class="mg-swp-summary-value" id="swpTax" aria-live="polite">...</span>
      <span class="mg-swp-summary-note" id="swpTaxNote">...</span>
    </div>
    <div class="mg-swp-summary-card">
      <span class="mg-swp-summary-label" id="swpNetLabel">Total Net Received</span>
      <span class="mg-swp-summary-value" id="swpNet" aria-live="polite">...</span>
      <span class="mg-swp-summary-note" id="swpNetNote">...</span>
    </div>
    <div class="mg-swp-summary-card">
      <span class="mg-swp-summary-label" id="swpEndingLabel">Ending Corpus</span>
      <span class="mg-swp-summary-value" id="swpEnding" aria-live="polite">...</span>
      <span class="mg-swp-summary-note" id="swpEndingNote">...</span>
    </div>
  </div>
  <details class="mg-swp-tax-breakdown mg-animate-in">
    <summary aria-label="Open tax breakdown details">Tax Breakdown</summary>
    <div class="mg-swp-tax-body" id="swpTaxDetails"></div>
  </details>

  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128202;</div>
      <div>
        <div class="mg-section-title">Growth Visuals</div>
        <div class="mg-section-subtitle">Closing corpus, cumulative income and gross-vs-net withdrawal flow</div>
      </div>
    </div>
    <div class="mg-section-body">
      <div class="mg-swp-chart-grid">
        <div class="mg-swp-growth-wrap">
          <div class="mg-swp-chart-brand">SWP Calculator by MasterGadgets.com</div>
          <div class="mg-swp-chart-toggles" id="swpCorpusToggles"></div>
          <div class="mg-swp-growth-canvas"><canvas id="swpCorpusChart" aria-label="Corpus growth chart" role="img"></canvas></div>
        </div>
        <div class="mg-swp-payout-wrap">
          <div class="mg-swp-chart-brand">SWP Calculator by MasterGadgets.com</div>
          <div class="mg-swp-chart-toggles" id="swpPayoutToggles"></div>
          <div class="mg-swp-payout-canvas"><canvas id="swpPayoutChart" aria-label="Payout breakdown chart" role="img"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#129309;</div>
      <div>
        <div class="mg-section-title" id="swpScenarioTitle">Scenario Comparison</div>
        <div class="mg-section-subtitle" id="swpScenarioSubtitle">See how your current plan stacks up against the best SWP paths in one glance</div>
      </div>
    </div>
    <div class="mg-section-body">
      <div class="mg-swp-compare-grid" id="swpScenarioGrid"></div>
    </div>
  </div>

  <div class="mg-section mg-animate-in">
    <div class="mg-section-header">
      <div class="mg-section-icon">&#128200;</div>
      <div>
        <div class="mg-section-title">Advanced Visuals</div>
        <div class="mg-section-subtitle">Understand year-on-year drawdown pressure and how annual step-up changes corpus longevity</div>
      </div>
    </div>
    <div class="mg-section-body">
      <div class="mg-swp-chart-grid mg-swp-advanced-grid">
        <div class="mg-swp-growth-wrap">
          <div class="mg-swp-chart-brand">SWP Calculator by MasterGadgets.com</div>
          <div class="mg-swp-chart-title">Yearly Return vs Drawdown</div>
          <div class="mg-swp-compare-copy" id="swpWaterfallNote">Waterfall view will appear here.</div>
          <div class="mg-swp-growth-canvas"><canvas id="swpWaterfallChart" aria-label="Yearly return versus drawdown chart" role="img"></canvas></div>
        </div>
        <div class="mg-swp-payout-wrap">
          <div class="mg-swp-chart-brand">SWP Calculator by MasterGadgets.com</div>
          <div class="mg-swp-chart-title">Step-Up Impact Comparison</div>
          <div class="mg-swp-compare-copy" id="swpStepUpNote">Step-up impact will appear here.</div>
          <div class="mg-swp-payout-canvas"><canvas id="swpStepUpChart" aria-label="Step-up impact comparison chart" role="img"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  <div class="mg-section mg-animate-in">
      <div class="mg-section-header">
        <div class="mg-section-icon">&#128176;</div>
        <div>
          <div class="mg-section-title" id="swpSnapshotTitle">Snapshot</div>
          <div class="mg-section-subtitle" id="swpSnapshotSubtitle">Key sustainability and tax indicators at a glance</div>
      </div>
    </div>
    <div class="mg-section-body">
      <div class="mg-swp-stat-grid" id="swpStatGrid"></div>
    </div>
  </div>

  <div class="mg-row-2 mg-animate-in mg-swp-bottom-grid">
    <div class="mg-section mg-swp-table-section">
      <div class="mg-section-header">
        <div class="mg-section-icon">&#128221;</div>
        <div>
          <div class="mg-section-title">Yearly Breakdown</div>
          <div class="mg-section-subtitle">Gross payout, tax drag, net income and closing corpus</div>
        </div>
        <div class="mg-swp-table-actions">
          <button class="mg-btn-ghost mg-swp-table-btn" id="swpExpandTableBtn" type="button">View Full Table</button>
          <button class="mg-btn-ghost mg-swp-table-btn mg-swp-table-btn-primary" id="swpExportCsvBtn" type="button">Export CSV</button>
        </div>
      </div>
      <div class="mg-section-body">
        <div class="mg-swp-table-toolbar">
          <span>Scroll horizontally for full yearly detail. Sticky year and closing columns stay visible.</span>
          <button class="mg-btn-ghost mg-swp-table-close" id="swpCloseTableBtn" type="button">Close Full Table</button>
        </div>
        <div class="mg-swp-table-wrap">
          <table class="mg-table mg-swp-table">
            <thead>
              <tr>
                <th data-sort="year">Year</th>
                <th data-sort="gross">Gross</th>
                <th data-sort="tax">Tax</th>
                <th data-sort="net">Net</th>
                <th data-sort="closing">Closing</th>
                <th data-sort="eqWithdraw">Eq Out</th>
                <th data-sort="debtWithdraw">Debt Out</th>
                <th data-sort="fdWithdraw">FD Out</th>
              </tr>
            </thead>
            <tbody id="swpTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="mg-section mg-swp-notes-section">
      <div class="mg-section-header">
        <div class="mg-section-icon">&#129504;</div>
        <div>
          <div class="mg-section-title">Planner Notes</div>
          <div class="mg-section-subtitle">How the mixed-portfolio SWP math is being interpreted</div>
        </div>
      </div>
      <div class="mg-section-body">
        <div class="mg-swp-assump-list" id="swpAssumptions"></div>
      </div>
    </div>
  </div>

  <div class="mg-footer">
    <strong>SWP Calculator</strong> by <a href="https://mastergadgets.com" target="_blank" rel="noopener">MasterGadgets.com</a> | Made with &#10084;&#65039; by <a href="https://twitter.com/AmitBhawani" target="_blank" rel="noopener">@AmitBhawani</a> in India
    <br><br>
    <div style="max-width:760px;margin:0 auto;line-height:1.7;">
      <strong>Disclaimer:</strong> This SWP calculator is an educational planning tool and not investment, retirement or tax advice. Equity tax here is modeled using current long-term capital gains rules, while debt mutual fund gains and fixed deposit interest are modeled using the selected slab rate. Actual tax depends on holding period, product structure, investor profile and future law changes. Mutual fund investments are subject to market risks. Please consult a SEBI-registered investment adviser or tax professional before acting on this output.
    </div>
  </div>
</div>`;
}

function setupTheme() {
  const sw = document.getElementById('swpThemeSwitch');
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
  [
    'swpCorpus', 'swpWithdraw', 'swpYears', 'swpFreq', 'swpStepUp',
    'swpReturnEquity', 'swpReturnDebt', 'swpReturnFd', 'swpTaxSlab',
    'swpCurrentAge', 'swpRetirementAge'
  ].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'swpCorpus' || id === 'swpWithdraw') {
      el.addEventListener('focus', function () {
        if (el.readOnly) return;
        el.value = digitsOnly(el.value);
        try { el.select(); } catch (e) {}
      });
      el.addEventListener('input', recalculate);
      el.addEventListener('blur', function () {
        const raw = digitsOnly(el.value);
        el.value = raw ? formatIndianNumber(raw) : '';
        recalculate();
      });
      return;
    }
    el.addEventListener('input', recalculate);
    el.addEventListener('change', recalculate);
  });

  ['swpMixEquity', 'swpMixDebt', 'swpMixFd'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      rebalanceMix(id);
      recalculate();
    });
    el.addEventListener('change', function () {
      rebalanceMix(id);
      recalculate();
    });
  });

  root.querySelectorAll('[data-mix-lock]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      S.lockedMixId = btn.getAttribute('data-mix-lock') || S.lockedMixId;
      updateMixDisplay();
      recalculate();
    });
  });

  root.querySelectorAll('[data-swp-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const key = btn.getAttribute('data-swp-preset');
      const presets = {
        pension: { corpus: 20000000, withdraw: 70000, years: 16, frequency: 'monthly', stepUpPct: 8, mixEquity: 45, mixDebt: 35, mixFd: 20, returnEquity: 12, returnDebt: 8, returnFd: 7, taxSlab: 30 },
        balanced: { corpus: 25000000, withdraw: 100000, years: 20, frequency: 'monthly', stepUpPct: 8, mixEquity: 50, mixDebt: 30, mixFd: 20, returnEquity: 12, returnDebt: 8.5, returnFd: 7, taxSlab: 30 },
        legacy: { corpus: 30000000, withdraw: 120000, years: 20, frequency: 'monthly', stepUpPct: 8, mixEquity: 60, mixDebt: 25, mixFd: 15, returnEquity: 13, returnDebt: 8.5, returnFd: 7, taxSlab: 30 }
      };
      const copy = {
        pension: 'Pension: steady monthly income with a moderately defensive mix.',
        balanced: 'Balanced: a middle path for income today and corpus growth later.',
        legacy: 'Legacy: higher growth bias for families who still want money left behind.'
      };
      applyState(presets[key] || PREVIEW);
      root.querySelectorAll('[data-swp-preset]').forEach(function (x) {
        x.classList.toggle('active', x === btn);
        x.setAttribute('aria-pressed', x === btn ? 'true' : 'false');
      });
      text('swpPresetCopy', copy[key] || copy.pension);
      recalculate();
    });
  });

  root.querySelectorAll('[data-swp-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const mode = btn.getAttribute('data-swp-mode') || 'standard';
      S.mode = mode;
      if (mode === 'reverse') S.reverseTier = 'recommended';
      root.querySelectorAll('[data-swp-mode]').forEach(function (x) {
        x.classList.toggle('active', x === btn);
        x.setAttribute('aria-pressed', x === btn ? 'true' : 'false');
      });
      recalculate();
    });
  });

  ['swpMixEquity', 'swpMixDebt', 'swpMixFd'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('aria-label',
      id === 'swpMixEquity' ? 'Equity allocation slider' :
      id === 'swpMixDebt' ? 'Debt allocation slider' :
      'Fixed deposit allocation slider'
    );
  });
}

function bindPdfExport() {
  const btn = document.getElementById('swpPdfBtn');
  if (!btn) return;
  btn.addEventListener('click', exportPdfReport);
}

function bindSharePlan() {
  const btn = document.getElementById('swpShareBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const cfg = S.preview || snapshot();
    const url = new URL(window.location.href);
    url.search = '';
    Object.entries({
      mode: S.mode,
      corpus: Math.round(cfg.corpus),
      withdrawal: Math.round(cfg.withdraw),
      duration: Math.round(cfg.years),
      currentAge: Math.round(S.currentAge),
      retirementAge: Math.round(S.retirementAge),
      frequency: cfg.frequency,
      stepup: Number(cfg.stepUpPct).toFixed(1).replace(/\.0$/, ''),
      equity: Number(cfg.mixEquity).toFixed(1).replace(/\.0$/, ''),
      debt: Number(cfg.mixDebt).toFixed(1).replace(/\.0$/, ''),
      fd: Number(cfg.mixFd).toFixed(1).replace(/\.0$/, ''),
      req: Number(cfg.returnEquity).toFixed(1).replace(/\.0$/, ''),
      rdebt: Number(cfg.returnDebt).toFixed(1).replace(/\.0$/, ''),
      rfd: Number(cfg.returnFd).toFixed(1).replace(/\.0$/, ''),
      slab: Number(cfg.taxSlab).toFixed(0)
    }).forEach(function (pair) {
      url.searchParams.set(pair[0], pair[1]);
    });
    const textValue = url.toString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textValue).then(function () {
        btn.textContent = 'URL Copied';
        setTimeout(function () { btn.textContent = 'Copy Shareable URL'; }, 1600);
      }).catch(function () {
        window.prompt('Copy this SWP plan URL', textValue);
      });
    } else {
      window.prompt('Copy this SWP plan URL', textValue);
    }
  });
}

function bindTableSorting() {
  root.querySelectorAll('.mg-swp-table th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      const key = th.getAttribute('data-sort');
      if (!key) return;
      if (S.tableSort.key === key) {
        S.tableSort.dir *= -1;
      } else {
        S.tableSort = { key: key, dir: 1 };
      }
      renderTable();
    });
  });
}

function bindTableExport() {
  const btn = document.getElementById('swpExportCsvBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (!S.rows.length) return;
    const header = ['Year','Gross','Tax','Net','Closing Corpus','Equity Out','Debt Out','FD Out'];
    const lines = [header.join(',')].concat(S.rows.map(function (row) {
      return [
        row.year,
        Math.round(row.gross),
        Math.round(row.tax),
        Math.round(row.net),
        Math.round(row.closing),
        Math.round(row.eqWithdraw),
        Math.round(row.debtWithdraw),
        Math.round(row.fdWithdraw)
      ].join(',');
    }));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mastergadgets-swp-yearly-breakdown.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function bindTableExpand() {
  const section = root.querySelector('.mg-swp-table-section');
  const openBtn = document.getElementById('swpExpandTableBtn');
  const closeBtn = document.getElementById('swpCloseTableBtn');
  if (!section || !openBtn || !closeBtn) return;
  openBtn.addEventListener('click', function () {
    section.classList.add('is-expanded');
  });
  closeBtn.addEventListener('click', function () {
    section.classList.remove('is-expanded');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') section.classList.remove('is-expanded');
  });
}

function bindQuickActions() {
  const noStep = document.getElementById('swpNoStepUpBtn');
  if (noStep) {
    noStep.addEventListener('click', function () {
      setInputValue('swpStepUp', 0);
      recalculate();
    });
  }
}

function loadStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return;
  const next = Object.assign({}, PREVIEW);
  if (params.has('mode')) next.mode = params.get('mode') === 'reverse' ? 'reverse' : 'standard';
  if (params.has('corpus')) next.corpus = num(params.get('corpus'), PREVIEW.corpus);
  if (params.has('withdrawal')) next.withdraw = num(params.get('withdrawal'), PREVIEW.withdraw);
  if (params.has('duration')) next.years = clamp(Math.round(num(params.get('duration'), PREVIEW.years)), 1, 40);
  if (params.has('currentAge')) next.currentAge = clamp(Math.round(num(params.get('currentAge'), PREVIEW.currentAge)), 18, 80);
  if (params.has('retirementAge')) next.retirementAge = clamp(Math.round(num(params.get('retirementAge'), PREVIEW.retirementAge)), PREVIEW.currentAge + 1, 90);
  if (params.has('frequency')) next.frequency = params.get('frequency') || PREVIEW.frequency;
  if (params.has('stepup')) next.stepUpPct = clamp(num(params.get('stepup'), PREVIEW.stepUpPct), 0, 25);
  if (params.has('equity')) next.mixEquity = clamp(num(params.get('equity'), PREVIEW.mixEquity), 0, 100);
  if (params.has('debt')) next.mixDebt = clamp(num(params.get('debt'), PREVIEW.mixDebt), 0, 100);
  if (params.has('fd')) next.mixFd = clamp(num(params.get('fd'), PREVIEW.mixFd), 0, 100);
  if (params.has('req')) next.returnEquity = clamp(num(params.get('req'), PREVIEW.returnEquity), 1, 100);
  if (params.has('rdebt')) next.returnDebt = clamp(num(params.get('rdebt'), PREVIEW.returnDebt), 1, 30);
  if (params.has('rfd')) next.returnFd = clamp(num(params.get('rfd'), PREVIEW.returnFd), 1, 20);
  if (params.has('slab')) next.taxSlab = clamp(num(params.get('slab'), PREVIEW.taxSlab), 0, 40);
  Object.assign(S, next);
}

function applyState(next) {
  S.mode = next.mode || S.mode;
  S.corpus = num(next.corpus, S.corpus);
  S.withdraw = num(next.withdraw, S.withdraw);
  S.years = Math.max(1, Math.round(num(next.years, S.years)));
  S.currentAge = Math.max(18, Math.round(num(next.currentAge, S.currentAge)));
  S.retirementAge = Math.max(S.currentAge + 1, Math.round(num(next.retirementAge, S.retirementAge)));
  S.frequency = next.frequency || S.frequency;
  S.stepUpPct = Math.max(0, num(next.stepUpPct, S.stepUpPct));
  S.mixEquity = num(next.mixEquity, S.mixEquity);
  S.mixDebt = num(next.mixDebt, S.mixDebt);
  S.mixFd = num(next.mixFd, S.mixFd);
  S.returnEquity = num(next.returnEquity, S.returnEquity);
  S.returnDebt = num(next.returnDebt, S.returnDebt);
  S.returnFd = num(next.returnFd, S.returnFd);
  S.taxSlab = num(next.taxSlab, S.taxSlab);
  S.inflationAdjusted = Boolean(next.inflationAdjusted);

  setInputValue('swpCorpus', S.corpus);
  setInputValue('swpWithdraw', S.withdraw);
  setInputValue('swpYears', S.years);
  setInputValue('swpCurrentAge', S.currentAge);
  setInputValue('swpRetirementAge', S.retirementAge);
  setInputValue('swpFreq', S.frequency);
  setInputValue('swpStepUp', S.stepUpPct);
  setInputValue('swpMixEquity', S.mixEquity);
  setInputValue('swpMixDebt', S.mixDebt);
  setInputValue('swpMixFd', S.mixFd);
  setInputValue('swpReturnEquity', S.returnEquity);
  setInputValue('swpReturnDebt', S.returnDebt);
  setInputValue('swpReturnFd', S.returnFd);
  setInputValue('swpTaxSlab', S.taxSlab);
  root.querySelectorAll('[data-swp-mode]').forEach(function (x) {
    const active = x.getAttribute('data-swp-mode') === S.mode;
    x.classList.toggle('active', active);
    x.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'swpCorpus' || id === 'swpWithdraw') {
    el.value = formatIndianNumber(value);
    return;
  }
  el.value = String(value);
}

function rebalanceMix(changedId) {
  const ids = ['swpMixEquity', 'swpMixDebt', 'swpMixFd'];
  const changedValue = clamp(num(getInputValue(changedId), 0), 0, 100);
  const lockedId = S.lockedMixId;

  if (lockedId && lockedId !== changedId) {
    const lockedValue = clamp(num(getInputValue(lockedId), 0), 0, 100);
    const freeId = ids.filter(function (id) { return id !== changedId && id !== lockedId; })[0];
    const adjustedChanged = Math.min(changedValue, Math.max(0, 100 - lockedValue));
    const freeValue = Math.max(0, 100 - lockedValue - adjustedChanged);
    setInputValue(changedId, adjustedChanged);
    if (freeId) setInputValue(freeId, freeValue);
  } else {
    const otherIds = ids.filter(function (id) { return id !== changedId; });
    const currentOthers = otherIds.map(function (id) { return clamp(num(getInputValue(id), 0), 0, 100); });
    const targetOthersTotal = Math.max(0, 100 - changedValue);
    const currentOthersTotal = currentOthers[0] + currentOthers[1];
    let nextOthers;

    if (currentOthersTotal <= 0) {
      const first = Math.floor(targetOthersTotal / 2);
      nextOthers = [first, targetOthersTotal - first];
    } else {
      const scaledFirst = Math.round((currentOthers[0] / currentOthersTotal) * targetOthersTotal);
      nextOthers = [scaledFirst, targetOthersTotal - scaledFirst];
    }

    setInputValue(changedId, changedValue);
    setInputValue(otherIds[0], nextOthers[0]);
    setInputValue(otherIds[1], nextOthers[1]);
  }
}

function recalculate() {
  const corpusRaw = getInputValue('swpCorpus').trim();
  const withdrawRaw = getInputValue('swpWithdraw').trim();
  const yearsRaw = getInputValue('swpYears').trim();
  const ready = corpusRaw !== '' && withdrawRaw !== '' && yearsRaw !== '';

  const corpusInputValue = corpusRaw === '' ? 0 : Math.max(0, num(corpusRaw, PREVIEW.corpus));
  const withdrawInputValue = withdrawRaw === '' ? 0 : Math.max(0, num(withdrawRaw, PREVIEW.withdraw));
  S.corpus = corpusInputValue;
  S.withdraw = withdrawInputValue;
  S.years = yearsRaw === '' ? 0 : clamp(Math.round(num(yearsRaw, PREVIEW.years)), 1, 40);
  S.currentAge = clamp(Math.round(num(getInputValue('swpCurrentAge'), PREVIEW.currentAge)), 18, 80);
  S.retirementAge = clamp(Math.round(num(getInputValue('swpRetirementAge'), PREVIEW.retirementAge)), S.currentAge + 1, 90);
  S.frequency = getInputValue('swpFreq') || PREVIEW.frequency;
  S.stepUpPct = clamp(num(getInputValue('swpStepUp'), PREVIEW.stepUpPct), 0, 25);
  S.taxSlab = clamp(num(getInputValue('swpTaxSlab'), PREVIEW.taxSlab), 0, 40);
  S.mixEquity = clamp(num(getInputValue('swpMixEquity'), PREVIEW.mixEquity), 0, 100);
  S.mixDebt = clamp(num(getInputValue('swpMixDebt'), PREVIEW.mixDebt), 0, 100);
  S.mixFd = clamp(num(getInputValue('swpMixFd'), PREVIEW.mixFd), 0, 100);
  S.returnEquity = clamp(num(getInputValue('swpReturnEquity'), PREVIEW.returnEquity), 1, 100);
  S.returnDebt = clamp(num(getInputValue('swpReturnDebt'), PREVIEW.returnDebt), 1, 30);
  S.returnFd = clamp(num(getInputValue('swpReturnFd'), PREVIEW.returnFd), 1, 20);
  S.inflationAdjusted = PREVIEW.inflationAdjusted;

  if (yearsRaw !== '' && Number(yearsRaw) > 40) setInputValue('swpYears', S.years);
  if (S.mode === 'reverse') {
    S.years = clamp(S.retirementAge - S.currentAge, 1, 40);
  }

  updateMixDisplay();

  let cfg = ready ? snapshot() : PREVIEW;
  if (ready && S.mode === 'reverse') {
    S.reverseSuite = getReverseGoalSuite(cfg);
    cfg = Object.assign({}, (S.reverseSuite[S.reverseTier] || S.reverseSuite.recommended).config);
    S.corpus = cfg.corpus;
  } else if (S.mode !== 'reverse') {
    S.reverseSuite = null;
  }
  const result = simulate(cfg);
  S.rows = result.rows;
  S.totals = result.totals;
  S.preview = ready ? null : PREVIEW;

  syncModeFields();
  try { renderSummary(); } catch (e) {}
  try { renderStats(); } catch (e) {}
  try { renderTable(); } catch (e) {}
  try { renderAssumptions(); } catch (e) {}
  try { renderInsight(cfg, result.totals); } catch (e) {}
  try { renderCharts(); } catch (e) {}
  try { renderScenarioComparison(); } catch (e) {}
}

function snapshot() {
  const total = Math.max(1, S.mixEquity + S.mixDebt + S.mixFd);
  return {
    corpus: S.corpus,
    withdraw: S.withdraw,
    years: S.years,
    currentAge: S.currentAge,
    retirementAge: S.retirementAge,
    frequency: S.frequency,
    stepUpPct: S.stepUpPct,
    mixEquity: (S.mixEquity / total) * 100,
    mixDebt: (S.mixDebt / total) * 100,
    mixFd: (S.mixFd / total) * 100,
    returnEquity: S.returnEquity,
    returnDebt: S.returnDebt,
    returnFd: S.returnFd,
    taxSlab: S.taxSlab,
    inflationAdjusted: S.inflationAdjusted
  };
}

function estimateReversePlan(cfg) {
  const targetWithdraw = Math.max(1, cfg.withdraw);
  let low = targetWithdraw * 12;
  let high = Math.max(1000000, targetWithdraw * 12 * cfg.years * 3);
  let best = high;
  for (let i = 0; i < 26; i++) {
    const mid = Math.round((low + high) / 2);
    const testCfg = Object.assign({}, cfg, { corpus: mid });
    const result = simulate(testCfg, { skipStress: true });
    const lasts = survivesFullTenure(result, cfg.years);
    if (lasts) {
      best = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return Object.assign({}, cfg, { corpus: roundNice(best, 'up') });
}

function getReverseGoalSuite(cfg) {
  const durationYears = Math.max(1, S.retirementAge - S.currentAge);
  const currentBase = estimateReversePlan(Object.assign({}, cfg, { years: durationYears }));
  const leanBase = estimateReversePlan(Object.assign({}, cfg, {
    years: durationYears,
    returnEquity: Math.max(1, cfg.returnEquity + 0.75),
    returnDebt: Math.max(1, cfg.returnDebt + 0.35),
    returnFd: Math.max(1, cfg.returnFd + 0.2)
  }));
  const recommendedBase = estimateReversePlan(Object.assign({}, cfg, {
    years: durationYears,
    returnEquity: Math.max(1, cfg.returnEquity - 1.25),
    returnDebt: Math.max(1, cfg.returnDebt - 0.75),
    returnFd: Math.max(1, cfg.returnFd - 0.5)
  }));
  const comfortBase = estimateReversePlan(Object.assign({}, cfg, {
    years: durationYears,
    returnEquity: Math.max(1, cfg.returnEquity - 2),
    returnDebt: Math.max(1, cfg.returnDebt - 1),
    returnFd: Math.max(1, cfg.returnFd - 0.75)
  }));

  const currentCorpus = roundNice(currentBase.corpus, 'up');
  const leanCorpus = roundNice(Math.min(leanBase.corpus, currentCorpus * 0.96), 'up');
  const recommendedCorpus = roundNice(Math.max(recommendedBase.corpus, currentCorpus * 1.08), 'up');
  const comfortCorpus = roundNice(Math.max(comfortBase.corpus, recommendedCorpus * 1.12), 'up');

  return {
    current: {
      key: 'current',
      name: 'Current Ask',
      tag: 'Input',
      copy: 'Matches your current assumptions directly, without adding any comfort buffer.',
      config: Object.assign({}, currentBase, { corpus: currentCorpus }),
      current: false
    },
    lean: {
      key: 'lean',
      name: 'Lean Goal',
      tag: 'Tight',
      copy: 'Gets you to the target with a thinner buffer. Useful if you expect to stay flexible on expenses later.',
      config: Object.assign({}, leanBase, { corpus: leanCorpus }),
      current: false
    },
    recommended: {
      key: 'recommended',
      name: 'Recommended Goal',
      tag: 'Safer',
      copy: 'Builds in a more practical cushion using softer return assumptions, which usually suits retirement planning better.',
      config: Object.assign({}, recommendedBase, { corpus: recommendedCorpus }),
      current: true
    },
    comfort: {
      key: 'comfort',
      name: 'Comfort Goal',
      tag: 'Comfort',
      copy: 'Adds a stronger reserve so the plan still feels comfortable if returns soften or expenses run higher than expected.',
      config: Object.assign({}, comfortBase, { corpus: comfortCorpus }),
      current: false
    }
  };
}

function updateMixDisplay() {
  const total = S.mixEquity + S.mixDebt + S.mixFd;
  const weighted = ((S.mixEquity * S.returnEquity) + (S.mixDebt * S.returnDebt) + (S.mixFd * S.returnFd)) / Math.max(1, total);
  text('swpMixEquityVal', Math.round(S.mixEquity) + '%');
  text('swpMixDebtVal', Math.round(S.mixDebt) + '%');
  text('swpMixFdVal', Math.round(S.mixFd) + '%');
  text('swpMixNote', 'Locked: ' + mixName(S.lockedMixId) + ' | Weighted return: ' + weighted.toFixed(1) + '%');
  setSliderTitle('swpMixEquity', 'Equity allocation: ' + Math.round(S.mixEquity) + '% | Expected return: ' + S.returnEquity.toFixed(1) + '%');
  setSliderTitle('swpMixDebt', 'Debt allocation: ' + Math.round(S.mixDebt) + '% | Expected return: ' + S.returnDebt.toFixed(1) + '% | Tax slab: ' + S.taxSlab.toFixed(0) + '%');
  setSliderTitle('swpMixFd', 'Fixed deposit allocation: ' + Math.round(S.mixFd) + '% | Expected return: ' + S.returnFd.toFixed(1) + '% | Tax slab: ' + S.taxSlab.toFixed(0) + '%');
  updateSliderFill('swpMixEquity', S.mixEquity);
  updateSliderFill('swpMixDebt', S.mixDebt);
  updateSliderFill('swpMixFd', S.mixFd);
  root.querySelectorAll('[data-mix-lock]').forEach(function (btn) {
    const on = btn.getAttribute('data-mix-lock') === S.lockedMixId;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function setSliderTitle(id, value) {
  const el = document.getElementById(id);
  if (el) el.title = value;
}

function updateSliderFill(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = clamp(num(value, 0), 0, 100);
  el.style.background = 'linear-gradient(90deg, rgba(212,133,59,0.95) 0%, rgba(212,133,59,0.95) ' + pct + '%, var(--bd) ' + pct + '%, var(--bd) 100%)';
}

function annualPayouts(freq) {
  if (freq === 'quarterly') return 4;
  if (freq === 'yearly') return 1;
  return 12;
}

function simulate(cfg, options) {
  const opts = options || {};
  const freqMonths = cfg.frequency === 'quarterly' ? 3 : cfg.frequency === 'yearly' ? 12 : 1;
  const totalMonths = cfg.years * 12;
  const taxBook = {};
  let withdrawal = cfg.withdraw;
  let eqValue = cfg.corpus * (cfg.mixEquity / 100);
  let debtValue = cfg.corpus * (cfg.mixDebt / 100);
  let fdValue = cfg.corpus * (cfg.mixFd / 100);
  let eqCost = eqValue;
  let debtCost = debtValue;
  let fdUntaxedInterestFY = 0;
  let openingCorpusYear = cfg.corpus;
  let yearGross = 0;
  let yearTax = 0;
  let yearNet = 0;
  let yearEqWithdraw = 0;
  let yearDebtWithdraw = 0;
  let yearFdWithdraw = 0;
  let yearEqTax = 0;
  let yearDebtTax = 0;
  let yearFdTax = 0;
  const rows = [];
  const inflationRate = 0.06;
  const benchmarkMonthly = 0.07 / 12;
  let benchmarkCorpus = cfg.corpus;

  const totals = {
    gross: 0,
    tax: 0,
    net: 0,
    endingCorpus: cfg.corpus,
    firstNetPayout: 0,
    firstYearGross: 0,
    firstYearTax: 0,
    firstYearNet: 0,
    highestYearNet: 0,
    depletedMonth: 0,
    lastNet: 0,
    drawRate: 0,
    taxDrag: 0,
    runwayDrop30: 0,
    confidenceScore: 0,
    requiredCorpus: cfg.corpus,
    maxWithdrawal: cfg.withdraw
  };

  for (let month = 1; month <= totalMonths; month++) {
    if (month > 1 && (month - 1) % 12 === 0 && cfg.stepUpPct > 0) {
      withdrawal = Math.round(withdrawal * (1 + cfg.stepUpPct / 100));
    }

    eqValue *= 1 + cfg.returnEquity / 12 / 100;
    debtValue *= 1 + cfg.returnDebt / 12 / 100;
    const fdInterest = fdValue * (cfg.returnFd / 12 / 100);
    fdValue += fdInterest;
    fdUntaxedInterestFY += fdInterest;
    benchmarkCorpus *= 1 + benchmarkMonthly;

    if (month % freqMonths === 0) {
      const totalValue = eqValue + debtValue + fdValue;
      const grossWanted = withdrawal;
      const gross = Math.min(totalValue, grossWanted);
      if (gross > 0) {
        const eqShare = totalValue > 0 ? eqValue / totalValue : 0;
        const debtShare = totalValue > 0 ? debtValue / totalValue : 0;
        const fdShare = totalValue > 0 ? fdValue / totalValue : 0;

        const eqGross = gross * eqShare;
        const debtGross = gross * debtShare;
        const fdGross = gross * fdShare;

        const eqGainShare = eqValue > 0 ? clamp(1 - (eqCost / eqValue), 0, 1) : 0;
        const debtGainShare = debtValue > 0 ? clamp(1 - (debtCost / debtValue), 0, 1) : 0;
        const eqGain = eqGross * eqGainShare;
        const debtGain = debtGross * debtGainShare;
        const eqTax = calcEquityTax(eqGain, month, taxBook);
        const debtTax = debtGain * (cfg.taxSlab / 100);

        eqValue -= eqGross;
        debtValue -= debtGross;
        fdValue -= fdGross;
        eqCost = Math.max(0, eqCost - (eqGross - eqGain));
        debtCost = Math.max(0, debtCost - (debtGross - debtGain));

        const tax = eqTax + debtTax;
        const net = Math.max(0, gross - tax);

        yearGross += gross;
        yearTax += tax;
        yearNet += net;
        yearEqWithdraw += eqGross;
        yearDebtWithdraw += debtGross;
        yearFdWithdraw += fdGross;
        yearEqTax += eqTax;
        yearDebtTax += debtTax;
        totals.gross += gross;
        totals.tax += tax;
        totals.net += net;
        totals.lastNet = net;
        if (!totals.firstNetPayout) totals.firstNetPayout = Math.round(net);

        if (!totals.depletedMonth && gross < grossWanted) totals.depletedMonth = month;
      }
    }

    if (month % 12 === 0) {
      const fdTax = fdUntaxedInterestFY * (cfg.taxSlab / 100);
      fdValue = Math.max(0, fdValue - fdTax);
      yearTax += fdTax;
      yearFdTax += fdTax;
      totals.tax += fdTax;
      totals.net = Math.max(0, totals.gross - totals.tax);

      const closing = Math.max(0, Math.round(eqValue + debtValue + fdValue));
      const totalClosing = eqValue + debtValue + fdValue;
      const yearIndex = month / 12;
      const inflationDivisor = Math.pow(1 + inflationRate, yearIndex);
      rows.push({
        year: yearIndex,
        opening: Math.round(openingCorpusYear),
        gross: Math.round(yearGross),
        tax: Math.round(yearTax),
        net: Math.max(0, Math.round(yearNet - fdTax)),
        closing: closing,
        realClosing: Math.round(closing / inflationDivisor),
        benchmark: Math.round(benchmarkCorpus / inflationDivisor),
        equityPct: totalClosing > 0 ? (eqValue / totalClosing) * 100 : 0,
        equityClosing: Math.round(eqValue),
        debtClosing: Math.round(debtValue),
        fdClosing: Math.round(fdValue),
        eqWithdraw: Math.round(yearEqWithdraw),
        debtWithdraw: Math.round(yearDebtWithdraw),
        fdWithdraw: Math.round(yearFdWithdraw),
        eqTax: Math.round(yearEqTax),
        debtTax: Math.round(yearDebtTax),
        fdTax: Math.round(yearFdTax),
        drawRate: openingCorpusYear > 0 ? (yearGross / openingCorpusYear) * 100 : 0
      });

      if (rows.length === 1) {
        totals.firstYearGross = Math.round(yearGross);
        totals.firstYearTax = Math.round(yearTax);
        totals.firstYearNet = Math.max(0, Math.round(yearNet - fdTax));
      }
      totals.highestYearNet = Math.max(totals.highestYearNet, Math.max(0, Math.round(yearNet - fdTax)));
      fdUntaxedInterestFY = 0;
      yearGross = 0;
      yearTax = 0;
      yearNet = 0;
      yearEqWithdraw = 0;
      yearDebtWithdraw = 0;
      yearFdWithdraw = 0;
      yearEqTax = 0;
      yearDebtTax = 0;
      yearFdTax = 0;
      openingCorpusYear = closing;
    }

    if (totals.depletedMonth && (eqValue + debtValue + fdValue) <= 1) break;
  }

  totals.endingCorpus = Math.max(0, Math.round(eqValue + debtValue + fdValue));
  totals.drawRate = cfg.corpus > 0 ? ((cfg.withdraw * (12 / freqMonths)) / cfg.corpus) * 100 : 0;
  totals.monthlyNetEquivalent = Math.round((totals.firstYearNet || 0) / annualPayouts(cfg.frequency));
  totals.taxDrag = totals.gross > 0 ? (totals.tax / totals.gross) * 100 : 0;
  totals.runwayDrop30 = opts.skipStress ? 0 : estimateRunwayAfterDrop(cfg, 0.3);
  totals.confidenceScore = opts.skipStress ? 0 : estimateConfidence(cfg);

  return { rows: rows, totals: totals };
}

function estimateRunwayAfterDrop(cfg, dropPct) {
  const shocked = Object.assign({}, cfg, { corpus: Math.max(0, Math.round(cfg.corpus * (1 - dropPct))), stepUpPct: 0 });
  const shockedResult = simulate(shocked, { skipStress: true });
  if (shockedResult.totals.depletedMonth) return shockedResult.totals.depletedMonth;
  const last = shockedResult.rows[shockedResult.rows.length - 1];
  return last ? last.year * 12 : 0;
}

function estimateConfidence(cfg) {
  const scenarios = [
    { eq: -3, debt: -1.5, fd: 0 },
    { eq: -2, debt: -1, fd: 0 },
    { eq: -1, debt: -0.5, fd: 0 },
    { eq: 0, debt: 0, fd: 0 },
    { eq: 1, debt: 0.5, fd: 0.25 },
    { eq: 2, debt: 1, fd: 0.5 }
  ];
  let survived = 0;
  scenarios.forEach(function (shift) {
    const scenario = Object.assign({}, cfg, {
      returnEquity: Math.max(1, cfg.returnEquity + shift.eq),
      returnDebt: Math.max(1, cfg.returnDebt + shift.debt),
      returnFd: Math.max(1, cfg.returnFd + shift.fd)
    });
    const result = simulate(scenario, { skipStress: true });
    if (survivesFullTenure(result, cfg.years)) survived += 1;
  });
  return Math.round((survived / scenarios.length) * 100);
}

function survivesFullTenure(result, years) {
  const last = result.rows[result.rows.length - 1];
  return !result.totals.depletedMonth && !!last && last.year >= years;
}

function calcEquityTax(realizedGain, month, taxBook) {
  if (realizedGain <= 0) return 0;
  const fy = fiscalYearKey(month - 1);
  const used = taxBook[fy] || 0;
  const allowanceLeft = Math.max(0, 125000 - used);
  const exemptGain = Math.min(allowanceLeft, realizedGain);
  taxBook[fy] = used + exemptGain;
  return Math.max(0, realizedGain - exemptGain) * 0.125;
}

function fiscalYearKey(offsetMonths) {
  const base = new Date();
  const dt = new Date(base.getFullYear(), base.getMonth() + offsetMonths, 1);
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const start = m >= 3 ? y : y - 1;
  return String(start) + '-' + String(start + 1).slice(-2);
}

function renderInsight(cfg, totals) {
  const currentYear = new Date().getFullYear();
  let message = '';
  let action = '';
  if (S.mode === 'reverse') {
    const suite = S.reverseSuite || getReverseGoalSuite(cfg);
    const recommended = suite.recommended.config.corpus;
    const currentAsk = suite.current.config.corpus;
    const comfort = suite.comfort.config.corpus;
    const delta = Math.max(0, recommended - currentAsk);
    const deltaPct = recommended > 0 ? ((delta / recommended) * 100) : 0;
    const recommendedMonthly = money(cfg.withdraw);
    message =
      '<strong>Recommended target:</strong> ' + money(recommended) + '<br>' +
      '<strong>Goal window:</strong> age ' + S.currentAge + ' to ' + S.retirementAge + ' for about ' + recommendedMonthly + ' per month.<br>' +
      (delta > 0
        ? '<strong>Planning cushion:</strong> about ' + money(delta) + ' higher than your current ask (' + deltaPct.toFixed(0) + '%) to create a safer retirement buffer.'
        : '<strong>Planning cushion:</strong> your current assumptions are already close to a workable retirement target.') +
      '<br><strong>Comfort target:</strong> ' + money(comfort) + ' if you want more breathing room for softer returns or higher expenses.';
  } else if (totals.depletedMonth) {
    const targetYear = currentYear + Math.floor(totals.depletedMonth / 12);
    message = 'At this pace, your blended corpus may get fully depleted around ' + targetYear + '.';
  } else if (totals.endingCorpus > cfg.corpus) {
    const surplus = Math.max(0, Math.round((totals.endingCorpus - cfg.corpus) / Math.max(1, cfg.years * 12)));
    message = 'Even after all planned withdrawals, your corpus is still projected to grow to ' + money(totals.endingCorpus) + '. You may be able to increase withdrawals by roughly ' + money(surplus) + ' per month and still remain in a healthy zone.';
    if (surplus > 0) action = '<button class="mg-btn-ghost mg-swp-try-btn" type="button" id="swpTryInsightBtn">Try +' + moneyPlain(surplus) + '/mo</button>';
  } else {
    message = 'Your plan may survive the full tenure and still leave around ' + money(totals.endingCorpus) + ' as legacy corpus.';
  }
  const el = document.getElementById('swpInsight');
  if (el) {
    el.innerHTML = '<div class="mg-swp-insight-icon">&#128161;</div><div class="mg-swp-insight-copy">' + (S.mode === 'reverse' ? ((S.preview ? '<strong>Sample plan.</strong> ' : '') + message) : escapeHtml((S.preview ? 'Sample plan. ' : '') + message)) + '</div>' + action;
    const btn = document.getElementById('swpTryInsightBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        const current = num(getInputValue('swpWithdraw'), S.withdraw);
        const extra = Math.max(0, Math.round((totals.endingCorpus - cfg.corpus) / Math.max(1, cfg.years * 12)));
        setInputValue('swpWithdraw', current + extra);
        recalculate();
      });
    }
  }
  renderWarning(cfg, totals);
}

function renderWarning(cfg, totals) {
  const wrap = document.getElementById('swpWithdrawModeNote');
  if (!wrap) return;
  if (totals.drawRate >= 4 || totals.taxDrag >= 10 || (totals.depletedMonth && totals.depletedMonth < cfg.years * 12)) {
    wrap.innerHTML = '<strong>Contextual warning:</strong> Draw rate starts at ' + totals.drawRate.toFixed(2) + '%, so review withdrawal amount, expected returns and mix carefully.';
    wrap.classList.add('is-warning');
  } else {
    wrap.textContent = '';
    wrap.classList.remove('is-warning');
  }
}

function syncModeFields() {
  const corpusEl = document.getElementById('swpCorpus');
  const withdrawEl = document.getElementById('swpWithdraw');
  const corpusNote = document.getElementById('swpCorpusModeNote');
  const withdrawNote = document.getElementById('swpWithdrawModeNote');
  const corpusLabel = document.getElementById('swpCorpusLabel');
  const corpusHelp = document.getElementById('swpCorpusHelp');
  const withdrawLabel = document.getElementById('swpWithdrawLabel');
  const withdrawHelp = document.getElementById('swpWithdrawHelp');
  const durationLabel = document.getElementById('swpDurationLabel');
  const durationWrap = document.getElementById('swpDurationWrap');
  const ageWrap = document.getElementById('swpAgeWrap');
  const reverseYearsNote = document.getElementById('swpReverseYearsNote');
  const inputsSubtitle = document.getElementById('swpInputsSubtitle');
  const heroIntro = document.getElementById('swpHeroIntro');
  const scenarioTitle = document.getElementById('swpScenarioTitle');
  const scenarioSubtitle = document.getElementById('swpScenarioSubtitle');
  const snapshotTitle = document.getElementById('swpSnapshotTitle');
  const snapshotSubtitle = document.getElementById('swpSnapshotSubtitle');
  if (!corpusEl || !withdrawEl) return;

  corpusEl.readOnly = S.mode === 'reverse';
  withdrawEl.readOnly = false;
  corpusEl.classList.toggle('mg-readonly', S.mode === 'reverse');
  withdrawEl.classList.remove('mg-readonly');
  const active = document.activeElement;
  if (active !== corpusEl) corpusEl.value = formatIndianNumber(Math.round(S.corpus));
  if (active !== withdrawEl) withdrawEl.value = formatIndianNumber(Math.round(S.withdraw));
  if (corpusLabel) corpusLabel.textContent = S.mode === 'reverse' ? 'Required Corpus Goal' : 'Initial Corpus';
  if (withdrawLabel) withdrawLabel.textContent = S.mode === 'reverse' ? 'Target Monthly Income' : 'Monthly Withdrawal';
  if (durationLabel) durationLabel.textContent = S.mode === 'reverse' ? 'Retirement Window' : 'Duration';
  if (inputsSubtitle) inputsSubtitle.textContent = S.mode === 'reverse'
    ? 'Estimate the retirement corpus needed to support your target monthly income'
    : 'Build a blended withdrawal plan in just three rows';
  if (heroIntro) heroIntro.textContent = S.mode === 'reverse'
    ? 'Estimate the retirement corpus you may need to generate your target post-retirement SWP income.'
    : 'Plan post-tax withdrawals from equity, debt and fixed deposits while tracking how long your corpus can last.';
  if (corpusHelp) corpusHelp.textContent = S.mode === 'reverse'
    ? 'This is the estimated corpus you may need before retirement to fund your target SWP.'
    : 'Your starting investment pool before withdrawals begin.';
  if (withdrawHelp) withdrawHelp.textContent = S.mode === 'reverse'
    ? 'The monthly post-retirement income you want the plan to support.'
    : 'Gross amount you plan to withdraw every payout cycle.';
  if (durationWrap) durationWrap.style.display = S.mode === 'reverse' ? 'none' : '';
  if (ageWrap) ageWrap.style.display = S.mode === 'reverse' ? 'block' : 'none';
  if (reverseYearsNote) reverseYearsNote.textContent = 'From age ' + S.currentAge + ' to ' + S.retirementAge + ', this plan models a ' + S.years + '-year withdrawal window.';
  if (corpusNote) corpusNote.textContent = S.mode === 'reverse' ? 'Calculated from your target income, retirement window, returns and tax assumptions.' : '';
  if (withdrawNote) withdrawNote.textContent = '';
  if (scenarioTitle) scenarioTitle.textContent = S.mode === 'reverse' ? 'Retirement Goal Comparison' : 'Scenario Comparison';
  if (scenarioSubtitle) scenarioSubtitle.textContent = S.mode === 'reverse'
    ? 'Compare lean, recommended and comfort corpus targets for the same retirement-income goal.'
    : 'See how your current plan stacks up against the best SWP paths in one glance';
  if (snapshotTitle) snapshotTitle.textContent = S.mode === 'reverse' ? 'Retirement Goal Snapshot' : 'Snapshot';
  if (snapshotSubtitle) snapshotSubtitle.textContent = S.mode === 'reverse'
    ? 'See how strong, tight or comfortable your retirement corpus target looks under this setup.'
    : 'Key sustainability and tax indicators at a glance';
  renderFrequencyImpact();
}

function renderFrequencyImpact() {
  const target = document.getElementById('swpFreqImpact');
  if (!target || !S.totals) return;
  const payouts = annualPayouts(S.frequency);
  const perCycle = payouts > 0 ? Math.round((S.totals.firstYearNet || 0) / payouts) : 0;
  const prefix = S.mode === 'reverse' ? 'Target plan ' : '';
  const note = S.frequency === 'monthly'
    ? prefix + 'estimates about ' + money(perCycle) + ' net received each month.'
    : S.frequency === 'quarterly'
      ? prefix + 'estimates about ' + money(perCycle) + ' net received per quarter with lower payout frequency.'
      : prefix + 'estimates about ' + money(perCycle) + ' net received once per year, which can improve corpus longevity.';
  target.textContent = note;
}

function renderSummary() {
  if (!S.totals) return;
  const cfg = S.preview || snapshot();
  const reverse = S.mode === 'reverse';
  animateMoney('swpHeroCorpus', cfg.corpus);
  animateMoney('swpHeroIncome', reverse ? S.withdraw : (S.totals.monthlyNetEquivalent || 0));
  animateMoney('swpHeroEnding', S.totals.endingCorpus);
  text('swpHeroCorpusLabel', reverse ? 'Required Corpus' : 'Starting Corpus');
  text('swpHeroCorpusUnit', reverse ? 'before retirement' : 'investment base');
  text('swpHeroIncomeLabel', reverse ? 'Target Income' : 'Net Withdrawal');
  text('swpHeroIncomeUnit', reverse ? 'monthly post-tax goal' : 'annualized post-tax payout');
  text('swpHeroEndingLabel', reverse ? 'Money Left at End' : 'Ending Corpus');
  text('swpHeroEndingUnit', reverse ? 'after planned withdrawals' : 'after full tenure');
  animateMoney('swpGross', S.totals.gross);
  text('swpGrossLabel', reverse ? 'Target Gross Income' : 'Total Gross Withdrawn');
  text('swpGrossNote', reverse ? 'First-year payout target: ' + money(S.totals.firstYearGross) : 'First-year payout: ' + money(S.totals.firstYearGross));
  animateMoney('swpTax', S.totals.firstYearTax || 0);
  text('swpTaxLabel', 'Estimated Tax');
  text('swpTaxNote', 'Year-1 tax | total tenure tax: ' + money(S.totals.tax));
  animateMoney('swpNet', S.totals.net);
  text('swpNetLabel', reverse ? 'Projected Net Received' : 'Total Net Received');
  text('swpNetNote', reverse ? 'Estimated monthly post-tax income: ' + money(S.totals.monthlyNetEquivalent || 0) : 'Annualized post-tax payout: ' + money(S.totals.monthlyNetEquivalent || 0));
  animateMoney('swpEnding', S.totals.endingCorpus);
  text('swpEndingLabel', reverse ? 'Money Left at End' : 'Ending Corpus');
  text('swpEndingNote', reverse ? 'Projected amount left after planned withdrawals' : 'Starting draw rate: ' + S.totals.drawRate.toFixed(2) + '%');
  renderHealth(cfg.corpus, S.totals.endingCorpus);
  try { renderTaxDetails(cfg); } catch (e) {}
  try { renderPortfolioLogic(cfg); } catch (e) {}
}

function renderHealth(startingCorpus, endingCorpus) {
  const bar = document.getElementById('swpHealthBar');
  const note = document.getElementById('swpHealthNote');
  if (!bar || !note) return;
  const ratio = startingCorpus > 0 ? endingCorpus / startingCorpus : 0;
  const pct = clamp(ratio * 100, 0, 100);
  let tone = 'danger';
  let label = 'At risk';
  if (ratio >= 0.75) {
    tone = 'safe';
    label = 'Healthy';
  } else if (ratio >= 0.35) {
    tone = 'warn';
    label = 'Caution';
  }
  bar.style.width = pct + '%';
  bar.className = 'mg-swp-health-bar ' + tone;
  if (S.mode === 'reverse') {
    const plain =
      pct < 10 ? 'This target is very tightly calibrated, so a slightly larger retirement corpus would make the plan feel safer.' :
      pct < 35 ? 'This target can work, but there is only a limited cushion if returns soften or expenses rise.' :
      'This target leaves a more comfortable reserve at the end of the retirement window.';
    note.textContent = 'Goal quality: ' + label + ' | Projected money left is ' + pct.toFixed(1) + '% of the required corpus goal. ' + plain;
    return;
  }
  note.textContent = 'Corpus health: ' + label + ' | Ending corpus is ' + pct.toFixed(1) + '% of starting corpus. Scale: 0-50% red, 50-100% amber, 100%+ green.';
}

function renderTaxDetails(cfg) {
  const target = document.getElementById('swpTaxDetails');
  if (!target || !S.rows.length) return;
  const year1 = S.rows[0];
  const eqExemptionUsed = Math.min(125000, Math.max(0, year1.eqWithdraw - year1.eqTax / 0.125));
  target.innerHTML =
    '<div class="mg-swp-tax-grid">' +
      taxChip('Equity LTCG tax', money(year1.eqTax), 'Estimated after using up to ₹1.25L annual LTCG exemption where applicable.') +
      taxChip('Debt gain tax', money(year1.debtTax), 'Estimated at your selected slab rate of ' + cfg.taxSlab.toFixed(0) + '%.') +
      taxChip('FD interest tax', money(year1.fdTax), 'Estimated on yearly FD interest at the same slab rate.') +
      taxChip('LTCG exemption basis', 'Up to ₹1.25L', 'Applied at financial-year level in the equity tax estimate.') +
    '</div>';
}

function taxChip(label, value, note) {
  return '<div class="mg-swp-tax-chip"><strong>' + label + '</strong><span>' + value + '</span><small>' + note + '</small></div>';
}

function renderPortfolioLogic(cfg) {
  const el = document.getElementById('swpPortfolioLogic');
  if (!el || !S.rows.length) return;
  const year1 = S.rows[0];
  const equityBase = cfg.corpus * (cfg.mixEquity / 100);
  const debtBase = cfg.corpus * (cfg.mixDebt / 100);
  const fdBase = cfg.corpus * (cfg.mixFd / 100);
  const eqReturn = Math.round(equityBase * (cfg.returnEquity / 100));
  const debtReturn = Math.round(debtBase * (cfg.returnDebt / 100));
  const fdReturn = Math.round(fdBase * (cfg.returnFd / 100));
  el.innerHTML = 'With <strong>' + cfg.mixEquity.toFixed(0) + '%</strong> in equity, <strong>' + cfg.mixDebt.toFixed(0) + '%</strong> in debt and <strong>' + cfg.mixFd.toFixed(0) + '%</strong> in FD, the model starts with roughly <strong>' + money(eqReturn) + '</strong>, <strong>' + money(debtReturn) + '</strong> and <strong>' + money(fdReturn) + '</strong> of annual return potential before withdrawals. Year 1 withdrawals are estimated to come out as <strong>' + money(year1.eqWithdraw) + '</strong> from equity, <strong>' + money(year1.debtWithdraw) + '</strong> from debt and <strong>' + money(year1.fdWithdraw) + '</strong> from FD.';
}

function exportPdfReport() {
  const win = window.open('', '_blank');
  if (!win || !S.totals) return;
  const cfg = S.preview || snapshot();
  const corpusChartImg = S.charts.corpus && typeof S.charts.corpus.toBase64Image === 'function' ? S.charts.corpus.toBase64Image() : '';
  const payoutChartImg = S.charts.payout && typeof S.charts.payout.toBase64Image === 'function' ? S.charts.payout.toBase64Image() : '';
  const mixChartImg = S.charts.mix && typeof S.charts.mix.toBase64Image === 'function' ? S.charts.mix.toBase64Image() : '';
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
      '<td>' + money(row.gross) + '</td>' +
      '<td>' + money(row.tax) + '</td>' +
      '<td>' + money(row.net) + '</td>' +
      '<td>' + money(row.closing) + '</td>' +
      '</tr>';
  }).join('');
  const reverse = S.mode === 'reverse';
  const summaryText = S.totals.depletedMonth
    ? 'This plan may run out around ' + monthLabel(S.totals.depletedMonth) + ' unless the withdrawal rate, tenure or return profile changes.'
    : (reverse
      ? 'This retirement-goal plan is modeled to support about ' + money(cfg.withdraw) + ' per month from age ' + S.currentAge + ' to ' + S.retirementAge + ', with money left at the end of the window.'
      : 'This plan is currently modeled to survive the full tenure with an ending corpus of ' + money(S.totals.endingCorpus) + '.');
  const plainEnglish = reverse
    ? 'In simple terms: this report estimates the retirement corpus needed to support your target monthly income. The confidence score improves when the required corpus is larger, the income target is lower, or your assumptions are more conservative.'
    : 'In simple terms: this report estimates how long your corpus can fund planned withdrawals, what tax drag may look like, and how much money could still be left at the end.';
  win.document.open();
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>SWP Report</title><style>' +
    'body{margin:0;padding:28px;background:#f7f3ee;font-family:Arial,sans-serif;color:#1a1510;}' +
    '.sheet{max-width:920px;margin:0 auto;background:#fff;border:1px solid #e4dacd;border-radius:18px;padding:30px;}' +
    '.page-break{page-break-before:always;break-before:page;margin-top:24px;}' +
    '.tag{display:inline-block;margin-bottom:14px;padding:6px 12px;border-radius:999px;border:1px solid rgba(212,133,59,.35);background:rgba(212,133,59,.07);color:#D4853B;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;}' +
    'h1{margin:0 0 8px;font-size:32px;line-height:1.1;}h1 em{font-style:normal;color:#D4853B;}.muted{color:#726960;font-size:13px;line-height:1.6;}' +
    '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0;}.card,.ibox{background:#fbf8f4;border:1px solid #e4dacd;border-radius:14px;padding:16px;}' +
    '.label{display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#726960;}.value{font-size:28px;font-weight:800;line-height:1.1;letter-spacing:-.03em;}' +
    '.inputs{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 24px;}.ibox strong{display:block;margin-bottom:6px;font-size:12px;color:#726960;}' +
    '.charts{display:grid;grid-template-columns:1fr;gap:14px;margin:0 0 24px;}.chartbox{position:relative;background:#fbf8f4;border:1px solid #e4dacd;border-radius:14px;padding:14px;}.chartbox img{width:100%;height:auto;display:block;}.charttitle{font-size:12px;font-weight:700;color:#726960;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}.chartwm{position:absolute;right:18px;bottom:12px;font-size:9px;font-weight:700;letter-spacing:.04em;color:#726960;opacity:.3;}' +
    'table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:10px 12px;border-bottom:1px solid #efe6db;text-align:left;white-space:nowrap;font-size:13px;}th{font-size:11px;color:#726960;text-transform:uppercase;letter-spacing:.06em;}' +
    '.foot{margin-top:24px;padding-top:18px;border-top:1px solid #efe6db;}button{padding:12px 18px;border:none;border-radius:999px;background:#D4853B;color:#fff;font-weight:700;cursor:pointer;}' +
    '@media print{body{background:#fff;padding:0}.sheet{max-width:none;border:none;border-radius:0;padding:18px}.print-hide{display:none}}' +
    '</style></head><body><div class="sheet">' +
    '<div class="tag">Personalized SWP report</div>' +
    '<h1>SWP <em>Calculator</em> Report</h1>' +
    '<div class="muted">Generated on ' + escapeHtml(generatedAt) + ' | MasterGadgets.com</div>' +
    '<div class="ibox" style="margin-top:18px;"><strong>Plan summary</strong><span>' + summaryText + '</span></div>' +
    '<div class="ibox" style="margin-top:12px;"><strong>What these numbers mean</strong><span>' + plainEnglish + '</span></div>' +
    '<div class="grid">' +
      pdfMetric(reverse ? 'Required Corpus' : 'Starting Corpus', money(cfg.corpus)) +
      pdfMetric(reverse ? 'Target Income' : 'Net Withdrawal', money(reverse ? cfg.withdraw : (S.totals.monthlyNetEquivalent || 0))) +
      pdfMetric(reverse ? 'Money Left at End' : 'Ending Corpus', money(S.totals.endingCorpus)) +
    '</div>' +
    '<div class="grid" style="grid-template-columns:repeat(3,1fr);margin-top:0;">' +
      pdfMetric('Confidence Score', (S.totals.confidenceScore || 0) + '%') +
      pdfMetric('Total Tax Paid', money(S.totals.tax)) +
      pdfMetric('30% Drop Runway', monthLabel(S.totals.runwayDrop30 || 0)) +
    '</div>' +
    '<div class="inputs">' +
      pdfInput('Preset style', root.querySelector('[data-swp-preset].active') ? root.querySelector('[data-swp-preset].active').textContent : 'Pension') +
      pdfInput(reverse ? 'Target monthly income' : 'Monthly withdrawal', money(cfg.withdraw)) +
      pdfInput(reverse ? 'Retirement window' : 'Duration', reverse ? (S.currentAge + ' to ' + S.retirementAge + ' (' + cfg.years + ' years)') : (cfg.years + ' years')) +
      pdfInput('Withdrawal frequency', titleCase(cfg.frequency)) +
      pdfInput('Annual step-up', cfg.stepUpPct.toFixed(1) + '%') +
      pdfInput('Equity mix', cfg.mixEquity.toFixed(1) + '% at ' + cfg.returnEquity.toFixed(1) + '%') +
      pdfInput('Debt mix', cfg.mixDebt.toFixed(1) + '% at ' + cfg.returnDebt.toFixed(1) + '%') +
      pdfInput('Fixed deposit mix', cfg.mixFd.toFixed(1) + '% at ' + cfg.returnFd.toFixed(1) + '%') +
      pdfInput('Income tax slab', cfg.taxSlab.toFixed(0) + '%') +
    '</div>' +
    '<div class="page-break"></div>' +
    '<div class="charts">' +
      (mixChartImg ? '<div class="chartbox"><div class="charttitle">Investment Mix</div><img src="' + mixChartImg + '" alt="Investment mix chart"><div class="chartwm">SWP Calculator by MasterGadgets.com</div></div>' : '') +
      (corpusChartImg ? '<div class="chartbox"><div class="charttitle">Corpus Growth Visual</div><img src="' + corpusChartImg + '" alt="Corpus growth chart"><div class="chartwm">SWP Calculator by MasterGadgets.com</div></div>' : '') +
      (payoutChartImg ? '<div class="chartbox"><div class="charttitle">Gross vs Net Withdrawals</div><img src="' + payoutChartImg + '" alt="Withdrawal chart"><div class="chartwm">SWP Calculator by MasterGadgets.com</div></div>' : '') +
    '</div>' +
    '<div class="ibox" style="margin-bottom:18px;"><strong>Tax summary</strong><span>Year 1 estimated tax: ' + money(S.totals.firstYearTax || 0) + ' | Total modeled tax over tenure: ' + money(S.totals.tax) + ' | Tax drag: ' + S.totals.taxDrag.toFixed(2) + '%</span></div>' +
    '<div class="page-break"></div>' +
    '<h2 style="margin:0 0 6px;font-size:19px;">Yearly Breakdown Snapshot</h2>' +
    '<div class="muted">Showing up to the first 20 yearly rows for easy printing and sharing.</div>' +
    '<table><thead><tr><th>Year</th><th>Gross Withdrawn</th><th>Tax</th><th>Net Received</th><th>Closing Corpus</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="foot">' +
      '<div class="muted"><strong>Disclaimer:</strong> This report is for educational planning only and should not be treated as investment advice, tax advice or an assured return communication. Equity taxation is estimated using the current LTCG framework, while debt mutual fund gains and FD interest are modeled with the selected slab rate. Actual tax and investment outcomes can differ materially.</div>' +
      '<div class="muted" style="margin-top:12px;">SWP Calculator by MasterGadgets.com | Made with ❤️ by @AmitBhawani in India</div>' +
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

function renderStats() {
  const statGrid = document.getElementById('swpStatGrid');
  if (!statGrid || !S.totals) return;
  const year10 = S.rows[Math.min(9, S.rows.length - 1)];
  const lastRow = S.rows[S.rows.length - 1];
  const starting = (S.preview || snapshot()).corpus;
  const endingRatio = starting > 0 ? (S.totals.endingCorpus / starting) * 100 : 0;
  if (S.mode === 'reverse') {
    statGrid.innerHTML = [
      statCard('Required corpus goal', money(starting), 'Estimated retirement corpus before the SWP starts'),
      statCard('Target monthly income', money(S.withdraw), 'Monthly income goal used in this reverse SWP plan'),
      statCard('Confidence score', S.totals.confidenceScore + '%', 'This score drops when the target income is aggressive for the chosen corpus. A larger goal corpus, lower income target or calmer return assumptions improve it.'),
      statCard('Money left ratio', endingRatio.toFixed(1) + '%', 'Projected money left at the end as a share of the required corpus goal'),
      statCard('Withdrawal rate', S.totals.drawRate.toFixed(2) + '%', 'Starting annual withdrawal as a share of the recommended retirement corpus goal'),
      statCard('Total tax paid', money(S.totals.tax), 'Combined estimated tax drag across the full retirement window'),
      statCard('30% market drop runway', monthLabel(S.totals.runwayDrop30 || 0), 'Approximate survival if the required corpus drops 30% immediately'),
      statCard('Retirement window', S.currentAge + ' to ' + S.retirementAge, 'Modeled withdrawal duration: ' + S.years + ' years')
    ].join('');
    return;
  }
  statGrid.innerHTML = [
    statCard('Highest yearly net', money(S.totals.highestYearNet), 'Peak post-tax cash flow across the plan'),
    statCard('10Y closing corpus', year10 ? money(year10.closing) : money(S.totals.endingCorpus), year10 ? 'Closing corpus after year ' + year10.year : 'Based on available duration'),
    statCard('Confidence score', S.totals.confidenceScore + '%', 'Stress-tested across softer and stronger return scenarios'),
    statCard('Corpus survival', endingRatio.toFixed(1) + '%', 'Ending corpus as a share of starting corpus'),
    statCard('Total tax paid', money(S.totals.tax), 'Combined estimated tax drag across the full modeled tenure'),
    statCard('30% market drop runway', monthLabel(S.totals.runwayDrop30 || 0), 'Approximate survival if the starting corpus drops 30% immediately'),
    statCard('Depletion point', S.totals.depletedMonth ? monthLabel(S.totals.depletedMonth) : 'Not depleted', lastRow ? 'Modeled years completed: ' + lastRow.year : 'Plan currently has no yearly rows')
  ].join('');
}

function statCard(title, value, note) {
  return '<div class="mg-swp-stat-card"><div class="mg-swp-stat-title">' + title + '</div><div class="mg-swp-stat-value">' + value + '</div><div class="mg-swp-stat-note">' + note + '</div></div>';
}

function renderTable() {
  const body = document.getElementById('swpTableBody');
  if (!body) return;
  const starting = (S.preview || snapshot()).corpus || 1;
  const rows = S.rows.slice().sort(function (a, b) {
    const key = S.tableSort.key;
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    return av > bv ? S.tableSort.dir : -S.tableSort.dir;
  });
  root.querySelectorAll('.mg-swp-table th[data-sort]').forEach(function (th) {
    const key = th.getAttribute('data-sort');
    const active = key === S.tableSort.key;
    th.classList.toggle('is-active', active);
    th.setAttribute('aria-sort', active ? (S.tableSort.dir === 1 ? 'ascending' : 'descending') : 'none');
  });
  body.innerHTML = rows.map(function (row) {
    const ratio = starting > 0 ? row.closing / starting : 0;
    const tone = ratio <= 0.25 ? 'danger' : ratio <= 0.5 ? 'warn' : 'safe';
    return '<tr class="mg-swp-row-' + tone + '">' +
      '<td>Year ' + row.year + '</td>' +
      '<td>' + moneyPlain(row.gross) + '</td>' +
      '<td>' + moneyPlain(row.tax) + '</td>' +
      '<td>' + moneyPlain(row.net) + '</td>' +
      '<td>' + moneyPlain(row.closing) + '</td>' +
      '<td>' + moneyPlain(row.eqWithdraw) + '</td>' +
      '<td>' + moneyPlain(row.debtWithdraw) + '</td>' +
      '<td>' + moneyPlain(row.fdWithdraw) + '</td>' +
      '</tr>';
  }).join('');
}

function renderAssumptions() {
  const wrap = document.getElementById('swpAssumptions');
  if (!wrap || !S.totals) return;
  const cfg = S.preview || snapshot();
  wrap.innerHTML = [
    assump('mix', 'Starting corpus is split into Equity ' + cfg.mixEquity.toFixed(1) + '%, Debt ' + cfg.mixDebt.toFixed(1) + '% and FD ' + cfg.mixFd.toFixed(1) + '%.'),
    assump('returns', 'Returns are modeled separately for all three buckets, and every withdrawal is taken proportionately from the live mix.'),
    assump('tax', 'Equity gains are estimated with current LTCG taxation after the yearly ₹1.25 lakh exemption. Debt gains and FD interest use your chosen slab rate of ' + cfg.taxSlab.toFixed(0) + '%.'),
    assump('time', S.totals.depletedMonth ? 'At this pace the corpus may run out around ' + monthLabel(S.totals.depletedMonth) + '.' : 'At this pace the blended corpus is estimated to last through the full ' + cfg.years + '-year plan.'),
    assump('inflation', cfg.inflationAdjusted ? 'Inflation-adjusted corpus line is visible, so you can compare nominal and today-value purchasing power.' : 'Turn on the inflation-adjusted view if you want to see the corpus in today-value terms.')
  ].join('');
}

function assump(kind, textValue) {
  return '<div class="mg-swp-assump-item"><span class="mg-swp-assump-icon mg-swp-assump-icon-' + kind + '" aria-hidden="true"></span><span>' + textValue + '</span></div>';
}

function renderCharts() {
  if (typeof Chart === 'undefined' || !S.rows.length) return;
  renderMixChart();
  renderCorpusChart();
  renderPayoutChart();
  renderWaterfallChart();
  renderStepUpChart();
  renderChartToggles('swpCorpusToggles', S.charts.corpus);
  renderChartToggles('swpPayoutToggles', S.charts.payout);
}

function renderScenarioComparison() {
  const wrap = document.getElementById('swpScenarioGrid');
  if (!wrap) return;
  const cfg = S.preview || snapshot();
  const scenarios = buildScenarioComparisons(cfg);
  wrap.innerHTML = scenarios.map(function (scenario) {
    const primaryValue = S.mode === 'reverse' ? money(scenario.requiredCorpus || 0) : money(scenario.monthlyNet);
    const primaryLabel = S.mode === 'reverse' ? 'estimated corpus target' : 'monthly post-tax cash flow';
    return '<div class="mg-swp-compare-card' + (scenario.current ? ' current' : '') + '">' +
      '<div class="mg-swp-compare-top">' +
        '<span class="mg-swp-compare-name">' + escapeHtml(scenario.name) + '</span>' +
        '<span class="mg-swp-compare-badge">' + escapeHtml(scenario.tag) + '</span>' +
      '</div>' +
      '<div class="mg-swp-compare-copy">' + escapeHtml(scenario.copy) + '</div>' +
      '<div class="mg-swp-compare-metric"><strong>' + primaryValue + '</strong><span>' + primaryLabel + '</span></div>' +
      '<div class="mg-swp-compare-grid-mini">' +
        compareMini(S.mode === 'reverse' ? 'Target income' : 'Ending corpus', S.mode === 'reverse' ? money(scenario.monthlyNet) : money(scenario.endingCorpus)) +
        compareMini(S.mode === 'reverse' ? 'Money left' : 'Total tax', S.mode === 'reverse' ? money(scenario.endingCorpus) : money(scenario.tax)) +
        compareMini('Confidence', scenario.confidence + '%') +
        compareMini('Outcome', scenario.outcome) +
      '</div>' +
      (S.mode === 'reverse'
        ? '<div class="mg-swp-compare-actions"><button class="mg-btn-ghost mg-swp-use-goal-btn" type="button" data-goal-tier="' + escapeHtml(scenario.key || '') + '" data-goal-corpus="' + Math.round(scenario.requiredCorpus || 0) + '"' + (scenario.current ? ' disabled' : '') + '>' + (scenario.current ? 'Current Goal' : 'Set as My Goal') + '</button></div>'
        : '') +
    '</div>';
  }).join('');
  wrap.querySelectorAll('.mg-swp-use-goal-btn[data-goal-corpus]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const goal = Math.max(0, num(btn.getAttribute('data-goal-corpus'), S.corpus));
      const tier = btn.getAttribute('data-goal-tier') || 'recommended';
      S.reverseTier = tier;
      S.corpus = goal;
      setInputValue('swpCorpus', goal);
      recalculate();
    });
  });
}

function compareMini(label, value) {
  return '<div class="mg-swp-compare-mini"><span>' + label + '</span><strong>' + value + '</strong></div>';
}

function buildScenarioComparisons(cfg) {
  if (S.mode === 'reverse') return buildReverseScenarioComparisons(cfg);
  const presets = [
    { key: 'current', name: 'Your Plan', tag: 'Live', copy: 'The numbers currently visible in your SWP setup.', config: cfg, current: true },
    { key: 'pension', name: 'Pension', tag: 'Stable', copy: 'Steady cash flow with a more defensive allocation tilt.', config: { corpus: 20000000, withdraw: 70000, years: 16, frequency: 'monthly', stepUpPct: 8, mixEquity: 45, mixDebt: 35, mixFd: 20, returnEquity: 12, returnDebt: 8, returnFd: 7, taxSlab: 30, inflationAdjusted: false } },
    { key: 'balanced', name: 'Balanced', tag: 'Blend', copy: 'Balances legacy growth with better monthly income headroom.', config: { corpus: 25000000, withdraw: 100000, years: 20, frequency: 'monthly', stepUpPct: 8, mixEquity: 50, mixDebt: 30, mixFd: 20, returnEquity: 12, returnDebt: 8.5, returnFd: 7, taxSlab: 30, inflationAdjusted: false } },
    { key: 'legacy', name: 'Legacy', tag: 'Growth', copy: 'Favours a stronger ending corpus while still funding withdrawals.', config: { corpus: 30000000, withdraw: 120000, years: 20, frequency: 'monthly', stepUpPct: 8, mixEquity: 60, mixDebt: 25, mixFd: 15, returnEquity: 13, returnDebt: 8.5, returnFd: 7, taxSlab: 30, inflationAdjusted: false } }
  ];
  return presets.map(function (preset) {
    const result = simulate(preset.config, { skipStress: true });
    const last = result.rows[result.rows.length - 1];
    return {
      name: S.mode === 'reverse' && preset.current ? 'Your Retirement Goal' : preset.name,
      tag: S.mode === 'reverse' && preset.current ? 'Goal' : preset.tag,
      copy: S.mode === 'reverse' && preset.current
        ? 'This compares the retirement corpus needed for your target income and retirement window.'
        : preset.copy,
      current: Boolean(preset.current),
      monthlyNet: result.totals.monthlyNetEquivalent || 0,
      endingCorpus: result.totals.endingCorpus || 0,
      tax: result.totals.tax || 0,
      confidence: preset.current ? (S.totals ? S.totals.confidenceScore : 0) : estimateConfidence(preset.config),
      outcome: S.mode === 'reverse'
        ? (result.totals.depletedMonth ? ('Needs more corpus') : (last ? ('Leaves ' + money(result.totals.endingCorpus)) : 'On track'))
        : (result.totals.depletedMonth ? ('Runs out ' + monthLabel(result.totals.depletedMonth)) : (last ? ('Lasts ' + last.year + 'Y') : 'Stable'))
    };
  });
}

function buildReverseScenarioComparisons(cfg) {
  const suite = S.reverseSuite || getReverseGoalSuite(cfg);
  const tiers = [suite.current, suite.lean, suite.recommended, suite.comfort];

  return tiers.map(function (tier) {
    const result = simulate(tier.config, { skipStress: true });
    const last = result.rows[result.rows.length - 1];
    const ending = result.totals.endingCorpus || 0;
    const outcome = ending <= tier.config.corpus * 0.1
      ? 'Very tight finish'
      : ending <= tier.config.corpus * 0.35
        ? 'Limited cushion'
        : 'Comfortable reserve';
    return {
      key: tier.key,
      name: tier.name,
      tag: tier.tag,
      copy: tier.copy,
      current: S.reverseTier === tier.key,
      monthlyNet: result.totals.monthlyNetEquivalent || 0,
      requiredCorpus: tier.config.corpus,
      endingCorpus: ending,
      tax: result.totals.tax || 0,
      confidence: tier.current ? (S.totals ? S.totals.confidenceScore : 0) : estimateConfidence(tier.config),
      outcome: tier.current
        ? (last ? ('Funds ages ' + S.currentAge + '-' + S.retirementAge) : 'Needs review')
        : outcome
    };
  });
}

function renderWaterfallChart() {
  const ctx = document.getElementById('swpWaterfallChart');
  if (!ctx || !S.rows.length) return;
  if (S.charts.waterfall) S.charts.waterfall.destroy();
  const dark = root.classList.contains('mg-dark');
  const maxRows = S.rows.slice(0, Math.min(12, S.rows.length));
  const growthSeries = maxRows.map(function (row) {
    return Math.max(0, row.closing - row.opening + row.gross + row.tax);
  });
  const withdrawSeries = maxRows.map(function (row) { return -row.gross; });
  const taxSeries = maxRows.map(function (row) { return -row.tax; });
  const netSeries = maxRows.map(function (row) { return row.closing - row.opening; });
  S.charts.waterfall = new Chart(ctx.getContext('2d'), {
    data: {
      labels: maxRows.map(function (row) { return 'Y' + row.year; }),
      datasets: [
        {
          type: 'bar',
          label: 'Portfolio growth',
          data: growthSeries,
          backgroundColor: 'rgba(34,197,94,0.82)',
          borderRadius: 8
        },
        {
          type: 'bar',
          label: 'Withdrawals',
          data: withdrawSeries,
          backgroundColor: 'rgba(212,133,59,0.82)',
          borderRadius: 8
        },
        {
          type: 'bar',
          label: 'Tax drag',
          data: taxSeries,
          backgroundColor: 'rgba(239,68,68,0.78)',
          borderRadius: 8
        },
        {
          type: 'line',
          label: 'Net corpus change',
          data: netSeries,
          borderColor: '#2b6cb0',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2
        }
      ]
    },
    options: waterfallChartOptions(dark)
  });
  text('swpWaterfallNote', 'First 12 years show how returns, withdrawals and tax combine to change corpus each year.');
}

function renderStepUpChart() {
  const ctx = document.getElementById('swpStepUpChart');
  if (!ctx || !S.rows.length) return;
  if (S.charts.stepup) S.charts.stepup.destroy();
  const dark = root.classList.contains('mg-dark');
  const cfg = S.preview || snapshot();
  const noStepCfg = Object.assign({}, cfg, { stepUpPct: 0 });
  const noStepResult = simulate(noStepCfg, { skipStress: true });
  const labels = S.rows.map(function (row) { return 'Y' + row.year; });
  const noStepMap = {};
  noStepResult.rows.forEach(function (row) { noStepMap[row.year] = row; });
  S.charts.stepup = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current step-up path',
          data: S.rows.map(function (row) { return row.closing; }),
          borderColor: '#D4853B',
          backgroundColor: 'rgba(212,133,59,0.12)',
          fill: true,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 2
        },
        {
          label: 'Without step-up',
          data: S.rows.map(function (row) {
            return noStepMap[row.year] ? noStepMap[row.year].closing : null;
          }),
          borderColor: '#2b6cb0',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 1
        },
        {
          label: 'Net received gap',
          data: S.rows.map(function (row) {
            const peer = noStepMap[row.year];
            if (!peer) return null;
            return row.net - peer.net;
          }),
          borderColor: '#7c9a52',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    },
    options: stepUpChartOptions(dark)
  });
  const lastLive = S.rows[S.rows.length - 1];
  const lastNoStep = noStepResult.rows[noStepResult.rows.length - 1];
  const diff = (lastLive && lastNoStep) ? (lastLive.closing - lastNoStep.closing) : 0;
  const direction = diff >= 0 ? 'more' : 'less';
  text('swpStepUpNote', 'Compared with a flat withdrawal, the current ' + cfg.stepUpPct.toFixed(1) + '% annual step-up leaves ' + money(Math.abs(diff)) + ' ' + direction + ' corpus by the end of the plan.');
}

function waterfallChartOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 16, right: 8 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: dark ? '#c5beb7' : '#706a62',
          boxWidth: 10,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: dark ? '#222' : '#fff',
        titleColor: dark ? '#f0ece8' : '#1a1a1a',
        bodyColor: dark ? '#a09890' : '#706a62',
        borderColor: dark ? '#2c2c2c' : '#d1ccc4',
        borderWidth: 1,
        callbacks: {
          afterTitle: function (items) {
            const row = S.rows[items[0].dataIndex];
            if (!row) return '';
            return 'Opening ' + money(row.opening) + ' | Closing ' + money(row.closing) + ' | Draw rate ' + row.drawRate.toFixed(2) + '%';
          },
          label: function (c) { return c.dataset.label + ': ' + money(c.parsed.y); }
        }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: dark ? '#8a8580' : '#706a62' } },
      y: { stacked: true, grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62', callback: function (v) { return compact(v); } } }
    }
  };
}

function stepUpChartOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 12, right: 10 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: dark ? '#c5beb7' : '#706a62',
          boxWidth: 10,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: dark ? '#222' : '#fff',
        titleColor: dark ? '#f0ece8' : '#1a1a1a',
        bodyColor: dark ? '#a09890' : '#706a62',
        borderColor: dark ? '#2c2c2c' : '#d1ccc4',
        borderWidth: 1,
        callbacks: {
          label: function (c) {
            if (c.dataset.yAxisID === 'y1') return c.dataset.label + ': ' + money(c.parsed.y);
            return c.dataset.label + ': ' + money(c.parsed.y);
          }
        }
      }
    },
    scales: {
      x: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62' } },
      y: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62', callback: function (v) { return compact(v); } } },
      y1: { position: 'right', grid: { display: false }, ticks: { color: dark ? '#8a8580' : '#706a62', callback: function (v) { return compact(v); } } }
    }
  };
}

function renderMixChart() {
  const ctx = document.getElementById('swpMixChart');
  if (!ctx) return;
  if (S.charts.mix) S.charts.mix.destroy();
  const dark = root.classList.contains('mg-dark');
  S.charts.mix = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Equity', 'Debt', 'Fixed Deposit'],
      datasets: [{
        data: [S.mixEquity, S.mixDebt, S.mixFd],
        backgroundColor: ['#D4853B', '#2b6cb0', '#7c9a52'],
        borderColor: dark ? '#161616' : '#FFFFFF',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: dark ? '#222' : '#fff',
          titleColor: dark ? '#f0ece8' : '#1a1a1a',
          bodyColor: dark ? '#a09890' : '#706a62',
          borderColor: dark ? '#2c2c2c' : '#d1ccc4',
          borderWidth: 1,
          displayColors: false,
          callbacks: { label: function (c) { return c.label + ': ' + c.parsed + '%'; } }
        }
      }
    }
  });
}

function renderCorpusChart() {
  const ctx = document.getElementById('swpCorpusChart');
  if (!ctx) return;
  if (S.charts.corpus) S.charts.corpus.destroy();
  const dark = root.classList.contains('mg-dark');
  const c2d = ctx.getContext('2d');
  const gradient = c2d.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(212,133,59,0.25)');
  gradient.addColorStop(1, 'rgba(212,133,59,0.02)');
  let cumulativeNet = 0;
  const cumulativeSeries = S.rows.map(function (row) {
    cumulativeNet += row.net;
    return cumulativeNet;
  });
  const benchmarkSeries = S.rows.map(function (row) { return row.benchmark; });
  const realSeries = S.rows.map(function (row) { return row.realClosing; });
  const starting = (S.preview || snapshot()).corpus;
  S.charts.corpus = new Chart(c2d, {
    type: 'line',
    data: {
      labels: S.rows.map(function (r) { return 'Y' + r.year; }),
      datasets: [
        {
          label: 'Closing corpus',
          data: S.rows.map(function (r) { return r.closing; }),
          customToggle: true,
          borderColor: '#D4853B',
          backgroundColor: gradient,
          fill: true,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 2
        },
        {
          label: 'Danger zone',
          data: S.rows.map(function () { return starting * 0.25; }),
          customToggle: false,
          borderColor: 'rgba(239,68,68,0.12)',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: false,
          pointRadius: 0,
          borderWidth: 1
        },
        {
          label: 'Cumulative net income',
          data: cumulativeSeries,
          customToggle: true,
          borderColor: '#2b6cb0',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 2
        },
        {
          label: 'FD benchmark (7%)',
          data: benchmarkSeries,
          customToggle: false,
          borderColor: '#7c9a52',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0
        },
        {
          label: 'Inflation-adjusted corpus',
          data: realSeries,
          customToggle: true,
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          hidden: !((S.preview || snapshot()).inflationAdjusted)
        }
      ]
    },
    options: lineChartOptions(dark)
  });
}

function renderPayoutChart() {
  const ctx = document.getElementById('swpPayoutChart');
  if (!ctx) return;
  if (S.charts.payout) S.charts.payout.destroy();
  const dark = root.classList.contains('mg-dark');
  S.charts.payout = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: S.rows.map(function (r) { return 'Y' + r.year; }),
      datasets: [
        {
          label: 'Equity withdrawn',
          data: S.rows.map(function (r) { return r.eqWithdraw; }),
          customToggle: true,
          backgroundColor: 'rgba(212,133,59,0.88)',
          borderRadius: 8
        },
        {
          label: 'Debt withdrawn',
          data: S.rows.map(function (r) { return r.debtWithdraw; }),
          customToggle: true,
          backgroundColor: 'rgba(43,108,176,0.88)',
          borderRadius: 8
        },
        {
          label: 'FD withdrawn',
          data: S.rows.map(function (r) { return r.fdWithdraw; }),
          customToggle: true,
          backgroundColor: 'rgba(124,154,82,0.88)',
          borderRadius: 8
        },
        {
          type: 'line',
          label: 'Net received',
          data: S.rows.map(function (r) { return r.net; }),
          customToggle: false,
          borderColor: '#111827',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 2,
          yAxisID: 'y'
        }
      ]
    },
    options: barChartOptions(dark)
  });
}

function lineChartOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: dark ? '#222' : '#fff',
        titleColor: dark ? '#f0ece8' : '#1a1a1a',
        bodyColor: dark ? '#a09890' : '#706a62',
        borderColor: dark ? '#2c2c2c' : '#d1ccc4',
        borderWidth: 1,
        callbacks: {
          afterTitle: function (items) {
            const row = S.rows[items[0].dataIndex];
            if (!row) return '';
            return 'Closing ' + money(row.closing) + ' | Inflation-adjusted ' + money(row.realClosing) + ' | Cumulative withdrawn ' + money(cumulativeNetAt(items[0].dataIndex)) + ' | Annual tax ' + money(row.tax);
          },
          label: function (c) { return c.dataset.label + ': ' + money(c.parsed.y); }
        }
      }
    },
    scales: {
      x: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62' } },
      y: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62', callback: function (v) { return compact(v); } } }
    }
  };
}

function barChartOptions(dark) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: dark ? '#222' : '#fff',
        titleColor: dark ? '#f0ece8' : '#1a1a1a',
        bodyColor: dark ? '#a09890' : '#706a62',
        borderColor: dark ? '#2c2c2c' : '#d1ccc4',
        borderWidth: 1,
        callbacks: {
          afterTitle: function (items) {
            const row = S.rows[items[0].dataIndex];
            if (!row) return '';
            return 'Closing corpus ' + money(row.closing) + ' | Tax ' + money(row.tax);
          },
          label: function (c) { return c.dataset.label + ': ' + money(c.parsed.y); }
        }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: dark ? '#8a8580' : '#706a62' } },
      y: { stacked: true, grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }, ticks: { color: dark ? '#8a8580' : '#706a62', callback: function (v) { return compact(v); } } }
    }
  };
}

function cumulativeNetAt(index) {
  let total = 0;
  for (let i = 0; i <= index && i < S.rows.length; i++) total += S.rows[i].net;
  return total;
}

function renderChartToggles(id, chart) {
  const wrap = document.getElementById(id);
  if (!wrap || !chart) return;
  wrap.innerHTML = '';
  chart.data.datasets.forEach(function (ds, index) {
    if (!ds.customToggle) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mg-swp-toggle' + (chart.isDatasetVisible(index) ? ' on' : ' off');
    btn.setAttribute('aria-pressed', chart.isDatasetVisible(index) ? 'true' : 'false');
    btn.setAttribute('aria-label', (chart.isDatasetVisible(index) ? 'Hide ' : 'Show ') + ds.label);
    btn.innerHTML = '<span class="mg-swp-toggle-icon">' + (chart.isDatasetVisible(index) ? '&#10003;' : '&#10005;') + '</span><span>' + ds.label + '</span>';
    btn.addEventListener('click', function () {
      const visible = chart.isDatasetVisible(index);
      chart.setDatasetVisibility(index, !visible);
      chart.update();
      renderChartToggles(id, chart);
    });
    wrap.appendChild(btn);
  });
}

function animateMoney(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = Number(el.getAttribute('data-value') || 0);
  const end = Math.round(value || 0);
  const duration = 450;
  const startTime = performance.now();
  el.setAttribute('data-value', String(end));

  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = Math.round(start + (end - start) * eased);
    el.textContent = money(current);
    if (p < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function money(value) {
  return '₹' + Math.round(value).toLocaleString('en-IN');
}

function moneyPlain(value) {
  return '₹' + Math.round(value);
}

function roundNice(value, direction) {
  const n = Math.max(0, Number(value) || 0);
  let step = 1000;
  if (n >= 10000000) step = 50000;
  else if (n >= 1000000) step = 10000;
  else if (n >= 100000) step = 5000;
  if (direction === 'down') return Math.floor(n / step) * step;
  return Math.ceil(n / step) * step;
}

function formatIndianNumber(value) {
  const raw = digitsOnly(String(value));
  return raw ? Number(raw).toLocaleString('en-IN') : '';
}

function digitsOnly(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function compact(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(1) + 'Cr';
  if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(1) + 'L';
  if (abs >= 1000) return sign + '₹' + (abs / 1000).toFixed(0) + 'K';
  return sign + '₹' + Math.round(abs);
}

function monthLabel(month) {
  const years = Math.floor(month / 12);
  const months = month % 12;
  if (years <= 0) return months + ' months';
  if (months === 0) return years + ' years';
  return years + ' years ' + months + ' months';
}

function mixName(id) {
  if (id === 'swpMixEquity') return 'Equity';
  if (id === 'swpMixDebt') return 'Debt';
  if (id === 'swpMixFd') return 'Fixed Deposit';
  return 'None';
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
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
})();
