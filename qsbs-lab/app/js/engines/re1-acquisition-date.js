// js/engines/re1-acquisition-date.js
import { lawConfig, getLawVersion, getLawConfig } from '../core/law-config.js';
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

export function evaluateAcquisitionDate(scenario, options) {
  const errors = [], warnings = [], missing = [];
  const acqDate = scenario && scenario.acquisition_date;

  if (!acqDate) {
    return createEngineResult({
      engine_id: 're1-acquisition-date',
      engine_version: '1.0.0',
      status: QSBS_STATUS.INSUFFICIENT,
      confidence: 0,
      summary: 'Acquisition date not provided.',
      missing_inputs: ['acquisition_date'],
      professional_review_questions: [
        'What is the stock acquisition date?',
        'Has the acquisition date been documented with a stock certificate or purchase agreement?'
      ],
      source_citations: [{ rule: '26 U.S.C. § 1202', text: 'Acquisition date determines applicable law version' }]
    });
  }

  const d = new Date(acqDate);
  if (isNaN(d.getTime())) {
    return createEngineResult({
      engine_id: 're1-acquisition-date',
      status: QSBS_STATUS.INSUFFICIENT,
      missing_inputs: ['acquisition_date'],
      errors: ['Invalid acquisition_date format: ' + acqDate]
    });
  }

  const cutoff = new Date('2025-07-05');
  const isHistorical = d < cutoff;
  const versionId = isHistorical ? 'historical' : 'post_july4_2025';
  const cfg = getLawConfig(versionId);

  const trail = buildAuditTrail('re1', { acquisition_date: acqDate }, [], cfg);
  addStep(trail, 'Compare acquisition_date to cutoff 2025-07-05', 'is_historical=' + isHistorical);
  addSource(trail, '26 U.S.C. § 1202 as amended by One Big Beautiful Bill Act (2025)',
    'Law version determined by acquisition date', '');

  return createEngineResult({
    engine_id: 're1-acquisition-date',
    engine_version: '1.0.0',
    status: 'pass',
    confidence: 95,
    summary: 'Law version determined: ' + cfg.name,
    note: isHistorical ? 'Pre-July 5, 2025 rules apply ($50M threshold, $10M limit).' : 'Post-July 4, 2025 rules apply ($75M threshold, $15M limit, 3/4/5yr tiers).',
    source_citations: [{ rule: '26 U.S.C. § 1202 as amended by One Big Beautiful Bill Act (2025)', text: 'Law version determined by acquisition date', url: '' }],
    professional_review_questions: [
      'Has the acquisition date been documented with a stock certificate or purchase agreement?',
      'If stock was received for services, is the acquisition date the vesting date or grant date?'
    ],
    audit_trail: trail,
    data: {
      law_version: versionId,
      law_config_block: cfg,
      is_historical: isHistorical,
      cutoff_date: '2025-07-05',
      acquisition_date_parsed: acqDate
    }
  });
}
