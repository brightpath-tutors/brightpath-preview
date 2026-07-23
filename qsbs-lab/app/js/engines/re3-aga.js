// js/engines/re3-aga.js
import { lawConfig, getLawVersion, getLawConfig } from '../core/law-config.js';
import { createEngineResult, QSBS_STATUS } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

const VALUATION_PARADOX = 'A higher FMV for contributed property increases the §1202 basis ceiling but also increases aggregate gross assets and may cause the threshold to be exceeded. Choosing a higher number does not make it supportable — it must be independently defensible.';

function getAlertLevel(ratio) {
  if (ratio < 0.50) return 'safe';
  if (ratio < 0.80) return 'watch';
  if (ratio < 0.95) return 'warning';
  if (ratio < 1.00) return 'critical';
  return 'exceeded';
}

export function evaluateAGA(scenario, options) {
  options = options || {};
  const warnings = [], missing = [];
  const lawVersion = scenario && (scenario.law_version || getLawVersion(scenario.acquisition_date) || 'post_july4_2025');
  const cfg = getLawConfig(lawVersion) || lawConfig.lawVersions.post_july4_2025;
  const threshold = cfg.grossAssetsThreshold;

  // Extract assets — from scenario.asset_record or direct scenario fields
  const rec = (scenario && scenario.asset_record) || scenario || {};

  const components = [];
  let total = 0;

  function addAsset(label, value, treatment) {
    const n = safeNumber(value, 0, warnings);
    if (n > 0) { components.push({ label: label, value: n, treatment: treatment }); total += n; }
  }

  addAsset('Cash', rec.cash, 'Face value per § 1202(d)(2)(A)');
  addAsset('Receivables (tax basis)', rec.receivables_basis, 'Adjusted tax basis');
  addAsset('Equipment (tax basis)', rec.equipment_basis, 'Adjusted tax basis — NOT FMV');
  addAsset('Software / Capitalized Dev (tax basis)', rec.software_basis, 'Adjusted tax basis');
  addAsset('Capitalized Development (tax basis)', rec.cap_dev_basis, 'Adjusted tax basis');
  addAsset('Acquired IP (tax basis)', rec.acquired_ip_basis, 'Adjusted tax basis');
  addAsset('Contributed Property (FMV at contribution)', rec.contributed_property_fmv, 'FMV per § 1202(d)(2)(B) special rule');
  addAsset('Investments (tax basis)', rec.investments_basis, 'Adjusted tax basis');
  addAsset('Other Assets (tax basis)', rec.other_asset_bases, 'Adjusted tax basis');

  // Controlled group and predecessor
  const cgAssets = safeNumber((scenario && scenario.controlled_group_assets) || options.controlled_group_assets, 0, warnings);
  const predAssets = safeNumber((scenario && scenario.predecessor_assets) || options.predecessor_assets, 0, warnings);
  if (cgAssets > 0) { components.push({ label: 'Controlled Group Assets', value: cgAssets, treatment: '§ 1202(d)(3)' }); total += cgAssets; }
  if (predAssets > 0) { components.push({ label: 'Predecessor Entity Assets', value: predAssets, treatment: '§ 1202(d)(3)' }); total += predAssets; }

  // Note exclusions
  if (rec.goodwill_fmv > 0) warnings.push('goodwill_fmv excluded from AGA — FMV of goodwill is not an asset basis per § 1202(d)');
  if (rec.enterprise_value > 0) warnings.push('enterprise_value excluded from AGA — enterprise value is not an aggregate gross asset per § 1202(d)');

  const exceeds = total >= threshold;
  const ratio = threshold > 0 ? total / threshold : 0;
  const headroom = threshold - total;
  const alertLevel = getAlertLevel(ratio);

  const status = components.length === 0 ? QSBS_STATUS.INSUFFICIENT : (exceeds ? 'fail' : 'pass');

  const trail = buildAuditTrail('re3', { asset_record: rec, law_version: lawVersion }, [], cfg);
  addStep(trail, 'Sum asset tax bases', total);
  addStep(trail, 'Compare to threshold ' + threshold, exceeds ? 'EXCEEDS' : 'WITHIN');
  addSource(trail, '26 U.S.C. § 1202(d)', 'Aggregate gross assets definition and threshold', '');

  const pqs = [
    'Has each asset value been confirmed as the adjusted tax basis (not book value or FMV)?',
    'Has contributed property FMV been independently appraised on the contribution date?',
    'Are there any controlled group entities whose assets must be included?'
  ];
  if (alertLevel === 'critical' || alertLevel === 'exceeded') {
    pqs.push('The AGA is near or above the threshold — has a qualified tax attorney confirmed the AGA calculation?');
  }

  return createEngineResult({
    engine_id: 're3-aga',
    engine_version: '1.0.0',
    status: status,
    value: total,
    confidence: components.length > 0 ? (alertLevel === 'safe' ? 85 : 70) : 0,
    summary: 'Aggregate gross assets: ' + (total / 1e6).toFixed(2) + 'M vs threshold ' + (threshold / 1e6).toFixed(0) + 'M. Status: ' + alertLevel.toUpperCase(),
    note: exceeds ? 'AGA exceeds threshold. Stock does not qualify for § 1202 exclusion.' : 'AGA within threshold. Headroom: $' + (headroom / 1e6).toFixed(1) + 'M.',
    supporting_facts: !exceeds && total > 0 ? ['AGA of $' + (total / 1e6).toFixed(1) + 'M is below $' + (threshold / 1e6).toFixed(0) + 'M threshold.'] : [],
    risk_factors: exceeds ? ['AGA of $' + (total / 1e6).toFixed(1) + 'M exceeds threshold of $' + (threshold / 1e6).toFixed(0) + 'M. Stock is disqualified.'] : (alertLevel === 'critical' ? ['AGA is within 5% of threshold — any additional assets or capital raise may cause disqualification.'] : []),
    warnings: warnings,
    missing_inputs: missing,
    source_citations: [{ rule: '26 U.S.C. § 1202(d)', text: 'Aggregate gross assets definition and threshold' }],
    professional_review_questions: pqs,
    audit_trail: trail,
    data: {
      total_aga: total,
      components: components,
      threshold: threshold,
      headroom: headroom,
      headroom_pct: ratio > 0 ? (1 - ratio) * 100 : 100,
      exceeds: exceeds,
      alert_level: alertLevel,
      controlled_group_included: cgAssets,
      predecessor_included: predAssets,
      valuation_paradox_note: VALUATION_PARADOX
    }
  });
}
