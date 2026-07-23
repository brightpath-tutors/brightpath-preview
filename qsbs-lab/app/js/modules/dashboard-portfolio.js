// js/modules/dashboard-portfolio.js — ED3: Portfolio Dashboard
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';

export function renderPortfolioDashboard(container) {
  Promise.all([storage.list('scenarios'), storage.list('companies')]).then(function(results) {
    const scenarios = results[0], companies = results[1];
    container.innerHTML = buildPortfolio(scenarios, companies);
  });
}

function buildPortfolio(scenarios, companies) {
  const active = scenarios.filter(function(s){return !s.is_archived;});
  const byStatus = {};
  active.forEach(function(s) {
    const st = s.qsbs_status || 'insufficient_information';
    byStatus[st] = (byStatus[st]||0) + 1;
  });

  const totalBenefit = active.reduce(function(sum,s){ return sum+(s.estimated_benefit||0); }, 0);
  const unresolved = active.filter(function(s){ return s.qsbs_status === 'uncertain_professional_review_required' || s.qsbs_status === 'insufficient_information'; }).length;

  return '<div class="page-header"><h1>Portfolio Overview</h1></div>' +
    '<div class="portfolio-stats">' +
    statCard('Companies', companies.length, '') +
    statCard('Active Scenarios', active.length, '') +
    statCard('Est. Total Benefit', fmt.millions(totalBenefit), 'disclaimer') +
    statCard('Need Review', unresolved, 'amber') +
    '</div>' +
    '<div class="card" style="margin-top:24px;"><h3>Status Breakdown</h3>' +
    '<table class="data-table"><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>' +
    Object.entries(byStatus).map(function(entry){ return '<tr><td>' + entry[0].replace(/_/g,' ') + '</td><td>' + entry[1] + '</td></tr>'; }).join('') +
    '</tbody></table></div>' +
    '<div class="card" style="margin-top:24px;"><h3>All Scenarios</h3>' +
    '<table class="data-table"><thead><tr><th>Scenario</th><th>Status</th><th>Modified</th></tr></thead><tbody>' +
    active.map(function(s) {
      const cls = s.qsbs_status && s.qsbs_status.includes('qualifies') ? 'tag-green' : s.qsbs_status && s.qsbs_status.includes('not') ? 'tag-red' : 'tag-amber';
      return '<tr><td><a href="#/scenarios">' + esc(s.name||'Untitled') + '</a></td>' +
        '<td><span class="tag ' + cls + '">' + esc((s.qsbs_status||'incomplete').replace(/_/g,' ')) + '</span></td>' +
        '<td>' + fmt.date(s.updated_at) + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="disclaimer" style="margin-top:16px;">Estimated benefit figures are illustrative planning estimates only. Not legal or tax advice.</p>';
}

function statCard(label, value, type) {
  return '<div class="stat-card' + (type ? ' stat-' + type : '') + '"><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
