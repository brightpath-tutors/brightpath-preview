// js/app.js — BrightPath QSBS Lab main entry
import router from './core/router.js';
import state from './core/state.js';
import storage from './core/storage.js';

import { renderDashboard } from './modules/dashboard.js';
import { renderCompanyWizard } from './modules/company-wizard.js';
import { renderScenarioManager } from './modules/scenario-manager.js';
import { renderQSBSWizard } from './modules/qsbs-wizard.js';
import { renderStockIssuance } from './modules/stock-issuance.js';
import { renderExitCalculator } from './modules/exit-calculator.js';
import { renderEvidence } from './modules/evidence.js';
import { renderDecisionJournal } from './modules/decision-journal.js';
import { renderReports } from './modules/reports.js';
import { renderSettings } from './modules/settings.js';
import { renderValuationTracker } from './modules/valuation-tracker.js';
import { renderEntityCompare } from './modules/entity-compare.js';
import { renderIntelligence } from './modules/bi1-intelligence.js';

const NAV_ITEMS = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/company', icon: '🏢', label: 'Companies' },
  { path: '/scenarios', icon: '📋', label: 'Scenarios' },
  { path: '/wizard', icon: '🔍', label: 'QSBS Wizard' },
  { path: '/issuance', icon: '📄', label: 'Stock Issuance' },
  { path: '/valuation', icon: '💰', label: 'Valuation' },
  { path: '/calculator', icon: '🧮', label: 'Exit Calculator' },
  { path: '/compare', icon: '⚖️', label: 'Entity Compare' },
  { path: '/evidence', icon: '✅', label: 'Evidence' },
  { path: '/journal', icon: '📓', label: 'Decision Journal' },
  { path: '/intelligence', icon: '💡', label: 'Intelligence' },
  { path: '/reports', icon: '📑', label: 'Reports' },
  { path: '/settings', icon: '⚙️', label: 'Settings' }
];

function buildSidebar(activePath) {
  const nav = document.getElementById('sidebar');
  if (!nav) return;
  nav.innerHTML =
    '<div class="sidebar-logo">' +
    '<div class="logo-title">BrightPath QSBS Lab</div>' +
    '<div class="logo-sub">§ 1202 Planning Tool</div>' +
    '</div>' +
    '<div class="sidebar-nav">' +
    '<div class="nav-section-label">Navigation</div>' +
    NAV_ITEMS.map(function(item) {
      return '<a class="nav-item' + (activePath === item.path ? ' active' : '') + '" href="#' + item.path + '">' +
        '<span class="nav-icon">' + item.icon + '</span>' +
        '<span>' + item.label + '</span>' +
        '</a>';
    }).join('') +
    '</div>' +
    '<div class="sidebar-footer">' +
    'For planning only.<br>Not legal or tax advice.<br>' +
    '<a href="#" style="color:rgba(255,255,255,0.5);font-size:11px;">§ 1202 Law Reference</a>' +
    '</div>';
}

function renderRoute(route) {
  const main = document.getElementById('main-content');
  if (!main) return;

  // Remove loading indicator
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.remove();

  // Clear and rebuild main area
  main.innerHTML = '';

  // Update active nav
  buildSidebar(route.path);

  // Scroll to top
  main.scrollTop = 0;
  window.scrollTo(0, 0);

  // Route to module
  switch (route.path) {
    case '/':
      renderDashboard(main);
      break;
    case '/company':
      renderCompanyWizard(main);
      break;
    case '/scenarios':
      renderScenarioManager(main);
      break;
    case '/wizard':
      renderQSBSWizard(main);
      break;
    case '/issuance':
      renderStockIssuance(main, route.params[0] || null);
      break;
    case '/calculator':
      renderExitCalculator(main);
      break;
    case '/evidence':
      renderEvidence(main, route.params[0] || null);
      break;
    case '/journal':
      renderDecisionJournal(main, route.params[0] || null);
      break;
    case '/reports':
      renderReports(main, route.params[0] || null);
      break;
    case '/valuation':
      renderValuationTracker(main, route.params[0] || null);
      break;
    case '/compare':
      renderEntityCompare(main);
      break;
    case '/intelligence':
      renderIntelligence(main);
      break;
    case '/settings':
      renderSettings(main);
      break;
    default:
      main.innerHTML = '<div class="page-header"><h1>Page Not Found</h1></div>' +
        '<div class="card empty-state"><p>No route matches <code>' + route.hash + '</code>.</p>' +
        '<a class="btn btn-primary" href="#/">Go to Dashboard</a></div>';
  }

  // Update document title
  const item = NAV_ITEMS.find(function(i){ return i.path === route.path; });
  document.title = (item ? item.label + ' — ' : '') + 'BrightPath QSBS Lab';
}

// ─── Init ─────────────────────────────────────────────────────────────────

async function init() {
  // Apply saved theme
  const savedTheme = localStorage.getItem('qsbs-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  // Init IndexedDB
  try {
    await storage.init();
  } catch (e) {
    console.warn('Storage init failed, using in-memory fallback:', e.message);
  }

  // Build initial sidebar
  buildSidebar('/');

  // Register routes
  router.on('/', function(r) { renderRoute(r); });
  router.on('/company', function(r) { renderRoute(r); });
  router.on('/scenarios', function(r) { renderRoute(r); });
  router.on('/wizard', function(r) { renderRoute(r); });
  router.on('/issuance', function(r) { renderRoute(r); });
  router.on('/calculator', function(r) { renderRoute(r); });
  router.on('/evidence', function(r) { renderRoute(r); });
  router.on('/journal', function(r) { renderRoute(r); });
  router.on('/valuation', function(r) { renderRoute(r); });
  router.on('/compare', function(r) { renderRoute(r); });
  router.on('/intelligence', function(r) { renderRoute(r); });
  router.on('/reports', function(r) { renderRoute(r); });
  router.on('/settings', function(r) { renderRoute(r); });
  router.on('*', function(r) { renderRoute(r); });

  // State listeners for cross-module events
  state.on('company:saved', function() {
    // Could refresh sidebar company count badge
  });
  state.on('data:cleared', function() {
    router.navigate('/');
  });

  // Start router
  router.start();
}

init().catch(function(err) {
  console.error('App init failed:', err);
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = '<div class="alert alert-error"><strong>Application failed to start.</strong> ' + err.message + '</div>';
});
