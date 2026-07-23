// js/modules/dc1-dashboard-cache.js — Dashboard cache layer
import storage from '../core/storage.js';
import state from '../core/state.js';
import { evaluateQSBS } from '../engines/rules-engine.js';
import { calcStockSaleTax, calcExclusionLimit } from '../engines/calc-engine.js';

const CACHE_TTL_MS = 60000; // 60 seconds

export function computeDashboardSummary(scenario) {
  let qsbs, calc, limit;
  try { qsbs = evaluateQSBS(scenario); } catch(e) { qsbs = { status: 'fail' }; }
  try { calc = calcStockSaleTax(scenario); } catch(e) { calc = null; }
  try { limit = calcExclusionLimit(scenario); } catch(e) { limit = null; }
  return {
    id: scenario.id,
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    law_version: scenario.law_version,
    status: qsbs.status,
    confidence: qsbs.confidence,
    aga: scenario.gross_assets_after,
    holding_years: scenario.exit_year,
    estimated_benefit: calc && calc.data ? calc.data.qsbs_savings : null,
    applicable_limit: limit && limit.data ? limit.data.applicable_limit : null,
    updated_at: new Date().toISOString(),
    cache_timestamp: Date.now()
  };
}

export function getCachedSummary(scenarioId) {
  return storage.load('dashboard_cache', scenarioId).then(function(cached) {
    if (!cached) return null;
    if (Date.now() - cached.cache_timestamp > CACHE_TTL_MS) return null;
    return cached;
  });
}

export function invalidateCache(scenarioId) {
  return storage.delete('dashboard_cache', scenarioId);
}

export function refreshCache(scenario) {
  const summary = computeDashboardSummary(scenario);
  return storage.save('dashboard_cache', summary);
}

// Listen for scenario saves and auto-refresh cache
state.on('scenario:saved', function(scenario) {
  if (scenario && scenario.id) refreshCache(scenario);
});
