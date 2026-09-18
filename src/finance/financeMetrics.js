import { normalizeChannelName } from '../sales/channelNormalization';

/**
 * Calculates comprehensive financial metrics:
 * Gross Sales -> Returns/RTO -> Cancellations -> Net Realization
 */
export const calculateFinanceMetrics = ({
  salesData = [],
  returnData = [],
  cancellationData = [],
  selectedMonth = 'July'
}) => {
  // 1. Filter Sales for Selected Month
  const monthSales = salesData.filter(row => {
    if (!selectedMonth || selectedMonth === 'All') return true;
    return (row.monthName || '').toLowerCase() === selectedMonth.toLowerCase();
  });

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
        rtoRevenue: 0,
        rtoUnits: 0,
        netRevenue: 0,
        netUnits: 0,
        realizationRate: 0
      };
    }
    return channelMetricsMap[norm];
  };

  monthSales.forEach(row => {
    const val = parseFloat(row.priceVal) || 0;
    grossRevenue += val;
    grossUnits += 1;

    // Track SKU average selling price for smart return valuation
    const sku = (row.item_color || row.itemcolor || row.sku || '').trim().toUpperCase();
    if (sku) {
      if (!skuSalesMap[sku]) {
        skuSalesMap[sku] = { count: 0, revenue: 0 };
      }
      skuSalesMap[sku].count += 1;
      skuSalesMap[sku].revenue += val;
    }

    const ch = ensureChannel(row.channel_name || row.channel || 'Unknown');
    ch.grossRevenue += val;
    ch.grossUnits += 1;
  });

  const overallAvgASP = grossUnits > 0 ? (grossRevenue / grossUnits) : 0;

  // 2. Filter & Value Returns
  const monthReturns = returnData.filter(row => {
    if (!selectedMonth || selectedMonth === 'All') return true;
    return (row.monthName || '').toLowerCase() === selectedMonth.toLowerCase();
  });

  let totalReturnRevenue = 0;
  let totalReturnUnits = 0;
  let customerReturnRevenue = 0;
  let customerReturnUnits = 0;
  let rtoRevenue = 0;
  let rtoUnits = 0;

  monthReturns.forEach(row => {
    const qty = parseFloat(row.return_qty) || 1;
    const sku = (row.item_color || '').trim().toUpperCase();

    // Determine unit price: explicitly provided, or matched against SKU sales ASP, or overall ASP
    let unitPrice = 0;
    if (row.price !== undefined && !isNaN(parseFloat(row.price))) {
      unitPrice = parseFloat(row.price);
    } else if (row.total !== undefined && !isNaN(parseFloat(row.total))) {
      unitPrice = parseFloat(row.total) / (qty || 1);
    } else if (sku && skuSalesMap[sku] && skuSalesMap[sku].count > 0) {
      unitPrice = skuSalesMap[sku].revenue / skuSalesMap[sku].count;
    } else {
      unitPrice = overallAvgASP;
    }

    const returnVal = unitPrice * qty;
    totalReturnUnits += qty;
    totalReturnRevenue += returnVal;

    // Detect Customer Return vs Courier Return (RTO)
    const rawType = (row.return_type || row.returntype || '').toLowerCase();
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
    }
  });

  // 3. Aggregate Cancellations
  let totalCancelledRevenue = 0;
  let totalCancelledUnits = 0;

  (cancellationData || []).forEach(row => {
    const units = parseFloat(row.units) || 0;
    const price = parseFloat(row.price) || 0;

    totalCancelledUnits += units;
    totalCancelledRevenue += price;

    const ch = ensureChannel(row.channel_name || 'Unknown');
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

  // Finalize Channel Breakdown
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
    { name: 'Gross Revenue', value: Math.round(grossRevenue), displayVal: grossRevenue, fill: '#1d8cf8' },
    { name: 'Cancellations', value: Math.round(totalCancelledRevenue), displayVal: totalCancelledRevenue, fill: '#ff4d4f' },
    { name: 'Returns & RTO', value: Math.round(totalReturnRevenue), displayVal: totalReturnRevenue, fill: '#ba54f5' },
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
