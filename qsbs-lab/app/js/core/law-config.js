// js/core/law-config.js — single source of truth for all QSBS tax law constants
// NEVER hardcode thresholds anywhere else — always read from this module.

function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const val = obj[name];
    if (val && typeof val === 'object') deepFreeze(val);
  });
  return Object.freeze(obj);
}

export const lawConfig = deepFreeze({
  lawVersions: {
    historical: {
      version_id: 'historical',
      name: 'Pre-July 5, 2025',
      effectiveThrough: '2025-07-04',
      grossAssetsThreshold: 50000000,
      fixedDollarLimit: 10000000,
      exclusionSchedule: { 5: 1.00 },
      minHoldYearsForAnyExclusion: 5,
      source: '26 U.S.C. § 1202',
      dateChecked: '2026-06-01'
    },
    post_july4_2025: {
      version_id: 'post_july4_2025',
      name: 'Post-July 4, 2025 (One Big Beautiful Bill Act)',
      effectiveFrom: '2025-07-05',
      grossAssetsThreshold: 75000000,
      fixedDollarLimit: 15000000,
      exclusionSchedule: { 3: 0.50, 4: 0.75, 5: 1.00 },
      minHoldYearsForAnyExclusion: 3,
      source: 'One Big Beautiful Bill Act (2025), amending 26 U.S.C. § 1202',
      dateChecked: '2026-06-01',
      notes: 'Verify current law before relying on these figures. Professional review required.'
    }
  },
  cutoffDate: '2025-07-05',
  rates: {
    ltcg: 0.20,
    niit: 0.038,
    ordinaryTop: 0.37,
    corporateFlat: 0.21
  },
  excludedBusinessCategories: [
    'health', 'law', 'engineering', 'architecture', 'accounting',
    'actuarial_science', 'performing_arts', 'consulting', 'athletics',
    'financial_services', 'brokerage_services', 'reputation_or_skill',
    'banking', 'insurance', 'financing', 'leasing', 'investing',
    'farming', 'extraction', 'hotel_restaurant'
  ],
  statusVocabulary: [
    'likely_qualifies_under_stated_assumptions',
    'potentially_qualifies',
    'uncertain_professional_review_required',
    'likely_does_not_qualify',
    'does_not_qualify_under_stated_assumptions',
    'insufficient_information'
  ]
});

export function getLawVersion(acquisitionDate) {
  if (!acquisitionDate) return null;
  const d = new Date(acquisitionDate);
  if (isNaN(d.getTime())) return null;
  const cutoff = new Date('2025-07-05');
  return d < cutoff ? 'historical' : 'post_july4_2025';
}

export function getLawConfig(versionId) {
  return lawConfig.lawVersions[versionId] || null;
}

export function getExclusionPct(versionId, holdingYears) {
  const cfg = getLawConfig(versionId);
  if (!cfg) return 0;
  const schedule = cfg.exclusionSchedule;
  const keys = Object.keys(schedule).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (holdingYears >= k) return schedule[k];
  }
  return 0;
}
