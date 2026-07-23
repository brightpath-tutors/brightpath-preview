// js/engines/ce1-basis.js
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

export function computeNormalBasis(scenario, options) {
  const w = [];
  const cash = safeNumber(scenario && scenario.cash_at_issuance, 0, w);
  const propertyFmv = safeNumber(scenario && scenario.contributed_property_fmv, 0, w);
  const servicesFmv = safeNumber(scenario && scenario.services_fmv, 0, w);
  return safeNumber(cash + propertyFmv + servicesFmv, 0, w);
}

export function compute1202Basis(scenario, options) {
  const w = [];
  if (scenario && scenario.sec1202_basis != null) return safeNumber(scenario.sec1202_basis, 0, w);
  return computeNormalBasis(scenario, options);
}

export function evaluateBasis(scenario, options) {
  options = options || {};
  const warnings = [];
  const normalBasis = safeNumber(scenario && (scenario.stock_basis || computeNormalBasis(scenario, options)), 0, warnings);
  const sec1202Basis = safeNumber(compute1202Basis(scenario, options), 0, warnings);
  const tenTimes = sec1202Basis * 10;

  if (sec1202Basis > normalBasis * 1.1) {
    warnings.push('§1202 basis is higher than normal basis — this is unusual and requires documentation.');
  }

  const trail = buildAuditTrail('ce1', { stock_basis: scenario && scenario.stock_basis, sec1202_basis: scenario && scenario.sec1202_basis }, []);
  addStep(trail, 'Compute normal basis', normalBasis);
  addStep(trail, 'Compute §1202 basis', sec1202Basis);
  addStep(trail, 'Compute 10× ceiling', tenTimes);
  addSource(trail, '26 U.S.C. § 1202(b)(1)(B)', '10× basis ceiling for exclusion limit', '');

  return createEngineResult({
    engine_id: 'ce1-basis',
    engine_version: '1.0.0',
    status: normalBasis > 0 ? 'pass' : 'insufficient_information',
    value: sec1202Basis,
    confidence: sec1202Basis > 0 ? 85 : 0,
    summary: 'Normal basis: $' + normalBasis.toLocaleString() + '. §1202 basis: $' + sec1202Basis.toLocaleString() + '. 10× ceiling: $' + tenTimes.toLocaleString(),
    warnings: warnings,
    professional_review_questions: [
      'Has the §1202 adjusted basis been separately computed and documented?',
      'If property was contributed, has the FMV been independently appraised on the contribution date?'
    ],
    source_citations: [{ rule: '26 U.S.C. § 1202(b)(1)(B)', text: '10× taxpayer adjusted basis ceiling' }],
    audit_trail: trail,
    data: { normal_basis: normalBasis, sec1202_basis: sec1202Basis, difference: sec1202Basis - normalBasis, ten_times_basis_ceiling: tenTimes }
  });
}
