// js/shared/engine-result.js — P1: Universal EngineResult contract
// Every engine must return this shape.

export const QSBS_STATUS = Object.freeze({
  LIKELY_QUALIFIES: 'likely_qualifies_under_stated_assumptions',
  POTENTIALLY: 'potentially_qualifies',
  UNCERTAIN: 'uncertain_professional_review_required',
  LIKELY_NOT: 'likely_does_not_qualify',
  DOES_NOT: 'does_not_qualify_under_stated_assumptions',
  INSUFFICIENT: 'insufficient_information'
});

export function createEngineResult(overrides = {}) {
  return Object.assign({
    engine_id: '',
    engine_version: '1.0.0',
    calculated_at: null,
    status: null,
    value: null,
    confidence: 0,
    summary: '',
    note: '',
    supporting_facts: [],
    risk_factors: [],
    missing_inputs: [],
    warnings: [],
    errors: [],
    source_citations: [],
    professional_review_questions: [],
    audit_trail: null,
    data: {}
  }, overrides);
}
