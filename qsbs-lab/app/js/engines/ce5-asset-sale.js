// js/engines/ce5-asset-sale.js
import { lawConfig } from '../core/law-config.js';
import { createEngineResult } from '../shared/engine-result.js';
import { safeNumber } from '../shared/errors.js';
import { buildAuditTrail, addStep, addSource } from '../shared/audit-trail.js';

const DOUBLE_TAX_WARNING = 'QSBS exclusion does not protect corporate-level gain in an asset sale. Only a stock sale can benefit from § 1202 exclusion.';

export function calcAssetSaleTax(scenario, options) {
  options = options || {};
  const warnings = [DOUBLE_TAX_WARNING];
  try {
    const grossProceeds = safeNumber(scenario && scenario.gross_proceeds, 0, warnings);
    const assetBasis = safeNumber(scenario && (scenario.asset_basis || scenario.stock_basis || 0), 0, warnings);
    const stockBasis = safeNumber(scenario && scenario.stock_basis, 0, warnings);
    const federalRate = safeNumber(scenario && scenario.federal_rate, 0.20, warnings);
    const niitRate = safeNumber(scenario && scenario.niit_rate, 0.038, warnings);
    const stateRate = safeNumber(scenario && scenario.state_rate, 0, warnings);
    const corporateRate = lawConfig.rates.corporateFlat;

    const corporateGain = Math.max(0, grossProceeds - assetBasis);
    const corporateTax = corporateGain * corporateRate;
    const distributable = grossProceeds - corporateTax;
    const shareholderGain = Math.max(0, distributable - stockBasis);
    const shareholderTax = shareholderGain * (federalRate + niitRate + stateRate);
    const doubleTaxTotal = corporateTax + shareholderTax;
    const afterTaxProceeds = distributable - shareholderTax;

    const stockSaleAfterTax = options.stockSaleAfterTax || null;
    const savingsFromStockVsAsset = stockSaleAfterTax != null ? stockSaleAfterTax - afterTaxProceeds : null;

    const trail = buildAuditTrail('ce5', { gross_proceeds: grossProceeds, asset_basis: assetBasis }, []);
    addStep(trail, 'corporate_gain = ' + grossProceeds + ' - ' + assetBasis, corporateGain);
    addStep(trail, 'corporate_tax = ' + corporateGain + ' × ' + corporateRate, corporateTax);
    addStep(trail, 'distributable = ' + grossProceeds + ' - ' + corporateTax, distributable);
    addStep(trail, 'shareholder_gain = ' + distributable + ' - ' + stockBasis, shareholderGain);
    addStep(trail, 'shareholder_tax', shareholderTax);
    addStep(trail, 'double_tax_total', doubleTaxTotal);
    addSource(trail, '26 U.S.C. § 1202', 'QSBS does not protect asset sales at corporate level', '');

    return createEngineResult({
      engine_id: 'ce5-asset-sale',
      engine_version: '1.0.0',
      status: 'pass',
      value: afterTaxProceeds,
      summary: 'Asset sale: corporate tax $' + (corporateTax/1e6).toFixed(2) + 'M + shareholder tax $' + (shareholderTax/1e6).toFixed(2) + 'M = $' + (doubleTaxTotal/1e6).toFixed(2) + 'M total. QSBS exclusion not available.',
      warnings: warnings,
      audit_trail: trail,
      source_citations: [{ rule: '26 U.S.C. § 1202', text: 'QSBS exclusion applies only to stock sales, not asset sales' }],
      professional_review_questions: ['Has the buyer requested an asset sale? If so, has the tax cost been modeled relative to a stock sale?'],
      data: {
        corporate_gain: corporateGain, corporate_tax: corporateTax,
        distributable: distributable, shareholder_gain: shareholderGain,
        shareholder_tax: shareholderTax, double_tax_total: doubleTaxTotal,
        after_tax_proceeds: afterTaxProceeds,
        savings_from_stock_vs_asset: savingsFromStockVsAsset
      }
    });
  } catch (e) {
    return createEngineResult({ engine_id: 'ce5-asset-sale', status: 'fail', errors: [e.message || String(e)], warnings: [DOUBLE_TAX_WARNING] });
  }
}
