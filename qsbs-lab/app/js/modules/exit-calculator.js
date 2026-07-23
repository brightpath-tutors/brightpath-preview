// js/modules/exit-calculator.js — M13: Real-time exit tax calculator
import { fmt } from '../shared/fmt.js';
import { calcStockSaleTax, calcAssetSaleTax, calcOldVsNewLaw, runSensitivity } from '../engines/calc-engine.js';
import { computeExclusionLimit } from '../engines/ce2-threshold.js';

const DISCLAIMER = 'DISCLAIMER: For planning purposes only. Not tax advice. Consult a qualified tax attorney.';

export function renderExitCalculator(container) {
  container.innerHTML = buildUI();
  bindEvents(container);
  updateResults(container);
}

function buildUI() {
  return '<div class="calculator-layout">' +
    '<div class="calc-inputs">' +
    '<h2>Exit Tax Calculator</h2>' +
    '<div class="form-section"><h3>Sale</h3>' +
    selField('Sale Type', 'sale_type', ['stock','asset','mixed'], 'stock') +
    numField('Gross Proceeds ($)', 'gross_proceeds', 10000000) +
    numField('Selling Expenses ($)', 'selling_expenses', 0) +
    '</div>' +
    '<div class="form-section"><h3>Basis</h3>' +
    numField('Stock Basis ($)', 'stock_basis', 100000) +
    numField('§1202 Basis ($)', 'sec1202_basis', 100000) +
    numField('Prior Exclusions Used ($)', 'prior_exclusions_used', 0) +
    '</div>' +
    '<div class="form-section"><h3>QSBS</h3>' +
    selField('Law Version', 'law_version', ['post_july4_2025','historical'], 'post_july4_2025') +
    numField('Years Held', 'exit_year', 5) +
    numField('Qualifying % (0-100)', 'qualifying_pct', 100) +
    '</div>' +
    '<div class="form-section"><h3>Tax Rates</h3>' +
    numField('Federal Rate', 'federal_rate', 0.20) +
    numField('NIIT Rate', 'niit_rate', 0.038) +
    numField('State Rate', 'state_rate', 0) +
    '</div>' +
    '</div>' +
    '<div class="calc-results">' +
    '<div class="alert alert-warn" style="font-size:12px;">' + DISCLAIMER + '</div>' +
    '<div id="calc-output"></div>' +
    '</div>' +
    '</div>';
}

function numField(label, name, def) {
  return '<div class="form-field"><label>' + label + '</label><input type="number" name="' + name + '" value="' + def + '" step="any"></div>';
}

function selField(label, name, opts, def) {
  return '<div class="form-field"><label>' + label + '</label><select name="' + name + '">' +
    opts.map(function(o){ return '<option value="'+o+'"'+(o===def?' selected':'')+'>'+o+'</option>'; }).join('') + '</select></div>';
}

function getScenario(container) {
  const vals = {};
  container.querySelectorAll('input[name],select[name]').forEach(function(el){ vals[el.name]=el.value; });
  return {
    gross_proceeds: parseFloat(vals.gross_proceeds)||0,
    selling_expenses: parseFloat(vals.selling_expenses)||0,
    stock_basis: parseFloat(vals.stock_basis)||0,
    sec1202_basis: parseFloat(vals.sec1202_basis)||0,
    prior_exclusions_used: parseFloat(vals.prior_exclusions_used)||0,
    law_version: vals.law_version||'post_july4_2025',
    exit_year: parseFloat(vals.exit_year)||5,
    qualifying_pct: parseFloat(vals.qualifying_pct)||100,
    federal_rate: parseFloat(vals.federal_rate)||0.20,
    niit_rate: parseFloat(vals.niit_rate)||0.038,
    state_rate: parseFloat(vals.state_rate)||0,
    sale_type: vals.sale_type||'stock'
  };
}

function updateResults(container) {
  const scenario = getScenario(container);
  const output = container.querySelector('#calc-output');
  if (!output) return;

  let stockResult, assetResult, oldVsNew, sensitivity, limitResult;
  try { stockResult = calcStockSaleTax(scenario); } catch(e) { stockResult = null; }
  try { assetResult = calcAssetSaleTax(scenario); } catch(e) { assetResult = null; }
  try { oldVsNew = calcOldVsNewLaw(scenario); } catch(e) { oldVsNew = null; }
  try { sensitivity = runSensitivity(scenario); } catch(e) { sensitivity = null; }
  try { limitResult = computeExclusionLimit(scenario); } catch(e) { limitResult = null; }

  output.innerHTML = buildResults(scenario, stockResult, assetResult, oldVsNew, sensitivity, limitResult);
}

