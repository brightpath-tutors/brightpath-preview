// js/engines/ce3-valuation.js — Pure math, no DOM

import { safeNumber } from '../shared/errors.js';

export function calcARRMultiple(arr, multiple) { return safeNumber(arr, 0, []) * safeNumber(multiple, 0, []); }
export function calcRevenueMultiple(revenue, multiple) { return safeNumber(revenue, 0, []) * safeNumber(multiple, 0, []); }
export function calcEBITDAMultiple(ebitda, multiple) { return safeNumber(ebitda, 0, []) * safeNumber(multiple, 0, []); }

export function calcDCF(cashflows, discountRate) {
  if (!cashflows || !cashflows.length) return 0;
  const r = safeNumber(discountRate, 0.10, []);
  return cashflows.reduce(function(sum, cf, i) {
    return sum + safeNumber(cf, 0, []) / Math.pow(1 + r, i + 1);
  }, 0);
}

export function calcNAV(totalAssets, totalLiabilities) {
  return safeNumber(totalAssets, 0, []) - safeNumber(totalLiabilities, 0, []);
}

export function calcIPFocused(ipValue, otherAssets) {
  return safeNumber(ipValue, 0, []) + safeNumber(otherAssets, 0, []);
}

export function calcWeightedEV(valuations) {
  if (!valuations || !valuations.length) return { enterprise_value: 0, equity_value: 0, methodology: 'none', components: [] };
  const totalWeight = valuations.reduce(function(s, v) { return s + safeNumber(v.weight, 1, []); }, 0);
  const ev = valuations.reduce(function(s, v) {
    const w = safeNumber(v.weight, 1, []) / totalWeight;
    return s + safeNumber(v.value, 0, []) * w;
  }, 0);
  return {
    enterprise_value: ev,
    equity_value: ev,
    methodology: 'weighted_average',
    components: valuations,
    total_weight: totalWeight
  };
}

export function calcEquityValue(enterpriseValue, totalDebt, cash) {
  return safeNumber(enterpriseValue, 0, []) - safeNumber(totalDebt, 0, []) + safeNumber(cash, 0, []);
}
