// js/modules/entity-compare.js — M14: Entity structure & law version comparison
import { fmt } from '../shared/fmt.js';
import { calcStockSaleTax } from '../engines/calc-engine.js';

const DISCLAIMER = 'Illustrative only. Not legal or tax advice. Consult a qualified attorney.';

export function renderEntityCompare(container) {
  container.innerHTML = buildUI();
  bindEvents(container);
  updateComparison(container);
}

function buildUI() {
  return '<div class="page-header"><h1>Entity Structure Comparison</h1></div>' +
    '<div class="alert alert-warn">' + DISCLAIMER + '</div>' +
    '<div class="compare-input-grid">' +
    '<div class="card"><h3>Shared Assumptions</h3>' +
    '<div class="form-grid">' +
    numF('Gross Proceeds ($)', 'gross_proceeds', 10000000) +
    numF('Stock Basis ($)', 'stock_basis', 100000) +
    numF('§1202 Basis ($)', 'sec1202_basis', 100000) +
    numF('Years Held', 'exit_year', 5) +
    numF('Federal Rate', 'federal_rate', 0.20) +
    numF('NIIT Rate', 'niit_rate', 0.038) +
    numF('State Rate', 'state_rate', 0) +
    '</div></div>' +
    '</div>' +
    '<div id="compare-output"></div>';
}

function numF(label, name, def) {
  return '<div class="form-field"><label>' + label + '</label><input type="number" name="' + name + '" value="' + def + '" step="any"></div>';
}

function getScenario(container) {
  const vals = {};
  container.querySelectorAll('input[name]').forEach(function(el){ vals[el.name] = parseFloat(el.value)||0; });
  return vals;
}

function updateComparison(container) {
  const base = getScenario(container);
  const output = container.querySelector('#compare-output');
  if (!output) return;

  // 4 scenarios: Historical C-Corp, Post-2025 C-Corp, Historical no-QSBS (LLC/S-Corp passthrough), S-Corp no QSBS
  const scenarios = [
    { label: 'C-Corp (Historical §1202)', law_version: 'historical', qualifying_pct: 100, sale_type: 'stock' },
    { label: 'C-Corp (Post-2025 §1202)', law_version: 'post_july4_2025', qualifying_pct: 100, sale_type: 'stock' },
    { label: 'C-Corp (Asset Sale)', law_version: 'post_july4_2025', qualifying_pct: 0, sale_type: 'asset' },
    { label: 'S-Corp / LLC (No QSBS, Stock)', law_version: 'post_july4_2025', qualifying_pct: 0, sale_type: 'stock' }
  ];

  const results = scenarios.map(function(s) {
    const scenario = Object.assign({}, base, s);
    let calc;
    try { calc = calcStockSaleTax(scenario); } catch(e) { calc = null; }
    return { label: s.label, calc: calc };
  });

  // Holding period milestones
  const holdMilestones = buildHoldingMilestones(base);

  output.innerHTML = buildCompareTable(results, base) + holdMilestones + buildQSBSElibility(base);
}

function buildCompareTable(results, base) {
  const headers = results.map(function(r){ return '<th>' + r.label + '</th>'; }).join('');
  const rows = [
    { label: 'Gross Proceeds', key: 'gross_proceeds' },
    { label: 'Total Gain', key: 'total_gain' },
    { label: 'Excluded Gain', key: 'excluded_gain', highlight: true },
    { label: 'Taxable Gain', key: 'taxable_gain' },
    { label: 'Total Tax', key: 'total_tax', highlight: true, lower_better: true },
    { label: 'After-Tax Proceeds', key: 'after_tax_proceeds', highlight: true },
    { label: 'Effective Rate', key: 'effective_rate', format: fmt.pct },
    { label: 'QSBS Savings', key: 'qsbs_savings', highlight: true }
  ];

  const body = rows.map(function(row) {
    const vals = results.map(function(r) { return r.calc && r.calc.data ? r.calc.data[row.key] : null; });
    const numVals = vals.map(Number).filter(function(v){ return !isNaN(v) && v !== 0; });
    const best = row.highlight ? (row.lower_better ? Math.min.apply(null, numVals) : Math.max.apply(null, numVals)) : null;

    const cells = vals.map(function(v) {
      if (v == null) return '<td>—</td>';
      const display = row.format ? row.format(v) : fmt.currency(v);
      const isBest = best != null && Number(v) === best;
      return '<td' + (isBest ? ' style="font-weight:700;color:#1a7a3c;background:#e8f5ee;"' : '') + '>' + display + '</td>';
    }).join('');

    return '<tr><td><strong>' + row.label + '</strong></td>' + cells + '</tr>';
  }).join('');

  return '<div class="card" style="margin-top:20px;"><h3>Tax Outcome Comparison</h3>' +
    '<div style="overflow-x:auto;"><table class="data-table">' +
    '<thead><tr><th>Metric</th>' + headers + '</tr></thead>' +
    '<tbody>' + body + '</tbody>' +
    '</table></div>' +
    '<p class="disclaimer" style="margin-top:12px;">Highlighted cells = best outcome. Asset sale uses simplified double-tax estimate.</p>' +
    '</div>';
}

