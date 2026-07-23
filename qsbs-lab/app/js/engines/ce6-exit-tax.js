// js/engines/ce6-exit-tax.js
import { createEngineResult } from '../shared/engine-result.js';
import { calcStockSaleTax } from './ce4-stock-sale.js';
import { calcAssetSaleTax } from './ce5-asset-sale.js';

export function calcExitTax(scenario, options) {
  options = options || {};
  try {
    const stockSale = calcStockSaleTax(scenario, options);
    const assetSale = calcAssetSaleTax(scenario, { stockSaleAfterTax: stockSale.data ? stockSale.data.after_tax_proceeds : null });

    const baselineTotalTax = stockSale.data ? stockSale.data.baseline_tax : 0;
    const withQsbsTax = stockSale.data ? stockSale.data.total_tax : 0;
    const savingsFromQsbs = baselineTotalTax - withQsbsTax;

    const historical = calcStockSaleTax(Object.assign({}, scenario, { law_version: 'historical' }), options);
    const postChange = calcStockSaleTax(Object.assign({}, scenario, { law_version: 'post_july4_2025' }), options);
    const oldVsNew = {
      historical: historical,
      post_july4_2025: postChange,
      difference: {
        excluded_gain: (postChange.data ? postChange.data.excluded_gain : 0) - (historical.data ? historical.data.excluded_gain : 0),
        total_tax: (postChange.data ? postChange.data.total_tax : 0) - (historical.data ? historical.data.total_tax : 0),
        after_tax_proceeds: (postChange.data ? postChange.data.after_tax_proceeds : 0) - (historical.data ? historical.data.after_tax_proceeds : 0)
      }
    };

    return createEngineResult({
      engine_id: 'ce6-exit-tax',
      engine_version: '1.0.0',
      status: 'pass',
      value: savingsFromQsbs,
      summary: 'QSBS savings vs. no exclusion: $' + (savingsFromQsbs / 1e6).toFixed(2) + 'M.',
      source_citations: [{ rule: '26 U.S.C. § 1202', text: 'QSBS exit tax analysis' }],
      data: {
        stock_sale: stockSale,
        asset_sale: assetSale,
        baseline_total_tax: baselineTotalTax,
        savings_from_qsbs: savingsFromQsbs,
        old_vs_new_law: oldVsNew,
        sale_type: scenario && scenario.sale_type
      }
    });
  } catch (e) {
    return createEngineResult({ engine_id: 'ce6-exit-tax', status: 'fail', errors: [e.message || String(e)] });
  }
}
