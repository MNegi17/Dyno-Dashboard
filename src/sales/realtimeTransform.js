import { normalizeChannelName } from './channelNormalization.js';
import { transformDate } from './dateTransformation.js';
import { lookupItem, deduceCategoryAndDivisionFromCode, updateItemDirectoryEntry } from './itemDirectory.js';
import { calculateMyntraAverageDiscountFromRows, computeChannelAdjustedSP } from './discountPricing.js';
import { getItemType } from '../uniware/catalogClient.js';

/**
 * Transform a single Sale Order Item into a Dyno Normalized Sales Row
 */
export function transformSaleOrderItem(order, item, myntraAvgDiscount) {
  // 1. Derive Item Color: itemName + "-" + color (e.g. "TGMOBS001166-MINT")
  let itemColor = 'Unknown';
  if (item.itemName && item.color) {
    itemColor = `${String(item.itemName).trim()}-${String(item.color).trim()}`;
  } else if (item.itemName) {
    itemColor = String(item.itemName).trim();
  } else if (item.itemSku) {
    itemColor = String(item.itemSku).trim();
  }

  // 2. Selling Price & MRP numeric conversion
  const rawPrice = item.sellingPrice ?? 0;
  const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice)) || 0;

  const rawMrp = item.maxRetailPrice ?? item.mrp ?? parsedPrice;
  const parsedMrp = typeof rawMrp === 'number' ? rawMrp : parseFloat(String(rawMrp)) || parsedPrice;

  // 3. Channel Normalization
  const channelName = normalizeChannelName(order.channel);

  // 4. Dynamic SP Calculation for Ajio, Cocoblu, Flipkart based on Myntra Average Discount
  const finalSp = computeChannelAdjustedSP(channelName, parsedPrice, parsedMrp, myntraAvgDiscount);

  // 5. Date Transformation (Asia/Kolkata timezone & fiscal year)
  const dateFields = transformDate(order.created);

  // 6. Item Directory Enrichment (Category & Division)
  const enrichment = lookupItem(item.itemSku, itemColor);

  // 7. Size Handling (preserve number or string, e.g. 8, "5-6Y", "XL")
  let itemTypeSize = 'Unknown';
  const rawSize = (item.size !== undefined && item.size !== null && String(item.size).trim() !== '' && String(item.size).trim() !== 'Unknown')
    ? item.size
    : enrichment.size;

  if (rawSize !== undefined && rawSize !== null && String(rawSize).trim() !== '' && String(rawSize).trim() !== 'Unknown') {
    if (typeof rawSize === 'number') {
      itemTypeSize = rawSize;
    } else if (!isNaN(Number(rawSize)) && !String(rawSize).includes('-') && !String(rawSize).includes('.')) {
      itemTypeSize = Number(rawSize);
    } else {
      itemTypeSize = String(rawSize).trim();
    }
  }

  return {
    fy: dateFields.fy,
    new_sp: finalSp,
    division: enrichment.division,
    priceVal: finalSp,
    monthName: dateFields.monthName,
    categories: enrichment.categories,
    item_color: itemColor,
    parsedDate: dateFields.parsedDate,
    channel_name: channelName,
    formattedDate: dateFields.formattedDate,
    item_type_size: itemTypeSize,
    mrp: parsedMrp,

    // Audit fields
    orderCode: order.code,
    orderItemCode: String(item.code),
    itemSku: String(item.itemSku || ''),
    enrichmentStatus: enrichment.enrichmentStatus
  };
}

/**
 * Transform multiple Sale Orders into Dyno Normalized Sales Rows with live catalog auto-learning
 */
export async function transformRealtimeOrders(orders = [], existingMyntraRows = []) {
  if (!orders || orders.length === 0) return [];

  // 1. Calculate Myntra Average Discount across existing Myntra rows + new orders
  const myntraItemsForDisc = [...existingMyntraRows];
  for (const order of orders) {
    const ch = normalizeChannelName(order.channel);
    if (ch === 'MYNTRA' || ch === 'MYNTRA_SJIT') {
      for (const it of order.saleOrderItems || []) {
        const sp = typeof it.sellingPrice === 'number' ? it.sellingPrice : parseFloat(String(it.sellingPrice)) || 0;
        const mrp = typeof it.maxRetailPrice === 'number' ? it.maxRetailPrice : parseFloat(String(it.maxRetailPrice)) || sp;
        if (mrp > 0 && sp > 0) {
          myntraItemsForDisc.push({ channel_name: 'MYNTRA', price_val: sp, mrp });
        }
      }
    }
  }

  const myntraAvgDiscount = calculateMyntraAverageDiscountFromRows(myntraItemsForDisc);

  // 2. Discover missing SKUs and auto-fetch from Uniware Item Catalog
  for (const order of orders) {
    for (const it of order.saleOrderItems || []) {
      if (it.itemSku) {
        const res = lookupItem(it.itemSku);
        if (res.enrichmentStatus === 'MISSING_ENRICHMENT') {
          try {
            const itemType = await getItemType(it.itemSku);
            if (itemType) {
              const rawStyle = itemType.name || '';
              const color = itemType.color || '';
              const itemColor = color ? `${rawStyle}-${color}` : rawStyle;
              const deduced = deduceCategoryAndDivisionFromCode(itemColor || it.itemSku);

              let finalDiv = itemType.categoryCode === 'APPAREL' ? 'APPAREL' : (itemType.categoryCode === 'FOOTWEAR' ? 'FOOTWEAR' : (itemType.categoryCode === 'ACCESSORIES' ? 'ACCESSORIES' : deduced.division));

              updateItemDirectoryEntry({
                sku: itemType.skuCode,
                itemColor,
                categories: deduced.categories,
                division: finalDiv,
                size: itemType.size || undefined,
                brand: itemType.brand || undefined
              });
            }
          } catch {
            // ignore catalog fetch failures
          }
        }
      }
    }
  }

  // 3. Transform all orders into Dyno Normalized Sales Rows
  const allRows = [];
  for (const order of orders) {
    for (const item of order.saleOrderItems || []) {
      allRows.push(transformSaleOrderItem(order, item, myntraAvgDiscount));
    }
  }

  return allRows;
}
