// js/modules/qsbs-wizard.js — M10: 6-step QSBS assessment wizard
import storage from '../core/storage.js';
import state from '../core/state.js';
import { fmt } from '../shared/fmt.js';
import { evaluateQSBS } from '../engines/rules-engine.js';
import { calcStockSaleTax, calcExclusionLimit } from '../engines/calc-engine.js';

const DISCLAIMER = 'DISCLAIMER: This analysis is for planning purposes only and does not constitute legal or tax advice. Results are based on information you entered and may not reflect all relevant facts. Consult a qualified tax attorney before relying on any analysis. § 1202 eligibility is highly fact-specific.';

let _state = { step: 1, data: {}, result: null, calcResult: null };

export function renderQSBSWizard(container) {
  _state = { step: 1, data: {}, result: null, calcResult: null };
  render(container);
}

function render(container) {
  container.innerHTML = buildWizard();
  bindEvents(container);
  showStep(container, _state.step);
}

function buildWizard() {
  return '<div class="wizard-container">' +
    '<div class="wizard-header">' +
    '<h1>QSBS Assessment Wizard</h1>' +
    '<div class="step-indicators">' +
    [1,2,3,4,5,6].map(function(n) {
      return '<div class="step-indicator" data-step="' + n + '">' +
        '<span class="step-num">' + n + '</span>' +
        '<span class="step-label">' + stepLabel(n) + '</span></div>';
    }).join('') +
    '</div></div>' +
    '<div class="wizard-body">' +
    buildStep(1) + buildStep(2) + buildStep(3) +
    buildStep(4) + buildStep(5) + buildStep(6) +
    '</div>' +
    '<div class="wizard-footer">' +
    '<button class="btn btn-secondary" id="btn-prev" style="display:none;">← Previous</button>' +
    '<button class="btn btn-primary" id="btn-next">Next →</button>' +
    '<button class="btn btn-primary" id="btn-finish" style="display:none;">Save as Scenario</button>' +
    '</div></div>';
}

function stepLabel(n) {
  return ['Entity','Issuance','AGA','Business','Holding','Results'][n-1];
}

