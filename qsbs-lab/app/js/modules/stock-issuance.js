// js/modules/stock-issuance.js — M11
import storage from '../core/storage.js';
import state from '../core/state.js';
import { fmt } from '../shared/fmt.js';

export function renderStockIssuance(container, scenarioId) {
  storage.list('stock_issuances', scenarioId ? { scenario_id: scenarioId } : {}).then(function(items) {
    container.innerHTML = buildUI(items, scenarioId);
    bindEvents(container, scenarioId);
  });
}

function buildUI(items, scenarioId) {
  return '<div class="page-header"><h1>Stock Issuance Tracker</h1><button class="btn btn-primary" id="btn-add-issuance">+ Add Issuance</button></div>' +
    '<div class="alert alert-info">Track each separate stock issuance separately. §1202 basis and acquisition dates must be maintained per issuance.</div>' +
    (items.length ? buildTable(items) : '<div class="empty-state"><p>No stock issuances recorded. Add each grant, purchase, or conversion separately.</p></div>') +
    '<div id="issuance-form-container" style="display:none;">' + buildForm(null, scenarioId) + '</div>';
}

function buildTable(items) {
  return '<table class="data-table"><thead><tr><th>Date</th><th>Description</th><th>Consideration</th><th>Stock Basis</th><th>§1202 Basis</th><th>Law Version</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
    items.map(function(i) {
      return '<tr><td>' + fmt.date(i.issuance_date) + '</td><td>' + esc(i.description||'—') + '</td><td>' + fmt.currency(i.consideration) + '</td><td>' + fmt.currency(i.stock_basis) + '</td><td>' + fmt.currency(i.sec1202_basis) + '</td>' +
        '<td>' + esc(i.law_version === 'post_july4_2025' ? 'Post-2025' : 'Historical') + '</td>' +
        '<td><span class="tag tag-green">Recorded</span></td>' +
        '<td><button class="btn btn-sm btn-danger btn-del-iss" data-id="' + i.id + '">Delete</button></td></tr>';
    }).join('') + '</tbody></table>';
}

function buildForm(item, scenarioId) {
  const i = item || {};
  return '<div class="card"><h3>New Stock Issuance</h3><form id="issuance-form">' +
    '<div class="form-grid">' +
    '<div class="form-field"><label>Issuance Date *</label><input type="date" name="issuance_date" value="' + esc(i.issuance_date||'') + '" required></div>' +
    '<div class="form-field"><label>Description</label><input type="text" name="description" value="' + esc(i.description||'') + '" placeholder="e.g. Founder shares at formation"></div>' +
    '<div class="form-field"><label>Consideration ($)</label><input type="number" name="consideration" value="' + esc(i.consideration||'') + '" step="any"></div>' +
    '<div class="form-field"><label>Stock Basis ($)</label><input type="number" name="stock_basis" value="' + esc(i.stock_basis||'') + '" step="any"></div>' +
    '<div class="form-field"><label>§1202 Basis ($) <small>Usually = cash paid</small></label><input type="number" name="sec1202_basis" value="' + esc(i.sec1202_basis||'') + '" step="any"></div>' +
    '<div class="form-field"><label>Shares</label><input type="number" name="shares" value="' + esc(i.shares||'') + '" step="any"></div>' +
    '</div><input type="hidden" name="scenario_id" value="' + esc(scenarioId||'') + '">' +
    '<div class="form-actions"><button type="submit" class="btn btn-primary">Save</button> <button type="button" id="btn-cancel-iss" class="btn btn-secondary">Cancel</button></div></form></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindEvents(container, scenarioId) {
  container.querySelector('#btn-add-issuance').addEventListener('click', function() {
    container.querySelector('#issuance-form-container').style.display = '';
  });
  const form = container.querySelector('#issuance-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      ['consideration','stock_basis','sec1202_basis','shares'].forEach(function(k){ if(data[k]) data[k]=parseFloat(data[k]); });
      const acq = data.issuance_date;
      data.law_version = acq && new Date(acq) < new Date('2025-07-05') ? 'historical' : 'post_july4_2025';
      data.id = crypto.randomUUID();
      storage.save('stock_issuances', data).then(function() {
        state.emit('issuance:saved', data);
        renderStockIssuance(container, scenarioId);
      });
    });
  }
  container.querySelectorAll('.btn-del-iss').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('Delete?')) return;
      storage.delete('stock_issuances', btn.dataset.id).then(function() { renderStockIssuance(container, scenarioId); });
    });
  });
  const btnCancel = container.querySelector('#btn-cancel-iss');
  if (btnCancel) btnCancel.addEventListener('click', function() { container.querySelector('#issuance-form-container').style.display = 'none'; });
}
