// js/modules/decision-journal.js — DJ1: Decision journal
import storage from '../core/storage.js';
import state from '../core/state.js';
import { fmt } from '../shared/fmt.js';

const ENTRY_TYPES = ['creation_rationale','assumption_log','professional_advice','question_to_revisit','action_item','timeline_note','decision_made'];
const TYPE_LABELS = { creation_rationale:'Creation Rationale', assumption_log:'Assumption Log', professional_advice:'Professional Advice', question_to_revisit:'Question to Revisit', action_item:'Action Item', timeline_note:'Timeline Note', decision_made:'Decision Made' };
const TYPE_ICONS = { professional_advice:'&#x2696;&#xFE0F;', action_item:'&#x2705;', question_to_revisit:'&#x2753;', decision_made:'&#x2714;&#xFE0F;', assumption_log:'&#x1F4DD;', timeline_note:'&#x1F4C5;', creation_rationale:'&#x1F3C1;' };

export function renderDecisionJournal(container, scenarioId) {
  storage.list('decision_journal', scenarioId ? { scenario_id: scenarioId } : {}).then(function(entries) {
    entries.sort(function(a,b){ return (b.created_at||'').localeCompare(a.created_at||''); });
    container.innerHTML = buildUI(entries, scenarioId);
    bindEvents(container, scenarioId, entries);
  });
}

function buildUI(entries, scenarioId) {
  const openActions = entries.filter(function(e){ return e.entry_type==='action_item' && e.action_status==='open'; }).length;
  return '<div class="page-header"><h1>Decision Journal' + (openActions ? ' <span class="badge badge-amber">' + openActions + ' open</span>' : '') + '</h1>' +
    '<button class="btn btn-primary" id="btn-new-entry">+ New Entry</button></div>' +
    '<div id="journal-form-container" style="display:none;"></div>' +
    '<div id="journal-list">' + (entries.length ? buildEntryList(entries) : '<div class="empty-state"><p>No journal entries. Document your planning decisions here.</p></div>') + '</div>';
}

function buildEntryList(entries) {
  return entries.map(function(e) {
    const overdue = e.entry_type==='action_item' && e.action_due_date && new Date(e.action_due_date) < new Date() && e.action_status !== 'completed';
    const cls = e.is_privileged ? 'journal-entry privileged' : (overdue ? 'journal-entry overdue' : 'journal-entry');
    return '<div class="' + cls + '" data-id="' + e.id + '">' +
      '<div class="entry-header">' +
      (e.is_privileged ? '<span class="lock-icon" title="Potentially privileged">&#x1F512;</span> ' : '') +
      '<span class="entry-icon">' + (TYPE_ICONS[e.entry_type]||'&#x1F4CB;') + '</span> ' +
      '<strong>' + esc(e.title||'Untitled') + '</strong>' +
      '<span class="tag tag-blue" style="margin-left:8px;">' + esc(TYPE_LABELS[e.entry_type]||e.entry_type) + '</span>' +
      (overdue ? '<span class="tag tag-red">OVERDUE</span>' : '') +
      '<span class="entry-date">' + fmt.date(e.created_at) + '</span></div>' +
      (e.is_privileged ? '<div class="alert alert-warn" style="margin:8px 0;font-size:12px;">Potentially privileged — consult attorney before sharing.</div>' : '') +
      '<div class="entry-body">' + esc(e.body||'') + '</div>' +
      (e.action_due_date ? '<div class="entry-due">Due: ' + fmt.date(e.action_due_date) + ' — ' + esc(e.action_status||'open') + '</div>' : '') +
      '</div>';
  }).join('');
}

function buildEntryForm(scenarioId) {
  return '<div class="card"><h3>New Journal Entry</h3><form id="entry-form">' +
    '<div class="form-grid">' +
    '<div class="form-field"><label>Entry Type *</label><select name="entry_type">' +
    ENTRY_TYPES.map(function(t){ return '<option value="'+t+'">'+(TYPE_LABELS[t]||t)+'</option>'; }).join('') +
    '</select></div>' +
    '<div class="form-field"><label>Title *</label><input type="text" name="title" required></div>' +
    '<div class="form-field"><label>Date</label><input type="date" name="date"></div>' +
    '<div class="form-field"><label>Attorney-Client Privileged?</label><select name="is_privileged"><option value="false">No</option><option value="true">Yes — potentially privileged</option></select></div>' +
    '</div>' +
    '<div class="form-field"><label>Body *</label><textarea name="body" rows="5" required></textarea></div>' +
    '<div class="form-row action-item-fields" style="display:none;">' +
    '<div class="form-grid">' +
    '<div class="form-field"><label>Due Date</label><input type="date" name="action_due_date"></div>' +
    '<div class="form-field"><label>Status</label><select name="action_status"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="deferred">Deferred</option></select></div>' +
    '</div></div>' +
    '<input type="hidden" name="scenario_id" value="' + esc(scenarioId||'') + '">' +
    '<div class="form-actions"><button type="submit" class="btn btn-primary">Save Entry</button> <button type="button" id="btn-cancel-entry" class="btn btn-secondary">Cancel</button></div>' +
    '</form></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindEvents(container, scenarioId, entries) {
  container.querySelector('#btn-new-entry').addEventListener('click', function() {
    const fc = container.querySelector('#journal-form-container');
    fc.innerHTML = buildEntryForm(scenarioId);
    fc.style.display = '';
    const form = fc.querySelector('#entry-form');
    form.querySelector('select[name="entry_type"]').addEventListener('change', function() {
      form.querySelector('.action-item-fields').style.display = this.value === 'action_item' ? '' : 'none';
    });
    fc.querySelector('#btn-cancel-entry').addEventListener('click', function() { fc.style.display = 'none'; });
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.id = crypto.randomUUID();
      data.is_privileged = data.is_privileged === 'true';
      data.add_to_review_packet = !data.is_privileged;
      storage.save('decision_journal', data).then(function() {
        state.emit('journal:saved', data);
        fc.style.display = 'none';
        renderDecisionJournal(container, scenarioId);
      });
    });
  });
}
