// js/engines/re4-original-issue.js
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

const CONVERSION_SIGNALS = ['convert', 'revoke', 'reorganize', 'statutory_conversion', 'form_8832', 'check_the_box'];

export function evaluateOriginalIssue(scenario, options) {
  options = options || {};
  const warnings = [];

  // Explicit override
  if (scenario && scenario.is_original_issue === true) {
    return createEngineResult({
      engine_id: 're4-original-issue',
      status: 'pass',
      confidence: 80,
      summary: 'Stock marked as original issue by user.',
      note: 'Requires supporting documentation.',
      supporting_facts: ['User confirmed stock was originally issued by the corporation.'],
      professional_review_questions: ['Has original issuance been documented with a stock certificate, cap table entry, and board resolution?'],
      source_citations: [{ rule: '26 U.S.C. § 1202(c)(1)(B)', text: 'Stock must be acquired at original issuance from the corporation' }],
      data: { conversion_detected: false, original_issue_explicit: true }
    });
  }
  if (scenario && scenario.is_original_issue === false) {
    return createEngineResult({
      engine_id: 're4-original-issue',
      status: 'fail',
      confidence: 90,
      summary: 'Stock marked as NOT original issue.',
      risk_factors: ['Secondary-market acquisitions do not qualify for § 1202 exclusion.'],
      source_citations: [{ rule: '26 U.S.C. § 1202(c)(1)(B)', text: 'Stock must be acquired at original issuance' }],
      data: { conversion_detected: false, original_issue_explicit: false }
    });
  }

  // Check for conversion signals
  const entityPath = (scenario && scenario.entity_path) || '';
  const conversionDetected = CONVERSION_SIGNALS.some(function(s) { return entityPath.toLowerCase().indexOf(s) >= 0; });
  const conversionType = conversionDetected ? entityPath : null;

  const trail = buildAuditTrail('re4', { entity_path: entityPath, is_original_issue: scenario && scenario.is_original_issue }, []);
  addStep(trail, 'Scan entity_path for conversion signals', conversionDetected);
  addSource(trail, '26 U.S.C. § 1202(c)(1)(B)', 'Original issue requirement', '');

  return createEngineResult({
    engine_id: 're4-original-issue',
    engine_version: '1.0.0',
    status: QSBS_STATUS.UNCERTAIN,
    confidence: conversionDetected ? 40 : 55,
    summary: conversionDetected
      ? 'Conversion scenario detected — original issue status requires professional review.'
      : 'Original issue status not confirmed. Professional review required.',
    note: conversionDetected
      ? 'Whether stock issued after an LLC/S-corp conversion satisfies the original-issue requirement is fact-specific and requires legal analysis.'
      : 'Confirm stock was acquired directly from the corporation, not from a secondary seller.',
    risk_factors: conversionDetected
      ? ['Conversion/reorganization may not satisfy original-issue requirement — requires tax attorney review.']
      : ['Original issue status not confirmed.'],
    professional_review_questions: [
      'Was stock acquired directly from the corporation at original issuance (not purchased from another stockholder)?',
      conversionDetected ? 'Does the conversion satisfy the original-issue requirement under § 1202(c)(1)(B)? Has a qualified tax attorney reviewed the conversion mechanics?' : 'Does the acquisition documentation confirm original issue?',
      'Was any consideration other than cash paid, and if so, was the exchange properly documented?'
    ],
    source_citations: [{ rule: '26 U.S.C. § 1202(c)(1)(B)', text: 'Qualified small business stock must be originally issued' }],
    audit_trail: trail,
    data: { conversion_detected: conversionDetected, conversion_type: conversionType, original_issue_explicit: null }
  });
}
