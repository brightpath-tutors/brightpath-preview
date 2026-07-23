// js/engines/business-qual.js — M5: Business qualification scoring
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';

export function scoreBusinessQual(scenario, options) {
  options = options || {};
  const w = [];
  const rm = (scenario && scenario.revenue_mix) || {};
  const ba = (scenario && scenario.business_answers) || {};

  const softwarePct = safeNumber(rm.software_subscription_pct, 0, w);
  const autoPct = safeNumber(rm.automated_diagnostic_pct, 0, w);
  const currPct = safeNumber(rm.curriculum_licensing_pct, 0, w);
  const humanPct = safeNumber(rm.human_tutoring_pct, 0, w);
  const consultingPct = safeNumber(rm.consulting_pct, 0, w);
  const otherPct = safeNumber(rm.other_pct, 0, w);

  const softwareOrientation = Math.min(100, softwarePct * 1.0 + autoPct * 0.8 + currPct * 0.5);
  const humanDependence = Math.min(100, humanPct * 1.5 + consultingPct * 1.2);
  const founderDep = safeNumber(ba.founder_dependence_pct, 50, w);
  const tutorDep = Math.min(100, humanPct * 1.2);
  const automationScore = Math.min(100, autoPct * 1.5 + softwarePct * 0.8);
  const proprietaryIP = ba.has_proprietary_ip ? 85 : (ba.has_proprietary_ip === false ? 20 : 50);
  const saasScore = Math.min(100, softwarePct * 1.2 + autoPct * 0.5);
  const excludedRisk = Math.min(100, Math.max(consultingPct * 2, humanPct * 1.5, founderDep * 0.7));

  const scores = {
    software_orientation_score: Math.round(softwareOrientation),
    human_service_dependence_score: Math.round(humanDependence),
    founder_dependence_score: Math.round(founderDep),
    tutor_dependence_score: Math.round(tutorDep),
    automation_score: Math.round(automationScore),
    proprietary_ip_score: Math.round(proprietaryIP),
    saas_characteristics_score: Math.round(saasScore),
    excluded_business_risk: Math.round(excludedRisk)
  };

  const summaryBadge = excludedRisk < 20 && softwareOrientation > 60
    ? 'low_risk'
    : excludedRisk > 60 || humanDependence > 60
      ? 'high_risk'
      : 'medium_risk';

  const totalRevPct = softwarePct + autoPct + currPct + humanPct + consultingPct + otherPct;
  const revWarning = Math.abs(totalRevPct - 100) > 5 ? ['Revenue mix sums to ' + totalRevPct.toFixed(0) + '% — should be 100%.'] : [];

  return createEngineResult({
    engine_id: 'business-qual',
    engine_version: '1.0.0',
    status: summaryBadge === 'low_risk' ? 'pass' : summaryBadge === 'high_risk' ? 'uncertain_professional_review_required' : 'uncertain_professional_review_required',
    confidence: summaryBadge === 'low_risk' ? 75 : summaryBadge === 'high_risk' ? 40 : 55,
    summary: 'Business qualification: ' + summaryBadge.replace(/_/g, ' ') + '. Excluded business risk: ' + scores.excluded_business_risk + '/100.',
    warnings: revWarning,
    professional_review_questions: [
      'Has a qualified tax attorney reviewed whether the business constitutes an excluded business under § 1202(e)(3)?',
      'Is any revenue derived from services where the principal asset is the reputation or skill of employees?'
    ],
    source_citations: [{ rule: '26 U.S.C. § 1202(e)(3)', text: 'Excluded business categories' }],
    data: { scores: scores, summary_badge: summaryBadge, revenue_mix: rm, total_revenue_pct: totalRevPct }
  });
}