function buildResults(scenario, stockResult, assetResult, oldVsNew, sensitivity, limitResult) {
  const d = (stockResult && stockResult.data) || {};
  const ld = (limitResult && limitResult.data) || {};
  let html = '<div class="results-panel">';

  html += '<h3>Stock Sale — With QSBS</h3>';
  html += buildTrace([
    ['Amount Realized', fmt.currency(d.amount_realized)],
    ['Total Gain', fmt.currency(d.total_gain)],
    ['Eligible Gain (×' + fmt.pct((scenario.qualifying_pct||100)/100) + ')', fmt.currency(d.eligible_gain)],
    ['Ten-Times Ceiling', fmt.currency(ld.ten_times_basis)],
    ['Fixed-Dollar Remaining', fmt.currency(ld.fixed_dollar_remaining)],
    ['Applicable Limit (max of above)', fmt.currency(ld.applicable_limit), true],
    ['Exclusion %', fmt.pct(d.exclusion_pct||0)],
    ['Excluded Gain', fmt.currency(d.excluded_gain), true],
    ['Taxable Gain', fmt.currency(d.taxable_gain)],
    ['Federal Tax', fmt.currency(d.federal_tax)],
    ['NIIT', fmt.currency(d.niit)],
    ['State Tax', fmt.currency(d.state_tax)],
    ['Total Tax', fmt.currency(d.total_tax), true],
    ['After-Tax Proceeds', fmt.currency(d.after_tax_proceeds), true],
    ['QSBS Savings vs. Baseline', fmt.currency(d.qsbs_savings), false, 'text-green']
  ]);

  if (assetResult && assetResult.data) {
    const ad = assetResult.data;
    html += '<h3>Asset Sale (Double-Tax Analysis)</h3>';
    html += '<div class="alert alert-warn">' + assetResult.warnings[0] + '</div>';
    html += buildTrace([
      ['Corporate Gain', fmt.currency(ad.corporate_gain)],
      ['Corporate Tax (21%)', fmt.currency(ad.corporate_tax)],
      ['Distributable', fmt.currency(ad.distributable)],
      ['Shareholder Gain', fmt.currency(ad.shareholder_gain)],
      ['Shareholder Tax', fmt.currency(ad.shareholder_tax)],
      ['Double Tax Total', fmt.currency(ad.double_tax_total), true],
      ['After-Tax Proceeds', fmt.currency(ad.after_tax_proceeds), true]
    ]);
  }

  if (oldVsNew) {
    const hd = (oldVsNew.historical && oldVsNew.historical.data) || {};
    const pd = (oldVsNew.postChange && oldVsNew.postChange.data) || {};
    html += '<h3>Old Law vs. New Law Comparison</h3>';
    html += '<table class="data-table"><thead><tr><th>Item</th><th>Historical (pre-2025)</th><th>Post-July 4, 2025</th><th>Difference</th></tr></thead><tbody>' +
      compRow('Excluded Gain', hd.excluded_gain, pd.excluded_gain) +
      compRow('Total Tax', hd.total_tax, pd.total_tax) +
      compRow('After-Tax Proceeds', hd.after_tax_proceeds, pd.after_tax_proceeds) +
      '</tbody></table>';
  }

  if (sensitivity && sensitivity.data && sensitivity.data.rows) {
    html += '<h3>Sensitivity Table</h3><table class="data-table"><thead><tr><th>Proceeds</th><th>Total Gain</th><th>Excluded</th><th>Total Tax</th><th>After-Tax</th><th>Eff. Rate</th></tr></thead><tbody>';
    sensitivity.data.rows.forEach(function(r) {
      const isBase = Math.abs(r.multiplier - 1.0) < 0.01;
      html += '<tr' + (isBase ? ' style="background:#fffbeb;font-weight:700"' : '') + '>' +
        '<td>' + fmt.currency(r.gross_proceeds) + (isBase ? ' ★' : '') + '</td>' +
        '<td>' + fmt.currency(r.total_gain) + '</td>' +
        '<td>' + fmt.currency(r.excluded_gain) + '</td>' +
        '<td>' + fmt.currency(r.total_tax) + '</td>' +
        '<td>' + fmt.currency(r.after_tax_proceeds) + '</td>' +
        '<td>' + fmt.pct(r.effective_rate) + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  html += '</div>';
  return html;
}

function buildTrace(rows) {
  return '<table class="data-table formula-trace"><tbody>' +
    rows.map(function(r) {
      const bold = r[2] ? ' style="font-weight:700"' : '';
      const cls = r[3] ? ' class="' + r[3] + '"' : '';
      return '<tr' + bold + '><td>' + r[0] + '</td><td' + cls + '>' + r[1] + '</td></tr>';
    }).join('') + '</tbody></table>';
}

function compRow(label, historical, post) {
  const diff = (post||0) - (historical||0);
  return '<tr><td>' + label + '</td><td>' + fmt.currency(historical) + '</td><td>' + fmt.currency(post) + '</td><td class="' + (diff>0?'text-green':'text-red') + '">' + (diff>=0?'+':'') + fmt.currency(diff) + '</td></tr>';
}

function bindEvents(container) {
  container.querySelectorAll('input[name],select[name]').forEach(function(el) {
    el.addEventListener('input', function() { updateResults(container); });
  });
}
