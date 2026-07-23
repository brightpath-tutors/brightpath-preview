// js/engines/re2-holding-period.js
import { lawConfig, getLawVersion, getLawConfig, getExclusionPct } from '../core/law-config.js';
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

function yearsBetween(dateA, dateB) {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return (dateB - dateA) / msPerYear;
}

export function evaluateHoldingPeriod(scenario, options) {
  options = options || {};
  const errors = [], warnings = [], missing = [];

  if (!scenario || !scenario.acquisition_date) {
    return createEngineResult({
      engine_id: 're2-holding-period',
      status: QSBS_STATUS.INSUFFICIENT,
      missing_inputs: ['acquisition_date'],
      summary: 'Acquisition date required to compute holding period.'
    });
  }

  const acqDate = new Date(scenario.acquisition_date);
  if (isNaN(acqDate.getTime())) {
    return createEngineResult({ engine_id: 're2-holding-period', status: 'fail', errors: ['Invalid acquisition_date'] });
  }

  const lawVersion = scenario.law_version || getLawVersion(scenario.acquisition_date) || 'post_july4_2025';
  const cfg = getLawConfig(lawVersion);

  let holdingYears;
  if (scenario.exit_date) {
    const exitDate = new Date(scenario.exit_date);
    holdingYears = isNaN(exitDate.getTime()) ? null : yearsBetween(acqDate, exitDate);
  } else if (scenario.exit_year != null) {
    holdingYears = safeNumber(scenario.exit_year, null, warnings);
  } else {
    // use today as prospective hold
    holdingYears = yearsBetween(acqDate, new Date());
  }

  const exclusionPct = holdingYears != null ? getExclusionPct(lawVersion, holdingYears) : 0;
  const minYears = cfg ? cfg.minHoldYearsForAnyExclusion : 5;

  // Build milestones
  const milestones = [];
  if (cfg && cfg.exclusionSchedule) {
    Object.keys(cfg.exclusionSchedule).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(yr) {
      const pct = cfg.exclusionSchedule[yr];
      const ms = new Date(acqDate.getTime() + Number(yr) * 365.25 * 24 * 60 * 60 * 1000);
      milestones.push({
        years: Number(yr),
        pct: pct,
        date: ms.toISOString().split('T')[0],
        label: (pct * 100) + '% exclusion at ' + yr + '-year mark',
        reached: holdingYears != null && holdingYears >= Number(yr)
      });
    });
  }

  const status = holdingYears == null
    ? QSBS_STATUS.UNCERTAIN
    : (holdingYears >= minYears ? 'pass' : 'fail');

  const trail = buildAuditTrail('re2', { acquisition_date: scenario.acquisition_date, exit_year: scenario.exit_year }, [], cfg);
  addStep(trail, 'Compute holding_years', holdingYears);
  addStep(trail, 'Look up exclusion_pct in schedule', exclusionPct);
  addSource(trail, '26 U.S.C. § 1202(a)', 'Holding period determines exclusion percentage', '');

  return createEngineResult({
    engine_id: 're2-holding-period',
    engine_version: '1.0.0',
    status: status,
    value: holdingYears,
    confidence: holdingYears != null ? 90 : 50,
    summary: holdingYears != null
      ? 'Holding period: ' + holdingYears.toFixed(1) + ' years. Exclusion: ' + (exclusionPct * 100) + '%.'
      : 'Exit date not specified — holding period uncertain.',
    supporting_facts: holdingYears >= minYears ? ['Holding period of ' + holdingYears.toFixed(1) + ' years meets minimum ' + minYears + '-year requirement.'] : [],
    risk_factors: holdingYears != null && holdingYears < minYears ? ['Holding period of ' + holdingYears.toFixed(1) + ' years does not yet meet ' + minYears + '-year minimum.'] : [],
    warnings: warnings,
    source_citations: [{ rule: '26 U.S.C. § 1202(a)', text: 'Holding period and exclusion percentage' }],
    professional_review_questions: [
      'Has the holding period been computed from the correct acquisition date?',
      'If stock was received in multiple tranches, have all acquisition dates been tracked separately?'
    ],
    audit_trail: trail,
    data: { holding_years: holdingYears, exclusion_pct: exclusionPct, law_version: lawVersion, milestones: milestones }
  });
}
