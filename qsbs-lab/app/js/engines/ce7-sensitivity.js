// js/engines/ce7-sensitivity.js
import { createEngineResult } from '../shared/engine-result.js';
import { calcStockSaleTax } from './ce4-stock-sale.js';
import { safeNumber } from '../shared/errors.js';

export function runSensitivity(scenario, options) {
  options = options || {};
  const warnings = [];
  try {
    const baseProceeds = safeNumber(scenario && scenario.gross_proceeds, 0, warnings);
    const multipliers = [0.50, 0.60, 0.70, 0.80, 0.90, 1.00, 1.10, 1.20, 1.40, 1.60, 2.00];
    const rows = multipliers.map(function(m) {
      const s = Object.assign({}, scenario, { gross_proceeds: baseProceeds * m });
      const result = calcStockSaleTax(s, options);
      const d = result.data || {};
      return {
        multiplier: m,
        gross_proceeds: baseProceeds * m,
        total_gain: d.total_gain || 0,
        excluded_gain: d.excluded_gain || 0,
        total_tax: d.total_tax || 0,
        after_tax_proceeds: d.after_tax_proceeds || 0,
        effective_rate: d.effective_rate || 0,
        qsbs_savings: d.qsbs_savings || 0
      };
    });
    return createEngineResult({
      engine_id: 'ce7-sensitivity',
      status: 'pass',
      summary: 'Sensitivity table: ' + rows.length + ' rows from 50% to 200% of base proceeds.',
      warnings: warnings,
      data: { rows: rows, base_proceeds: baseProceeds, row_count: rows.length }
    });
  } catch (e) {
    return createEngineResult({ engine_id: 'ce7-sensitivity', status: 'fail', errors: [e.message || String(e)] });
  }
}

export function runMonteCarlo(scenario, rangeMultiplier, iterations, options) {
  rangeMultiplier = rangeMultiplier || 0.3;
  iterations = iterations || 500;
  options = options || {};
  const warnings = [];
  try {
    const baseProceeds = safeNumber(scenario && scenario.gross_proceeds, 0, warnings);
    const results = [];
    // Pseudo-random using sin for reproducibility
    for (let i = 0; i < iterations; i++) {
      const rand = (Math.sin(i * 127.1 + 311.7) + 1) / 2; // 0-1
      const proceeds = baseProceeds * (1 + (rand - 0.5) * 2 * rangeMultiplier);
      const s = Object.assign({}, scenario, { gross_proceeds: Math.max(0, proceeds) });
      const r = calcStockSaleTax(s, options);
      results.push(r.data ? r.data.after_tax_proceeds : 0);
    }
    results.sort(function(a, b) { return a - b; });
    const mean = results.reduce(function(s, v) { return s + v; }, 0) / results.length;
    const median = results[Math.floor(results.length / 2)];
    const p10 = results[Math.floor(results.length * 0.10)];
    const p90 = results[Math.floor(results.length * 0.90)];
    return createEngineResult({
      engine_id: 'ce7-monte-carlo',
      status: 'pass',
      summary: 'Monte Carlo (' + iterations + ' iterations): median after-tax $' + (median/1e6).toFixed(2) + 'M.',
      data: { mean_after_tax: mean, median_after_tax: median, p10: p10, p90: p90, iterations: iterations }
    });
  } catch (e) {
    return createEngineResult({ engine_id: 'ce7-monte-carlo', status: 'fail', errors: [e.message || String(e)] });
  }
}
