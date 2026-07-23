// js/modules/scenario-manager.js — M9: Scenario CRUD + compare
import storage from '../core/storage.js';
import state from '../core/state.js';
import { fmt } from '../shared/fmt.js';
import { validate } from '../shared/validate.js';

let _saveTimers = {};
let _inMemory = {};
let _comparing = [];

export function renderScenarioManager(container, opts) {
  opts = opts || {};
  Promise.all([storage.list('scenarios'), storage.list('companies')]).then(function(results) {
    const scenarios = results[0].sort(function(a,b){return (b.updated_at||'').localeCompare(a.updated_at||'');});
    const companies = results[1];
    const companyMap = {};
    companies.forEach(function(c){companyMap[c.id]=c;});
    container.innerHTML = buildListUI(scenarios, companyMap);
    bindListEvents(container, scenarios, companyMap);
  });
}

function buildListUI(scenarios, companyMap) {
  return '<div class="page-header">' +
    '<h1>Scenarios</h1>' +
    '<div class="header-actions">' +
    '<input type="search" id="scenario-search" placeholder="Search scenarios..." class="search-input">' +
    '<button class="btn btn-secondary" id="btn-compare">Compare Selected</button>' +
    '<button class="btn btn-primary" id="btn-new-scenario">+ New Scenario</button>' +
    '</div></div>' +
    '<div id="scenario-list-container">' + buildScenarioTable(scenarios, companyMap) + '</div>' +
    '<div id="scenario-detail-container" style="display:none;"></div>' +
    '<div id="compare-container" style="display:none;"></div>';
}

function buildScenarioTable(scenarios, companyMap) {
  if (!scenarios.length) return '<div class="empty-state"><p>No scenarios yet. Create your first QSBS analysis scenario.</p></div>';
  return '<table class="data-table">' +
    '<thead><tr><th><input type="checkbox" id="select-all"></th><th>⭐</th><th>Name</th><th>Company</th><th>Status</th><th>Law Version</th><th>Modified</th><th>Actions</th></tr></thead>' +
    '<tbody>' + scenarios.map(function(s) {
      const company = s.company_id ? (companyMap[s.company_id] || {}) : {};
      const status = s.qsbs_status || '—';
      const statusClass = status.includes('qualifies') ? 'tag-green' : status.includes('not_qualify') ? 'tag-red' : 'tag-amber';
      return '<tr data-id="' + s.id + '">' +
        '<td><input type="checkbox" class="select-row" data-id="' + s.id + '"></td>' +
        '<td><span class="star' + (s.is_favorite ? ' active' : '') + '" data-id="' + s.id + '">★</span></td>' +
        '<td><a href="#" class="scenario-link" data-id="' + s.id + '">' + esc(s.name || 'Untitled') + (s.is_locked ? ' 🔒' : '') + '</a></td>' +
        '<td>' + esc(company.name || '—') + '</td>' +
        '<td><span class="tag ' + statusClass + '">' + esc(shortStatus(status)) + '</span></td>' +
        '<td>' + esc(s.law_version === 'post_july4_2025' ? 'Post-2025' : s.law_version === 'historical' ? 'Historical' : '—') + '</td>' +
        '<td>' + fmt.date(s.updated_at) + '</td>' +
        '<td>' +
        '<button class="btn btn-sm btn-edit" data-id="' + s.id + '">Edit</button> ' +
        '<button class="btn btn-sm btn-dup" data-id="' + s.id + '">Dup</button> ' +
        '<button class="btn btn-sm btn-danger btn-del" data-id="' + s.id + '">Del</button>' +
        '</td></tr>';
    }).join('') + '</tbody></table>';
}

function shortStatus(status) {
  const map = {
    'likely_qualifies_under_stated_assumptions': 'Likely ✓',
    'potentially_qualifies': 'Potential',
    'uncertain_professional_review_required': 'Uncertain',
    'likely_does_not_qualify': 'Likely ✗',
    'does_not_qualify_under_stated_assumptions': 'Does Not Qualify',
    'insufficient_information': 'Incomplete'
  };
  return map[status] || status || '—';
}