function buildStep(n) {
  const s = '<div class="wizard-step" data-step="' + n + '" style="display:none;">';
  if (n === 1) return s + '<h2>Step 1 — Entity Information</h2>' +
    '<div class="form-grid">' +
    field('Company Name', 'company_name', '', 'text') +
    select('Legal Entity Type', 'entity_type', ['LLC','S-Corp','C-Corp']) +
    select('Federal Tax Class', 'tax_class', ['Partnership','S-Corp','C-Corp','Disregarded Entity']) +
    field('State', 'state', '', 'text') +
    select('Conversion Planned?', 'conversion_planned', ['No','Yes — LLC to C-Corp','Yes — S-Corp to C-Corp','Yes — Statutory Conversion']) +
    '</div></div>';
  if (n === 2) return s + '<h2>Step 2 — Stock Issuance</h2>' +
    '<div class="alert alert-info">The acquisition date determines which law version applies. July 5, 2025 or later = Post-July 4 rules ($75M threshold).</div>' +
    '<div class="form-grid">' +
    field('Acquisition Date *', 'acquisition_date', '', 'date') +
    field('Cash at Issuance ($)', 'cash_at_issuance', '', 'number') +
    field('Stock Basis ($)', 'stock_basis', '', 'number') +
    field('§1202 Basis ($) <small>Usually = cash paid at issuance</small>', 'sec1202_basis', '', 'number') +
    field('Prior Exclusions Used ($)', 'prior_exclusions_used', '0', 'number') +
    '</div>' +
    '<div class="form-row"><label>Was this stock originally issued to you by the corporation? <small>(not purchased from another stockholder)</small></label>' +
    '<select name="is_original_issue"><option value="">— Unknown —</option><option value="true">Yes — original issue</option><option value="false">No — secondary purchase</option></select></div>' +
    '<div class="form-row"><label>Any stock redemptions in 2 years before/after issuance?</label><select name="redemption_detected"><option value="false">No</option><option value="true">Yes</option></select></div>' +
    '</div>';
  if (n === 3) return s + '<h2>Step 3 — Aggregate Gross Assets</h2>' +
    '<div class="alert alert-info"><strong>Important:</strong> AGA uses adjusted <u>tax bases</u> of assets — NOT fair market value, NOT book value. Exception: contributed property uses FMV at contribution date.</div>' +
    '<div class="form-grid">' +
    field('Cash ($)', 'cash', '', 'number') +
    field('Receivables (tax basis)', 'receivables_basis', '', 'number') +
    field('Equipment (tax basis)', 'equipment_basis', '', 'number') +
    field('Software / Cap Dev (tax basis)', 'software_basis', '', 'number') +
    field('Acquired IP (tax basis)', 'acquired_ip_basis', '', 'number') +
    field('Contributed Property (FMV at contribution)', 'contributed_property_fmv', '', 'number') +
    field('Other Assets (tax basis)', 'other_asset_bases', '', 'number') +
    '</div>' +
    '<div class="aga-gauge-container"><div id="aga-gauge-display"><p>Enter asset values above to see AGA vs threshold.</p></div></div>' +
    '</div>';
  if (n === 4) return s + '<h2>Step 4 — Business Qualification</h2>' +
    '<div class="form-grid">' +
    field('Software Subscription Revenue %', 'software_subscription_pct', '0', 'number') +
    field('Automated Diagnostic Revenue %', 'automated_diagnostic_pct', '0', 'number') +
    field('Curriculum / Content Licensing %', 'curriculum_licensing_pct', '0', 'number') +
    field('Human Tutoring / Services %', 'human_tutoring_pct', '0', 'number') +
    field('Consulting Revenue %', 'consulting_pct', '0', 'number') +
    field('Other Revenue %', 'other_pct', '0', 'number') +
    '</div>' +
    '<div class="form-row"><label>Does the business rely on founder reputation/skill to deliver services?</label>' +
    '<select name="founder_reputation_dependent"><option value="no">No — delivery is systematized/automated</option><option value="yes">Yes — founder involvement is central</option><option value="partial">Partial</option></select></div>' +
    '<div id="rev-total-warning" class="alert alert-warn" style="display:none;">Revenue percentages must sum to 100%.</div>' +
    '</div>';
  if (n === 5) return s + '<h2>Step 5 — Holding Period & Exit</h2>' +
    '<div class="form-grid">' +
    field('Exit Date (or leave blank)', 'exit_date', '', 'date') +
    field('Years Held (alternative to exit date)', 'exit_year', '', 'number') +
    field('Gross Proceeds ($)', 'gross_proceeds', '', 'number') +
    select('Sale Type', 'sale_type', ['stock', 'asset', 'mixed']) +
    field('Qualifying % (0-100)', 'qualifying_pct', '100', 'number') +
    field('Federal Rate', 'federal_rate', '0.20', 'number') +
    field('NIIT Rate', 'niit_rate', '0.038', 'number') +
    field('State Rate', 'state_rate', '0', 'number') +
    '</div>' +
    '<div id="holding-display"></div>' +
    '</div>';
  if (n === 6) return s + '<h2>Step 6 — Results</h2>' +
    '<div class="alert alert-warn" id="results-disclaimer">' + DISCLAIMER + '</div>' +
    '<div id="results-content"><p>Computing results...</p></div>' +
    '</div>';
  return s + '</div>';
}

function field(label, name, value, type) {
  return '<div class="form-field"><label>' + label + '</label><input type="' + (type||'text') + '" name="' + name + '" value="' + esc(value||'') + '"></div>';
}

