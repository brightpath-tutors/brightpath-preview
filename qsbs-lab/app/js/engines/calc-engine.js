// js/engines/calc-engine.js — M3: Calculation orchestrator
import { getExclusionPct, lawConfig } from '../core/law-config.js';
import { evaluateBasis } from './ce1-basis.js';
import { computeExclusionLimit } from './ce2-threshold.js';
import { calcWeightedEV, calcEquityValue } from './ce3-valuation.js';
import { calcStockSaleTax } from './ce4-stock-sale.js';
import { calcAssetSaleTax } from './ce5-asset-sale.js';
import { calcExitTax } from './ce6-exit-tax.js';
import { runSensitivity, runMonteCarlo } from './ce7-sensitivity.js';

export { evaluateBasis, computeExclusionLimit, calcWeightedEV, calcEquityValue,
  calcStockSaleTax, calcAssetSaleTax, calcExitTax, runSensitivity, runMonteCarlo };

export function calcExclusionLimit(scenario) {
  return computeExclusionLimit(scenario);
}

export function calcExclusionPct(lawVersion, holdingYears) {
  return getExclusionPct(lawVersion, holdingYears);
}

export function calcBaselineTax(gain, federalRate, niitRate, stateRate) {
  const taxable = Math.max(0, gain);
  const total = taxable * ((federalRate || 0) + (niitRate || 0) + (stateRate || 0));
  return {
    gain: gain,
    taxable: taxable,
    federal_tax: taxable * (federalRate || 0),
    niit: taxable * (niitRate || 0),
    state_tax: taxable * (stateRate || 0),
    total_tax: total
  };
}

export function calcOldVsNewLaw(scenario) {
  const historical = calcStockSaleTax(Object.assign({}, scenario, { law_version: 'historical' }));
  const postChange = calcStockSaleTax(Object.assign({}, scenario, { law_version: 'post_july4_2025' }));
  const hd = historical.data || {};
  const pd = postChange.data || {};
  return {
    historical,
    postChange,
    difference: {
      excluded_gain: (pd.excluded_gain || 0) - (hd.excluded_gain || 0),
      total_tax: (pd.total_tax || 0) - (hd.total_tax || 0),
      after_tax_proceeds: (pd.after_tax_proceeds || 0) - (hd.after_tax_proceeds || 0)
    }
  };
}
