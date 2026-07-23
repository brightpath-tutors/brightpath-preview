// js/engines/re5-active-business.js
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

export function evaluateActiveBusiness(scenario, options) {
  options = options || {};
  const warnings = [], facts = [], risks = [];

  const bq = options.bizQualResult || (scenario && scenario.business_qual) || null;
  const rm = (scenario && scenario.revenue_mix) || null;

  let confidence = 40;
  let status = QSBS_STATUS.UNCERTAIN;

  if (!bq && !rm) {
    return createEngineResult({
      engine_id: 're5-active-business',
      status: QSBS_STATUS.INSUFFICIENT,
      missing_inputs: ['business_qual or revenue_mix'],
      summary: 'Insufficient data to evaluate active business test.',
      professional_review_questions: ['What percentage of corporate assets are used in active business operations?']
    });
  }

  if (rm) {
    const softwarePct = safeNumber(rm.software_subscription_pct, 0, warnings);
    const autoPct = safeNumber(rm.automated_diagnostic_pct, 0, warnings);
    const currPct = safeNumber(rm.curriculum_licensing_pct, 0, warnings);
    const humanPct = safeNumber(rm.human_tutoring_pct, 0, warnings);
    const activePct = softwarePct + autoPct + currPct;

    if (activePct > 80) {
      status = 'pass';
      confidence = 75;
      facts.push('Revenue mix indicates ' + activePct.toFixed(0) + '% active software/automated delivery — consistent with 80% active business test.');
    } else if (humanPct > 60) {
      status = QSBS_STATUS.UNCERTAIN;
      confidence = 50;
      risks.push('High human-service revenue (' + humanPct + '%) raises questions about active business asset use — requires review.');
    }
  }

  if (bq && bq.scores) {
    const automationScore = safeNumber(bq.scores.automation_score, 0, warnings);
    const saasScore = safeNumber(bq.scores.saas_characteristics_score, 0, warnings);
    if (automationScore > 60 && saasScore > 60) {
      status = 'pass';
      confidence = Math.max(confidence, 80);
      facts.push('High automation (' + automationScore + ') and SaaS characteristics (' + saasScore + ') support active business qualification.');
    }
  }

  const trail = buildAuditTrail('re5', { revenue_mix: rm }, []);
  addStep(trail, 'Evaluate active business signals', status);
  addSource(trail, '26 U.S.C. § 1202(e)(1)', '80% active business asset use requirement', '');

  return createEngineResult({
    engine_id: 're5-active-business',
    engine_version: '1.0.0',
    status: status,
    confidence: confidence,
    summary: 'Active business test: ' + status,
    supporting_facts: facts,
    risk_factors: risks,
    warnings: warnings,
    professional_review_questions: [
      'What percentage of corporate assets (by value) are used in active business operations?',
      'Does the corporation hold significant passive investment assets or cash not deployed in operations?',
      'Has a qualified tax attorney reviewed the active business composition at the relevant date?'
    ],
    source_citations: [{ rule: '26 U.S.C. § 1202(e)(1)', text: '80% of assets must be used in active qualified trade or business' }],
    audit_trail: trail,
    data: { revenue_mix: rm, biz_qual_scores: bq && bq.scores }
  });
}