function select(label, name, options) {
  return '<div class="form-field"><label>' + label + '</label><select name="' + name + '">' +
    options.map(function(o){ return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') +
    '</select></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showStep(container, n) {
  container.querySelectorAll('.wizard-step').forEach(function(s) { s.style.display = s.dataset.step == n ? '' : 'none'; });
  container.querySelectorAll('.step-indicator').forEach(function(s) {
    s.classList.toggle('active', s.dataset.step == n);
    s.classList.toggle('completed', s.dataset.step < n);
  });
  container.querySelector('#btn-prev').style.display = n > 1 ? '' : 'none';
  container.querySelector('#btn-next').style.display = n < 6 ? '' : 'none';
  container.querySelector('#btn-finish').style.display = n === 6 ? '' : 'none';
  if (n === 3) updateAGAGauge(container);
  if (n === 6) computeAndShowResults(container);
}

function updateAGAGauge(container) {
  const data = collectData(container);
  const lawVersion = data.acquisition_date ? (new Date(data.acquisition_date) < new Date('2025-07-05') ? 'historical' : 'post_july4_2025') : 'post_july4_2025';
  const threshold = lawVersion === 'historical' ? 50000000 : 75000000;
  const aga = ['cash','receivables_basis','equipment_basis','software_basis','acquired_ip_basis','contributed_property_fmv','other_asset_bases']
    .reduce(function(sum, k) { return sum + (parseFloat(data[k])||0); }, 0);
  const pct = Math.min(100, (aga / threshold) * 100);
  const cls = pct < 50 ? 'gauge-safe' : pct < 80 ? 'gauge-watch' : pct < 95 ? 'gauge-warning' : 'gauge-critical';
  const display = container.querySelector('#aga-gauge-display');
  if (display) {
    display.innerHTML = '<div class="gauge-bar ' + cls + '" style="width:' + pct.toFixed(1) + '%"></div>' +
      '<div class="gauge-label">' + fmt.currency(aga) + ' / ' + fmt.currency(threshold) + ' threshold (' + pct.toFixed(1) + '%)' +
      (aga >= threshold ? ' — <strong style="color:red">EXCEEDS THRESHOLD</strong>' : '') + '</div>';
  }
}

function computeAndShowResults(container) {
  const data = collectData(container);
  const isOrigIssue = data.is_original_issue === 'true' ? true : data.is_original_issue === 'false' ? false : null;
  const assetRecord = {
    cash: parseFloat(data.cash)||0, receivables_basis: parseFloat(data.receivables_basis)||0,
    equipment_basis: parseFloat(data.equipment_basis)||0, software_basis: parseFloat(data.software_basis)||0,
    acquired_ip_basis: parseFloat(data.acquired_ip_basis)||0,
    contributed_property_fmv: parseFloat(data.contributed_property_fmv)||0,
    other_asset_bases: parseFloat(data.other_asset_bases)||0
  };
  const revMix = {
    software_subscription_pct: parseFloat(data.software_subscription_pct)||0,
    automated_diagnostic_pct: parseFloat(data.automated_diagnostic_pct)||0,
    curriculum_licensing_pct: parseFloat(data.curriculum_licensing_pct)||0,
    human_tutoring_pct: parseFloat(data.human_tutoring_pct)||0,
    consulting_pct: parseFloat(data.consulting_pct)||0,
    other_pct: parseFloat(data.other_pct)||0
  };
  const scenario = {
    acquisition_date: data.acquisition_date,
    stock_basis: parseFloat(data.stock_basis)||0,
    sec1202_basis: parseFloat(data.sec1202_basis)||0,
    gross_assets_after: assetRecord.cash + assetRecord.receivables_basis + assetRecord.equipment_basis,
    prior_exclusions_used: parseFloat(data.prior_exclusions_used)||0,
    is_original_issue: isOrigIssue,
    entity_path: data.conversion_planned !== 'No' ? 'convert' : '',
    asset_record: assetRecord,
    revenue_mix: revMix,
    exit_date: data.exit_date || null,
    exit_year: parseFloat(data.exit_year)||null,
    gross_proceeds: parseFloat(data.gross_proceeds)||0,
    qualifying_pct: parseFloat(data.qualifying_pct)||100,
    federal_rate: parseFloat(data.federal_rate)||0.20,
    niit_rate: parseFloat(data.niit_rate)||0.038,
    state_rate: parseFloat(data.state_rate)||0,
    sale_type: data.sale_type || 'stock'
  };
  _state.data = scenario;

  let qsbsResult, calcResult;
  try { qsbsResult = evaluateQSBS(scenario); } catch(e) { qsbsResult = { status: 'fail', errors: [e.message] }; }
  try { calcResult = calcStockSaleTax(scenario); } catch(e) { calcResult = null; }
  _state.result = qsbsResult;
  _state.calcResult = calcResult;

  const div = container.querySelector('#results-content');
  if (!div) return;
  div.innerHTML = buildResults(qsbsResult, calcResult, scenario);

  const btnCopy = div.querySelector('#btn-copy-questions');
  if (btnCopy) {
    btnCopy.addEventListener('click', function() {
      const pqs = (qsbsResult.professional_review_questions || []).join('\n');
      navigator.clipboard.writeText(pqs).then(function(){ btnCopy.textContent = '✓ Copied!'; });
    });
  }
}

function buildResults(qsbs, calc, scenario) {
  const statusClass = {
    'likely_qualifies_under_stated_assumptions': 'tag-green',
    'potentially_qualifies': 'tag-green',
    'uncertain_professional_review_required': 'tag-amber',
    'likely_does_not_qualify': 'tag-red',
    'does_not_qualify_under_stated_assumptions': 'tag-red',
    'insufficient_information': 'tag-amber'
  }[qsbs.status] || 'tag-amber';

  let html = '<div class="results-status"><span class="tag ' + statusClass + ' tag-lg">' + esc(qsbs.status.replace(/_/g,' ').toUpperCase()) + '</span></div>';

  if (qsbs.individual_tests) {
    html += '<h3>Individual Test Results</h3><table class="data-table">' +
      '<thead><tr><th>Test</th><th>Result</th><th>Notes</th></tr></thead><tbody>';
    Object.entries(qsbs.individual_tests).forEach(function(entry) {
      const name = entry[0], t = entry[1];
      const pass = t.pass === true ? '✓' : t.pass === false ? '✗' : '?';
      const cls = t.pass === true ? 'text-green' : t.pass === false ? 'text-red' : 'text-amber';
      html += '<tr><td>' + esc(name.replace(/_/g,' ')) + '</td><td class="' + cls + '">' + pass + '</td><td>' + esc(t.note||'') + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  if (calc && calc.data) {
    const d = calc.data;
    html += '<h3>Tax Calculation</h3><table class="data-table">' +
      '<thead><tr><th>Item</th><th>With QSBS</th><th>Without QSBS</th></tr></thead><tbody>' +
      row('Gross Proceeds', fmt.currency(scenario.gross_proceeds), fmt.currency(scenario.gross_proceeds)) +
      row('Total Gain', fmt.currency(d.total_gain), fmt.currency(d.total_gain)) +
      row('Excluded Gain', fmt.currency(d.excluded_gain), '$0') +
      row('Taxable Gain', fmt.currency(d.taxable_gain), fmt.currency(d.total_gain)) +
      row('Federal Tax', fmt.currency(d.federal_tax), fmt.currency(d.total_gain * (scenario.federal_rate||0.20))) +
      row('NIIT', fmt.currency(d.niit), '') +
      row('State Tax', fmt.currency(d.state_tax), '') +
      row('Total Tax', fmt.currency(d.total_tax), fmt.currency(d.baseline_tax), true) +
      row('After-Tax Proceeds', fmt.currency(d.after_tax_proceeds), fmt.currency(scenario.gross_proceeds - d.baseline_tax), true) +
      row('QSBS Savings', fmt.currency(d.qsbs_savings), '—') +
      '</tbody></table>';
  }

  if (qsbs.professional_review_questions && qsbs.professional_review_questions.length) {
    html += '<h3>Questions for Your Attorney <button class="btn btn-sm btn-secondary" id="btn-copy-questions">Copy All</button></h3><ol>' +
      qsbs.professional_review_questions.map(function(q){ return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>';
  }

  return html;
}

function row(label, a, b, bold) {
  const style = bold ? ' style="font-weight:700"' : '';
  return '<tr' + style + '><td>' + label + '</td><td>' + a + '</td><td>' + (b||'') + '</td></tr>';
}

function collectData(container) {
  const data = {};
  container.querySelectorAll('input[name], select[name], textarea[name]').forEach(function(el) {
    data[el.name] = el.value;
  });
  return data;
}

function bindEvents(container) {
  container.querySelector('#btn-prev').addEventListener('click', function() {
    if (_state.step > 1) { _state.step--; showStep(container, _state.step); }
  });
  container.querySelector('#btn-next').addEventListener('click', function() {
    if (_state.step < 6) { _state.step++; showStep(container, _state.step); }
  });
  container.querySelector('#btn-finish').addEventListener('click', function() {
    const scenario = Object.assign({}, _state.data, {
      id: crypto.randomUUID(),
      name: container.querySelector('[name="company_name"]') ? container.querySelector('[name="company_name"]').value + ' — QSBS Analysis ' + new Date().toLocaleDateString() : 'QSBS Analysis',
      qsbs_status: _state.result ? _state.result.status : null
    });
    storage.save('scenarios', scenario).then(function() {
      state.emit('scenario:saved', scenario);
      alert('Scenario saved! Find it in the Scenarios tab.');
    });
  });

  // Revenue total warning on step 4
  container.querySelectorAll('input[name$="_pct"]').forEach(function(input) {
    input.addEventListener('input', function() {
      const total = ['software_subscription_pct','automated_diagnostic_pct','curriculum_licensing_pct','human_tutoring_pct','consulting_pct','other_pct']
        .reduce(function(s,k){ return s+(parseFloat(container.querySelector('[name="'+k+'"]')&&container.querySelector('[name="'+k+'"]').value)||0); }, 0);
      const warn = container.querySelector('#rev-total-warning');
      if (warn) warn.style.display = Math.abs(total-100)>5 ? '' : 'none';
    });
  });
}
