// js/modules/dashboard.js — M7: Dashboard tab container
import storage from '../core/storage.js';
import state from '../core/state.js';
import { renderFounderDashboard } from './dashboard-founder.js';
import { renderQSBSDashboard } from './dashboard-qsbs.js';
import { renderPortfolioDashboard } from './dashboard-portfolio.js';

let _activeTab = 'ed1';

export function renderDashboard(container) {
  storage.list('companies').then(function(companies) {
    if (!companies.length) {
      container.innerHTML = '<div class="page-header"><h1>Dashboard</h1></div>' +
        '<div class="card empty-state">' +
        '<h2>Welcome to BrightPath QSBS Lab</h2>' +
        '<p>Start by creating a company, then add scenarios to model your § 1202 QSBS analysis.</p>' +
        '<a class="btn btn-primary" href="#/company">Create Your First Company →</a>' +
        '</div>';
      return;
    }
    container.innerHTML = buildDashboardShell();
    bindTabEvents(container);
    showTab(container, _activeTab);
  });
}

function buildDashboardShell() {
  return '<div class="page-header"><h1>Dashboard</h1></div>' +
    '<div class="dashboard-tabs">' +
    '<button class="tab-btn' + (_activeTab==='ed1'?' active':'') + '" data-tab="ed1">📊 Founder Overview</button>' +
    '<button class="tab-btn' + (_activeTab==='ed2'?' active':'') + '" data-tab="ed2">🔍 QSBS Readiness</button>' +
    '<button class="tab-btn' + (_activeTab==='ed3'?' active':'') + '" data-tab="ed3">📈 Portfolio</button>' +
    '</div>' +
    '<div id="tab-content"></div>';
}

function bindTabEvents(container) {
  container.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _activeTab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab===_activeTab); });
      showTab(container, _activeTab);
    });
  });
}

function showTab(container, tab) {
  const content = container.querySelector('#tab-content');
  if (!content) return;
  content.innerHTML = '<div class="loading">Loading...</div>';
  setTimeout(function() {
    if (tab === 'ed1') renderFounderDashboard(content);
    else if (tab === 'ed2') renderQSBSDashboard(content);
    else if (tab === 'ed3') renderPortfolioDashboard(content);
  }, 10);
}
