// js/engines/ce2-threshold.js
import { lawConfig, getLawConfig } from '../core/law-config.js';
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

export function computeExclusionLimit(scenario, options) {
  options = options || {};
  const warnings = [];
  const lawVersion = (scenario && scenario.law_version) || 'post_july4_2025';
  const cfg = getLawConfig(lawVersion) || lawConfig.lawVersions.post_july4_2025;
  const fixedLimit = cfg.fixedDollarLimit;
  const priorUsed = safeNumber(scenario && scenario.prior_exclusions_used, 0, warnings);
  const fixedRemaining = Math.max(0, fixedLimit - priorUsed);
  const sec1202Basis = safeNumber(scenario && (scenario.sec1202_basis || scenario.stock_basis), 0, warnings);
  const tenTimes = sec1202Basis * 10;
  const applicable = Math.max(fixedRemaining, tenTimes);
  const limitingFactor = tenTimes >= fixedRemaining ? 'ten_times_basis' : 'fixed_dollar';

  // Test: sec1202_basis=100000, post_july4 → applicable=15000000 (max of $15M,$1M = $15M)
  // Test: sec1202_basis=2000000, post_july4 → applicable=20000000 (max of $15M,$20M = $20M)

  const trail = buildAuditTrail('ce2', { sec1202_basis: sec1202Basis, prior_exclusions_used: priorUsed, law_version: lawVersion }, []);
  addStep(trail, 'fixed_remaining = ' + fixedLimit + ' - ' + priorUsed, fixedRemaining);
  addStep(trail, 'ten_times = 10 × ' + sec1202Basis, tenTimes);
  addStep(trail, 'applicable = max(' + fixedRemaining + ', ' + tenTimes + ')', applicable);
  addSource(trail, '26 U.S.C. § 1202(b)(1)', 'Exclusion limit: greater of $15M or 10× adjusted basis', '');

  return createEngineResult({
    engine_id: 'ce2-threshold',
    engine_version: '1.0.0',
    status: applicable > 0 ? 'pass' : 'fail',
    value: applicable,
    confidence: 95,
    summary: 'Applicable exclusion limit: $' + (applicable / 1e6).toFixed(2) + 'M (' + limitingFactor.replace('_', ' ') + ').',
    audit_trail: trail,
    source_citations: [{ rule: '26 U.S.C. § 1202(b)(1)', text: 'Exclusion limit: greater of $15M (post-2025) or 10× adjusted basis' }],
    professional_review_questions: [
      'Has the §1202 adjusted basis been separately computed and documented?',
      'Have prior exclusions against this issuer been tracked and deducted?'
    ],
    data: {
      fixed_dollar_limit: fixedLimit,
      prior_exclusions_used: priorUsed,
      fixed_dollar_remaining: fixedRemaining,
      ten_times_basis: tenTimes,
      applicable_limit: applicable,
      limiting_factor: limitingFactor,
      law_version: lawVersion
    }
  });
}
