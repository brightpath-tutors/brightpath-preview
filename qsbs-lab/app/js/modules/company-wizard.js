// js/modules/company-wizard.js — M8: Company management
import storage from '../core/storage.js';
import state from '../core/state.js';
import { validate } from '../shared/validate.js';
import { fmt } from '../shared/fmt.js';

const ENTITY_TYPES = ['LLC', 'S-Corp', 'C-Corp'];
const TAX_CLASSES = ['Partnership', 'S-Corp', 'C-Corp', 'Disregarded Entity'];

export function renderCompanyWizard(container) {
  loadCompanies().then(function(companies) {
    container.innerHTML = buildUI(companies);
    bindEvents(container);
  });
}

function loadCompanies() {
  return storage.list('companies').then(function(list) {
    return list.sort(function(a,b) { return (b.updated_at||'').localeCompare(a.updated_at||''); });
  });
}

function buildUI(companies) {
  return '<div class="page-header"><h1>Companies</h1><button class="btn btn-primary" id="btn-new-company">+ New Company</button></div>' +
    '<div id="company-list">' + (companies.length ? buildCompanyList(companies) : buildEmpty()) + '</div>' +
    '<div id="company-form-container" style="display:none;">' + buildForm(null) + '</div>';
}

function buildEmpty() {
  return '<div class="empty-state"><p>No companies yet.</p><p>Add your first company to start modeling QSBS eligibility.</p></div>';
}

function buildCompanyList(companies) {
  return '<table class="data-table"><thead><tr><th>Company Name</th><th>Entity Type</th><th>Tax Class</th><th>State</th><th>Formation Date</th><th>Actions</th></tr></thead><tbody>' +
    companies.map(function(c) {
      return '<tr data-id="' + c.id + '">' +
        '<td><strong>' + esc(c.name) + '</strong></td>' +
        '<td>' + esc(c.entity_type || '—') + '</td>' +
        '<td>' + esc(c.tax_class || '—') + '</td>' +
        '<td>' + esc(c.state || '—') + '</td>' +
        '<td>' + fmt.date(c.formation_date) + '</td>' +
        '<td><button class="btn btn-sm btn-edit" data-id="' + c.id + '">Edit</button> <button class="btn btn-sm btn-danger btn-delete" data-id="' + c.id + '">Delete</button></td>' +
        '</tr>';
    }).join('') + '</tbody></table>';
}

function buildForm(company) {
  const c = company || {};
  return '<div class="card"><div class="card-header"><h2>' + (c.id ? 'Edit Company' : 'New Company') + '</h2></div>' +
    '<form id="company-form" data-id="' + (c.id || '') + '">' +
    '<div class="form-grid">' +
    field('Company Name', 'name', c.name, 'text', true) +
    select('Entity Type', 'entity_type', ENTITY_TYPES, c.entity_type) +
    select('Federal Tax Class', 'tax_class', TAX_CLASSES, c.tax_class) +
    field('State of Formation', 'state', c.state, 'text') +
    field('Formation Date', 'formation_date', c.formation_date, 'date') +
    field('EIN (optional)', 'ein', c.ein, 'text') +
    '</div>' +
    '<div class="form-row"><label>Notes</label><textarea name="notes" rows="3">' + esc(c.notes || '') + '</textarea></div>' +
    '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Company</button> <button type="button" id="btn-cancel-form" class="btn btn-secondary">Cancel</button></div>' +
    '</form></div>';
}

function field(label, name, value, type, required) {
  return '<div class="form-field"><label>' + label + (required ? ' *' : '') + '</label>' +
    '<input type="' + (type||'text') + '" name="' + name + '" value="' + esc(value||'') + '"' + (required ? ' required' : '') + '></div>';
}

function select(label, name, options, current) {
  return '<div class="form-field"><label>' + label + '</label><select name="' + name + '">' +
    '<option value="">— Select —</option>' +
    options.map(function(o) { return '<option value="' + o + '"' + (current === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
    '</select></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindEvents(container) {
  container.querySelector('#btn-new-company').addEventListener('click', function() {
    container.querySelector('#company-form-container').innerHTML = buildForm(null);
    container.querySelector('#company-form-container').style.display = '';
    bindFormEvents(container);
  });

  container.querySelectorAll('.btn-edit').forEach(function(btn) {
    btn.addEventListener('click', function() {
      storage.load('companies', btn.dataset.id).then(function(c) {
        if (!c) return;
        container.querySelector('#company-form-container').innerHTML = buildForm(c);
        container.querySelector('#company-form-container').style.display = '';
        bindFormEvents(container);
      });
    });
  });

  container.querySelectorAll('.btn-delete').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!confirm('Delete this company?')) return;
      storage.delete('companies', btn.dataset.id).then(function() {
        state.emit('company:deleted', { id: btn.dataset.id });
        renderCompanyWizard(container);
      });
    });
  });
}

function bindFormEvents(container) {
  const form = container.querySelector('#company-form');
  if (!form) return;

  container.querySelector('#btn-cancel-form').addEventListener('click', function() {
    container.querySelector('#company-form-container').style.display = 'none';
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = [];
    if (!data.name) errors.push('Company name is required');
    if (errors.length) { alert(errors.join('\n')); return; }

    const id = form.dataset.id || crypto.randomUUID();
    const record = Object.assign({ id: id }, data);
    storage.save('companies', record).then(function() {
      state.emit('company:saved', record);
      container.querySelector('#company-form-container').style.display = 'none';
      renderCompanyWizard(container);
    });
  });
}