function buildHoldingMilestones(base) {
  const acquisitionYear = 2024; // Illustrative — user would set acquisition date in a real scenario
  const law = base.law_version || 'post_july4_2025';

  const milestones = law === 'historical' ? [
    { years: 3, pct: 0, note: 'Pre-5yr — no exclusion' },
    { years: 5, pct: 1.0, note: '100% exclusion available' }
  ] : [
    { years: 3, pct: 0.50, note: '50% exclusion (post-2025)' },
    { years: 4, pct: 0.75, note: '75% exclusion (post-2025)' },
    { years: 5, pct: 1.00, note: '100% exclusion (post-2025)' }
  ];

  const rows = milestones.map(function(m) {
    const scenario = Object.assign({}, base, { exit_year: m.years, qualifying_pct: 100, law_version: law });
    let calc;
    try { calc = calcStockSaleTax(scenario); } catch(e) { calc = null; }
    const d = calc && calc.data ? calc.data : {};
    return '<tr>' +
      '<td>' + m.years + ' years</td>' +
      '<td>' + fmt.pct(m.pct) + '</td>' +
      '<td>' + m.note + '</td>' +
      '<td>' + fmt.currency(d.excluded_gain) + '</td>' +
      '<td>' + fmt.currency(d.total_tax) + '</td>' +
      '<td>' + fmt.currency(d.after_tax_proceeds) + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="card" style="margin-top:20px;"><h3>Holding Period Milestones (Post-2025 Law)</h3>' +
    '<table class="data-table"><thead><tr>' +
    '<th>Hold</th><th>Exclusion %</th><th>Note</th><th>Excluded Gain</th><th>Total Tax</th><th>After-Tax</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p class="disclaimer" style="margin-top:8px;">Assumes same proceeds and basis across holding periods.</p>' +
    '</div>';
}

function buildQSBSElibility(base) {
  const laws = [
    { id: 'post_july4_2025', label: 'Post-July 4, 2025 (One Big Beautiful Bill Act)' },
    { id: 'historical', label: 'Pre-July 5, 2025 (Historical)' }
  ];
  return '<div class="card" style="margin-top:20px;"><h3>Law Version Summary</h3>' +
    '<table class="data-table"><thead><tr>' +
    '<th>Provision</th>' + laws.map(function(l){ return '<th>' + l.label + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    '<tr><td>AGA Threshold</td><td>$50 million</td><td>$75 million</td></tr>' +
    '<tr><td>Fixed Dollar Limit</td><td>$10 million</td><td>$15 million</td></tr>' +
    '<tr><td>Exclusion at 3 years</td><td>0%</td><td>50%</td></tr>' +
    '<tr><td>Exclusion at 4 years</td><td>0%</td><td>75%</td></tr>' +
    '<tr><td>Exclusion at 5+ years</td><td>100%</td><td>100%</td></tr>' +
    '<tr><td>AMT preference item</td><td>No (TCJA)</td><td>No (confirmed)</td></tr>' +
    '<tr><td>C-Corp required</td><td>Yes</td><td>Yes</td></tr>' +
    '</tbody></table></div>';
}

function bindEvents(container) {
  container.querySelectorAll('input[name]').forEach(function(el) {
    el.addEventListener('input', function() { updateComparison(container); });
  });
}
