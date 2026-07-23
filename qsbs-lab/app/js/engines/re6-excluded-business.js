// js/engines/re6-excluded-business.js
import { lawConfig } from '../core/law-config.js';
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

export function evaluateExcludedBusiness(scenario, options) {
  options = options || {};
  const warnings = [];
  const bq = options.bizQualResult || (scenario && scenario.business_qual) || null;
  const rm = (scenario && scenario.revenue_mix) || null;

  const riskMatrix = [];

  const consultingPct = rm ? safeNumber(rm.consulting_pct, 0, warnings) : 0;
  const humanPct = rm ? safeNumber(rm.human_tutoring_pct, 0, warnings) : 0;
  const softwarePct = rm ? safeNumber(rm.software_subscription_pct, 0, warnings) : 0;
  const founderDep = bq && bq.scores ? safeNumber(bq.scores.founder_dependence_score, 50, warnings) : 50;
  const humanDep = bq && bq.scores ? safeNumber(bq.scores.human_service_dependence_score, 50, warnings) : 50;

  function addRisk(category, score, basis, note) {
    riskMatrix.push({ category: category, risk_score: Math.round(score), basis: basis, note: note });
  }

  addRisk('consulting', Math.min(100, consultingPct * 2.5), 'consulting_pct=' + consultingPct + '%', consultingPct > 20 ? 'Consulting revenue above 20% raises excluded-business risk.' : 'Low consulting revenue.');
  addRisk('reputation_or_skill', Math.min(100, founderDep * 0.9), 'founder_dependence_score=' + founderDep, founderDep > 60 ? 'High founder dependence may indicate principal asset is founder reputation/skill.' : 'Low founder dependence detected.');
  addRisk('personal_services', Math.min(100, humanPct * 1.5), 'human_tutoring_pct=' + humanPct + '%', humanPct > 50 ? 'High human-service revenue suggests potential excluded services issue.' : 'Low human-service revenue.');
  addRisk('health', 0, 'No health revenue detected', 'EdTech — not applicable.');
  addRisk('law', 0, 'No legal services detected', 'Not applicable.');
  addRisk('financial_services', 0, 'No financial services detected', 'Not applicable.');

  const highestRisk = riskMatrix.reduce(function(max, r) { return r.risk_score > max.risk_score ? r : max; }, riskMatrix[0]);
  const maxScore = highestRisk ? highestRisk.risk_score : 0;

  let status, confidence;
  if (maxScore < 30) { status = 'pass'; confidence = 75; }
  else if (maxScore >= 70) { status = 'fail'; confidence = 70; }
  else { status = QSBS_STATUS.UNCERTAIN; confidence = 55; }

  if (softwarePct > 50 && humanPct < 20 && consultingPct < 10) {
    status = 'pass';
    confidence = 80;
  }

  const pqs = [
    'Has a qualified tax attorney reviewed whether any revenue category constitutes an "excluded business" under § 1202(e)(3)?'
  ];
  riskMatrix.filter(function(r) { return r.risk_score >= 40; }).forEach(function(r) {
    pqs.push('Regarding "' + r.category + '": ' + r.note + ' Professional review required.');
  });

  const trail = buildAuditTrail('re6', { revenue_mix: rm }, []);
  addStep(trail, 'Score each excluded business category', riskMatrix);
  addSource(trail, '26 U.S.C. § 1202(e)(3)', 'Excluded business categories', '');

  return createEngineResult({
    engine_id: 're6-excluded-business',
    engine_version: '1.0.0',
    status: status,
    confidence: confidence,
    summary: 'Excluded business risk: ' + (maxScore < 30 ? 'LOW' : maxScore >= 70 ? 'HIGH' : 'MEDIUM') + '. Highest risk category: ' + (highestRisk ? highestRisk.category : 'none') + ' (' + maxScore + '/100).',
    supporting_facts: maxScore < 30 ? ['Revenue mix and business profile indicate low excluded-business risk.'] : [],
    risk_factors: maxScore >= 40 ? riskMatrix.filter(function(r){return r.risk_score >= 40;}).map(function(r){return r.category + ': risk score ' + r.risk_score + '/100. ' + r.note;}) : [],
    warnings: warnings,
    professional_review_questions: pqs,
    source_citations: [{ rule: '26 U.S.C. § 1202(e)(3)', text: 'Excluded business categories for QSBS qualification' }],
    audit_trail: trail,
    data: { risk_matrix: riskMatrix, highest_risk_category: highestRisk && highestRisk.category, highest_risk_score: maxScore }
  });
}
