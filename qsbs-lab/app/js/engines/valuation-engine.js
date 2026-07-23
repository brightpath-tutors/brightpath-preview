// js/engines/valuation-engine.js — M4: Valuation engine
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { calcARRMultiple, calcRevenueMultiple, calcEBITDAMultiple, calcDCF, calcNAV, calcIPFocused, calcWeightedEV, calcEquityValue } from './ce3-valuation.js';

export { calcWeightedEV, calcEquityValue };

export function computeValuation(scenario, options) {
  options = options || {};
  const w = [];
  const vi = (scenario && scenario.valuation_inputs) || {};
  const valuations = [];

  if (vi.arr && vi.arr_multiple) valuations.push({ method: 'ARR Multiple', value: calcARRMultiple(vi.arr, vi.arr_multiple), weight: vi.arr_weight || 1 });
  if (vi.revenue && vi.revenue_multiple) valuations.push({ method: 'Revenue Multiple', value: calcRevenueMultiple(vi.revenue, vi.revenue_multiple), weight: vi.revenue_weight || 1 });
  if (vi.ebitda && vi.ebitda_multiple) valuations.push({ method: 'EBITDA Multiple', value: calcEBITDAMultiple(vi.ebitda, vi.ebitda_multiple), weight: vi.ebitda_weight || 1 });
  if (vi.dcf_cashflows && vi.dcf_rate) valuations.push({ method: 'DCF', value: calcDCF(vi.dcf_cashflows, vi.dcf_rate), weight: vi.dcf_weight || 1 });
  if (vi.total_assets && vi.total_liabilities) valuations.push({ method: 'NAV', value: calcNAV(vi.total_assets, vi.total_liabilities), weight: vi.nav_weight || 1 });
  if (vi.ip_value) valuations.push({ method: 'IP-Focused', value: calcIPFocused(vi.ip_value, vi.other_assets || 0), weight: vi.ip_weight || 1 });
  if (vi.custom_value) valuations.push({ method: 'Custom', value: safeNumber(vi.custom_value, 0, w), weight: vi.custom_weight || 1 });
  if (vi.comparables && vi.comparables.length) {
    const wev = calcWeightedEV(vi.comparables);
    valuations.push({ method: 'Comparables', value: wev.enterprise_value, weight: vi.comparables_weight || 1 });
  }

  if (!valuations.length) {
    return createEngineResult({ engine_id: 'valuation-engine', status: 'insufficient_information', missing_inputs: ['valuation_inputs'] });
  }

  const result = calcWeightedEV(valuations);
  const totalDebt = safeNumber(vi.total_debt, 0, w);
  const cash = safeNumber(vi.cash, 0, w);
  const equityValue = calcEquityValue(result.enterprise_value, totalDebt, cash);

  return createEngineResult({
    engine_id: 'valuation-engine',
    engine_version: '1.0.0',
    status: 'pass',
    value: result.enterprise_value,
    summary: 'Weighted enterprise value: $' + (result.enterprise_value / 1e6).toFixed(2) + 'M. Equity value: $' + (equityValue / 1e6).toFixed(2) + 'M.',
    warnings: ['Enterprise value ≠ aggregate gross assets. Do not use enterprise value as AGA without adjustment.'],
    professional_review_questions: [
      'Has enterprise value been independently appraised?',
      'Has the valuation been reviewed by a qualified business appraiser for tax purposes?'
    ],
    data: { enterprise_value: result.enterprise_value, equity_value: equityValue, valuation_methods_used: valuations.map(function(v){return v.method;}), components: valuations, aga_note: 'Enterprise value does not equal aggregate gross assets. AGA uses adjusted tax bases of assets, not FMV.' }
  });
}
