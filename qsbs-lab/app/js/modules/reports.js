// js/modules/reports.js — M16: Professional review packet
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';
import { evaluateQSBS } from '../engines/rules-engine.js';
import { calcStockSaleTax, calcExclusionLimit } from '../engines/calc-engine.js';

const DISCLAIMER_FULL = 'DRAFT — FOR PROFESSIONAL REVIEW ONLY. This document is prepared for discussion with a qualified tax attorney and does not constitute legal or tax advice. Qualification for exclusion under 26 U.S.C. § 1202 is highly fact-specific and requires professional analysis. All figures are modeled estimates based on user-provided inputs. Verify all assumptions with qualified counsel before relying on this analysis.';

export function renderReports(container, scenarioId) {
  if (!scenarioId) {
    container.innerHTML = '<div class="page-header"><h1>Professional Review Packet</h1></div>' +
      '<div class="card"><p>Select a scenario from the <a href="#/scenarios">Scenarios</a> page to generate a review packet.</p></div>';
    return;
  }
  Promise.all([
    storage.load('scenarios', scenarioId),
    storage.list('stock_issuances', { scenario_id: scenarioId }),
    storage.list('decision_journal', { scenario_id: scenarioId })
  ]).then(function(results) {
    const scenario = results[0], issuances = results[1], journal = results[2];
    if (!scenario) { container.innerHTML = '<p>Scenario not found.</p>'; return; }
    let qsbsResult, calcResult, limitResult;
    try { qsbsResult = evaluateQSBS(scenario); } catch(e) { qsbsResult = {}; }
    try { calcResult = calcStockSaleTax(scenario); } catch(e) { calcResult = null; }
    try { limitResult = calcExclusionLimit(scenario); } catch(e) { limitResult = null; }
    container.innerHTML = buildPacket(scenario, issuances, journal, qsbsResult, calcResult, limitResult);
    bindReportEvents(container, scenario);
  });
}

function buildPacket(scenario, issuances, journal, qsbs, calc, limit) {
  const publicJournal = journal.filter(function(e){ return !e.is_privileged && e.add_to_review_packet; });
  const privilegedCount = journal.filter(function(e){ return e.is_privileged; }).length;
  const d = (calc && calc.data) || {};
  const ld = (limit && limit.data) || {};

  return '<div class="report-controls">' +
    '<button class="btn btn-primary" id="btn-print-report">&#x1F5A8; Print / Save PDF</button> ' +
    '<button class="btn btn-secondary" id="btn-export-json">Export JSON</button></div>' +
    '<div class="review-packet">' +
    section(1, 'Cover Page',
      '<div class="draft-label">DRAFT — FOR PROFESSIONAL REVIEW ONLY</div>' +
      '<h1>' + esc(scenario.name||'QSBS Analysis') + '</h1>' +
      '<p>Prepared: ' + fmt.date(new Date().toISOString()) + '</p>' +
      '<p class="disclaimer">' + DISCLAIMER_FULL + '</p>') +
    section(2, 'Scenario Summary',
      '<table class="data-table"><tbody>' +
      row2('Scenario Name', scenario.name) +
      row2('Law Version', scenario.law_version === 'post_july4_2025' ? 'Post-July 4, 2025 (One Big Beautiful Bill Act)' : 'Pre-July 5, 2025 (Historical)') +
      row2('Acquisition Date', fmt.date(scenario.acquisition_date)) +
      row2('Stock Basis', fmt.currency(scenario.stock_basis)) +
      row2('§1202 Basis', fmt.currency(scenario.sec1202_basis)) +
      row2('Gross Assets at Issuance', fmt.currency(scenario.gross_assets_after)) +
      row2('Gross Proceeds', fmt.currency(scenario.gross_proceeds)) +
      row2('Years Held', fmt.years(scenario.exit_year)) +
      '</tbody></table>') +
    section(3, 'QSBS Qualification Matrix',
      buildQMatrix(qsbs)) +
    section(4, 'Modeled Exclusion Calculation',
      '<p class="disclaimer">Illustrative only. Requires professional review.</p>' +
      buildCalcTrace(d, ld, scenario)) +
    section(5, 'Unresolved Questions',
      (qsbs.risk_factors && qsbs.risk_factors.length ? '<ul>' + qsbs.risk_factors.map(function(r){return '<li>'+esc(r)+'</li>';}).join('') + '</ul>' : '<p>No unresolved risks identified with current inputs.</p>')) +
    section(6, 'Questions for Counsel',
      (qsbs.professional_review_questions && qsbs.professional_review_questions.length ? '<ol>' + qsbs.professional_review_questions.map(function(q){return '<li>'+esc(q)+'</li>';}).join('') + '</ol>' : '<p>No questions generated.</p>')) +
    section(7, 'Decision Journal',
      (publicJournal.length ? publicJournal.map(function(e){return '<div class="journal-entry-report"><strong>'+esc(e.title)+'</strong> — '+esc(e.entry_type)+'<br>'+esc(e.body)+'</div>';}).join('') : '<p>No journal entries flagged for inclusion.</p>') +
      (privilegedCount > 0 ? '<p><em>[' + privilegedCount + ' entr' + (privilegedCount===1?'y':'ies') + ' withheld — potentially attorney-client privileged]</em></p>' : '')) +
    section(8, 'Source Register',
      buildSourceRegister(qsbs)) +
    section(9, 'Disclaimer',
      '<p class="disclaimer">' + DISCLAIMER_FULL + '</p>') +
    '</div>';
}