function buildScenarioForm(scenario, companies) {
  const s = scenario || {};
  const isLocked = s.is_locked;
  const dis = isLocked ? ' disabled' : '';
  return '<div class="card scenario-detail">' +
    '<div class="card-header">' +
    '<h2>' + (s.id ? esc(s.name || 'Untitled') : 'New Scenario') + '</h2>' +
    '<div class="header-actions">' +
    '<span id="save-indicator" class="save-indicator"></span>' +
    (s.id ? '<button class="btn btn-sm btn-secondary" id="btn-lock">' + (isLocked ? '🔓 Unlock' : '🔒 Lock') + '</button> ' : '') +
    '<button class="btn btn-sm btn-secondary" id="btn-back">← Back</button>' +
    '</div></div>' +
    (isLocked ? '<div class="alert alert-warn">This scenario is locked. Unlock to edit.</div>' : '') +
    '<form id="scenario-form" data-id="' + (s.id || '') + '">' +
    '<div class="form-section"><h3>Identification</h3><div class="form-grid">' +
    field('Scenario Name', 'name', s.name, 'text', true, dis) +
    selectField('Company', 'company_id', companies, s.company_id, dis) +
    selectField('Law Version', 'law_version', [
      { value: 'post_july4_2025', label: 'Post-July 4, 2025 (One Big Beautiful Bill Act)' },
      { value: 'historical', label: 'Pre-July 5, 2025 (Historical)' }
    ], s.law_version, dis) +
    '</div></div>' +
    '<div class="form-section"><h3>Stock Issuance</h3><div class="form-grid">' +
    field('Acquisition Date', 'acquisition_date', s.acquisition_date, 'date', false, dis) +
    field('Stock Basis ($)', 'stock_basis', s.stock_basis, 'number', false, dis) +
    field('§1202 Basis ($)', 'sec1202_basis', s.sec1202_basis, 'number', false, dis) +
    field('Gross Assets at Issuance ($)', 'gross_assets_after', s.gross_assets_after, 'number', false, dis) +
    field('Prior Exclusions Used ($)', 'prior_exclusions_used', s.prior_exclusions_used, 'number', false, dis) +
    '</div></div>' +
    '<div class="form-section"><h3>Exit Assumptions</h3><div class="form-grid">' +
    field('Gross Proceeds ($)', 'gross_proceeds', s.gross_proceeds, 'number', false, dis) +
    field('Years Held (exit_year)', 'exit_year', s.exit_year, 'number', false, dis) +
    field('Exit Date', 'exit_date', s.exit_date, 'date', false, dis) +
    selectField('Sale Type', 'sale_type', [
      { value: 'stock', label: 'Stock Sale' },
      { value: 'asset', label: 'Asset Sale' },
      { value: 'mixed', label: 'Mixed' }
    ], s.sale_type || 'stock', dis) +
    field('Qualifying % (0-100)', 'qualifying_pct', s.qualifying_pct != null ? s.qualifying_pct : 100, 'number', false, dis) +
    '</div></div>' +
    '<div class="form-section"><h3>Tax Rates</h3><div class="form-grid">' +
    field('Federal Rate', 'federal_rate', s.federal_rate != null ? s.federal_rate : 0.20, 'number', false, dis) +
    field('NIIT Rate', 'niit_rate', s.niit_rate != null ? s.niit_rate : 0.038, 'number', false, dis) +
    field('State Rate', 'state_rate', s.state_rate != null ? s.state_rate : 0, 'number', false, dis) +
    '</div></div>' +
    '<div class="form-section"><h3>Tags & Notes</h3>' +
    '<div class="form-field"><label>Tags (comma-separated)</label><input type="text" name="tags_raw" value="' + esc((s.tags||[]).join(', ')) + '"' + dis + '></div>' +
    '<div class="form-field"><label>Notes</label><textarea name="notes" rows="3"' + dis + '>' + esc(s.notes||'') + '</textarea></div>' +
    '</div>' +
    (isLocked ? '' : '<div class="form-actions"><button type="submit" class="btn btn-primary">Save</button> <button type="button" id="btn-save-version" class="btn btn-secondary">Save Version</button></div>') +
    '</form></div>';
}

function field(label, name, value, type, required, dis) {
  return '<div class="form-field"><label>' + label + (required ? ' *' : '') + '</label>' +
    '<input type="' + (type||'text') + '" name="' + name + '" value="' + esc(value != null ? value : '') + '"' + (required ? ' required' : '') + (dis||'') + '></div>';
}

