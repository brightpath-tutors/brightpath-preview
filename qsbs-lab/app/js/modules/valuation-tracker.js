// js/modules/valuation-tracker.js — M12: Valuation tracker
import storage from '../core/storage.js';
import state from '../core/state.js';
import { fmt } from '../shared/fmt.js';
import { computeValuation } from '../engines/valuation-engine.js';

const METHOD_LABELS = {
  arr_multiple: 'ARR Multiple',
  revenue_multiple: 'Revenue Multiple',
  ebitda_multiple: 'EBITDA Multiple',
  dcf: 'DCF',
  nav: 'Net Asset Value',
  ip_focused: 'IP-Focused',
  custom_comparable: 'Custom Comparable'
};

export function renderValuationTracker(container, scenarioId) {
  Promise.all([
    storage.list('valuations', scenarioId ? { scenario_id: scenarioId } : {}),
    scenarioId ? storage.load('scenarios', scenarioId) : Promise.resolve(null)
  ]).then(function(results) {
    const valuations = results[0].sort(function(a,b){return (b.valuation_date||'').localeCompare(a.valuation_date||'');});
    const scenario = results[1];
    container.innerHTML = buildUI(valuations, scenario, scenarioId);
    bindEvents(container, scenarioId, scenario);
  });
}

function buildUI(valuations, scenario, scenarioId) {
  return '<div class="page-header"><h1>Valuation Tracker</h1>' +
    '<button class="btn btn-primary" id="btn-add-val">+ Add Valuation</button></div>' +
    '<div class="alert alert-warn"><strong>Important:</strong> QSBS §1202 uses Aggregate Gross Assets (tax bases, NOT fair market value) for the threshold test. Valuations here document equity value and are separate from AGA calculations.</div>' +
    (valuations.length ? buildValuationList(valuations, scenario) : '<div class="empty-state"><p>No valuations on record. Document 409A valuations, board minutes, or arm\'s-length transactions here.</p></div>') +
    '<div id="val-form-container" style="display:none;">' + buildForm(null, scenarioId) + '</div>';
}

function buildValuationList(valuations, scenario) {
  const aga = scenario && scenario.gross_assets_after ? scenario.gross_assets_after : null;
  return '<table class="data-table">' +
    '<thead><tr><th>Date</th><th>Method</th><th>Enterprise Value</th><th>Equity Value</th><th>AGA at Issue</th><th>EV/AGA Ratio</th><th>Source</th><th>Actions</th></tr></thead>' +
    '<tbody>' + valuations.map(function(v) {
      const ratio = aga && v.equity_value ? (v.equity_value / aga) : null;
      const ratioDisplay = ratio ? ratio.toFixed(1) + '×' : '—';
      const ratioCls = ratio && ratio > 100 ? 'text-amber' : '';
      return '<tr>' +
        '<td>' + fmt.date(v.valuation_date) + '</td>' +
        '<td>' + esc(METHOD_LABELS[v.method] || v.method || '—') + '</td>' +
        '<td>' + fmt.currency(v.enterprise_value) + '</td>' +
        '<td>' + fmt.currency(v.equity_value) + '</td>' +
        '<td>' + (aga ? fmt.currency(aga) : '—') + '</td>' +
        '<td class="' + ratioCls + '">' + ratioDisplay + '</td>' +
        '<td>' + esc(v.source_note || '—') + '</td>' +
        '<td><button class="btn btn-sm btn-danger btn-del-val" data-id="' + v.id + '">Del</button></td>' +
        '</tr>';
    }).join('') + '</tbody></table>' +
    buildModelerSection(valuations[0], scenario);
}