function section(n, title, content) {
  return '<div class="report-section"><h2>' + n + '. ' + title + '</h2>' + content + '</div>';
}
function row2(label, value) { return '<tr><th style="width:200px;">' + label + '</th><td>' + esc(String(value||'—')) + '</td></tr>'; }

function buildQMatrix(qsbs) {
  if (!qsbs.individual_tests) return '<p>No test results available.</p>';
  return '<table class="data-table"><thead><tr><th>Test</th><th>Result</th><th>Confidence</th><th>Notes</th></tr></thead><tbody>' +
    Object.entries(qsbs.individual_tests).map(function(entry) {
      const name = entry[0], t = entry[1];
      const icon = t.pass === true ? '&#x2713;' : t.pass === false ? '&#x2717;' : '?';
      const cls = t.pass === true ? 'text-green' : t.pass === false ? 'text-red' : 'text-amber';
      return '<tr><td>' + esc(name.replace(/_/g,' ')) + '</td><td class="' + cls + '">' + icon + '</td><td>' + esc(String(t.confidence||'—')) + '</td><td>' + esc(t.note||'') + '</td></tr>';
    }).join('') + '</tbody></table>';
}

function buildCalcTrace(d, ld, scenario) {
  if (!d.total_gain) return '<p>No calculation available. Enter gross proceeds in scenario.</p>';
  return '<table class="data-table"><tbody>' +
    row2('Amount Realized', fmt.currency(d.amount_realized)) +
    row2('Total Gain', fmt.currency(d.total_gain)) +
    row2('Eligible Gain (' + (scenario.qualifying_pct||100) + '%)', fmt.currency(d.eligible_gain)) +
    row2('Ten-Times Basis Ceiling', fmt.currency(ld.ten_times_basis)) +
    row2('Fixed-Dollar Remaining', fmt.currency(ld.fixed_dollar_remaining)) +
    row2('Applicable Limit (greater of above)', fmt.currency(ld.applicable_limit)) +
    row2('Exclusion %', fmt.pct(d.exclusion_pct||0)) +
    row2('Excluded Gain', fmt.currency(d.excluded_gain)) +
    row2('Taxable Gain', fmt.currency(d.taxable_gain)) +
    row2('Total Tax', fmt.currency(d.total_tax)) +
    row2('After-Tax Proceeds', fmt.currency(d.after_tax_proceeds)) +
    row2('QSBS Savings', fmt.currency(d.qsbs_savings)) +
    '</tbody></table>';
}

function buildSourceRegister(qsbs) {
  const sources = [];
  const seen = {};
  if (qsbs.source_citations) qsbs.source_citations.forEach(function(c) { if (!seen[c.rule]) { seen[c.rule]=true; sources.push(c); } });
  if (!sources.length) return '<p>No sources recorded.</p>';
  return '<table class="data-table"><thead><tr><th>Citation</th><th>Proposition</th></tr></thead><tbody>' +
    sources.map(function(c){ return '<tr><td>' + esc(c.rule) + '</td><td>' + esc(c.text||'') + '</td></tr>'; }).join('') + '</tbody></table>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindReportEvents(container, scenario) {
  const btnPrint = container.querySelector('#btn-print-report');
  if (btnPrint) btnPrint.addEventListener('click', function() { window.print(); });
  const btnJson = container.querySelector('#btn-export-json');
  if (btnJson) btnJson.addEventListener('click', function() {
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'qsbs-review-packet.json'; a.click(); URL.revokeObjectURL(url);
  });
}