function selectField(label, name, options, current, dis) {
  const opts = options.map(function(o) {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label || (o.name || val);
    return '<option value="' + esc(val) + '"' + (current === val ? ' selected' : '') + '>' + esc(lbl) + '</option>';
  });
  return '<div class="form-field"><label>' + label + '</label><select name="' + name + '"' + (dis||'') + '><option value="">— Select —</option>' + opts.join('') + '</select></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindListEvents(container, scenarios, companyMap) {
  // Search
  const searchInput = container.querySelector('#scenario-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const q = searchInput.value.toLowerCase();
      container.querySelectorAll('tbody tr').forEach(function(row) {
        const text = row.textContent.toLowerCase();
        row.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }

  // New scenario
  const btnNew = container.querySelector('#btn-new-scenario');
  if (btnNew) {
    btnNew.addEventListener('click', function() {
      storage.list('companies').then(function(companies) {
        showDetail(container, null, companies);
      });
    });
  }

  // Edit buttons
  container.querySelectorAll('.btn-edit, .scenario-link').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const id = btn.dataset.id;
      Promise.all([storage.load('scenarios', id), storage.list('companies')]).then(function(results) {
        showDetail(container, results[0], results[1]);
      });
    });
  });

  // Duplicate
  container.querySelectorAll('.btn-dup').forEach(function(btn) {
    btn.addEventListener('click', function() {
      storage.load('scenarios', btn.dataset.id).then(function(s) {
        if (!s) return;
        const dup = Object.assign({}, s, { id: crypto.randomUUID(), name: 'Copy of ' + (s.name || 'Untitled'), created_at: null, updated_at: null, qsbs_status: null });
        storage.save('scenarios', dup).then(function() {
          state.emit('scenario:saved', dup);
          renderScenarioManager(container);
        });
      });
    });
  });

  // Delete
  container.querySelectorAll('.btn-del').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('Delete this scenario?')) return;
      storage.delete('scenarios', btn.dataset.id).then(function() {
        state.emit('scenario:deleted', { id: btn.dataset.id });
        renderScenarioManager(container);
      });
    });
  });

  // Favorites
  container.querySelectorAll('.star').forEach(function(star) {
    star.addEventListener('click', function() {
      const id = star.dataset.id;
      storage.load('scenarios', id).then(function(s) {
        if (!s) return;
        s.is_favorite = !s.is_favorite;
        storage.save('scenarios', s).then(function() {
          star.classList.toggle('active', s.is_favorite);
        });
      });
    });
  });

  // Compare button
  const btnCompare = container.querySelector('#btn-compare');
  if (btnCompare) {
    btnCompare.addEventListener('click', function() {
      const checked = Array.from(container.querySelectorAll('.select-row:checked')).map(function(cb) { return cb.dataset.id; });
      if (checked.length < 2) { alert('Select 2-6 scenarios to compare.'); return; }
      if (checked.length > 6) { alert('Maximum 6 scenarios for comparison.'); return; }
      Promise.all(checked.map(function(id) { return storage.load('scenarios', id); })).then(function(items) {
        showCompare(container, items.filter(Boolean));
      });
    });
  }

  // Select all
  const selectAll = container.querySelector('#select-all');
  if (selectAll) {
    selectAll.addEventListener('change', function() {
      container.querySelectorAll('.select-row').forEach(function(cb) { cb.checked = selectAll.checked; });
    });
  }
}

function showDetail(container, scenario, companies) {
  container.querySelector('#scenario-list-container').style.display = 'none';
  container.querySelector('#compare-container').style.display = 'none';
  const detail = container.querySelector('#scenario-detail-container');
  detail.innerHTML = buildScenarioForm(scenario, companies);
  detail.style.display = '';
  bindDetailEvents(container, scenario, detail);
}

function bindDetailEvents(container, scenario, detail) {
  const form = detail.querySelector('#scenario-form');
  if (!form) return;

  const indicator = detail.querySelector('#save-indicator');
  function showSaving() { if (indicator) indicator.textContent = 'Saving…'; }
  function showSaved() { if (indicator) indicator.textContent = '✓ Saved'; setTimeout(function(){ if(indicator) indicator.textContent=''; }, 2000); }

  const btnBack = detail.querySelector('#btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', function() {
      detail.style.display = 'none';
      container.querySelector('#scenario-list-container').style.display = '';
      renderScenarioManager(container);
    });
  }

  const btnLock = detail.querySelector('#btn-lock');
  if (btnLock) {
    btnLock.addEventListener('click', function() {
      const id = form.dataset.id;
      storage.load('scenarios', id).then(function(s) {
        if (!s) return;
        s.is_locked = !s.is_locked;
        storage.save('scenarios', s).then(function() {
          state.emit('scenario:saved', s);
          storage.list('companies').then(function(companies) { showDetail(container, s, companies); });
        });
      });
    });
  }

  // Autosave on field change
  form.querySelectorAll('input, select, textarea').forEach(function(input) {
    input.addEventListener('input', function() {
      const id = form.dataset.id;
      if (!id) return;
      showSaving();
      clearTimeout(_saveTimers[id]);
      _saveTimers[id] = setTimeout(function() {
        const data = getFormData(form);
        storage.load('scenarios', id).then(function(existing) {
          const merged = Object.assign({}, existing || {}, data, { id: id });
          storage.save('scenarios', merged).then(function() {
            state.emit('scenario:saved', merged);
            showSaved();
          });
        });
      }, 500);
    });
  });

  // Submit (explicit save)
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = getFormData(form);
    const id = form.dataset.id || crypto.randomUUID();
    const record = Object.assign({ id: id }, data);
    storage.save('scenarios', record).then(function() {
      state.emit('scenario:saved', record);
      showSaved();
      if (!form.dataset.id) {
        form.dataset.id = id;
      }
    });
  });

  // Save version
  const btnVersion = detail.querySelector('#btn-save-version');
  if (btnVersion) {
    btnVersion.addEventListener('click', function() {
      const id = form.dataset.id;
      if (!id) { alert('Save the scenario first.'); return; }
      storage.load('scenarios', id).then(function(s) {
        if (!s) return;
        const version = { id: crypto.randomUUID(), scenario_id: id, snapshot: JSON.stringify(s) };
        storage.save('scenario_versions', version).then(function() {
          alert('Version saved.');
        });
      });
    });
  }
}

