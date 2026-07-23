// js/engines/ce4-stock-sale.js
import { getLawConfig, getExclusionPct } from '../core/law-config.js';
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';
import { computeExclusionLimit } from './ce2-threshold.js';

export function calcStockSaleTax(scenario, options) {
  options = options || {};
  const warnings = [], errors = [];
  try {
    const lawVersion = (scenario && scenario.law_version) || 'post_july4_2025';
    const grossProceeds = safeNumber(scenario && scenario.gross_proceeds, 0, warnings);
    const sellingExpenses = safeNumber(scenario && scenario.selling_expenses, 0, warnings);
    const stockBasis = safeNumber(scenario && (scenario.stock_basis || 0), 0, warnings);
    const qualifyingPct = safeNumber(scenario && (scenario.qualifying_pct != null ? scenario.qualifying_pct : 100), 100, warnings) / 100;
    const federalRate = safeNumber(scenario && scenario.federal_rate, 0.20, warnings);
    const niitRate = safeNumber(scenario && scenario.niit_rate, 0.038, warnings);
    const stateRate = safeNumber(scenario && scenario.state_rate, 0, warnings);
    const holdingYears = safeNumber(scenario && (scenario.exit_year || scenario.holding_years || 5), 5, warnings);

    const exclusionPct = options.exclusionPct != null ? options.exclusionPct : getExclusionPct(lawVersion, holdingYears);
    const limitResult = options.exclusionLimit ? options.exclusionLimit : computeExclusionLimit(scenario, options);
    const applicableLimit = limitResult.data ? limitResult.data.applicable_limit : limitResult.applicable_limit || 0;

    const amountRealized = grossProceeds - sellingExpenses;
    const totalGain = Math.max(0, amountRealized - stockBasis);
    const eligibleGain = totalGain * qualifyingPct;

    // excluded_gain = exclusion_pct × min(eligible_gain, applicable_limit)
    const gainSubjectToExclusion = Math.min(eligibleGain, applicableLimit);
    const excludedGain = exclusionPct * gainSubjectToExclusion;
    const taxableGain = totalGain - excludedGain;

    const federalTax = taxableGain * federalRate;
    const niit = taxableGain * niitRate;
    const stateTax = taxableGain * stateRate;
    const totalTax = federalTax + niit + stateTax;
    const afterTaxProceeds = amountRealized - totalTax;
    const effectiveRate = totalGain > 0 ? totalTax / totalGain : 0;

    const baselineTax = totalGain * (federalRate + niitRate + stateRate);
    const qsbsSavings = baselineTax - totalTax;

    const trail = buildAuditTrail('ce4', { gross_proceeds: grossProceeds, stock_basis: stockBasis, law_version: lawVersion }, []);
    addStep(trail, 'amount_realized = ' + grossProceeds + ' - ' + sellingExpenses, amountRealized);
    addStep(trail, 'total_gain = ' + amountRealized + ' - ' + stockBasis, totalGain);
    addStep(trail, 'eligible_gain = ' + totalGain + ' × ' + (qualifyingPct * 100) + '%', eligibleGain);
    addStep(trail, 'excluded_gain = ' + (exclusionPct*100) + '% × min(' + eligibleGain + ', ' + applicableLimit + ')', excludedGain);
    addStep(trail, 'taxable_gain = ' + totalGain + ' - ' + excludedGain, taxableGain);
    addStep(trail, 'total_tax', totalTax);
    addSource(trail, '26 U.S.C. § 1202(a)', 'QSBS gain exclusion', '');

    return createEngineResult({
      engine_id: 'ce4-stock-sale',
      engine_version: '1.0.0',
      status: 'pass',
      value: afterTaxProceeds,
      confidence: 90,
      summary: 'Stock sale: $' + (totalGain/1e6).toFixed(2) + 'M gain, $' + (excludedGain/1e6).toFixed(2) + 'M excluded (' + (exclusionPct*100) + '%), $' + (totalTax/1e6).toFixed(2) + 'M tax.',
      warnings: warnings,
      audit_trail: trail,
      source_citations: [{ rule: '26 U.S.C. § 1202(a)', text: 'QSBS gain exclusion' }],
      professional_review_questions: ['Has § 1202 eligibility been confirmed by a qualified tax attorney before filing?'],
      data: {
        amount_realized: amountRealized, total_gain: totalGain, eligible_gain: eligibleGain,
        excluded_gain: excludedGain, taxable_gain: taxableGain,
        federal_tax: federalTax, niit: niit, state_tax: stateTax,
        total_tax: totalTax, after_tax_proceeds: afterTaxProceeds, effective_rate: effectiveRate,
        baseline_tax: baselineTax, qsbs_savings: qsbsSavings,
        exclusion_pct: exclusionPct, applicable_limit: applicableLimit,
        limiting_factor: limitResult.data ? limitResult.data.limiting_factor : null,
        law_version: lawVersion
      }
    });
  } catch (e) {
    return createEngineResult({ engine_id: 'ce4-stock-sale', status: 'fail', errors: [e.message || String(e)] });
  }
}
