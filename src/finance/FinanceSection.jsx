import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  RotateCcw, 
  XCircle, 
  UploadCloud, 
  Layers, 
  CheckCircle2, 
  X, 
  BarChart3, 
  AlertCircle,
  Package,
  ArrowDownRight,
  ArrowUpRight
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
import { calculateFinanceMetrics } from './financeMetrics';
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
  availableMonths = [],
  getChannelColor
}) => {
  // 1. Month state: default to 'July' for testing
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [cancellationsData, setCancellationsData] = useState([]);
  
  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // 2. Load cancellations when month changes
  useEffect(() => {
    const loaded = loadCancellations(selectedMonth, selectedYear);
    setCancellationsData(loaded);
  }, [selectedMonth, selectedYear]);

  // 3. Compute all financial metrics
  const metrics = useMemo(() => {
    return calculateFinanceMetrics({
      salesData,
      returnData,
      cancellationData: cancellationsData,
      selectedMonth
    });
  }, [salesData, returnData, cancellationsData, selectedMonth]);

  // Handle cancellation file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus(null);
    try {
      const res = await parseCancellationFile(file, selectedMonth, selectedYear);
      setCancellationsData(res.rows);
      setUploadStatus({
        success: true,
        message: `Successfully ingested "${res.fileName}"! ${formatUnits(res.totalUnits)} cancelled units (${formatINR(res.totalPrice)}) registered for ${res.month} ${res.year}.`
      });
      if (res.month && res.month !== selectedMonth) {
        setSelectedMonth(res.month);
      }
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
    clearCancellations(selectedMonth, selectedYear);
    const reloaded = loadCancellations(selectedMonth, selectedYear);
    setCancellationsData(reloaded);
    setUploadStatus({
      success: true,
      message: `Reset to default cancellation dataset for ${selectedMonth} ${selectedYear}.`
    });
  };

  // Month options (ensure July is prominently available)
  const monthOptions = useMemo(() => {
    const set = new Set(['July']);
    (availableMonths || []).forEach(m => {
      if (m && m !== 'Unknown') set.add(m);
    });
    return Array.from(set);
  }, [availableMonths]);

  return (
    <div className="finance-container">
      {/* Top Header Controls */}
      <div className="finance-header-card">
        <div className="finance-title-group">
          <h2>
            <DollarSign size={28} style={{ color: '#00f2c4' }} />
            Finance & Net Realization Hub
          </h2>
          <p>
            Comprehensive P&L Reconciliation: Gross Revenue minus Cancellations & Returns (Customer Return + RTO)
          </p>
        </div>

        <div className="finance-controls-bar">
          <div className="month-pills-wrapper">
            {monthOptions.map(m => (
              <button
                key={m}
                className={`month-pill ${selectedMonth === m ? 'active' : ''}`}
                onClick={() => setSelectedMonth(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <button 
            className="finance-action-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <UploadCloud size={18} />
            Upload Cancellations
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid (4 Core Tiles) */}
      <div className="finance-grid">
        {/* Tile 1: NET REVENUE & UNITS (Main Hero Tile) */}
        <div className="finance-card hero-net">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Realized Sales</span>
              <span style={{ fontSize: '0.8rem', color: '#00f2c4', fontWeight: 700 }}>
                ★ Main Net Metric
              </span>
            </div>
            <div className="card-icon-box icon-net">
              <TrendingUp size={24} />
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
              <span className="submetric-label">Gross Deduction:</span>
              <span className="submetric-val" style={{ color: '#ff6491' }}>
                - {formatINR(metrics.cancellations.revenue + metrics.returns.revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Tile 2: GROSS REVENUE TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Gross Revenue</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Total Order Sales
              </span>
            </div>
            <div className="card-icon-box icon-gross">
              <DollarSign size={24} />
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number">
              {formatINR(metrics.gross.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.gross.units)} Total Units</span>
              <span className="badge-pill badge-blue">Sales Only</span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Gross ASP:</span>
              <span className="submetric-val">
                {formatINR(metrics.gross.asp)}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Active Channels:</span>
              <span className="submetric-val">
                {metrics.channelBreakdown.length} Marketplaces
              </span>
            </div>
          </div>
        </div>

        {/* Tile 3: CANCELLATIONS TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Cancellations</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Pre-dispatch Cancelled
              </span>
            </div>
            <div className="card-icon-box icon-cancel">
              <XCircle size={24} />
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number" style={{ color: '#ff4d4f' }}>
              {formatINR(metrics.cancellations.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.cancellations.units)} Cancelled Units</span>
              <span className="badge-pill badge-red">
                {metrics.cancellations.rate.toFixed(1)}% Rate
              </span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Dataset:</span>
              <span className="submetric-val" style={{ fontSize: '0.75rem', color: '#ff7875' }}>
                {cancellationsData.length > 0 ? `${cancellationsData.length} SKUs loaded` : 'No file uploaded'}
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Impact on Gross:</span>
              <span className="submetric-val" style={{ color: '#ff4d4f' }}>
                - {formatINR(metrics.cancellations.revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Tile 4: RETURNS & RTO TILE */}
        <div className="finance-card">
          <div className="card-top-row">
            <div className="card-title-group">
              <span className="card-label">Returns & RTO</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Customer Return + Courier RTO
              </span>
            </div>
            <div className="card-icon-box icon-returns">
              <RotateCcw size={24} />
            </div>
          </div>

          <div className="card-main-metric">
            <div className="metric-number" style={{ color: '#ba54f5' }}>
              {formatINR(metrics.returns.revenue)}
            </div>
            <div className="metric-subtitle">
              <span>{formatUnits(metrics.returns.units)} Combined Units</span>
              <span className="badge-pill badge-purple">
                {metrics.returns.rate.toFixed(1)}% Return Rate
              </span>
            </div>
          </div>

          <div className="card-bottom-pills">
            <div className="submetric-row">
              <span className="submetric-label">Customer Return:</span>
              <span className="submetric-val" style={{ color: '#d3adf7' }}>
                {formatUnits(metrics.returns.customerReturnUnits)} units ({formatINR(metrics.returns.customerReturnRevenue)})
              </span>
            </div>
            <div className="submetric-row">
              <span className="submetric-label">Courier Return (RTO):</span>
              <span className="submetric-val" style={{ color: '#b37feb' }}>
                {formatUnits(metrics.returns.rtoUnits)} units ({formatINR(metrics.returns.rtoRevenue)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Waterfall Chart & Insights */}
      <div className="finance-content-row split">
        {/* Waterfall / Deduction Flow Chart */}
        <div className="finance-section-card">
          <div className="section-header">
            <h3>
              <BarChart3 size={20} style={{ color: '#1d8cf8' }} />
              Revenue Realization Bridge ({selectedMonth})
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Gross → Deductions → Net
            </span>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.waterfallData} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9a9a9a" 
                  tick={{ fill: '#9a9a9a', fontSize: 11 }} 
                />
                <YAxis 
                  stroke="#9a9a9a" 
                  tick={{ fill: '#9a9a9a', fontSize: 11 }}
                  tickFormatter={(v) => '₹' + (v / 100000).toFixed(1) + 'L'}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1d213b', 
                    border: '1px solid rgba(255,255,255,0.15)', 
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

        {/* Deductions & Realization Summary Card */}
        <div className="finance-section-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="section-header">
            <h3>
              <Layers size={20} style={{ color: '#00f2c4' }} />
              Financial Health & Deduction Summary
            </h3>
            <span className="badge-pill badge-cyan">
              {metrics.net.realizationRate.toFixed(1)}% Realized
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Total Realization Rate (Net / Gross)
                </span>
                <span style={{ fontWeight: 700, color: '#00f2c4' }}>
                  {metrics.net.realizationRate.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, metrics.net.realizationRate)}%`, height: '100%', background: 'linear-gradient(90deg, #00f2c4, #1d8cf8)', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Cancellations Leakage
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff4d4f' }}>
                  {metrics.cancellations.rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#ff7875', marginTop: '2px' }}>
                  {formatINR(metrics.cancellations.revenue)} lost
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Returns / RTO Leakage
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ba54f5' }}>
                  {metrics.returns.rate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d3adf7', marginTop: '2px' }}>
                  {formatINR(metrics.returns.revenue)} returned
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 242, 196, 0.05)', border: '1px solid rgba(0, 242, 196, 0.2)', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.82rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} style={{ color: '#00f2c4', flexShrink: 0 }} />
              <span>
                Net Realization stands at <strong>{formatINR(metrics.net.revenue)}</strong> across <strong>{formatUnits(metrics.net.units)}</strong> fulfilled units.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel-Wise Financial Breakdown Table */}
      <div className="finance-section-card">
        <div className="section-header">
          <h3>
            <Package size={20} style={{ color: '#ba54f5' }} />
            Channel-Wise Financial Realization Breakdown
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
                <th>Cancelled (₹)</th>
                <th>Cancelled Units</th>
                <th>Returns / RTO (₹)</th>
                <th>Return Units</th>
                <th>Net Revenue (₹)</th>
                <th>Net Units</th>
                <th>Realization %</th>
              </tr>
            </thead>
            <tbody>
              {metrics.channelBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No channel sales data available for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                metrics.channelBreakdown.map((ch, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="channel-tag">
                        <span style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          background: getChannelColor ? getChannelColor(ch.channel) : '#1d8cf8' 
                        }} />
                        {ch.channel}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatINR(ch.grossRevenue)}</td>
                    <td>{formatUnits(ch.grossUnits)}</td>
                    <td style={{ color: '#ff4d4f' }}>
                      {ch.cancelledRevenue > 0 ? `- ${formatINR(ch.cancelledRevenue)}` : '₹0'}
                    </td>
                    <td style={{ color: '#ff7875' }}>{formatUnits(ch.cancelledUnits)}</td>
                    <td style={{ color: '#ba54f5' }}>
                      {ch.returnRevenue > 0 ? `- ${formatINR(ch.returnRevenue)}` : '₹0'}
                    </td>
                    <td style={{ color: '#d3adf7' }}>{formatUnits(ch.returnUnits)}</td>
                    <td style={{ fontWeight: 700, color: '#00f2c4' }}>
                      {formatINR(ch.netRevenue)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatUnits(ch.netUnits)}</td>
                    <td>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${Math.min(100, ch.realizationRate)}%` }} 
                        />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Cancellation File</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Upload your monthly cancelled orders file (e.g. <code>July-2026_CancelledOrders.xlsx</code>). 
              Supported columns: <strong>Channel Name</strong>, <strong>Item Color</strong>, <strong>Units</strong>, <strong>New SP</strong>.
            </p>

            <div 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={36} style={{ color: '#00f2c4', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                {isProcessing ? 'Processing spreadsheet...' : 'Click to browse or drag & drop'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Supports .xlsx, .xls, .csv
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx,.xls,.csv" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            {uploadStatus && (
              <div style={{ 
                marginTop: '1.25rem', 
                padding: '0.85rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem',
                background: uploadStatus.success ? 'rgba(0, 242, 196, 0.1)' : 'rgba(255, 77, 79, 0.1)',
                border: `1px solid ${uploadStatus.success ? 'rgba(0, 242, 196, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`,
                color: uploadStatus.success ? '#00f2c4' : '#ff7875',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {uploadStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{uploadStatus.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                style={{ 
                  background: 'transparent', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  color: 'var(--text-secondary)', 
                  padding: '6px 12px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.8rem' 
                }}
                onClick={handleResetCancellations}
              >
                Reset to Default
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
