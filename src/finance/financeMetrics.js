import { normalizeChannelName } from '../sales/channelNormalization.js';

/**
 * Calculates comprehensive financial metrics:
 * Gross Sales -> Returns/RTO -> Cancellations -> Net Realization
 */
export const calculateFinanceMetrics = ({
  salesData = [],
  returnData = [],
  cancellationData = [],
  allSalesData = [],
  selectedChannels = []
}) => {
  let grossRevenue = 0;
  let grossUnits = 0;
  const skuSalesMap = {};
  const channelMetricsMap = {};

  const ensureChannel = (ch) => {
    const norm = normalizeChannelName(ch) || 'OTHER';
    if (!channelMetricsMap[norm]) {
      channelMetricsMap[norm] = {
        channel: norm,
        grossRevenue: 0,
        grossUnits: 0,
        cancelledRevenue: 0,
        cancelledUnits: 0,
        returnRevenue: 0,
        returnUnits: 0,
        customerReturnRevenue: 0,
        customerReturnUnits: 0,
        rtoRevenue: 0,
        rtoUnits: 0,
        netRevenue: 0,
        netUnits: 0,
        realizationRate: 0
      };
    }
    return channelMetricsMap[norm];
  };

  // Build broader SKU ASP map from all sales data or current sales data
  const baseSales = (allSalesData && allSalesData.length > 0) ? allSalesData : salesData;
  baseSales.forEach(row => {
    const sku = (row.item_color || row.itemcolor || row.sku || '').trim().toUpperCase();
    const val = parseFloat(row.priceVal ?? row.new_sp ?? 0) || 0;
    if (sku && val > 0) {
      if (!skuSalesMap[sku]) skuSalesMap[sku] = { count: 0, revenue: 0 };
      skuSalesMap[sku].count += 1;
      skuSalesMap[sku].revenue += val;
    }
  });

  // 1. Process Sales (already filtered by App.jsx)
  salesData.forEach(row => {
    const val = parseFloat(row.priceVal ?? row.new_sp ?? 0) || 0;
    grossRevenue += val;
    grossUnits += 1;

    const ch = ensureChannel(row.channel_name || row.channel || 'Unknown');
    ch.grossRevenue += val;
    ch.grossUnits += 1;
  });

  const overallAvgASP = grossUnits > 0 ? (grossRevenue / grossUnits) : 850;

  // 2. Process Returns (already filtered by App.jsx)
  let totalReturnRevenue = 0;
  let totalReturnUnits = 0;
  let customerReturnRevenue = 0;
  let customerReturnUnits = 0;
  let rtoRevenue = 0;
  let rtoUnits = 0;

  returnData.forEach(row => {
    const qty = parseFloat(row.return_qty) || 1;
    const sku = (row.item_color || row.itemcolor || row.sku || '').trim().toUpperCase();

    // Priority 1: Exact 'Total' column from return file (as requested by user)
    let unitPrice = 0;
    const rowTotal = parseFloat(row.total ?? row.price ?? 0);
    if (rowTotal > 0) {
      unitPrice = rowTotal / (qty || 1);
    } else if (sku && skuSalesMap[sku] && skuSalesMap[sku].count > 0) {
      // Priority 2: Match against SKU sales ASP
      unitPrice = skuSalesMap[sku].revenue / skuSalesMap[sku].count;
    } else {
      // Priority 3: Overall Sales ASP
      unitPrice = overallAvgASP;
    }

    const returnVal = unitPrice * qty;
    totalReturnUnits += qty;
    totalReturnRevenue += returnVal;

    // Detect Customer Return vs Courier Return (RTO)
    const rawType = (row.return_type || row.returntype || row.type || '').toLowerCase().trim();
    const isRTO = rawType.includes('courier') || rawType.includes('rto');

    if (isRTO) {
      rtoUnits += qty;
      rtoRevenue += returnVal;
    } else {
      customerReturnUnits += qty;
      customerReturnRevenue += returnVal;
    }

    const ch = ensureChannel(row.channel_name || 'Unknown');
    ch.returnUnits += qty;
    ch.returnRevenue += returnVal;
    if (isRTO) {
      ch.rtoUnits += qty;
      ch.rtoRevenue += returnVal;
    } else {
      ch.customerReturnUnits += qty;
      ch.customerReturnRevenue += returnVal;
    }
  });

  // 3. Process Cancellations (filter by selectedChannels if selected)
  let totalCancelledRevenue = 0;
  let totalCancelledUnits = 0;

  (cancellationData || []).forEach(row => {
    const rawCh = row.channel_name || row['Channel Name'] || row.channel_entry || row.channel || 'Unknown';
    const chName = normalizeChannelName(rawCh);
    if (selectedChannels && selectedChannels.length > 0 && !selectedChannels.includes(chName)) {
      return;
    }

    const units = parseFloat(row.units ?? row.Units ?? row.qty ?? row.quantity ?? 0) || 0;
    const price = parseFloat(row.price ?? row['New SP'] ?? row.new_sp ?? row.total_price ?? row.total ?? 0) || 0;

    totalCancelledUnits += units;
    totalCancelledRevenue += price;

    const ch = ensureChannel(rawCh);
    ch.cancelledUnits += units;
    ch.cancelledRevenue += price;
  });

  // 4. Net Calculations
  const netRevenue = Math.max(0, grossRevenue - totalReturnRevenue - totalCancelledRevenue);
  const netUnits = Math.max(0, grossUnits - totalReturnUnits - totalCancelledUnits);
  const realizationRate = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
  const netASP = netUnits > 0 ? (netRevenue / netUnits) : 0;
  const grossASP = grossUnits > 0 ? (grossRevenue / grossUnits) : 0;
  const returnRate = grossUnits > 0 ? (totalReturnUnits / grossUnits) * 100 : 0;
  const cancellationRate = grossUnits > 0 ? (totalCancelledUnits / grossUnits) * 100 : 0;

  // Channel breakdown
  const channelBreakdown = Object.values(channelMetricsMap)
    .filter(ch => ch.grossUnits > 0 || ch.cancelledUnits > 0 || ch.returnUnits > 0)
    .map(ch => {
      const chNetRev = Math.max(0, ch.grossRevenue - ch.returnRevenue - ch.cancelledRevenue);
      const chNetUnits = Math.max(0, ch.grossUnits - ch.returnUnits - ch.cancelledUnits);
      const chRealization = ch.grossRevenue > 0 ? (chNetRev / ch.grossRevenue) * 100 : 0;
      return {
        ...ch,
        netRevenue: chNetRev,
        netUnits: chNetUnits,
        realizationRate: chRealization
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  // Waterfall Chart Data
  const waterfallData = [
    { name: 'Gross Revenue', value: Math.round(grossRevenue), displayVal: grossRevenue, fill: '#ba54f5' },
    { name: 'Cancellations', value: Math.round(totalCancelledRevenue), displayVal: totalCancelledRevenue, fill: '#8a70d6' },
    { name: 'Returns & RTO', value: Math.round(totalReturnRevenue), displayVal: totalReturnRevenue, fill: '#9d4edd' },
    { name: 'Net Revenue', value: Math.round(netRevenue), displayVal: netRevenue, fill: '#00f2c4' }
  ];

  return {
    gross: {
      revenue: grossRevenue,
      units: grossUnits,
      asp: grossASP
    },
    cancellations: {
      revenue: totalCancelledRevenue,
      units: totalCancelledUnits,
      rate: cancellationRate
    },
    returns: {
      revenue: totalReturnRevenue,
      units: totalReturnUnits,
      rate: returnRate,
      customerReturnRevenue,
      customerReturnUnits,
      rtoRevenue,
      rtoUnits
    },
    net: {
      revenue: netRevenue,
      units: netUnits,
      asp: netASP,
      realizationRate
    },
    channelBreakdown,
    waterfallData
  };
};
