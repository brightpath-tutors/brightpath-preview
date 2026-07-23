// js/modules/dashboard-qsbs.js — ED2: QSBS Readiness Dashboard
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';
import { evaluateQSBS } from '../engines/rules-engine.js';

export function renderQSBSDashboard(container) {
  storage.list('scenarios').then(function(scenarios) {
    const active = scenarios.filter(function(s){return !s.is_archived;})
      .sort(function(a,b){return (b.updated_at||'').localeCompare(a.updated_at||'');})[0];
    if (!active) {
      container.innerHTML = '<div class="empty-state"><p>No active scenarios. <a href="#/scenarios">Create a scenario</a> to see QSBS readiness.</p></div>';
      return;
    }
    let qsbs;
    try { qsbs = evaluateQSBS(active); } catch(e) { qsbs = { status: 'fail', individual_tests: {} }; }
    container.innerHTML = buildQSBSReadiness(active, qsbs);
  });
}

function buildQSBSReadiness(scenario, qsbs) {
  const tests = qsbs.individual_tests || {};
  const statusClass = {
    'likely_qualifies_under_stated_assumptions': 'tag-green',
    'potentially_qualifies': 'tag-green',
    'uncertain_professional_review_required': 'tag-amber',
    'likely_does_not_qualify': 'tag-red',
    'does_not_qualify_under_stated_assumptions': 'tag-red',
    'insufficient_information': 'tag-amber'
  }[qsbs.status] || 'tag-amber';

  let html = '<div class="page-header"><h2>QSBS Readiness — ' + esc(scenario.name||'Scenario') + '</h2>' +
    '<span class="tag ' + statusClass + ' tag-lg">' + esc((qsbs.status||'').replace(/_/g,' ').toUpperCase()) + '</span></div>';

  html += '<div class="test-grid">';
  Object.entries(tests).forEach(function(entry) {
    const name = entry[0], t = entry[1];
    const cls = t.pass === true ? 'test-panel-pass' : t.pass === false ? 'test-panel-fail' : 'test-panel-uncertain';
    const icon = t.pass === true ? '✅' : t.pass === false ? '❌' : '⚠️';
    html += '<div class="test-panel ' + cls + '">' +
      '<div class="test-name">' + icon + ' ' + esc(name.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();})) + '</div>' +
      '<div class="test-note">' + esc(t.note||'') + '</div>' +
      '<div class="test-confidence">Confidence: ' + esc(String(t.confidence||'—')) + '</div>' +
      '</div>';
  });
  html += '</div>';

  if (qsbs.professional_review_questions && qsbs.professional_review_questions.length) {
    html += '<div class="card" style="margin-top:24px;"><h3>Questions for Your Attorney</h3><ol>' +
      qsbs.professional_review_questions.map(function(q){ return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>';
  }

  if (qsbs.explanation) {
    html += '<div class="card" style="margin-top:24px;"><h3>Analysis Summary</h3><p>' + esc(qsbs.explanation.data ? qsbs.explanation.data.plain_language : qsbs.explanation.summary || '') + '</p></div>';
  }

  return html;
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
