// js/modules/bi1-intelligence.js — BI1: Cross-scenario intelligence
import storage from '../core/storage.js';
import { fmt } from '../shared/fmt.js';
import { evaluateQSBS } from '../engines/rules-engine.js';
import { calcStockSaleTax, calcExclusionLimit } from '../engines/calc-engine.js';

const DISCLAIMER = 'Intelligence insights are algorithmic observations based on your inputs. Not legal or tax advice.';

export function renderIntelligence(container) {
  container.innerHTML = '<div class="page-header"><h1>Intelligence</h1></div><div class="loading">Analyzing scenarios</div>';
  Promise.all([
    storage.list('scenarios'),
    storage.list('companies'),
    storage.list('decision_journal')
  ]).then(function(results) {
    const scenarios = results[0].filter(function(s){ return !s.is_archived; });
    const companies = results[1];
    const journal = results[2];
    if (!scenarios.length) {
      container.innerHTML = '<div class="page-header"><h1>Intelligence</h1></div>' +
        '<div class="empty-state"><p>No scenarios yet. Create scenarios to unlock cross-scenario intelligence.</p></div>';
      return;
    }
    const insights = generateInsights(scenarios, companies, journal);
    container.innerHTML = buildUI(insights, scenarios);
    bindEvents(container);
  });
}

function generateInsights(scenarios, companies, journal) {
  const insights = [];

  // 1. AGA proximity warnings
  scenarios.forEach(function(s) {
    const aga = s.gross_assets_after || 0;
    const threshold = (s.law_version === 'historical') ? 50000000 : 75000000;
    const pct = aga / threshold;
    if (pct >= 0.9 && pct < 1) {
      insights.push({
        type: 'warning',
        category: 'AGA',
        priority: 'high',
        scenario: s.name,
        title: 'AGA Within 10% of Threshold',
        body: s.name + ' has AGA of ' + fmt.currency(aga) + ' — ' + Math.round(pct * 100) + '% of the ' + fmt.currency(threshold) + ' threshold. Future asset acquisitions could push you over.',
        action: 'Review planned asset acquisitions before next funding round.'
      });
    }
    if (pct >= 1) {
      insights.push({
        type: 'critical',
        category: 'AGA',
        priority: 'critical',
        scenario: s.name,
        title: 'AGA Exceeds Threshold — Qualification Fails',
        body: s.name + ' AGA of ' + fmt.currency(aga) + ' exceeds the ' + fmt.currency(threshold) + ' §1202 threshold. Shares issued after threshold breach do not qualify.',
        action: 'Confirm which shares were issued before AGA exceeded threshold.'
      });
    }
  });

  // 2. Holding period milestones (within 90 days of next milestone)
  scenarios.forEach(function(s) {
    if (!s.acquisition_date) return;
    const acqDate = new Date(s.acquisition_date);
    const now = new Date();
    const isPost2025 = s.law_version === 'post_july4_2025';
    const milestones = isPost2025 ?
      [{ years: 3, pct: 0.50 }, { years: 4, pct: 0.75 }, { years: 5, pct: 1.00 }] :
      [{ years: 5, pct: 1.00 }];
    milestones.forEach(function(m) {
      const milestone = new Date(acqDate);
      milestone.setFullYear(milestone.getFullYear() + m.years);
      const daysAway = Math.round((milestone - now) / 86400000);
      if (daysAway >= 0 && daysAway <= 90) {
        insights.push({
          type: 'opportunity',
          category: 'HoldingPeriod',
          priority: 'high',
          scenario: s.name,
          title: fmt.pct(m.pct) + ' Exclusion Milestone in ' + daysAway + ' Days',
          body: s.name + ' reaches the ' + (m.years) + '-year ' + fmt.pct(m.pct) + ' exclusion milestone on ' + fmt.date(milestone.toISOString()) + '.',
          action: 'Consider delaying any liquidity event until after ' + fmt.date(milestone.toISOString()) + '.'
        });
      }
    });
  });

  // 3. Scenarios with no exit proceeds (incomplete)
  const incomplete = scenarios.filter(function(s){ return !s.gross_proceeds || !s.acquisition_date; });
  if (incomplete.length) {
    insights.push({
      type: 'info',
      category: 'Completeness',
      priority: 'medium',
      scenario: incomplete.map(function(s){return s.name;}).join(', '),
      title: incomplete.length + ' Scenario' + (incomplete.length > 1 ? 's' : '') + ' Missing Key Data',
      body: 'Scenarios without acquisition date or gross proceeds cannot compute QSBS benefit. Enter these values to unlock full analysis.',
      action: 'Complete data entry in each scenario.'
    });
  }

  // 4. Open action items in journal
  const openActions = journal.filter(function(e){ return e.entry_type === 'action_item' && e.action_status === 'open'; });
  if (openActions.length) {
    const overdue = openActions.filter(function(e){ return e.action_due_date && new Date(e.action_due_date) < new Date(); });
    if (overdue.length) {
      insights.push({
        type: 'warning',
        category: 'Journal',
        priority: 'high',
        scenario: 'All',
        title: overdue.length + ' Overdue Action Item' + (overdue.length > 1 ? 's' : ''),
        body: overdue.map(function(e){ return e.title + ' (due ' + fmt.date(e.action_due_date) + ')'; }).join('; '),
        action: 'Review and update overdue action items in Decision Journal.'
      });
    } else {
      insights.push({
        type: 'info',
        category: 'Journal',
        priority: 'low',
        scenario: 'All',
        title: openActions.length + ' Open Action Item' + (openActions.length > 1 ? 's' : ''),
        body: 'You have ' + openActions.length + ' open action items in your Decision Journal.',
        action: 'Review and resolve open items.'
      });
    }
  }

  // 5. Tax savings estimate across portfolio
  let totalBenefit = 0;
  let computedCount = 0;
  scenarios.forEach(function(s) {
    if (s.gross_proceeds && s.stock_basis != null && s.acquisition_date) {
      try {
        const calc = calcStockSaleTax(s);
        if (calc && calc.data && calc.data.qsbs_savings) {
          totalBenefit += calc.data.qsbs_savings;
          computedCount++;
        }
      } catch(e) {}
    }
  });
  if (computedCount > 0) {
    insights.push({
      type: 'opportunity',
      category: 'Portfolio',
      priority: 'medium',
      scenario: computedCount + ' of ' + scenarios.length + ' scenarios',
      title: 'Portfolio QSBS Opportunity',
      body: 'Estimated total QSBS tax savings across ' + computedCount + ' scenario' + (computedCount > 1 ? 's' : '') + ': ' + fmt.currency(totalBenefit) + '.',
      action: 'Ensure professional review is scheduled before any liquidity event. ' + DISCLAIMER
    });
  }

  // 6. Mixed entity types — C-Corp required
  scenarios.forEach(function(s) {
    if (s.entity_type && s.entity_type !== 'C-Corp' && s.tax_class === 'C-Corp') {
      insights.push({
        type: 'info',
        category: 'Entity',
        priority: 'medium',
        scenario: s.name,
        title: 'Entity Type and Tax Class Mismatch',
        body: s.name + ' shows entity type "' + s.entity_type + '" but tax class "C-Corp". §1202 requires the issuing entity to be a domestic C-Corp at issuance.',
        action: 'Verify conversion documents and date of effective C-Corp status.'
      });
    }
  });

  // 7. Prior exclusions reducing headroom
  scenarios.forEach(function(s) {
    if (!s.prior_exclusions_used || !s.sec1202_basis) return;
    try {
      const limit = calcExclusionLimit(s);
      if (limit && limit.data) {
        const remaining = limit.data.fixed_dollar_remaining;
        const fixedTotal = s.law_version === 'historical' ? 10000000 : 15000000;
        if (remaining < fixedTotal * 0.5) {
          insights.push({
            type: 'warning',
            category: 'Limit',
            priority: 'medium',
            scenario: s.name,
            title: 'Fixed Dollar Limit More Than 50% Used',
            body: s.name + ': only ' + fmt.currency(remaining) + ' of fixed-dollar limit remaining after prior exclusions.',
            action: 'Confirm ten-times-basis ceiling (' + fmt.currency(limit.data.ten_times_basis) + ') is larger and available.'
          });
        }
      }
    } catch(e) {}
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort(function(a,b){ return (priorityOrder[a.priority]||3) - (priorityOrder[b.priority]||3); });

  return insights;
}

function buildUI(insights, scenarios) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, opportunity: 0 };
  insights.forEach(function(i) {
    counts[i.priority] = (counts[i.priority]||0) + 1;
    counts[i.type] = (counts[i.type]||0) + 1;
  });

  return '<div class="page-header"><h1>Intelligence</h1>' +
    (counts.critical ? '<span class="badge badge-red">' + counts.critical + ' critical</span> ' : '') +
    (counts.high ? '<span class="badge badge-amber">' + counts.high + ' high</span>' : '') +
    '</div>' +
    '<div class="alert alert-info" style="font-size:12px;">' + DISCLAIMER + '</div>' +
    '<div class="intelligence-summary">' +
    statBadge(insights.length, 'Total Insights') +
    statBadge(counts.opportunity || 0, 'Opportunities', 'green') +
    statBadge((counts.critical||0) + (counts.high||0), 'Warnings', 'red') +
    statBadge(scenarios.length, 'Scenarios Analyzed') +
    '</div>' +
    '<div class="insights-list">' +
    (insights.length ? insights.map(buildInsightCard).join('') : '<div class="empty-state"><p>No insights generated. Add more scenario data to unlock patterns.</p></div>') +
    '</div>';
}

