// js/modules/evidence.js — M15: Evidence & Timeline tracker
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';

const CHECKLIST_ITEMS = [
  { id: 'stock_cert', label: 'Stock Certificate or Cap Table Entry', critical: true },
  { id: 'board_res', label: 'Board Resolution Authorizing Issuance', critical: true },
  { id: 'purchase_agmt', label: 'Stock Purchase Agreement or Subscription Agreement', critical: true },
  { id: '83b_election', label: '§83(b) Election (if applicable)', critical: false },
  { id: 'aga_schedule', label: 'Asset Schedule with Tax Bases at Issuance', critical: true },
  { id: 'entity_docs', label: 'Articles of Incorporation / Certificate of Formation', critical: true },
  { id: 'conversion_docs', label: 'Conversion Documents (if converted entity)', critical: false },
  { id: 'revenue_records', label: 'Revenue Records Showing Business Activity', critical: false },
  { id: 'attorney_memo', label: 'Attorney Memo on §1202 Qualification', critical: false }
];

export function renderEvidence(container, scenarioId) {
  const key = 'evidence_' + (scenarioId || 'global');
  const saved = JSON.parse(localStorage.getItem(key) || '{}');

  container.innerHTML = '<div class="page-header"><h1>Evidence &amp; Documentation Checklist</h1></div>' +
    '<div class="card">' +
    '<p>Maintain these documents to support §1202 qualification. Check each item as it is obtained.</p>' +
    '<table class="data-table"><thead><tr><th>Document</th><th>Critical?</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
    CHECKLIST_ITEMS.map(function(item) {
      const done = saved[item.id] && saved[item.id].done;
      const notes = (saved[item.id] && saved[item.id].notes) || '';
      return '<tr>' +
        '<td>' + item.label + '</td>' +
        '<td>' + (item.critical ? '<span class="tag tag-red">Critical</span>' : '<span class="tag tag-amber">Recommended</span>') + '</td>' +
        '<td><label><input type="checkbox" class="evidence-check" data-id="' + item.id + '" ' + (done ? 'checked' : '') + '> ' + (done ? '&#10003; Complete' : 'Pending') + '</label></td>' +
        '<td><input type="text" class="evidence-note" data-id="' + item.id + '" value="' + esc(notes) + '" placeholder="Notes..." style="width:100%"></td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';

  const total = CHECKLIST_ITEMS.length;
  const done = Object.values(saved).filter(function(v){ return v.done; }).length;
  container.querySelector('.card').insertAdjacentHTML('afterbegin', '<div class="progress-bar-container"><div class="progress-bar" style="width:' + Math.round(done/total*100) + '%"></div></div><p>' + done + ' of ' + total + ' documents complete.</p>');

  container.querySelectorAll('.evidence-check,.evidence-note').forEach(function(el) {
    el.addEventListener('change', function() {
      const allChecks = {};
      container.querySelectorAll('.evidence-check').forEach(function(cb) {
        const note = container.querySelector('.evidence-note[data-id="' + cb.dataset.id + '"]');
        allChecks[cb.dataset.id] = { done: cb.checked, notes: note ? note.value : '' };
      });
      container.querySelectorAll('.evidence-note').forEach(function(inp) {
        if (!allChecks[inp.dataset.id]) allChecks[inp.dataset.id] = {};
        allChecks[inp.dataset.id].notes = inp.value;
      });
      localStorage.setItem(key, JSON.stringify(allChecks));
    });
  });
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
