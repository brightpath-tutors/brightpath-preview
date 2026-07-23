// js/engines/rules-engine.js — M2: QSBS evaluation orchestrator
import { getLawVersion } from '../core/law-config.js';
import { createEngineResult } from '../shared/engine-result.js';
import { evaluateAcquisitionDate } from './re1-acquisition-date.js';
import { evaluateHoldingPeriod } from './re2-holding-period.js';
import { evaluateAGA } from './re3-aga.js';
import { evaluateOriginalIssue } from './re4-original-issue.js';
import { evaluateActiveBusiness } from './re5-active-business.js';
import { evaluateExcludedBusiness } from './re6-excluded-business.js';
import { aggregateQualificationResult } from './re7-qualification-decision.js';
import { buildExplanation } from './re8-explanation.js';

export function evaluateQSBS(scenario) {
  try {
    if (!scenario) {
      return createEngineResult({
        engine_id: 'rules-engine',
        status: 'insufficient_information',
        missing_inputs: ['scenario'],
        summary: 'No scenario provided.'
      });
    }

    // Enrich with law version
    if (!scenario.law_version) {
      scenario = Object.assign({}, scenario, { law_version: getLawVersion(scenario.acquisition_date) || 'post_july4_2025' });
    }

    const re1 = evaluateAcquisitionDate(scenario);
    const re2 = evaluateHoldingPeriod(scenario);
    const re3 = evaluateAGA(scenario);
    const re4 = evaluateOriginalIssue(scenario);
    const re5 = evaluateActiveBusiness(scenario, { bizQualResult: scenario.business_qual });
    const re6 = evaluateExcludedBusiness(scenario, { bizQualResult: scenario.business_qual });
    const re7 = aggregateQualificationResult({ re1, re2, re3, re4, re5, re6 });
    const explanation = buildExplanation({ re1, re2, re3, re4, re5, re6, re7 });

    return Object.assign({}, re7, { re1, re2, re3, re4, re5, re6, explanation });
  } catch (e) {
    return createEngineResult({ engine_id: 'rules-engine', status: 'fail', errors: [e.message || String(e)] });
  }
}

export { evaluateAcquisitionDate, evaluateHoldingPeriod, evaluateAGA,
  evaluateOriginalIssue, evaluateActiveBusiness, evaluateExcludedBusiness,
  aggregateQualificationResult, buildExplanation };
