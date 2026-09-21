import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Layers, 
  CheckCircle2, 
  X, 
  BarChart3, 
  AlertCircle,
  Package,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  loadCancellations, 
  parseCancellationFile, 
  clearCancellations 
} from './cancellationStorage';
import { calculateFinanceMetrics } from './financeMetrics.js';
import { 
  loadMarketingRates, 
  saveMarketingRates, 
  resetMarketingRates, 
  resolveChannelRate, 
  DEFAULT_CHANNEL_RATES 
} from './marketingRatesStorage.js';
import './FinanceSection.css';

const formatINR = (val) => {
  const num = Math.round(Number(val) || 0);
  return '₹' + num.toLocaleString('en-IN');
};

const formatUnits = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN');
};

export const FinanceSection = ({
  salesData = [],
  returnData = [],
  allSalesData = [],
  selectedMonth = ['July'],
  selectedFY = '2026',
  selectedChannels = [],
  userRole = 'viewer',
  getChannelColor,
  onReturnUpload
}) => {
  // Determine primary month name for cancellations mapping
  const primaryMonth = useMemo(() => {
    if (Array.isArray(selectedMonth) && selectedMonth.length > 0) {
      return selectedMonth[0];
    }
    if (typeof selectedMonth === 'string' && selectedMonth !== 'All') {
      return selectedMonth;
    }
    return 'July';
  }, [selectedMonth]);

  const [cancellationsData, setCancellationsData] = useState([]);
  
  // Upload modal state (Admin only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Marketing Rates State
  const [marketingRates, setMarketingRates] = useState(() => loadMarketingRates());
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editRatesDraft, setEditRatesDraft] = useState({});
  const [ratesSaveSuccess, setRatesSaveSuccess] = useState(false);

  // Load cancellations when primary month or year changes
  useEffect(() => {
    const loaded = loadCancellations(primaryMonth, selectedFY);
    setCancellationsData(loaded);
  }, [primaryMonth, selectedFY]);

  // Compute all financial metrics dynamically from the filtered datasets
  const metrics = useMemo(() => {
    return calculateFinanceMetrics({
      salesData,
      returnData,
      cancellationData: cancellationsData,
      allSalesData,
      selectedChannels
    });
  }, [salesData, returnData, cancellationsData, allSalesData, selectedChannels]);

  // Determine active channel for Marketing tiles (syncs with top channel filter)
  const activeTopChannel = useMemo(() => {
    if (Array.isArray(selectedChannels) && selectedChannels.length === 1) {
      return selectedChannels[0];
    }
    return 'All';
  }, [selectedChannels]);

  const [selectedMarketingChannel, setSelectedMarketingChannel] = useState(activeTopChannel);

  // Sync internal channel selector when the top filter changes
  useEffect(() => {
    setSelectedMarketingChannel(activeTopChannel);
  }, [activeTopChannel]);

  // Resolve active rates (Margin, Marketing, Logistics)
  const activeRates = useMemo(() => {
    return resolveChannelRate(selectedMarketingChannel, marketingRates);
  }, [selectedMarketingChannel, marketingRates]);

  // Revenue base for computing the Rupee amounts for this channel
  const activeRevenueBase = useMemo(() => {
    if (selectedMarketingChannel !== 'All' && selectedMarketingChannel !== 'All Channels') {
      const chItem = metrics.channelBreakdown.find(
        c => c.channel.toUpperCase() === selectedMarketingChannel.toUpperCase()
      );
      if (chItem) {
        return chItem.netRevenue > 0 ? chItem.netRevenue : chItem.grossRevenue;
      }
    }
    return metrics.net.revenue > 0 ? metrics.net.revenue : metrics.gross.revenue;
  }, [selectedMarketingChannel, metrics]);

  const computedMarginINR = Math.round((activeRevenueBase * (activeRates.margin || 0)) / 100);
  const computedMarketingINR = Math.round((activeRevenueBase * (activeRates.marketing || 0)) / 100);
  const computedLogisticsINR = Math.round((activeRevenueBase * (activeRates.logistics || 0)) / 100);

  // Available channel list for the marketing dropdown/pills
  const availableChannelOptions = useMemo(() => {
    const keys = Object.keys(marketingRates).filter(k => k !== 'All');
    return ['All', ...keys];
  }, [marketingRates]);

  // Open Edit Rates modal with current values
  const handleOpenRatesModal = () => {
    setEditRatesDraft(JSON.parse(JSON.stringify(marketingRates)));
    setRatesSaveSuccess(false);
    setIsRatesModalOpen(true);
  };

  // Save updated rates from modal
  const handleSaveRates = () => {
    saveMarketingRates(editRatesDraft);
    setMarketingRates(editRatesDraft);
    setRatesSaveSuccess(true);
    setTimeout(() => {
      setIsRatesModalOpen(false);
      setRatesSaveSuccess(false);
    }, 800);
  };

  // Reset rates to factory defaults
  const handleResetRates = () => {
    resetMarketingRates();
    const defaults = { ...DEFAULT_CHANNEL_RATES };
    setMarketingRates(defaults);
    setEditRatesDraft(defaults);
    setRatesSaveSuccess(true);
  };

  // Handle cancellation file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus(null);
    try {
      const res = await parseCancellationFile(file, primaryMonth, selectedFY);
      setCancellationsData(res.rows);
      setUploadStatus({
        success: true,
        message: `Successfully ingested "${res.fileName}"! ${formatUnits(res.totalUnits)} cancelled units (${formatINR(res.totalPrice)}) registered.`
      });
    } catch (err) {
      setUploadStatus({
        success: false,
        message: err.message || 'Failed to parse cancellation file.'
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetCancellations = () => {
    clearCancellations(primaryMonth, selectedFY);
    const reloaded = loadCancellations(primaryMonth, selectedFY);
    setCancellationsData(reloaded);
    setUploadStatus({
      success: true,
      message: `Reset to default cancellation dataset for ${primaryMonth} ${selectedFY}.`
    });
  };

  const activeMonthLabel = Array.isArray(selectedMonth) && selectedMonth.length > 0 
    ? selectedMonth.join(', ') 
    : (selectedMonth || 'All Months');

  return (
    <div className="finance-container">
      {/* Top Action Row: Admin Upload Button */}
      {userRole === 'admin' && (
        <div className="finance-admin-bar">
          <button 
            className="finance-action-btn"
            onClick={() => setIsModalOpen(true)}
            title="Admin: Upload monthly cancelled orders spreadsheet"
          >
            <UploadCloud size={16} />
            Upload Cancellations
          </button>
        </div>
      )}

      {/* Main Metric Cards Grid (4 Core Tiles) */}
      <div className="finance-grid">
        {/* Tile 1: GROSS REVENUE TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Gross Revenue</span>
              <span className="card-sub-info">Total Order Sales</span>
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number">
              {formatINR(metrics.gross.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.gross.units)} Total Units</span>
              <span className="badge-pill badge-purple-clean">Sales Only</span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Gross ASP:</span>
              <span className="submetric-val" style={{ color: '#e2d9fc' }}>
                {formatINR(metrics.gross.asp)}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Active Channels:</span>
              <span className="submetric-val" style={{ color: '#e2d9fc' }}>
                {metrics.channelBreakdown.length} Marketplaces
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: NET REVENUE & UNITS (Main Hero Tile) */}
        <div className="finance-card hero-net">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Net Revenue</span>
              <span className="card-sub-info" style={{ color: '#00f2c4' }}>
                Gross − Cancellations − Returns
              </span>
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number net-glow">
              {formatINR(metrics.net.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.net.units)} Net Units</span>
              <span className="badge-pill badge-cyan">
                {metrics.net.realizationRate.toFixed(1)}% Realization
              </span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Net ASP:</span>
              <span className="submetric-val" style={{ color: '#00f2c4' }}>
                {formatINR(metrics.net.asp)}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Total Deduction:</span>
              <span className="submetric-val" style={{ color: '#d6c8ff' }}>
                - {formatINR(metrics.cancellations.revenue + metrics.returns.revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: RETURNS & RTO TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Returns</span>
              <span className="card-sub-info">Customer Return + Courier RTO</span>
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number">
              {formatINR(metrics.returns.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.returns.units)} Combined Units</span>
              <span className="badge-pill badge-purple-clean">
                {metrics.returns.rate.toFixed(1)}% Return Rate
              </span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Customer Return:</span>
              <span className="submetric-val" style={{ color: '#e2d9fc' }}>
                {formatUnits(metrics.returns.customerReturnUnits)} units ({formatINR(metrics.returns.customerReturnRevenue)})
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Courier Return (RTO):</span>
              <span className="submetric-val" style={{ color: '#d6c8ff' }}>
                {formatUnits(metrics.returns.rtoUnits)} units ({formatINR(metrics.returns.rtoRevenue)})
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: CANCELLATION TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Cancellation</span>
              <span className="card-sub-info">Pre-dispatch Cancelled</span>
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number">
              {formatINR(metrics.cancellations.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.cancellations.units)} Cancelled Units</span>
              <span className="badge-pill badge-purple-clean">
                {metrics.cancellations.rate.toFixed(1)}% Rate
              </span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Dataset:</span>
              <span className="submetric-val" style={{ fontSize: '0.78rem', color: '#d6c8ff' }}>
                {cancellationsData.length > 0 ? `${formatUnits(metrics.cancellations.units)} units (${cancellationsData.length} records)` : 'No cancellation file'}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Impact on Gross:</span>
              <span className="submetric-val" style={{ color: '#d6c8ff' }}>
                - {formatINR(metrics.cancellations.revenue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Marketing & Unit Economics Tiles (Margin, Marketing, Logistics) */}
      <div className="marketing-section">
        <div className="marketing-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
              Marketing & Unit Economics
            </span>
            <span className="badge-pill badge-purple-clean">
              Channel: <strong style={{ color: '#fff', marginLeft: '4px' }}>{activeRates.channelName}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Quick Channel Preview Selector */}
            <div className="marketing-channel-select-wrapper">
              <span style={{ fontSize: '0.78rem', color: '#c4b5fd' }}>View Channel:</span>
              <select
                className="marketing-channel-dropdown"
                value={selectedMarketingChannel}
                onChange={(e) => setSelectedMarketingChannel(e.target.value)}
              >
                {availableChannelOptions.map(ch => (
                  <option key={ch} value={ch}>{ch === 'All' ? 'All Channels (Blended)' : ch}</option>
                ))}
              </select>
            </div>

            {/* Admin: Edit Rates Modal Trigger */}
            {userRole === 'admin' && (
              <button 
                className="marketing-edit-btn"
                onClick={handleOpenRatesModal}
                title="Edit pre-filled Margin, Marketing, and Logistics rates per channel"
              >
                <SlidersHorizontal size={14} />
                Edit Rates
              </button>
            )}
          </div>
        </div>

        <div className="marketing-tiles-grid">
          {/* Tile 1: Margin */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Margin</span>
              <span className="badge-pill badge-purple-clean">{activeRates.margin}% Target</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{activeRates.margin}%</div>
              <div className="marketing-calculated-val">{formatINR(computedMarginINR)}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">Gross Margin for {activeRates.channelName}</span>
            </div>
          </div>

          {/* Tile 2: Marketing */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Marketing</span>
              <span className="badge-pill badge-purple-clean">{activeRates.marketing}% Ad Spend</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{activeRates.marketing}%</div>
              <div className="marketing-calculated-val">{formatINR(computedMarketingINR)}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">Marketing allocation on net sales</span>
            </div>
          </div>

          {/* Tile 3: Logistics */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Logistics</span>
              <span className="badge-pill badge-purple-clean">{activeRates.logistics}% Fulfillment</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{activeRates.logistics}%</div>
              <div className="marketing-calculated-val">{formatINR(computedLogisticsINR)}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">Shipping & logistics allocation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Waterfall Chart & Health Summary */}
      <div className="finance-content-row split">
        {/* Waterfall / Deduction Flow Chart */}
        <div className="finance-section-card">
          <div className="section-header">
            <h3>
              Revenue Realization Bridge ({activeMonthLabel})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>
              Gross → Net → Returns → Cancellation
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.waterfallData} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(186, 84, 245, 0.08)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#a78bfa" 
                  tick={{ fill: '#c4b5fd', fontSize: 11 }} 
                />
                <YAxis 
                  stroke="#a78bfa" 
                  tick={{ fill: '#c4b5fd', fontSize: 11 }}
                  tickFormatter={(v) => '₹' + (v / 100000).toFixed(1) + 'L'}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1a162b', 
                    border: '1px solid rgba(186, 84, 245, 0.25)', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value, name, item) => [
                    formatINR(item.payload.displayVal), 
                    item.payload.name
                  ]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {metrics.waterfallData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deductions & Realization Summary Card (Purple & White-Purple Theme) */}
        <div className="finance-section-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="section-header">
            <h3>
              Financial Health & Deduction Summary
            </h3>
            <span className="badge-pill badge-cyan">
              {metrics.net.realizationRate.toFixed(1)}% Realized
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#c4b5fd' }}>
                  Total Realization Rate (Net / Gross)
                </span>
                <span style={{ fontWeight: 700, color: '#00f2c4' }}>
                  {metrics.net.realizationRate.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(186, 84, 245, 0.12)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, metrics.net.realizationRate)}%`, height: '100%', background: 'linear-gradient(90deg, #ba54f5, #00f2c4)', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(186, 84, 245, 0.06)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(186, 84, 245, 0.15)' }}>
                <div style={{ fontSize: '0.78rem', color: '#c4b5fd', marginBottom: '4px' }}>
                  Cancellations Leakage
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  {metrics.cancellations.rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d6c8ff', marginTop: '2px' }}>
                  {formatINR(metrics.cancellations.revenue)} deducted
                </div>
              </div>

              <div style={{ background: 'rgba(186, 84, 245, 0.06)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(186, 84, 245, 0.15)' }}>
                <div style={{ fontSize: '0.78rem', color: '#c4b5fd', marginBottom: '4px' }}>
                  Returns / RTO Leakage
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  {metrics.returns.rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d6c8ff', marginTop: '2px' }}>
                  {formatINR(metrics.returns.revenue)} returned
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 242, 196, 0.06)', border: '1px solid rgba(0, 242, 196, 0.25)', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#a7f3d0' }}>
              Net Realization stands at <strong style={{ color: '#00f2c4' }}>{formatINR(metrics.net.revenue)}</strong> across <strong style={{ color: '#fff' }}>{formatUnits(metrics.net.units)}</strong> fulfilled units.
            </div>
          </div>
        </div>
      </div>

      {/* Channel-Wise Financial Breakdown Table - No Colorful Bullets */}
      <div className="finance-section-card">
        <div className="section-header">
          <h3>
            Channel-Wise Financial Realization Breakdown
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>
            Gross Sales vs Deductions by Channel
          </span>
        </div>

        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Gross Sales (₹)</th>
                <th>Gross Units</th>
                <th>Net Revenue (₹)</th>
                <th>Net Units</th>
                <th>Returns (₹)</th>
                <th>Return Units</th>
                <th>Cancellation (₹)</th>
                <th>Cancelled Units</th>
                <th>Realization %</th>
              </tr>
            </thead>
            <tbody>
              {metrics.channelBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#c4b5fd' }}>
                    No channel sales data available for {activeMonthLabel}.
                  </td>
                </tr>
              ) : (
                metrics.channelBreakdown.map((ch, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {ch.channel}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{formatINR(ch.grossRevenue)}</td>
                    <td style={{ color: '#e2d9fc' }}>{formatUnits(ch.grossUnits)}</td>
                    <td style={{ fontWeight: 700, color: '#00f2c4' }}>
                      {formatINR(ch.netRevenue)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{formatUnits(ch.netUnits)}</td>
                    <td style={{ color: '#d6c8ff' }}>
                      {ch.returnRevenue > 0 ? `- ${formatINR(ch.returnRevenue)}` : '₹0'}
                    </td>
                    <td style={{ color: '#c4b5fd' }}>{formatUnits(ch.returnUnits)}</td>
                    <td style={{ color: '#d6c8ff' }}>
                      {ch.cancelledRevenue > 0 ? `- ${formatINR(ch.cancelledRevenue)}` : '₹0'}
                    </td>
                    <td style={{ color: '#c4b5fd' }}>{formatUnits(ch.cancelledUnits)}</td>
                    <td>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${Math.min(100, ch.realizationRate)}%` }} 
                        />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#00f2c4' }}>
                        {ch.realizationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Marketing & Unit Economics Rates Modal */}
      {isRatesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRatesModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Channel Economics Rates</h3>
              <button className="modal-close-btn" onClick={() => setIsRatesModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#c4b5fd', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Update pre-filled Margin, Marketing, and Logistics percentage rates for each sales channel. Changes are saved automatically.
            </p>

            <div style={{ maxHeight: '340px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(186, 84, 245, 0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(186, 84, 245, 0.2)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#c4b5fd' }}>Channel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Margin %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Marketing %</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Logistics %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(editRatesDraft).map((chKey) => {
                    const row = editRatesDraft[chKey] || { margin: 0, marketing: 0, logistics: 0 };
                    return (
                      <tr key={chKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                          {chKey === 'All' ? 'All Channels (Default)' : chKey}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            step="0.1"
                            value={row.margin}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditRatesDraft(prev => ({
                                ...prev,
                                [chKey]: { ...prev[chKey], margin: val }
                              }));
                            }}
                            className="rate-edit-input"
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            step="0.1"
                            value={row.marketing}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditRatesDraft(prev => ({
                                ...prev,
                                [chKey]: { ...prev[chKey], marketing: val }
                              }));
                            }}
                            className="rate-edit-input"
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            step="0.1"
                            value={row.logistics}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditRatesDraft(prev => ({
                                ...prev,
                                [chKey]: { ...prev[chKey], logistics: val }
                              }));
                            }}
                            className="rate-edit-input"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {ratesSaveSuccess && (
              <div style={{ marginTop: '1rem', color: '#00f2c4', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> Rates successfully updated and saved!
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="finance-text-btn"
                onClick={handleResetRates}
                style={{ background: 'none', border: 'none', color: '#c4b5fd', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset to Defaults
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setIsRatesModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(186, 84, 245, 0.3)', color: '#c4b5fd', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  className="finance-action-btn"
                  onClick={handleSaveRates}
                >
                  Save Rates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Upload Cancellation Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Cancellations ({primaryMonth} {selectedFY})</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#c4b5fd', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Upload an Excel (.xlsx, .xls) or CSV sheet containing cancelled orders for <strong>{primaryMonth} {selectedFY}</strong>.
            </p>

            <div 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={40} style={{ color: '#ba54f5', margin: '0 auto 1rem auto' }} />
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                {isProcessing ? 'Processing spreadsheet...' : 'Click to select cancellation spreadsheet'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>
                Supports .xlsx, .xls, .csv (e.g. July-2026_CancelledOrders.xlsx)
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            {uploadStatus && (
              <div style={{ 
                marginTop: '1.25rem', 
                padding: '0.85rem 1rem', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                background: uploadStatus.success ? 'rgba(0, 242, 196, 0.1)' : 'rgba(255, 77, 79, 0.1)',
                border: `1px solid ${uploadStatus.success ? 'rgba(0, 242, 196, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`,
                color: uploadStatus.success ? '#00f2c4' : '#ff4d4f'
              }}>
                {uploadStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{uploadStatus.message}</span>
              </div>
            )}

            <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="finance-text-btn"
                onClick={handleResetCancellations}
                style={{ background: 'none', border: 'none', color: '#c4b5fd', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset to default dataset
              </button>

              <button 
                className="finance-action-btn"
                onClick={() => setIsModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