function statBadge(value, label, color) {
  return '<div class="stat-card' + (color ? ' stat-' + color : '') + '" style="min-width:120px;">' +
    '<div class="stat-value">' + value + '</div>' +
    '<div class="stat-label">' + label + '</div>' +
    '</div>';
}

function buildInsightCard(insight) {
  const typeClass = {
    critical: 'alert-error',
    warning: 'alert-warn',
    opportunity: 'alert-success',
    info: 'alert-info'
  }[insight.type] || 'alert-info';
  const icon = { critical: '🚨', warning: '⚠️', opportunity: '💡', info: 'ℹ️' }[insight.type] || '📋';
  return '<div class="insight-card ' + typeClass + '">' +
    '<div class="insight-header">' +
    '<span class="insight-icon">' + icon + '</span>' +
    '<strong class="insight-title">' + esc(insight.title) + '</strong>' +
    '<span class="tag tag-' + (insight.priority === 'critical' || insight.priority === 'high' ? 'red' : insight.priority === 'medium' ? 'amber' : 'blue') + '">' + insight.priority.toUpperCase() + '</span>' +
    '<span class="tag tag-blue">' + esc(insight.category) + '</span>' +
    '</div>' +
    '<p class="insight-body">' + esc(insight.body) + '</p>' +
    (insight.action ? '<p class="insight-action"><strong>Action:</strong> ' + esc(insight.action) + '</p>' : '') +
    '<div class="insight-scenario"><em>Scenario: ' + esc(insight.scenario || 'All') + '</em></div>' +
    '</div>';
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function bindEvents(container) {
  // Future: filter by category, priority, export
}
