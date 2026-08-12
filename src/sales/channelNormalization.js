/**
 * Normalize raw Uniware channel codes to standard Dyno Dashboard channel names
 */
export function normalizeChannelName(rawName) {
  if (!rawName) return 'Unknown';
  const name = rawName.toString().trim();
  const upper = name.toUpperCase();

  if (upper.includes('MYNTRA_ONLINE') || upper.includes('MYNTRA_ONL') || upper === 'PUSPL _MYNTRA_ONL' || upper === 'PUSPL__MYNTRA_ONLINE') {
    return 'MYNTRA';
  }
  if (upper === 'FIRSTCRY') {
    return 'FIRSTCRY';
  }
  if (upper.includes('SHOPIFY') || upper.includes('D2C') || upper === 'D2C_SHOPIFY' || upper === 'D2C SHOPIFY' || upper === 'SHOPIFY' || upper === 'D2C') {
    return 'D2C';
  }
  if (upper.includes('COCOBLU_ONLINE') || upper.includes('COCOBLU_ON') || upper === 'PUSPL _COCOBLU_ON' || upper === 'AMAZON_COCOBLU' || upper === 'COCOBLU') {
    return 'AMAZON_COCOBLU';
  }
  if (upper === 'AMAZON_FLEX_API' || upper === 'AMAZON_IN_API' || upper === 'AMAZON') {
    return 'AMAZON';
  }
  if (upper === 'AJIO_DROPSHIP' || upper === 'AJIO DROPSHIP' || upper === 'AJIO_DRPSHP' || upper === 'AJIO') {
    return 'AJIO';
  }
  if (upper.includes('FLIPKART_ONLINE') || upper.includes('FLIPKART_ON') || upper === 'PUSPL _FLIPKART_ON' || upper === 'FLIPKART') {
    return 'FLIPKART';
  }
  if (upper.includes('NYKAA_ONLINE') || upper.includes('NYKAA_ONLIN') || upper === 'PUSPL _NYKAA_ONLIN' || upper === 'NYKAA') {
    return 'NYKAA';
  }
  if (upper === 'AMAZON_FBA') {
    return 'AMAZON_FBA';
  }
  if (upper === 'MYNTRA_SJIT') {
    return 'MYNTRA_SJIT';
  }

  return name;
}
