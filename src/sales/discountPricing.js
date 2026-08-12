const DEFAULT_MYNTRA_DISCOUNT = 0.52; // Fallback 52% if no Myntra orders yet

/**
 * Calculates Myntra's Total Average Discount across a set of sales rows.
 * Formula: For each Myntra item, Discount = 1 - (SP / MRP).
 * MyntraAvgDiscount = Sum(Discounts) / Count(Myntra items).
 */
export function calculateMyntraAverageDiscountFromRows(rows = []) {
  let discSum = 0;
  let count = 0;

  for (const r of rows) {
    const ch = (r.channel_name || '').toUpperCase();
    if (ch === 'MYNTRA' || ch === 'MYNTRA_SJIT') {
      const sp = r.price_val || r.new_sp || r.priceVal || 0;
      const mrp = r.mrp || sp;
      if (mrp > 0 && sp > 0) {
        const disc = 1.0 - (sp / mrp);
        discSum += disc;
        count++;
      }
    }
  }

  if (count === 0) {
    return DEFAULT_MYNTRA_DISCOUNT;
  }

  return discSum / count;
}

/**
 * Check if channel requires dynamic SP calculation based on Myntra's Average Discount
 */
export function isChannelDiscountRecalculated(channelName) {
  if (!channelName) return false;
  const upper = channelName.trim().toUpperCase();
  return (
    upper === 'AJIO' ||
    upper === 'AJIO_DROPSHIP' ||
    upper === 'AMAZON_COCOBLU' ||
    upper === 'COCOBLU' ||
    upper === 'COCOBLU_ONLINE' ||
    upper === 'FLIPKART' ||
    upper === 'FLIPKART_ONLINE'
  );
}

/**
 * Calculate dynamic SP for Ajio, Cocoblu, and Flipkart products:
 * Formula: SP = MRP - (MRP * MyntraAvgDiscount)
 */
export function computeChannelAdjustedSP(channelName, rawSp, mrp, myntraAvgDiscount = DEFAULT_MYNTRA_DISCOUNT) {
  if (!isChannelDiscountRecalculated(channelName)) {
    return rawSp;
  }

  const effectiveMrp = mrp > 0 ? mrp : rawSp;
  const calculatedSp = effectiveMrp - (effectiveMrp * myntraAvgDiscount);
  return Math.round(calculatedSp * 100) / 100;
}
