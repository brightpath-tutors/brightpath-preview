// js/modules/dashboard-founder.js — ED1: Founder Overview Dashboard
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';
import { evaluateQSBS } from '../engines/rules-engine.js';
import { calcStockSaleTax } from '../engines/calc-engine.js';

const DISCLAIMER = 'Illustrative only. Not a legal guarantee. Professional review required.';

export function renderFounderDashboard(container) {
  const t0 = Date.now();
  Promise.all([
    storage.list('companies'),
    storage.list('scenarios'),
    storage.list('evidence_checklist')
  ]).then(function(results) {
    const companies = results[0], scenarios = results[1];
    const activeScenario = scenarios.filter(function(s){return !s.is_archived;}).sort(function(a,b){return (b.updated_at||'').localeCompare(a.updated_at||'');})[0];
    const activeCompany = companies[0] || null;

    let qsbs = null, calc = null;
    if (activeScenario) {
      try { qsbs = evaluateQSBS(activeScenario); } catch(e) {}
      try { calc = calcStockSaleTax(activeScenario); } catch(e) {}
    }

    container.innerHTML = buildFounderOverview(activeCompany, activeScenario, scenarios, qsbs, calc);
    const elapsed = Date.now() - t0;
    if (elapsed > 500) console.warn('ED1 render took ' + elapsed + 'ms');
  });
}

function buildFounderOverview(company, scenario, allScenarios, qsbs, calc) {
  const s = scenario || {};
  const c = company || {};
  const d = (calc && calc.data) || {};
  const re2 = qsbs && qsbs.re2;
  const re3 = qsbs && qsbs.re3;

  return '<div class="dashboard-grid">' +
    // Panel 1: Entity Status
    panel('Entity Status', '🏢',
      c.name ? [
        '<strong>' + esc(c.name) + '</strong>',
        'Entity: ' + esc(c.entity_type || '—'),
        'Tax Class: ' + esc(c.tax_class || '—'),
        'State: ' + esc(c.state || '—'),
        c.formation_date ? 'Formed: ' + fmt.date(c.formation_date) : ''
      ].filter(Boolean).join('<br>') : '<a href="#/company" class="btn btn-primary">Create Company</a>') +

    // Panel 2: Valuation (placeholder)
    panel('Valuation', '💰',
      s.gross_proceeds ? fmt.millions(s.gross_proceeds) + ' modeled exit<br><small>No formal valuation on record.</small>' : '<p>No exit value entered. <a href="#/scenarios">Add in scenario.</a></p>') +

    // Panel 3: AGA Gauge
    panel('AGA vs Threshold', '⚡',
      buildAGAGauge(re3, s)) +

    // Panel 4: Holding Period
    panel('Holding Period', '⏱',
      buildHoldingPanel(re2, s)) +

    // Panel 5: QSBS Benefit
    panel('Estimated QSBS Benefit', '💡',
      buildBenefitPanel(d) + '<p class="disclaimer-sm">' + DISCLAIMER + '</p>') +

    // Panel 6: Risk Ticker
    panel('Top Risks', '⚠️',
      buildRiskTicker(qsbs)) +

    // Panel 7: Scenario Count
    panel('Scenarios', '📋',
      allScenarios.length + ' scenario' + (allScenarios.length !== 1 ? 's' : '') + '<br>' +
      allScenarios.filter(function(s){return !s.is_archived;}).length + ' active<br>' +
      '<a href="#/scenarios" class="btn btn-sm btn-secondary" style="margin-top:8px;">View All →</a>') +

    // Panel 8: Next Step
    panel('Next Step', '🎯',
      s.acquisition_date ? 'Run QSBS Wizard for a full analysis.' : '<a href="#/wizard" class="btn btn-primary btn-sm">Start QSBS Wizard →</a>') +

    '</div>';
}

function buildAGAGauge(re3, s) {
  if (!re3 || !re3.data) {
    const aga = s.gross_assets_after || 0;
    const threshold = 75000000;
    const pct = Math.min(100, (aga / threshold) * 100);
    const cls = pct < 50 ? 'gauge-safe' : pct < 80 ? 'gauge-watch' : pct < 95 ? 'gauge-warning' : 'gauge-critical';
    return '<div class="gauge-bar-wrap"><div class="gauge-bar ' + cls + '" style="width:' + pct.toFixed(0) + '%"></div></div>' +
      fmt.currency(aga) + ' / ' + fmt.currency(threshold) + '<br>' +
      (aga >= threshold ? '<span class="tag tag-red">EXCEEDS THRESHOLD</span>' : '<span class="tag tag-green">Within Threshold</span>');
  }
  const data = re3.data;
  const pct = Math.min(100, (data.total_aga / data.threshold) * 100);
  const cls = data.alert_level === 'safe' ? 'gauge-safe' : data.alert_level === 'watch' ? 'gauge-watch' : data.alert_level === 'warning' ? 'gauge-warning' : 'gauge-critical';
  return '<div class="gauge-bar-wrap"><div class="gauge-bar ' + cls + '" style="width:' + pct.toFixed(0) + '%"></div></div>' +
    fmt.currency(data.total_aga) + ' of ' + fmt.currency(data.threshold) + ' threshold<br>' +
    'Headroom: ' + fmt.currency(data.headroom) + '<br>' +
    '<span class="tag tag-' + (data.exceeds?'red':'green') + '">' + (data.exceeds?'EXCEEDS':'Within') + '</span>';
}

function buildHoldingPanel(re2, s) {
  if (!s.acquisition_date) return '<p>Set acquisition date in scenario.</p>';
  const holdYears = re2 && re2.data ? re2.data.holding_years : null;
  const exclPct = re2 && re2.data ? re2.data.exclusion_pct : 0;
  const milestones = re2 && re2.data ? re2.data.milestones : [];
  let html = holdYears != null ? '<strong>' + holdYears.toFixed(1) + ' years held</strong><br>' : '';
  html += exclPct > 0 ? '<span class="tag tag-green">' + fmt.pct(exclPct) + ' exclusion available</span>' : '<span class="tag tag-amber">Minimum hold not yet reached</span>';
  const next = milestones && milestones.filter(function(m){return !m.reached;})[0];
  if (next) html += '<br><small>Next: ' + fmt.pct(next.pct) + ' at ' + fmt.date(next.date) + '</small>';
  return html;
}

function buildBenefitPanel(d) {
  if (!d.qsbs_savings) return '<p>Enter scenario data to model QSBS benefit.</p>';
  return '<div class="benefit-highlight">Est. Tax Savings<br><span class="big-number">' + fmt.millions(d.qsbs_savings) + '</span></div>' +
    '<small>Baseline tax: ' + fmt.currency(d.baseline_tax) + '<br>With QSBS: ' + fmt.currency(d.total_tax) + '</small>';
}

function buildRiskTicker(qsbs) {
  if (!qsbs || !qsbs.risk_factors || !qsbs.risk_factors.length) return '<p class="text-green">No risks identified with current inputs.</p>';
  const top3 = qsbs.risk_factors.slice(0, 3);
  return '<ul class="risk-list">' + top3.map(function(r){ return '<li><span class="tag tag-amber">Risk</span> ' + esc(r.slice(0,80)) + (r.length>80?'…':'') + '</li>'; }).join('') + '</ul>';
}

function panel(title, icon, content) {
  return '<div class="dashboard-panel"><div class="panel-header">' + icon + ' ' + title + '</div><div class="panel-body">' + content + '</div></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
