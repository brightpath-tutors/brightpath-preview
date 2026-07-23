// js/engines/re7-qualification-decision.js
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { buildAuditTrail, addStep } from '../shared/audit-trail.js';

const DISCLAIMER = 'Professional review by a qualified tax attorney is required before relying on this analysis. This tool does not provide legal or tax advice.';

export function aggregateQualificationResult(testResults, options) {
  options = options || {};
  testResults = testResults || {};

  const re1 = testResults.re1 || null;
  const re2 = testResults.re2 || null;
  const re3 = testResults.re3 || null;
  const re4 = testResults.re4 || null;
  const re5 = testResults.re5 || null;
  const re6 = testResults.re6 || null;

  const allFacts = [], allRisks = [], allPqs = [DISCLAIMER], allCitations = [];
  [re1,re2,re3,re4,re5,re6].filter(Boolean).forEach(function(r) {
    (r.supporting_facts || []).forEach(function(f) { if (allFacts.indexOf(f) < 0) allFacts.push(f); });
    (r.risk_factors || []).forEach(function(f) { if (allRisks.indexOf(f) < 0) allRisks.push(f); });
    (r.professional_review_questions || []).forEach(function(q) { if (allPqs.indexOf(q) < 0) allPqs.push(q); });
    (r.source_citations || []).forEach(function(c) { allCitations.push(c); });
  });

  const statuses = [re1,re2,re3,re4,re5,re6].filter(Boolean).map(function(r) { return r.status; });
  const hasFail = statuses.indexOf('fail') >= 0;
  const hasInsufficient = statuses.some(function(s) { return s === QSBS_STATUS.INSUFFICIENT; });
  const hasUncertain = statuses.some(function(s) { return s === QSBS_STATUS.UNCERTAIN || s === 'uncertain_professional_review_required'; });
  const allPass = statuses.length > 0 && statuses.every(function(s) { return s === 'pass'; });

  let overallStatus;
  if (hasFail) overallStatus = QSBS_STATUS.DOES_NOT;
  else if (hasInsufficient) overallStatus = QSBS_STATUS.INSUFFICIENT;
  else if (allPass) overallStatus = QSBS_STATUS.LIKELY_QUALIFIES;
  else if (hasUncertain) overallStatus = QSBS_STATUS.POTENTIALLY;
  else overallStatus = QSBS_STATUS.UNCERTAIN;

  const individualTests = {
    c_corp: { pass: null, confidence: 'low', note: 'Entity type not separately evaluated — confirm C-corp federal tax classification.' },
    original_issue: re4 ? { pass: re4.status === 'pass', confidence: re4.confidence, note: re4.summary } : { pass: null, confidence: 'low', note: 'Not evaluated' },
    threshold: re3 ? { pass: re3.status === 'pass', confidence: re3.confidence, note: re3.summary } : { pass: null, confidence: 'low', note: 'Not evaluated' },
    active_business: re5 ? { pass: re5.status === 'pass', confidence: re5.confidence, note: re5.summary } : { pass: null, confidence: 'low', note: 'Not evaluated' },
    excluded_business: re6 ? { pass: re6.status === 'pass', confidence: re6.confidence, note: re6.summary } : { pass: null, confidence: 'low', note: 'Not evaluated' },
    holding_period: re2 ? { pass: re2.status === 'pass', confidence: re2.confidence, note: re2.summary } : { pass: null, confidence: 'low', note: 'Not evaluated' },
    redemption: { pass: null, confidence: 'low', note: 'Redemption test not evaluated — confirm no disqualifying redemptions in 2yr window.' }
  };

  const trail = buildAuditTrail('re7', { statuses: statuses }, []);
  addStep(trail, 'Aggregate test results', overallStatus);

  return createEngineResult({
    engine_id: 're7-qualification-decision',
    engine_version: '1.0.0',
    status: overallStatus,
    confidence: hasFail ? 90 : allPass ? 70 : 50,
    summary: 'Overall QSBS qualification assessment: ' + overallStatus.replace(/_/g, ' ').toUpperCase(),
    note: DISCLAIMER,
    supporting_facts: allFacts,
    risk_factors: allRisks,
    professional_review_questions: allPqs,
    source_citations: allCitations,
    audit_trail: trail,
    data: { individual_tests: individualTests, statuses_evaluated: statuses, test_count: statuses.length }
  });
}
