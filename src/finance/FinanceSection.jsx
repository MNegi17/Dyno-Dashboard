import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  X, 
  AlertCircle 
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