function getFormData(form) {
  const raw = Object.fromEntries(new FormData(form));
  const tags = raw.tags_raw ? raw.tags_raw.split(',').map(function(t){return t.trim();}).filter(Boolean) : [];
  const numeric = ['stock_basis','sec1202_basis','gross_assets_after','prior_exclusions_used','gross_proceeds','exit_year','qualifying_pct','federal_rate','niit_rate','state_rate'];
  numeric.forEach(function(k) { if (raw[k] !== undefined && raw[k] !== '') raw[k] = parseFloat(raw[k]); else if (raw[k] === '') raw[k] = null; });
  return Object.assign({}, raw, { tags: tags });
}

function showCompare(container, scenarios) {
  container.querySelector('#scenario-list-container').style.display = 'none';
  const comp = container.querySelector('#compare-container');
  comp.innerHTML = buildCompareView(scenarios);
  comp.style.display = '';
  comp.querySelector('#btn-back-compare').addEventListener('click', function() {
    comp.style.display = 'none';
    container.querySelector('#scenario-list-container').style.display = '';
  });
  comp.querySelector('#btn-print-compare').addEventListener('click', function() { window.print(); });
}

function buildCompareView(scenarios) {
  const rows = [
    { label: 'Entity Path', key: 'entity_path' },
    { label: 'Law Version', key: 'law_version', format: function(v){return v==='post_july4_2025'?'Post-2025':'Historical';} },
    { label: 'Gross Assets ($)', key: 'gross_assets_after', format: function(v){return fmt.currency(v);} },
    { label: 'Stock Basis ($)', key: 'stock_basis', format: function(v){return fmt.currency(v);} },
    { label: '§1202 Basis ($)', key: 'sec1202_basis', format: function(v){return fmt.currency(v);} },
    { label: 'QSBS Status', key: 'qsbs_status' },
    { label: 'Excluded Gain ($)', key: 'excluded_gain', format: function(v){return fmt.currency(v);}, numeric: true },
    { label: 'Total Tax ($)', key: 'total_tax', format: function(v){return fmt.currency(v);}, numeric: true, lower_better: true },
    { label: 'After-Tax Proceeds ($)', key: 'after_tax_proceeds', format: function(v){return fmt.currency(v);}, numeric: true }
  ];

  const headerCells = scenarios.map(function(s){ return '<th>' + esc(s.name||'Untitled') + '</th>'; }).join('');
  const bodyRows = rows.map(function(row) {
    const vals = scenarios.map(function(s) { return s[row.key]; });
    const numericVals = row.numeric ? vals.map(Number).filter(function(v){return !isNaN(v);}) : [];
    const best = row.numeric ? (row.lower_better ? Math.min.apply(null,numericVals) : Math.max.apply(null,numericVals)) : null;
    const worst = row.numeric ? (row.lower_better ? Math.max.apply(null,numericVals) : Math.min.apply(null,numericVals)) : null;
    const cells = vals.map(function(v) {
      const display = row.format ? row.format(v) : esc(String(v||'—'));
      const num = Number(v);
      let cls = '';
      if (row.numeric && !isNaN(num)) { if (num === best) cls = 'compare-best'; else if (num === worst) cls = 'compare-worst'; }
      return '<td class="' + cls + '">' + display + '</td>';
    }).join('');
    return '<tr><td class="compare-label">' + row.label + '</td>' + cells + '</tr>';
  }).join('');

  return '<div class="page-header"><h1>Scenario Comparison</h1><div class="header-actions">' +
    '<button class="btn btn-secondary" id="btn-back-compare">← Back</button>' +
    '<button class="btn btn-secondary" id="btn-print-compare">🖨 Print</button>' +
    '</div></div>' +
    '<div class="compare-legend"><span class="tag tag-green">Best value</span> <span class="tag tag-red">Worst value</span></div>' +
    '<div style="overflow-x:auto;"><table class="data-table compare-table">' +
    '<thead><tr><th>Field</th>' + headerCells + '</tr></thead>' +
    '<tbody>' + bodyRows + '</tbody></table></div>';
}
