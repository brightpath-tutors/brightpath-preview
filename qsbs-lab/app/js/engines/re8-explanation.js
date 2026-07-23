// js/engines/re8-explanation.js
import { createEngineResult } from '../shared/engine-result.js';

export function buildExplanation(allResults, options) {
  options = options || {};
  allResults = allResults || {};

  const re1 = allResults.re1 || {};
  const re2 = allResults.re2 || {};
  const re3 = allResults.re3 || {};
  const re7 = allResults.re7 || {};

  const lawVersion = (re1.data && re1.data.law_version) || 'unknown';
  const acqDate = (re1.data && re1.data.acquisition_date_parsed) || 'an unknown date';
  const aga = re3.data ? re3.data.total_aga : null;
  const threshold = re3.data ? re3.data.threshold : null;
  const holdYears = re2.data ? re2.data.holding_years : null;
  const exclPct = re2.data ? re2.data.exclusion_pct : null;
  const overallStatus = re7.status || 'unknown';

  let lawLabel = lawVersion === 'post_july4_2025' ? 'Post-July 4, 2025 (One Big Beautiful Bill Act)' : 'Pre-July 5, 2025';

  let plainLanguage = 'Based on the information provided, the stock was acquired on ' + acqDate + ' under ' + lawLabel + ' rules. ';
  if (aga != null && threshold != null) {
    plainLanguage += 'The aggregate gross assets at issuance were approximately $' + (aga / 1e6).toFixed(1) + 'M, which is ' + (aga < threshold ? 'below' : 'above') + ' the $' + (threshold / 1e6).toFixed(0) + 'M threshold. ';
  }
  if (holdYears != null) {
    plainLanguage += 'The stock has been held for approximately ' + holdYears.toFixed(1) + ' years, ' + (exclPct > 0 ? 'qualifying for ' + (exclPct * 100) + '% exclusion' : 'not yet reaching the minimum holding period for any exclusion') + '. ';
  }
  plainLanguage += 'Overall assessment: ' + overallStatus.replace(/_/g, ' ') + '. Professional review is required before relying on this analysis.';

  // Consolidate sources and questions from all results
  const allSources = [], allPqs = [];
  const seen = {};
  Object.values(allResults).forEach(function(r) {
    if (!r) return;
    (r.source_citations || []).forEach(function(c) {
      if (!seen[c.rule]) { seen[c.rule] = true; allSources.push(c); }
    });
    (r.professional_review_questions || []).forEach(function(q) {
      if (allPqs.indexOf(q) < 0) allPqs.push(q);
    });
  });

  const allRisks = [], allMissing = [];
  Object.values(allResults).forEach(function(r) {
    if (!r) return;
    (r.risk_factors || []).forEach(function(f) { if (allRisks.indexOf(f) < 0) allRisks.push(f); });
    (r.missing_inputs || []).forEach(function(m) { if (allMissing.indexOf(m) < 0) allMissing.push(m); });
  });

  return createEngineResult({
    engine_id: 're8-explanation',
    engine_version: '1.0.0',
    status: overallStatus,
    summary: plainLanguage,
    professional_review_questions: allPqs,
    source_citations: allSources,
    risk_factors: allRisks,
    missing_inputs: allMissing,
    data: {
      plain_language: plainLanguage,
      source_register: allSources,
      professional_questions: allPqs,
      unresolved_risks: allRisks,
      missing_inputs: allMissing
    }
  });
}