function buildModelerSection(latestVal, scenario) {
  if (!scenario || !latestVal) return '';
  let html = '<div class="card" style="margin-top:20px;"><h3>Modeled Valuation (Latest Inputs)</h3>';
  try {
    const result = computeValuation(Object.assign({}, scenario, latestVal ? {
      arr: latestVal.arr, revenue: latestVal.revenue, ebitda: latestVal.ebitda
    } : {}));
    if (result && result.data) {
      const d = result.data;
      html += '<p><strong>Weighted Enterprise Value:</strong> ' + fmt.currency(d.weighted_ev) + '</p>';
      html += '<p><strong>Equity Value:</strong> ' + fmt.currency(d.equity_value) + '</p>';
      if (d.methods_used) {
        html += '<table class="data-table"><thead><tr><th>Method</th><th>Value</th><th>Weight</th></tr></thead><tbody>';
        d.methods_used.forEach(function(m) {
          html += '<tr><td>' + esc(METHOD_LABELS[m.method] || m.method) + '</td><td>' + fmt.currency(m.value) + '</td><td>' + fmt.pct(m.weight) + '</td></tr>';
        });
        html += '</tbody></table>';
      }
    }
  } catch(e) { html += '<p class="text-muted">Enter revenue/ARR/EBITDA fields to model valuation.</p>'; }
  html += '</div>';
  return html;
}

function buildForm(val, scenarioId) {
  const v = val || {};
  const methodOptions = Object.entries(METHOD_LABELS).map(function(e) {
    return '<option value="' + e[0] + '"' + (v.method === e[0] ? ' selected' : '') + '>' + e[1] + '</option>';
  }).join('');
  return '<div class="card"><h3>New Valuation</h3><form id="val-form">' +
    '<div class="form-grid">' +
    '<div class="form-field"><label>Date *</label><input type="date" name="valuation_date" required value="' + esc(v.valuation_date||'') + '"></div>' +
    '<div class="form-field"><label>Method</label><select name="method"><option value="">— Select —</option>' + methodOptions + '</select></div>' +
    '<div class="form-field"><label>Enterprise Value ($)</label><input type="number" name="enterprise_value" value="' + esc(v.enterprise_value||'') + '" step="any"></div>' +
    '<div class="form-field"><label>Equity Value ($)</label><input type="number" name="equity_value" value="' + esc(v.equity_value||'') + '" step="any"></div>' +
    '<div class="form-field"><label>ARR at Date ($)</label><input type="number" name="arr" step="any"></div>' +
    '<div class="form-field"><label>Revenue at Date ($)</label><input type="number" name="revenue" step="any"></div>' +
    '<div class="form-field"><label>EBITDA at Date ($)</label><input type="number" name="ebitda" step="any"></div>' +
    '</div>' +
    '<div class="form-field"><label>Source / Notes</label><input type="text" name="source_note" placeholder="e.g. 409A by Carta, Board minutes 2024-Q3"></div>' +
    '<input type="hidden" name="scenario_id" value="' + esc(scenarioId||'') + '">' +
    '<div class="form-actions"><button type="submit" class="btn btn-primary">Save</button> <button type="button" id="btn-cancel-val" class="btn btn-secondary">Cancel</button></div>' +
    '</form></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindEvents(container, scenarioId, scenario) {
  container.querySelector('#btn-add-val').addEventListener('click', function() {
    const fc = container.querySelector('#val-form-container');
    fc.innerHTML = buildForm(null, scenarioId);
    fc.style.display = '';
    fc.querySelector('#btn-cancel-val').addEventListener('click', function() { fc.style.display = 'none'; });
    fc.querySelector('#val-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      ['enterprise_value','equity_value','arr','revenue','ebitda'].forEach(function(k){ if(data[k]) data[k]=parseFloat(data[k]); else delete data[k]; });
      data.id = crypto.randomUUID();
      storage.save('valuations', data).then(function() {
        state.emit('valuation:saved', data);
        renderValuationTracker(container, scenarioId);
      });
    });
  });

  container.querySelectorAll('.btn-del-val').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('Delete this valuation?')) return;
      storage.delete('valuations', btn.dataset.id).then(function() {
        renderValuationTracker(container, scenarioId);
      });
    });
  });
}
