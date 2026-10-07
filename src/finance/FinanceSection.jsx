import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Layers, 
  CheckCircle2, 
  X, 
  BarChart3, 
  AlertCircle,
  Package,
  SlidersHorizontal
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
  FINANCE_CHANNEL_RULES,
  FINANCE_MONTH_OPTIONS,
  normalizeFinanceMonthKey,
  normalizeFinanceChannelKey,
  calculateChannelTiles,
  loadFinanceRules,
  saveFinanceRules,
  resetFinanceRules
} from './financeRulesStorage.js';
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
  // Primary month name derived directly from the main top filter
  const primaryMonth = useMemo(() => {
    if (Array.isArray(selectedMonth) && selectedMonth.length > 0) {
      return selectedMonth[0];
    }
    if (typeof selectedMonth === 'string' && selectedMonth !== 'All') {
      return selectedMonth;
    }
    return 'September';
  }, [selectedMonth]);

  // Normalized month key for finance rules (April-Sept, and September Onwards for Oct+)
  const activeRuleMonth = useMemo(() => {
    return normalizeFinanceMonthKey(selectedMonth);
  }, [selectedMonth]);

  // Active channel derived directly from the main top channel filter
  const activeChannelKey = useMemo(() => {
    if (Array.isArray(selectedChannels)) {
      if (selectedChannels.length === 1) {
        return normalizeFinanceChannelKey(selectedChannels[0]);
      }
      return 'All';
    }
    if (typeof selectedChannels === 'string' && selectedChannels !== 'All' && selectedChannels !== 'All Channels') {
      return normalizeFinanceChannelKey(selectedChannels);
    }
    return 'All';
  }, [selectedChannels]);

  const [cancellationsData, setCancellationsData] = useState([]);
  
  // Upload modal state (Admin only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Finance Rules State
  const [financeRules, setFinanceRules] = useState(() => loadFinanceRules());
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editRulesDraft, setEditRulesDraft] = useState({});
  const [ratesSaveSuccess, setRatesSaveSuccess] = useState(false);
  const [activeEditMonth, setActiveEditMonth] = useState(activeRuleMonth);

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

  // Compute the 4 Unit Economics tiles driven directly by the main filter
  const unitEconomics = useMemo(() => {
    const isSingleChannel = activeChannelKey !== 'All' && activeChannelKey !== 'All Channels';
    let targetRev = metrics.net.revenue > 0 ? metrics.net.revenue : metrics.gross.revenue;
    let targetUnits = metrics.net.units > 0 ? metrics.net.units : metrics.gross.units;

    if (isSingleChannel) {
      const chItem = metrics.channelBreakdown.find(
        c => normalizeFinanceChannelKey(c.channel) === activeChannelKey
      );
      if (chItem) {
        targetRev = chItem.netRevenue > 0 ? chItem.netRevenue : chItem.grossRevenue;
        targetUnits = chItem.netUnits > 0 ? chItem.netUnits : chItem.grossUnits;
      }
    }

    return calculateChannelTiles({
      channelKey: activeChannelKey,
      monthKey: activeRuleMonth,
      salesData,
      revenue: targetRev,
      units: targetUnits,
      customRules: financeRules
    });
  }, [activeChannelKey, activeRuleMonth, salesData, metrics, financeRules]);

  // Open Edit Rates modal with current values
  const handleOpenRatesModal = () => {
    setEditRulesDraft(JSON.parse(JSON.stringify(financeRules)));
    setActiveEditMonth(activeRuleMonth);
    setRatesSaveSuccess(false);
    setIsRatesModalOpen(true);
  };

  // Save updated rates from modal
  const handleSaveRates = () => {
    saveFinanceRules(editRulesDraft);
    setFinanceRules(editRulesDraft);
    setRatesSaveSuccess(true);
    setTimeout(() => {
      setIsRatesModalOpen(false);
      setRatesSaveSuccess(false);
    }, 800);
  };

  // Reset rates to factory defaults from Finance Sheet.xlsx
  const handleResetRates = () => {
    const defaults = resetFinanceRules();
    setFinanceRules(defaults);
    setEditRulesDraft(defaults);
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

      {/* Main Metric Cards Grid (4 Core High-Level Tiles) */}
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
              <span className="card-label">Cancellation (Invoice Not Generated)</span>
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
              <span className="submetric-label">Month Dataset:</span>
              <span className="submetric-val" style={{ color: '#e2d9fc' }}>
                {primaryMonth} {selectedFY}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Impact on Gross:</span>
              <span className="submetric-val" style={{ color: '#ff7675' }}>
                - {metrics.gross.revenue > 0 ? ((metrics.cancellations.revenue / metrics.gross.revenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          CHANNEL UNIT ECONOMICS SECTION (4 TILES: Margin, Marketing, Logistic, Fixed Fee)
          Driven directly by main dashboard filters
          ========================================================= */}
      <div className="marketing-section">
        <div className="marketing-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} style={{ color: '#ba54f5' }} />
              Channel Economics & Finance Rules
            </span>
            <span className="badge-pill badge-purple-clean">
              Channel: <strong style={{ color: '#fff', marginLeft: '4px' }}>{unitEconomics.channelDisplay}</strong>
            </span>
            <span className="badge-pill badge-cyan">
              Month: <strong style={{ color: '#00f2c4', marginLeft: '4px' }}>{unitEconomics.monthKey}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Admin: Edit Rules Modal Trigger */}
            {userRole === 'admin' && (
              <button 
                className="marketing-edit-btn"
                onClick={handleOpenRatesModal}
                title="Edit Margin, Marketing, Logistics, and Fixed Fee rules per channel"
              >
                <SlidersHorizontal size={14} />
                Edit Rules
              </button>
            )}
          </div>
        </div>

        {/* 4 Core Unit Economics Tiles Grid */}
        <div className="marketing-tiles-grid four-tiles">
          {/* Tile 1: Margin (Fixed) */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Margin (Fixed)</span>
              <span className="badge-pill badge-purple-clean">{unitEconomics.margin.badge}</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{unitEconomics.margin.mainDisplay}</div>
              <div className="marketing-calculated-val">{formatINR(unitEconomics.margin.inr)}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">{unitEconomics.margin.subNote}</span>
            </div>
          </div>

          {/* Tile 2: Marketing (Fixed) */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">{unitEconomics.marketing?.label || (String(unitEconomics.channelKey || "").toUpperCase().includes("MYNTRA") ? "Marketing (Fixed)" : "Marketing")}</span>
              <span className="badge-pill badge-purple-clean">{unitEconomics.marketing.badge}</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{unitEconomics.marketing.mainDisplay}</div>
              <div className="marketing-calculated-val">{unitEconomics.marketing.inr > 0 ? formatINR(unitEconomics.marketing.inr) : '₹0'}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">{unitEconomics.marketing.subNote}</span>
            </div>
          </div>

          {/* Tile 3: Logistic (Avg) */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Logistic (Avg)</span>
              <span className="badge-pill badge-purple-clean">{unitEconomics.logistics.badge}</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{unitEconomics.logistics.mainDisplay}</div>
              <div className="marketing-calculated-val">{unitEconomics.logistics.inr > 0 ? formatINR(unitEconomics.logistics.inr) : '₹0'}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">{unitEconomics.logistics.subNote}</span>
            </div>
          </div>

          {/* Tile 4: Fixed Fee (Avg) */}
          <div className="marketing-card">
            <div className="marketing-card-top">
              <span className="marketing-card-label">Fixed Fee (Avg)</span>
              <span className="badge-pill badge-purple-clean">{unitEconomics.fixedFee.badge}</span>
            </div>
            <div className="marketing-card-main">
              <div className="marketing-number">{unitEconomics.fixedFee.mainDisplay}</div>
              <div className="marketing-calculated-val">{unitEconomics.fixedFee.inr > 0 ? formatINR(unitEconomics.fixedFee.inr) : '₹0'}</div>
            </div>
            <div className="marketing-card-footer">
              <span className="marketing-footer-note">{unitEconomics.fixedFee.subNote}</span>
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
                  cursor={{ fill: 'rgba(186, 84, 245, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const entry = payload[0].payload;
                      return (
                        <div style={{
                          background: '#1a162b',
                          border: '1px solid rgba(186, 84, 245, 0.35)',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                        }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                            {entry.name}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: entry.fill || '#ffffff' }}>
                            {formatINR(entry.displayVal)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
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
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(186, 84, 245, 0.1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#c4b5fd', marginBottom: '4px' }}>Return Loss Ratio</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  {metrics.gross.revenue > 0 ? ((metrics.returns.revenue / metrics.gross.revenue) * 100).toFixed(1) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '2px' }}>
                  {formatINR(metrics.returns.revenue)} lost
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(186, 84, 245, 0.1)' }}>
                <div style={{ fontSize: '0.78rem', color: '#c4b5fd', marginBottom: '4px' }}>Cancellation Ratio</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                  {metrics.gross.revenue > 0 ? ((metrics.cancellations.revenue / metrics.gross.revenue) * 100).toFixed(1) : 0}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '2px' }}>
                  {formatINR(metrics.cancellations.revenue)} lost
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(186, 84, 245, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #ba54f5' }}>
              <div style={{ fontSize: '0.8rem', color: '#e2d9fc', lineHeight: 1.4 }}>
                <strong>Net ASP vs Gross ASP:</strong> Net ASP is <strong style={{ color: '#00f2c4' }}>{formatINR(metrics.net.asp)}</strong> compared to Gross ASP of {formatINR(metrics.gross.asp)}.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Breakdown Table */}
      <div className="finance-section-card">
        <div className="section-header">
          <h3>
            Marketplace Financial Breakdown ({activeMonthLabel})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>
            Sorted by gross sales volume
          </span>
        </div>

        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Marketplace Channel</th>
                <th style={{ textAlign: 'right' }}>Gross Revenue</th>
                <th style={{ textAlign: 'right' }}>Cancelled Revenue</th>
                <th style={{ textAlign: 'right' }}>Returns Revenue</th>
                <th style={{ textAlign: 'right' }}>Net Revenue</th>
                <th style={{ textAlign: 'right' }}>Net Units</th>
                <th style={{ textAlign: 'center' }}>Realization Rate</th>
              </tr>
            </thead>
            <tbody>
              {metrics.channelBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#c4b5fd' }}>
                    No financial data available for selected filters.
                  </td>
                </tr>
              ) : (
                metrics.channelBreakdown.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: getChannelColor ? getChannelColor(row.channel) : '#ba54f5' 
                        }} 
                      />
                      {row.channel}
                    </td>
                    <td style={{ textAlign: 'right', color: '#ffffff' }}>
                      {formatINR(row.grossRevenue)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#ff7675' }}>
                      {row.cancelledRevenue > 0 ? `- ${formatINR(row.cancelledRevenue)}` : '₹0'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#d6c8ff' }}>
                      {row.returnRevenue > 0 ? `- ${formatINR(row.returnRevenue)}` : '₹0'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#00f2c4' }}>
                      {formatINR(row.netRevenue)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#ffffff' }}>
                      {formatUnits(row.netUnits)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${Math.min(100, row.realizationRate)}%` }} 
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2d9fc' }}>
                        {row.realizationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Rules Modal */}
      {isRatesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRatesModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Channel Finance Rules</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setIsRatesModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <p style={{ color: '#c4b5fd', fontSize: '0.85rem', margin: 0 }}>
                Edit rates for <strong>{activeEditMonth}</strong>. Rules saved here persist across dashboard reloads.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>Editing Month:</span>
                <select 
                  className="marketing-channel-dropdown"
                  value={activeEditMonth}
                  onChange={(e) => setActiveEditMonth(e.target.value)}
                >
                  {FINANCE_MONTH_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(186, 84, 245, 0.2)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#c4b5fd' }}>Channel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Margin (Apparel)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Margin (Footwear)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Marketing</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Logistics</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#c4b5fd' }}>Fixed Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(editRulesDraft).map((chKey) => {
                    const monthRules = editRulesDraft[chKey]?.[activeEditMonth] || {
                      marginApparel: 0,
                      marginFootwear: 0,
                      marketing: 0,
                      logistics: 0,
                      fixedFee: 0
                    };
                    return (
                      <tr key={chKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                          {chKey}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input 
                            type="text" 
                            value={monthRules.marginApparel ?? ''}
                            onChange={(e) => {
                              const val = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value;
                              setEditRulesDraft(prev => ({
                                ...prev,
                                [chKey]: {
                                  ...prev[chKey],
                                  [activeEditMonth]: {
                                    ...prev[chKey]?.[activeEditMonth],
                                    marginApparel: val
                                  }
                                }
                              }));
                            }}
                            className="rate-edit-input"
                            style={{ width: '90px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input 
                            type="text" 
                            value={monthRules.marginFootwear ?? ''}
                            onChange={(e) => {
                              const val = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value;
                              setEditRulesDraft(prev => ({
                                ...prev,
                                [chKey]: {
                                  ...prev[chKey],
                                  [activeEditMonth]: {
                                    ...prev[chKey]?.[activeEditMonth],
                                    marginFootwear: val
                                  }
                                }
                              }));
                            }}
                            className="rate-edit-input"
                            style={{ width: '90px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input 
                            type="text" 
                            value={monthRules.marketing ?? ''}
                            onChange={(e) => {
                              const val = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value;
                              setEditRulesDraft(prev => ({
                                ...prev,
                                [chKey]: {
                                  ...prev[chKey],
                                  [activeEditMonth]: {
                                    ...prev[chKey]?.[activeEditMonth],
                                    marketing: val
                                  }
                                }
                              }));
                            }}
                            className="rate-edit-input"
                            style={{ width: '90px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input 
                            type="text" 
                            value={monthRules.logistics ?? ''}
                            onChange={(e) => {
                              const val = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value;
                              setEditRulesDraft(prev => ({
                                ...prev,
                                [chKey]: {
                                  ...prev[chKey],
                                  [activeEditMonth]: {
                                    ...prev[chKey]?.[activeEditMonth],
                                    logistics: val
                                  }
                                }
                              }));
                            }}
                            className="rate-edit-input"
                            style={{ width: '90px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input 
                            type="text" 
                            value={monthRules.fixedFee ?? ''}
                            onChange={(e) => {
                              const val = !isNaN(Number(e.target.value)) ? Number(e.target.value) : e.target.value;
                              setEditRulesDraft(prev => ({
                                ...prev,
                                [chKey]: {
                                  ...prev[chKey],
                                  [activeEditMonth]: {
                                    ...prev[chKey]?.[activeEditMonth],
                                    fixedFee: val
                                  }
                                }
                              }));
                            }}
                            className="rate-edit-input"
                            style={{ width: '90px' }}
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
                <CheckCircle2 size={16} /> Rules successfully updated and saved!
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="finance-text-btn"
                onClick={handleResetRates}
                style={{ background: 'none', border: 'none', color: '#c4b5fd', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Reset to Finance Sheet Defaults
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
                  Save Rules
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
