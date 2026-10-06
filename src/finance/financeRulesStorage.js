/**
 * Finance Rules & Channel Rates Storage
 * Derived directly from 'Finance Sheet.xlsx'
 * Supports Month-wise rules for April through Sept, with 'September Onwards'
 * acting as the rule for all subsequent months (Oct, Nov, Dec, Jan, Feb, Mar).
 */

export const FINANCE_CHANNEL_RULES = {
  'MYNTRA': {
    'April': { marginApparel: 0.15, marginFootwear: 0.10, marketing: '15% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'May': { marginApparel: 0.15, marginFootwear: 0.10, marketing: '15% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'June': { marginApparel: 0.15, marginFootwear: 0.10, marketing: '15% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'July': { marginApparel: 0.15, marginFootwear: 0.10, marketing: '15% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'August': { marginApparel: 0.15, marginFootwear: 0.10, marketing: '15% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'Sept': { marginApparel: 0.00, marginFootwear: 0.00, marketing: '18% of Net Revenue', logistics: 0.13, fixedFee: 0.05 },
    'September Onwards': { marginApparel: 0.00, marginFootwear: 0.00, marketing: '18% of Net Revenue', logistics: 0.13, fixedFee: 0.05 }
  },
  'FLIPKART': {
    'April': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: '1% (below 999 = 1%), above 1000 = 16%', marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'May': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: '1% (below 999 = 1%), above 1000 = 16%', marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'June': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: 0.01, marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'July': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: 0.01, marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'August': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: 0.01, marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'Sept': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: 0.01, marketing: 0.12, logistics: 0.04, fixedFee: 0.12 },
    'September Onwards': { marginApparel: '1% (below 999 = 0%), above 1000 = 16%', marginFootwear: 0.068, marketing: 0.12, logistics: 0.04, fixedFee: 0.05 }
  },
  'FIRSTCRY': {
    'April': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'May': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'June': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'July': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'August': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'Sept': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'September Onwards': { marginApparel: 0.42, marginFootwear: 0.42, marketing: 0, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' }
  },
  'AMAZON': {
    'April': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.22, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'May': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.17, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'June': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.27, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'July': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.31, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'August': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.35, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'Sept': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.30, logistics: 'Rs 52', fixedFee: 'Rs 66' },
    'September Onwards': { marginApparel: '0% (below 999 = 0%), above 1000 = 20%', marginFootwear: '0% (below 999 = 0%), above 1000 = 13%', marketing: 0.30, logistics: 'Rs 52', fixedFee: 'Rs 66' }
  },
  'AJIO': {
    'April': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'May': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'June': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'July': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'August': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'Sept': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'September Onwards': { marginApparel: 0.41, marginFootwear: 0.41, marketing: '0% (Included in Margin)', logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' }
  },
  'D2C': {
    'April': { marginApparel: 0.00, marginFootwear: 0.00, marketing: 0.529159, logistics: 'Rs. 100/Order', fixedFee: 0 },
    'May': { marginApparel: 0.00, marginFootwear: 0.00, marketing: 0.554028, logistics: 'Rs. 100/Order', fixedFee: 0 },
    'June': { marginApparel: 0.00, marginFootwear: 0.00, marketing: 0.497921, logistics: 'Rs. 100/Order', fixedFee: 0 },
    'July': { marginApparel: 0.00, marginFootwear: 0.00, marketing: 0.470000, logistics: 'Rs. 100/Order', fixedFee: 0 },
    'August': { marginApparel: 0.00, marginFootwear: 0.00, marketing: 0.460000, logistics: 'Rs. 100/Order', fixedFee: 0 },
    'Sept': { marginApparel: 0.00, marginFootwear: 0.00, marketing: '-', logistics: 'Rs. 100/Order', fixedFee: 0 },
    'September Onwards': { marginApparel: 0.00, marginFootwear: 0.00, marketing: '-', logistics: 'Rs. 100/Order', fixedFee: 0 }
  },
  'NYKAA': {
    'April': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'May': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'June': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'July': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'August': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'Sept': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' },
    'September Onwards': { marginApparel: 0.30, marginFootwear: 0.30, marketing: 0.03, logistics: '0% (Included in Margin)', fixedFee: '0% (Included in Margin)' }
  }
};

export const FINANCE_MONTH_OPTIONS = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'Sept',
  'September Onwards'
];

export const ALL_CHANNEL_KEYS = [
  'All',
  'MYNTRA',
  'FLIPKART',
  'FIRSTCRY',
  'AMAZON',
  'AJIO',
  'D2C',
  'NYKAA'
];

export const normalizeFinanceMonthKey = (monthInput) => {
  if (!monthInput) return 'September Onwards';
  let target = monthInput;
  if (Array.isArray(monthInput)) {
    if (monthInput.length === 0) return 'September Onwards';
    target = monthInput[0];
  }
  const str = String(target).trim().toLowerCase();
  if (str === 'all' || str === 'all months') return 'September Onwards';
  if (str.includes('apr')) return 'April';
  if (str.includes('may')) return 'May';
  if (str.includes('jun')) return 'June';
  if (str.includes('jul')) return 'July';
  if (str.includes('aug')) return 'August';
  if (str === 'sept' || str === 'sep' || str === 'september') return 'Sept';
  return 'September Onwards';
};

export const normalizeFinanceChannelKey = (channelInput) => {
  if (!channelInput) return 'All';
  let ch = channelInput;
  if (Array.isArray(channelInput)) {
    if (channelInput.length === 1) ch = channelInput[0];
    else return 'All';
  }
  const clean = String(ch).trim().toUpperCase();
  if (clean === 'ALL' || clean === 'ALL CHANNELS' || clean === '') return 'All';
  if (clean.includes('MYNTRA')) return 'MYNTRA';
  if (clean.includes('FLIPKART')) return 'FLIPKART';
  if (clean.includes('FIRSTCRY')) return 'FIRSTCRY';
  if (clean.includes('AMAZON')) return 'AMAZON';
  if (clean.includes('AJIO')) return 'AJIO';
  if (clean.includes('D2C') || clean.includes('WEBSITE') || clean.includes('SHOPIFY')) return 'D2C';
  if (clean.includes('NYKAA')) return 'NYKAA';
  return clean;
};

export const resolveChannelMonthRules = (channelInput, monthInput, customRules = null) => {
  const rules = customRules || FINANCE_CHANNEL_RULES;
  const channelKey = normalizeFinanceChannelKey(channelInput);
  const monthKey = normalizeFinanceMonthKey(monthInput);

  if (channelKey === 'All') {
    return {
      channelKey: 'All',
      channelDisplay: 'All Channels',
      monthKey,
      isAllChannels: true,
      rules: null
    };
  }

  const chData = rules[channelKey] || FINANCE_CHANNEL_RULES[channelKey] || FINANCE_CHANNEL_RULES['MYNTRA'];
  const monthRule = chData[monthKey] || chData['September Onwards'] || chData['Sept'] || Object.values(chData)[0];

  return {
    channelKey,
    channelDisplay: channelKey.charAt(0) + channelKey.slice(1).toLowerCase(),
    monthKey,
    isAllChannels: false,
    rules: monthRule
  };
};

/**
 * Calculate the 4 core Unit Economics tiles (Margin, Marketing, Logistic, Fixed Fee)
 */
export const calculateChannelTiles = ({
  channelKey,
  monthKey,
  salesData = [],
  revenue = 0,
  units = 0,
  customRules = null
}) => {
  const rules = customRules || FINANCE_CHANNEL_RULES;
  const normMonth = normalizeFinanceMonthKey(monthKey);
  const normChannel = normalizeFinanceChannelKey(channelKey);

  if (normChannel === 'All') {
    let totalMarginINR = 0;
    let totalMarketingINR = 0;
    let totalLogisticsINR = 0;
    let totalFixedFeeINR = 0;
    let totalRev = revenue > 0 ? revenue : 0;
    let totalUnits = units > 0 ? units : 0;

    const channels = ['MYNTRA', 'FLIPKART', 'FIRSTCRY', 'AMAZON', 'AJIO', 'D2C', 'NYKAA'];
    
    const chSalesMap = {};
    channels.forEach(ch => { chSalesMap[ch] = { revenue: 0, units: 0, items: [] }; });

    salesData.forEach(row => {
      const rowCh = normalizeFinanceChannelKey(row.channel_name || row.channel || '');
      if (chSalesMap[rowCh]) {
        const val = parseFloat(row.priceVal ?? row.new_sp ?? 0) || 0;
        chSalesMap[rowCh].revenue += val;
        chSalesMap[rowCh].units += 1;
        chSalesMap[rowCh].items.push(row);
      }
    });

    channels.forEach(ch => {
      const chRule = (rules[ch] && rules[ch][normMonth]) ? rules[ch][normMonth] : FINANCE_CHANNEL_RULES[ch]['September Onwards'];
      const chRev = chSalesMap[ch].revenue > 0 ? chSalesMap[ch].revenue : (totalRev / channels.length);
      const chUnits = chSalesMap[ch].units > 0 ? chSalesMap[ch].units : Math.round(totalUnits / channels.length);

      const singleRes = computeSingleChannelTiles(chRule, chRev, chUnits, chSalesMap[ch].items);
      totalMarginINR += singleRes.margin.inr;
      totalMarketingINR += singleRes.marketing.inr;
      totalLogisticsINR += singleRes.logistics.inr;
      totalFixedFeeINR += singleRes.fixedFee.inr;
    });

    const marginPct = totalRev > 0 ? (totalMarginINR / totalRev) * 100 : 0;
    const marketingPct = totalRev > 0 ? (totalMarketingINR / totalRev) * 100 : 0;
    const logisticsPct = totalRev > 0 ? (totalLogisticsINR / totalRev) * 100 : 0;
    const fixedFeePct = totalRev > 0 ? (totalFixedFeeINR / totalRev) * 100 : 0;

    return {
      channelKey: 'All',
      channelDisplay: 'All Channels',
      monthKey: normMonth,
      margin: {
        label: 'Margin (Fixed)',
        mainDisplay: marginPct.toFixed(1) + '%',
        inr: Math.round(totalMarginINR),
        badge: 'Blended Margin',
        subNote: 'Weighted across all 7 channels for ' + normMonth
      },
      marketing: {
        label: 'Marketing (Fixed)',
        mainDisplay: marketingPct.toFixed(1) + '%',
        inr: Math.round(totalMarketingINR),
        badge: 'Blended Ad Spend',
        subNote: 'Weighted ad spend across all channels'
      },
      logistics: {
        label: 'Logistic (Avg)',
        mainDisplay: logisticsPct.toFixed(1) + '%',
        inr: Math.round(totalLogisticsINR),
        badge: 'Blended Logistics',
        subNote: 'Weighted fulfillment cost across all channels'
      },
      fixedFee: {
        label: 'Fixed Fee (Avg)',
        mainDisplay: fixedFeePct.toFixed(1) + '%',
        inr: Math.round(totalFixedFeeINR),
        badge: 'Blended Closing Fee',
        subNote: 'Weighted marketplace fee across all channels'
      }
    };
  }

  // Single channel calculation
  const chData = rules[normChannel] || FINANCE_CHANNEL_RULES[normChannel] || FINANCE_CHANNEL_RULES['MYNTRA'];
  const monthRule = chData[normMonth] || chData['September Onwards'] || chData['Sept'] || Object.values(chData)[0];

  const channelSalesItems = salesData.filter(row => {
    const rowCh = normalizeFinanceChannelKey(row.channel_name || row.channel || '');
    return rowCh === normChannel;
  });

  const res = computeSingleChannelTiles(monthRule, revenue, units, channelSalesItems);
  return {
    channelKey: normChannel,
    channelDisplay: normChannel.charAt(0) + normChannel.slice(1).toLowerCase(),
    monthKey: normMonth,
    ...res
  };
};

function computeSingleChannelTiles(rule, revenue, units, salesItems = []) {
  const rev = Number(revenue) || 0;
  const count = Number(units) || 0;

  // 1. Margin (Fixed)
  let marginDisplay = '0%';
  let marginINR = 0;
  let marginBadge = 'Fixed Margin';
  let marginSubNote = 'Target channel gross margin';

  if (typeof rule.marginApparel === 'number' && typeof rule.marginFootwear === 'number') {
    if (rule.marginApparel === rule.marginFootwear) {
      const p = rule.marginApparel;
      marginDisplay = (p * 100).toFixed(p % 0.01 === 0 ? 0 : 1) + '%';
      marginINR = Math.round(rev * p);
      marginBadge = marginDisplay + ' Fixed';
      marginSubNote = 'Fixed margin for Apparel & Footwear';
    } else {
      const apPct = (rule.marginApparel * 100).toFixed(0);
      const fwPct = (rule.marginFootwear * 100).toFixed(0);
      marginDisplay = apPct + '% / ' + fwPct + '%';
      const avgRate = (rule.marginApparel + rule.marginFootwear) / 2;
      marginINR = Math.round(rev * avgRate);
      marginBadge = 'Apparel: ' + apPct + '% | Footwear: ' + fwPct + '%';
      marginSubNote = 'Apparel (' + apPct + '%) & Footwear (' + fwPct + '%)';
    }
  } else if (typeof rule.marginApparel === 'string') {
    const isAmazon = rule.marginApparel.includes('20%');
    const isFlipkart = rule.marginApparel.includes('16%');
    marginDisplay = isAmazon ? '20% Tiered' : (isFlipkart ? '16% Tiered' : rule.marginApparel);
    marginBadge = isAmazon ? '<₹999: 0% | ≥₹1000: 20%' : '<₹999: 0% | ≥₹1000: 16%';
    marginSubNote = 'Tiered by selling price';

    if (salesItems && salesItems.length > 0) {
      let calc = 0;
      salesItems.forEach(row => {
        const p = parseFloat(row.priceVal ?? row.new_sp ?? 0) || 0;
        if (isAmazon) {
          if (p >= 1000) calc += p * 0.20;
        } else if (isFlipkart) {
          if (p >= 1000) calc += p * 0.16;
          else calc += p * 0.01;
        }
      });
      marginINR = Math.round(calc);
    } else {
      const rate = isAmazon ? 0.20 : 0.16;
      marginINR = Math.round(rev * rate);
    }
  }

  // 2. Marketing (Fixed)
  let marketingDisplay = '0%';
  let marketingINR = 0;
  let marketingBadge = 'Ad Spend';
  let marketingSubNote = 'Marketing allocation on net sales';

  if (typeof rule.marketing === 'number') {
    const p = rule.marketing;
    marketingDisplay = (p * 100).toFixed(p % 0.01 === 0 ? 0 : 1) + '%';
    marketingINR = Math.round(rev * p);
    marketingBadge = marketingDisplay + ' of Net Revenue';
    marketingSubNote = 'Fixed percentage of net revenue';
  } else if (typeof rule.marketing === 'string') {
    const rawMkt = rule.marketing.trim();
    if (rawMkt.toLowerCase().includes('included')) {
      marketingDisplay = 'Included';
      marketingINR = 0;
      marketingBadge = 'Included in Margin';
      marketingSubNote = 'No additional ad spend deduction';
    } else if (rawMkt === '-') {
      marketingDisplay = '-';
      marketingINR = 0;
      marketingBadge = 'N/A';
      marketingSubNote = 'Not applicable for this period';
    } else if (rawMkt.includes('%')) {
      const match = rawMkt.match(/([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : 0;
      marketingDisplay = pct + '%';
      marketingINR = Math.round(rev * (pct / 100));
      marketingBadge = rawMkt;
      marketingSubNote = rawMkt;
    } else {
      marketingDisplay = rawMkt;
      marketingBadge = rawMkt;
    }
  }

  // 3. Logistic (Avg)
  let logisticsDisplay = '0%';
  let logisticsINR = 0;
  let logisticsBadge = 'Fulfillment';
  let logisticsSubNote = 'Shipping & logistics allocation';

  if (typeof rule.logistics === 'number') {
    const p = rule.logistics;
    logisticsDisplay = (p * 100).toFixed(p % 0.01 === 0 ? 0 : 1) + '%';
    logisticsINR = Math.round(rev * p);
    logisticsBadge = logisticsDisplay + ' Fulfillment';
    logisticsSubNote = 'Percentage-based logistics allocation';
  } else if (typeof rule.logistics === 'string') {
    if (rule.logistics.toLowerCase().includes('included')) {
      logisticsDisplay = 'Included';
      logisticsINR = 0;
      logisticsBadge = 'Included in Margin';
      logisticsSubNote = 'Logistics included in channel margin';
    } else if (rule.logistics.toLowerCase().includes('rs')) {
      const match = rule.logistics.match(/(\d+)/);
      const perOrder = match ? parseInt(match[1], 10) : 0;
      logisticsDisplay = '₹' + perOrder + ' / order';
      logisticsINR = Math.round(count * perOrder);
      logisticsBadge = '₹' + perOrder + ' / Order';
      logisticsSubNote = 'Fixed ₹' + perOrder + ' per fulfilled unit (' + count.toLocaleString('en-IN') + ' units)';
    } else {
      logisticsDisplay = rule.logistics;
      logisticsBadge = rule.logistics;
    }
  }

  // 4. Fixed Fee (Avg)
  let fixedFeeDisplay = '0%';
  let fixedFeeINR = 0;
  let fixedFeeBadge = 'Closing Fee';
  let fixedFeeSubNote = 'Marketplace closing & tech fee';

  if (typeof rule.fixedFee === 'number') {
    const p = rule.fixedFee;
    fixedFeeDisplay = (p * 100).toFixed(p % 0.01 === 0 ? 0 : 1) + '%';
    fixedFeeINR = Math.round(rev * p);
    fixedFeeBadge = fixedFeeDisplay + ' Fee';
    fixedFeeSubNote = 'Percentage marketplace closing fee';
  } else if (typeof rule.fixedFee === 'string') {
    if (rule.fixedFee.toLowerCase().includes('included')) {
      fixedFeeDisplay = 'Included';
      fixedFeeINR = 0;
      fixedFeeBadge = 'Included in Margin';
      fixedFeeSubNote = 'Fixed fees included in channel margin';
    } else if (rule.fixedFee.toLowerCase().includes('rs')) {
      const match = rule.fixedFee.match(/(\d+)/);
      const perOrder = match ? parseInt(match[1], 10) : 0;
      fixedFeeDisplay = '₹' + perOrder + ' / order';
      fixedFeeINR = Math.round(count * perOrder);
      fixedFeeBadge = '₹' + perOrder + ' / Order';
      fixedFeeSubNote = 'Fixed ₹' + perOrder + ' fee per unit (' + count.toLocaleString('en-IN') + ' units)';
    } else {
      fixedFeeDisplay = rule.fixedFee;
      fixedFeeBadge = rule.fixedFee;
    }
  }

  return {
    margin: {
      label: 'Margin (Fixed)',
      mainDisplay: marginDisplay,
      inr: marginINR,
      badge: marginBadge,
      subNote: marginSubNote
    },
    marketing: {
      label: 'Marketing (Fixed)',
      mainDisplay: marketingDisplay,
      inr: marketingINR,
      badge: marketingBadge,
      subNote: marketingSubNote
    },
    logistics: {
      label: 'Logistic (Avg)',
      mainDisplay: logisticsDisplay,
      inr: logisticsINR,
      badge: logisticsBadge,
      subNote: logisticsSubNote
    },
    fixedFee: {
      label: 'Fixed Fee (Avg)',
      mainDisplay: fixedFeeDisplay,
      inr: fixedFeeINR,
      badge: fixedFeeBadge,
      subNote: fixedFeeSubNote
    }
  };
}

const STORAGE_KEY = 'dyno_finance_channel_rules_v3';

export const loadFinanceRules = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...FINANCE_CHANNEL_RULES, ...JSON.parse(saved) };
      }
    }
  } catch (err) {
    console.error('Failed to load finance rules from localStorage:', err);
  }
  return JSON.parse(JSON.stringify(FINANCE_CHANNEL_RULES));
};

export const saveFinanceRules = (rules) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
    return true;
  } catch (err) {
    console.error('Failed to save finance rules to localStorage:', err);
    return false;
  }
};

export const resetFinanceRules = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to reset finance rules:', err);
  }
  return JSON.parse(JSON.stringify(FINANCE_CHANNEL_RULES));
};
