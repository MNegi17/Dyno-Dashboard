// Dyno Dashboard v1.1 - with MN branding
import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Sector
} from 'recharts';
import { UploadCloud, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Layers, BarChart2, Home, Star, Activity, FileText, Trash2, LogOut, ChevronDown, Eye, EyeOff, Target, Menu, Search, X, PieChart as PieChartIcon, Database, Globe, Cpu, RefreshCw, Package } from 'lucide-react';
import { supabase } from './supabaseClient';

const GlowingLogoIcon = ({ size = 36, white = false }) => {
  return (
    <div 
      className={`glowing-logo-init ${white ? 'white-logo' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <img 
        src="/logo-icon.png" 
        alt="Purple United Kids" 
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          display: 'block',
          filter: white ? 'brightness(0) invert(1)' : 'none',
          transition: 'all 0.3s ease'
        }} 
      />
    </div>
  );
};

const COLORS = ['#ba54f5', '#1d8cf8', '#00f2c4', '#ff8d72', '#fd5d93', '#8965e0'];
const GOALS = {
  "April": { revenue: 23100000, asp: 800, units: 28875, apparel: 17325, footwear: 11550 },
  "May": { revenue: 25410000, asp: 800, units: 31763, apparel: 19058, footwear: 12705 },
  "June": { revenue: 27951000, asp: 800, units: 34939, apparel: 20963, footwear: 13976 },
  "July": { revenue: 27671490, asp: 800, units: 34589, apparel: 20754, footwear: 13836 },
  "August": { revenue: 29608494, asp: 800, units: 37011, apparel: 22206, footwear: 14804 },
  "September": { revenue: 31088919, asp: 800, units: 38861, apparel: 23317, footwear: 15544 },
  "October": { revenue: 41970040, asp: 900, units: 46633, apparel: 27980, footwear: 18653 },
  "November": { revenue: 43648842, asp: 900, units: 48499, apparel: 29099, footwear: 19399 },
  "December": { revenue: 44521819, asp: 900, units: 49469, apparel: 29681, footwear: 19787 },
  "January": { revenue: 39179200, asp: 900, units: 43532, apparel: 26119, footwear: 17413 },
  "February": { revenue: 35261280, asp: 900, units: 39179, apparel: 23508, footwear: 15672 },
  "March": { revenue: 34919073, asp: 900, units: 38799, apparel: 23279, footwear: 15520 },
  "All": { revenue: 404330160.87, asp: 850, units: 475683, apparel: 283289, footwear: 188860 }
};

const normalizeChannelName = (rawName) => {
  if (!rawName) return 'Unknown';
  const name = rawName.toString().trim();
  const upper = name.toUpperCase();
  
  if (upper.includes('MYNTRA_ONLINE') || upper.includes('MYNTRA_ONL') || upper === 'PUSPL _MYNTRA_ONL') {
    return 'MYNTRA';
  }
  if (upper === 'FIRSTCRY') {
    return 'FIRSTCRY';
  }
  if (upper === 'D2C SHOPIFY' || upper === 'SHOPIFY') {
    return 'D2C';
  }
  if (upper.includes('COCOBLU_ONLINE') || upper.includes('COCOBLU_ON') || upper === 'PUSPL _COCOBLU_ON') {
    return 'AMAZON_COCOBLU';
  }
  if (upper === 'AMAZON_FLEX_API' || upper === 'AMAZON_IN_API') {
    return 'AMAZON';
  }
  if (upper === 'AJIO_DROPSHIP' || upper === 'AJIO DROPSHIP' || upper === 'AJIO_DRPSHP') {
    return 'AJIO';
  }
  if (upper.includes('FLIPKART_ONLINE') || upper.includes('FLIPKART_ON') || upper === 'PUSPL _FLIPKART_ON') {
    return 'FLIPKART';
  }
  if (upper.includes('NYKAA_ONLINE') || upper.includes('NYKAA_ONLIN') || upper === 'PUSPL _NYKAA_ONLIN') {
    return 'NYKAA';
  }
  if (upper === 'AMAZON_FBA') {
    return 'AMAZON_FBA';
  }
  if (upper === 'MYNTRA_SJIT') {
    return 'MYNTRA_SJIT';
  }
  
  return name;
};

const isFY25File = (name) => {
  if (!name) return false;
  if (name.startsWith('[INVENTORY]')) return false;
  if (!name.startsWith('[RETURN]') && name.includes('FY25')) {
    return true;
  }
  if (name.startsWith('[RETURN]') && (name.includes('2025') || name.includes('FY25'))) {
    return true;
  }
  return false;
};

const getChannelColor = (channelName) => {
  if (!channelName) return COLORS[0];
  const name = channelName.toLowerCase();
  
  // Return consistent monochromatic neon green scale based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

const formatLUDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const CustomSelect = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value === 'All' ? placeholder : value}</span>
        <ChevronDown size={16} />
      </div>
      
      {isOpen && (
        <div className="custom-select-options">
          <div 
            className={`custom-select-option ${value === 'All' ? 'selected' : ''}`}
            onClick={() => { onChange('All'); setIsOpen(false); }}
          >
            {placeholder}
          </div>
          {options.map(opt => (
            <div 
              key={opt}
              className={`custom-select-option ${value === opt ? 'selected' : ''}`}
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomMultiSelect = ({ values = [], options = [], onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (opt) => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  const isAllSelected = !values || values.length === 0;

  const displayValue = isAllSelected 
    ? placeholder 
    : values.length === 1 
      ? values[0] 
      : `${values.length} Selected`;

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          maxWidth: '180px',
          display: 'block' 
        }}>
          {displayValue}
        </span>
        <ChevronDown size={16} />
      </div>
      
      {isOpen && (
        <div className="custom-select-options" style={{ maxHeight: '250px', overflowY: 'auto' }}>
          <div 
            className={`custom-select-option ${isAllSelected ? 'selected' : ''}`}
            onClick={() => { onChange([]); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <input 
              type="checkbox" 
              checked={isAllSelected} 
              readOnly 
            />
            <span>{placeholder}</span>
          </div>
          {options.map(opt => {
            const isSelected = values.includes(opt);
            return (
              <div 
                key={opt}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => { handleToggleOption(opt); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  readOnly 
                />
                <span style={{ fontSize: '0.9rem' }}>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const correctParsedDate = (dateObj, fy) => {
  if (!dateObj || isNaN(dateObj.getTime())) return dateObj;
  const year = dateObj.getTime() ? dateObj.getFullYear() : 2026;
  if (year < 2024) {
    const month = dateObj.getMonth();
    const targetFy = parseInt(fy) || 2026;
    const correctedYear = month >= 3 ? targetFy : targetFy + 1;
    dateObj.setFullYear(correctedYear);
  }
  return dateObj;
};

const getGenderFromItemColor = (itemColor) => {
  if (!itemColor) return 'Unisex';
  const clean = String(itemColor).trim().toUpperCase();
  if (clean.length < 4) return 'Unisex';
  
  // 1. Check 2nd letter (index 1)
  const secondLetter = clean.charAt(1);
  if (secondLetter === 'B') return 'Boys';
  if (secondLetter === 'G') return 'Girls';
  if (secondLetter === 'U') return 'Unisex';
  
  // 2. Check 4th letter (index 3)
  const fourthLetter = clean.charAt(3);
  if (fourthLetter === 'B') return 'Boys';
  if (fourthLetter === 'G') return 'Girls';
  if (fourthLetter === 'U') return 'Unisex';
  
  return 'Unisex';
};

const getGenderColor = (genderName) => {
  if (genderName === 'Girls') return '#e14eca'; // Bright neon magenta
  if (genderName === 'Boys') return '#1d8cf8';  // Bright blue
  return '#ba54f5'; // Vibrant purple for Unisex
};

// Determine role from email — only the admin email gets admin access
const getRoleFromEmail = (email) => {
  return email === 'manannegi17@gmail.com' ? 'admin' : 'user';
};

function App() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('dyno_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('dyno_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      return getRoleFromEmail(parsed.user?.email || '');
    }
    return 'user';
  });
  

  const [loginRole, setLoginRole] = useState('user'); // 'admin' or 'user'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ active: false, current: 0, total: 0 });

  // App State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [insightType, setInsightType] = useState('revenue');
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuSearchQueryPrev, setSkuSearchQueryPrev] = useState('');

  // Intelli Report State
  const [selectedReportFY, setSelectedReportFY] = useState('2026');
  const [reportStartMonth, setReportStartMonth] = useState('April');
  const [reportEndMonth, setReportEndMonth] = useState('May');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [reportType, setReportType] = useState('inventory'); // 'inventory' or 'business'
  const [selectedReportMonth, setSelectedReportMonth] = useState('June');
  const [saleReportStartDate, setSaleReportStartDate] = useState('');
  const [saleReportEndDate, setSaleReportEndDate] = useState('');

  // Reconciliation State
  const [recoMonth, setRecoMonth] = useState('April');
  const [recoYear, setRecoYear] = useState('2026');
  const [recoFile, setRecoFile] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [recoError, setRecoError] = useState('');
  const [recoSuccess, setRecoSuccess] = useState('');

  // Validation Dialog Modal State
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    missingColumns: [],
    onConfirm: null,
    onCancel: null
  });

  const [skuSortField, setSkuSortField] = useState('units'); // 'units' or 'returns'
  const [skuSortDirection, setSkuSortDirection] = useState('desc'); // 'asc' or 'desc'
  const [activeTableFilterDropdown, setActiveTableFilterDropdown] = useState(null); // 'units' or 'returns' or null

  // Inventory DRR and Live Dates States
  const [selectedDrrRange, setSelectedDrrRange] = useState(30);
  const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);
  const drrDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drrDropdownRef.current && !drrDropdownRef.current.contains(event.target)) {
        setIsRangeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [activePoItem, setActivePoItem] = useState(null);
  const [poMailRecipient, setPoMailRecipient] = useState('purchasing@dyno.com');
  const [poMailSubject, setPoMailSubject] = useState('');
  const [poMailBody, setPoMailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    if (activePoItem) {
      setEmailError('');
      setEmailSuccess('');
      setPoMailSubject(`[PO ORDER] Purchase Order Recommendation for SKU: ${activePoItem.sku}`);
      setPoMailBody(
`Hello,

Please initiate a Purchase Order for the following SKU:

Product SKU: ${activePoItem.sku}
Recommended PO Quantity: ${activePoItem.poRecommendation} units
Units Sold (Past ${selectedDrrRange} Days): ${activePoItem.unitsSold} units
Daily Run Rate (DRR): ${activePoItem.drr.toFixed(2)}
Current Inventory: ${activePoItem.inventoryQty} units

Please confirm once the PO has been raised.

Best regards,
Dyno Dashboard Auto-Mail`
      );
    }
  }, [activePoItem, selectedDrrRange]);

  const handleSendPoEmail = async () => {
    setIsSendingEmail(true);
    setEmailError('');
    setEmailSuccess('');
    try {
      const endpoint = window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api/send_po_email'
        : 'https://backend-production-bbaa.up.railway.app/api/send_po_email';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: poMailRecipient,
          subject: poMailSubject,
          body: poMailBody
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to send email.');
      }

      setEmailSuccess('Email sent successfully!');
      setTimeout(() => {
        setActivePoItem(null);
      }, 1500);
    } catch (err) {
      setEmailError(err.message || 'An error occurred.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const [isUploadingLiveDates, setIsUploadingLiveDates] = useState(false);
  const [liveDatesError, setLiveDatesError] = useState('');
  const [liveDatesSuccess, setLiveDatesSuccess] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryTab, setInventoryTab] = useState('all'); // 'all', 'alerts', 'new_launches'
  const [inventoryPage, setInventoryPage] = useState(1);

  // Second Product Returns Search States
  const [productSearchReturn, setProductSearchReturn] = useState('');
  const [selectedProductReturn, setSelectedProductReturn] = useState(null);

  // Previous Years Lazy Loading States
  const [isFY25Loaded, setIsFY25Loaded] = useState(false);
  const [isFY25Loading, setIsFY25Loading] = useState(false);
  const [fy25Progress, setFy25Progress] = useState({ active: false, current: 0, total: 0 });

  // Previous Years Filter States
  const [selectedMonthPrev, setSelectedMonthPrev] = useState([]);
  const [selectedDatePrev, setSelectedDatePrev] = useState('All');
  const [selectedDivisionPrev, setSelectedDivisionPrev] = useState('All');
  const [selectedChannelsPrev, setSelectedChannelsPrev] = useState([]);
  const [selectedCategoriesPrev, setSelectedCategoriesPrev] = useState([]);
  const [selectedGendersPrev, setSelectedGendersPrev] = useState([]);

  // Previous Years SKU Sorting States
  const [skuSortFieldPrev, setSkuSortFieldPrev] = useState('units');
  const [skuSortDirectionPrev, setSkuSortDirectionPrev] = useState('desc');
  const [activeTableFilterDropdownPrev, setActiveTableFilterDropdownPrev] = useState(null);

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState([]);
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedFY, setSelectedFY] = useState('2026');

  // Guard: ensures fetchData is called at most once per session lifecycle
  const hasFetchedRef = useRef(false);


  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveTableFilterDropdown(null);
      setActiveTableFilterDropdownPrev(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (userRole !== 'admin' && (activePage === 'raw_files' || activePage === 'reco')) {
      setActivePage('dashboard');
    }
  }, [userRole, activePage]);

  useEffect(() => {
    // 1. Initialize from localStorage immediately (on page load/reload)
    const savedSession = localStorage.getItem('dyno_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        setUserRole(getRoleFromEmail(parsed.user?.email || ''));
        // Fetch data once on initial load
        if (!hasFetchedRef.current) {
          hasFetchedRef.current = true;
          fetchData();
        }
      } catch (e) {
        console.error("Failed to parse saved session", e);
        localStorage.removeItem('dyno_session');
      }
    }

    // 2. Listen for Supabase Auth changes
    // IMPORTANT: Only update session/role here. NEVER call fetchData() here.
    // fetchData() is called explicitly after login and on initial mount only.
    // This prevents the dashboard from re-downloading data on every tab switch
    // (which triggers TOKEN_REFRESHED or INITIAL_SESSION events).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (sbSession) {
        setSession(sbSession);
        localStorage.setItem('dyno_session', JSON.stringify(sbSession));
        setUserRole(getRoleFromEmail(sbSession.user?.email || ''));
        // Do NOT call fetchData() here — handled by handleAuth and initial mount
      } else if (event === 'SIGNED_OUT') {
        hasFetchedRef.current = false;
        setSession(null);
        localStorage.removeItem('dyno_session');
        setUploadedFiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const downloadInventorySilently = async (inventoryFiles) => {
    if (inventoryFiles.length === 0) {
      setIsInventoryLoading(false);
      return;
    }
    setIsInventoryLoading(true);
    try {
      // Load cache
      let cache = {};
      const cachedRaw = localStorage.getItem('dyno_inventory_cache');
      if (cachedRaw) {
        try {
          cache = JSON.parse(cachedRaw);
        } catch (e) {
          console.error("Failed to parse inventory cache", e);
        }
      }

      const updates = {};
      const missingIds = [];

      // Check which file data is in cache
      inventoryFiles.forEach(file => {
        if (cache[file.id]) {
          updates[file.id] = cache[file.id];
        } else {
          missingIds.push(file.id);
        }
      });

      // Fetch missing files from Supabase
      if (missingIds.length > 0) {
        const batchSize = 15;
        const batches = [];
        for (let i = 0; i < missingIds.length; i += batchSize) {
          batches.push(missingIds.slice(i, i + batchSize));
        }

        for (const batch of batches) {
          const { data, error } = await supabase
            .from('uploaded_files')
            .select('id, data')
            .in('id', batch);

          if (!error && data) {
            data.forEach(item => {
              if (!item.data) return;
              const formattedRows = item.data.map(row => ({
                item_color: row.item_color || 'Unknown',
                total_inventory: parseFloat(row.total_inventory || row.totalinventory || 0) || 0,
                is_inventory: true
              }));
              updates[item.id] = formattedRows;
              cache[item.id] = formattedRows; // Add to cache
            });
          } else if (error) {
            console.error("Error fetching inventory batch silently:", error);
          }
        }

        // Save updated cache
        try {
          localStorage.setItem('dyno_inventory_cache', JSON.stringify(cache));
        } catch (e) {
          console.error("Failed to write to inventory cache", e);
        }
      }

      // Prune old entries from cache that are no longer in active metadata
      try {
        const activeIds = new Set(inventoryFiles.map(f => f.id));
        let pruned = false;
        Object.keys(cache).forEach(id => {
          if (!activeIds.has(id)) {
            delete cache[id];
            pruned = true;
          }
        });
        if (pruned) {
          localStorage.setItem('dyno_inventory_cache', JSON.stringify(cache));
        }
      } catch (e) {
        console.error("Failed to prune inventory cache", e);
      }

      // Update local state
      setUploadedFiles(prev => prev.map(f => updates[f.id] ? { ...f, data: updates[f.id] } : f));
    } catch (err) {
      console.error("Silent inventory download caught error:", err);
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const downloadLaunchDatesSilently = async (launchDateFiles) => {
    if (launchDateFiles.length === 0) return;
    try {
      const ids = launchDateFiles.map(f => f.id);
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('id, data')
        .in('id', ids);

      if (!error && data) {
        const updates = {};
        data.forEach(item => {
          if (!item.data) return;
          updates[item.id] = item.data.map(row => ({
            sku: row.sku || row.item_color || row.barcode || row.itemcolor || 'Unknown',
            live_date: row.live_date || row.launch_date || row.date || row.livedate || row.launchdate || null
          }));
        });
        setUploadedFiles(prev => prev.map(f => updates[f.id] ? { ...f, data: updates[f.id] } : f));
      } else if (error) {
        console.error("Error fetching launch dates silently:", error);
      }
    } catch (err) {
      console.error("Silent launch dates download caught error:", err);
    }
  };

  const fetchData = async () => {
    // 1. Fetch only metadata first (Lightning fast)
    const { data, error } = await supabase.from('uploaded_files').select('id, name, upload_date, record_count').order('upload_date', { ascending: false });
    
    if (!error && data) {
      const formatted = data.map(f => ({
        id: f.id,
        name: f.name,
        uploadDate: new Date(f.upload_date),
        recordCount: f.record_count,
        data: [] // Initially empty
      }));
      setUploadedFiles(formatted);
      
      // 2. Start background download
      if (formatted.length > 0) {
        const mainFiles = formatted.filter(f => 
          !isFY25File(f.name) && 
          !(f.name || '').startsWith('[INVENTORY]') &&
          !(f.name || '').startsWith('[LAUNCH_DATES]')
        );
        startBackgroundDownload(mainFiles);
        
        const inventoryFiles = formatted.filter(f => (f.name || '').startsWith('[INVENTORY]'));
        downloadInventorySilently(inventoryFiles);

        const launchDateFiles = formatted.filter(f => (f.name || '').startsWith('[LAUNCH_DATES]'));
        downloadLaunchDatesSilently(launchDateFiles);
      }
    } else if (error) {
      console.error("Error fetching metadata.", error);
    }
  };

  const downloadFilesData = async (files, setProgress) => {
    if (files.length === 0) return;
    setProgress({ active: true, current: 0, total: files.length });
    let completedCount = 0;
    
    // Group files into batches of 15 to query multiple files in a single HTTP request
    const batchSize = 15;
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    const promises = batches.map(async (batch) => {
      const batchIds = batch.map(f => f.id);
      try {
        const { data, error } = await supabase
          .from('uploaded_files')
          .select('id, data')
          .in('id', batchIds);
          
        if (!error && data) {
          const updates = {};
          data.forEach(item => {
            const file = batch.find(f => f.id === item.id);
            if (!file || !item.data) return;
            
            const isRet = (file.name || '').startsWith('[RETURN]');
            const isInv = (file.name || '').startsWith('[INVENTORY]');
            const parsedRows = item.data.map(row => {
              if (isInv) {
                return {
                  item_color: row.item_color || 'Unknown',
                  total_inventory: parseFloat(row.total_inventory || row.totalinventory || 0) || 0,
                  is_inventory: true
                };
              }
              if (isRet || row.is_return) {
                let dateObj = null;
                if (row.parsedDate) {
                  const fyVal = row.fy || '2026';
                  dateObj = correctParsedDate(new Date(row.parsedDate), fyVal);
                }
                return {
                  parsedDate: dateObj,
                  monthName: row.monthName || 'Unknown',
                  formattedDate: row.formattedDate || 'Unknown',
                  fy: row.fy || '2026',
                  channel_name: normalizeChannelName(row.channel_name),
                  item_color: row.item_color || 'Unknown',
                  return_qty: parseFloat(row.return_qty) || 0,
                  division: row.division || 'Unknown',
                  categories: row.categories || 'Unknown',
                  is_return: true
                };
              }

              let dateObj = null;
              const rawYear = row.year;
              if (row.parsedDate) {
                dateObj = new Date(row.parsedDate);
                if (rawYear && !isNaN(rawYear)) {
                  dateObj.setFullYear(parseInt(rawYear));
                }
              } else {
                let rawDateVal = undefined;
                const dayKey = Object.keys(row).find(k => k === 'day');
                if (dayKey) {
                  rawDateVal = row[dayKey];
                }
                if (rawDateVal === undefined) {
                  rawDateVal = row.date;
                }
                if (rawDateVal === undefined) {
                  const dateKey = Object.keys(row).find(k => k.includes('date') && k !== 'parseddate' && k !== 'formatteddate' && k !== 'dispatch_date');
                  if (dateKey) {
                    rawDateVal = row[dateKey];
                  }
                }
                if (rawDateVal) {
                  try {
                    let dateStr = rawDateVal.toString().trim();
                    if (rawYear && !isNaN(rawYear)) {
                      const yearStr = rawYear.toString().trim();
                      if (!dateStr.includes(yearStr)) {
                        dateStr = `${dateStr} ${yearStr}`;
                      }
                    }
                    dateObj = new Date(dateStr);
                  } catch {
                    dateObj = null;
                  }
                }
              }
              if (dateObj && isNaN(dateObj.getTime())) {
                dateObj = null;
              }

              let monthName = row.monthName;
              let formattedDate = row.formattedDate;
              if (dateObj && (!monthName || monthName === 'Unknown')) {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                monthName = monthNames[dateObj.getMonth()];
                const day = dateObj.getDate().toString().padStart(2, '0');
                formattedDate = `${day} ${monthNames[dateObj.getMonth()]}`;
              }

              let fyVal = '2026';
              if (row.fy) {
                fyVal = row.fy;
              } else if (dateObj) {
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth();
                if (year < 2024) {
                  fyVal = '2026';
                } else {
                  const fyStartYear = month >= 3 ? year : year - 1;
                  if (fyStartYear === 2025) {
                    fyVal = '2025';
                  } else {
                    fyVal = '2026';
                  }
                }
              }

              if (dateObj) {
                dateObj = correctParsedDate(dateObj, fyVal);
              }

              const priceVal = row.priceVal ?? row.new_sp ?? row.newsp ?? row.total_selling_price ?? row.totalsellingprice ?? row.price ?? 0;
              const parsedPriceVal = parseFloat(priceVal) || 0;

              return {
                parsedDate: dateObj,
                monthName: monthName || 'Unknown',
                formattedDate: formattedDate || 'Unknown',
                fy: fyVal,
                priceVal: parsedPriceVal,
                division: row.division || 'Unknown',
                channel_name: normalizeChannelName(row.channel_name || row.channelname || row.channel),
                categories: row.categories || row.category || 'Unknown',
                item_color: row.item_color || row.itemcolor || row.barcode || 'Unknown',
                item_type_size: row.item_type_size || row.itemtypesize || row.size || 'Unknown'
              };
            });
            
            updates[item.id] = parsedRows;
          });
          
          setUploadedFiles(prev => prev.map(f => updates[f.id] ? { ...f, data: updates[f.id] } : f));
        } else if (error) {
          console.error(`Error fetching batch:`, error);
        }
      } catch (err) {
        console.error(`Caught error fetching batch:`, err);
      } finally {
        completedCount += batch.length;
        setProgress(prev => ({ ...prev, current: completedCount }));
      }
    });
    
    await Promise.all(promises);
    setProgress({ active: false, current: 0, total: 0 });
  };

  const startBackgroundDownload = async (files) => {
    await downloadFilesData(files, setDownloadProgress);
  };

  const loadFY25Data = async () => {
    setIsFY25Loading(true);
    const fy25Files = uploadedFiles.filter(f => isFY25File(f.name) && f.data.length === 0);
    
    if (fy25Files.length > 0) {
      await downloadFilesData(fy25Files, setFy25Progress);
    }
    setIsFY25Loaded(true);
    setIsFY25Loading(false);
  };

  const validateConsecutiveMonths = (fromMonth, toMonth) => {
    const months = [
      "April", "May", "June", "July", "August", "September", "October", "November", "December",
      "January", "February", "March"
    ];
    const fromIdx = months.indexOf(fromMonth);
    const toIdx = months.indexOf(toMonth);
    if (fromIdx === -1 || toIdx === -1) return false;
    return toIdx === (fromIdx + 1) % 12;
  };

  const monthsList = [
    "April", "May", "June", "July", "August", "September", "October", "November", "December",
    "January", "February", "March"
  ];

  const yearsList = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

  const downloadIntelliReport = async () => {
    setReportError('');
    setIsGeneratingReport(true);

    try {
      const fromIdx = monthsList.indexOf(reportStartMonth);
      const toIdx = monthsList.indexOf(reportEndMonth);
      if (fromIdx === -1 || toIdx === -1 || toIdx !== (fromIdx + 1) % 12) {
        setReportError("Please select exactly 2 consecutive months (e.g. April to May).");
        setIsGeneratingReport(false);
        return;
      }

      const yearStr = selectedReportFY === 'FY25' ? '2025' : '2026';
      
      const filteredSales = data.filter(row => {
        const fy = row.fy || '2026';
        const m = row.monthName || 'Unknown';
        return fy === yearStr && (m === reportStartMonth || m === reportEndMonth);
      });

      const payload = {
        sales_data: filteredSales.map(row => ({
          item_color: row.item_color || 'Unknown',
          priceVal: row.priceVal || 0,
          monthName: row.monthName || 'Unknown',
          division: row.division || 'Unknown',
          categories: row.categories || 'Unknown'
        })),
        inventory_data: latestInventoryData.map,
        start_month: reportStartMonth,
        end_month: reportEndMonth,
        year: yearStr
      };

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiEndpoint = isLocal 
        ? 'http://localhost:5001/api/generate_report'
        : 'https://backend-production-bbaa.up.railway.app/api/generate_report';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Intelli_Inventory_Report_${selectedReportFY}_${reportStartMonth}_${reportEndMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      setReportError(err.message || "Failed to generate report. Make sure local Python server is running.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadWeeklyBusinessReport = async () => {
    setReportError('');
    setIsGeneratingReport(true);

    try {
      const yearStr = selectedReportFY === 'FY25' ? '2025' : '2026';
      
      const filteredSales = data.filter(row => {
        const fy = row.fy || '2026';
        const m = row.monthName || 'Unknown';
        return fy === yearStr && m === selectedReportMonth;
      });

      const filteredReturns = returnData.filter(row => {
        const fy = row.fy || '2026';
        const m = row.monthName || 'Unknown';
        return fy === yearStr && m === selectedReportMonth;
      });

      const payload = {
        sales_data: filteredSales.map(row => ({
          parsedDate: row.parsedDate,
          priceVal: row.priceVal || 0,
          channel_name: row.channel_name || 'Unknown'
        })),
        returns_data: filteredReturns.map(row => ({
          parsedDate: row.parsedDate,
          return_qty: row.return_qty || 0,
          channel_name: row.channel_name || 'Unknown'
        })),
        month: selectedReportMonth,
        year: yearStr
      };

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiEndpoint = isLocal 
        ? 'http://localhost:5001/api/generate_weekly_business_report'
        : 'https://backend-production-bbaa.up.railway.app/api/generate_weekly_business_report';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Weekly_Business_Report_${selectedReportFY}_${selectedReportMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      setReportError(err.message || "Failed to generate report. Make sure local Python server is running.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadSaleReport = () => {
    try {
      if (!saleReportStartDate || !saleReportEndDate) {
        setReportError('Please select both Start Date and End Date.');
        return;
      }

      const start = new Date(saleReportStartDate);
      const end = new Date(saleReportEndDate);

      if (start > end) {
        setReportError('Start Date cannot be after End Date.');
        return;
      }

      // Check max range (93 days)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 93) {
        setReportError('Date range cannot exceed 3 months.');
        return;
      }

      setIsGeneratingReport(true);
      setReportError('');

      // Filter and map sales data in the date range
      const excelRows = [];
      data.forEach(row => {
        if (!row.parsedDate) return;
        const rowDate = new Date(row.parsedDate);
        const m = rowDate.getMonth();
        const d = rowDate.getDate();

        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        for (let y = startYear; y <= endYear; y++) {
          const testDate = new Date(y, m, d);
          const compareStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const compareEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          if (testDate >= compareStart && testDate <= compareEnd) {
            excelRows.push({
              'Date': testDate.toLocaleDateString('en-IN'),
              'Month': row.monthName || '',
              'Formatted Date': row.formattedDate || '',
              'FY': row.fy || '',
              'Selling Price': row.priceVal || 0,
              'Division': row.division || '',
              'Channel': row.channel_name || '',
              'Category': row.categories || '',
              'Item Color': row.item_color || '',
              'Size': row.item_type_size || ''
            });
            break; // Stop once we find a matching calendar year
          }
        }
      });

      if (excelRows.length === 0) {
        setReportError('No sales data found in the selected date range.');
        setIsGeneratingReport(false);
        return;
      }

      // Create Worksheet using SheetJS
      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      
      // Auto-fit column widths
      const colWidths = Object.keys(excelRows[0]).map(key => {
        let maxLen = key.length;
        excelRows.forEach(row => {
          const val = String(row[key] || '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = colWidths;

      // Create Workbook and append sheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      // Write and trigger download
      XLSX.writeFile(workbook, `Sales_Report_${saleReportStartDate}_to_${saleReportEndDate}.xlsx`);
      
      setIsGeneratingReport(false);
    } catch (e) {
      console.error(e);
      setReportError('Failed to generate sales report. Please try again.');
      setIsGeneratingReport(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const emailToUse = authEmail.trim().toLowerCase();

    // Enforce admin vs user credentials selection check
    const calculatedRole = getRoleFromEmail(emailToUse);
    if (loginRole === 'admin' && calculatedRole !== 'admin') {
      setAuthError('Under Admin Mode, you cannot login with User credentials.');
      setIsLoading(false);
      return;
    }
    if (loginRole === 'user' && calculatedRole === 'admin') {
      setAuthError('Under User Mode, you cannot login with Admin credentials.');
      setIsLoading(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: authPassword,
    });

    if (error) {
      console.error('Supabase Auth Error:', error);
      setAuthError('Invalid credentials. Please check your ID and password.');
      setIsLoading(false);
      return;
    }

    if (authData.session) {
      setSession(authData.session);
      localStorage.setItem('dyno_session', JSON.stringify(authData.session));
      const role = getRoleFromEmail(authData.session.user?.email || '');
      setUserRole(role);
      hasFetchedRef.current = true;
      fetchData();
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('dyno_session');
    supabase.auth.signOut();
    setAuthEmail('');
    setAuthPassword('');
  };

  const data = useMemo(() => {
    return uploadedFiles
      .filter(file => 
        !(file.name || '').startsWith('[RETURN]') && 
        !(file.name || '').startsWith('[INVENTORY]') &&
        !(file.name || '').startsWith('[LAUNCH_DATES]')
      )
      .flatMap(file => file.data);
  }, [uploadedFiles]);

  const returnData = useMemo(() => {
    return uploadedFiles
      .filter(file => (file.name || '').startsWith('[RETURN]'))
      .flatMap(file => file.data);
  }, [uploadedFiles]);

  const latestInventoryData = useMemo(() => {
    const invFiles = uploadedFiles.filter(f => (f.name || '').startsWith('[INVENTORY]') && f.data && f.data.length > 0);
    if (invFiles.length === 0) return { date: null, map: {} };
    
    const sorted = [...invFiles].sort((a, b) => b.uploadDate - a.uploadDate);
    const latestFile = sorted[0];
    
    // Extract base name, e.g. "Current Inventory.xlsx" from "[INVENTORY] Current Inventory.xlsx (Part 1/10)"
    const getBaseName = (name) => {
      if (!name) return "";
      let base = name.replace(/^\[INVENTORY\]\s*/i, "");
      base = base.replace(/\s*\(Part\s+\d+\/\d+\)$/i, "");
      return base.trim();
    };
    
    const latestBase = getBaseName(latestFile.name);
    const group = sorted.filter(f => getBaseName(f.name) === latestBase);
    
    const map = {};
    group.forEach(file => {
      if (file.data) {
        file.data.forEach(row => {
          const sku = row.item_color || 'Unknown';
          if (!map[sku]) {
            map[sku] = 0;
          }
          map[sku] += row.total_inventory || 0;
        });
      }
    });
    
    return {
      date: latestFile.uploadDate,
      map
    };
  }, [uploadedFiles]);

  const skuLiveDatesMap = useMemo(() => {
    const launchDateFile = uploadedFiles.find(f => (f.name || '').startsWith('[LAUNCH_DATES]'));
    const map = {};
    if (launchDateFile && launchDateFile.data) {
      launchDateFile.data.forEach(row => {
        const rawSku = row.sku || row.item_color || row.barcode || row.itemcolor;
        const rawDate = row.live_date || row.launch_date || row.date || row.livedate || row.launchdate;
        if (rawSku && rawDate) {
          const skuStr = String(rawSku).trim().toUpperCase();
          let dateObj = null;
          if (rawDate instanceof Date) {
            dateObj = rawDate;
          } else {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              dateObj = parsed;
            }
          }
          if (dateObj) {
            map[skuStr] = dateObj;
          }
        }
      });
    }
    return map;
  }, [uploadedFiles]);

  const inventoryDrrData = useMemo(() => {
    const today = new Date();
    const rangeStart = new Date(today);
    rangeStart.setDate(today.getDate() - selectedDrrRange);

    // Filter sales to range
    const rangeSales = data.filter(item => {
      if (!item.parsedDate) return false;
      const d = new Date(item.parsedDate);
      return d >= rangeStart && d <= today;
    });

    // Count sales per SKU
    const salesCountMap = {};
    rangeSales.forEach(item => {
      const sku = String(item.item_color || '').trim().toUpperCase();
      if (sku && sku !== 'UNKNOWN') {
        salesCountMap[sku] = (salesCountMap[sku] || 0) + 1;
      }
    });

    // Get list of unique SKUs that have ever been sold or have a launch date
    const uniqueSkus = new Set([
      ...Object.keys(salesCountMap),
      ...Object.keys(skuLiveDatesMap)
    ]);

    // Calculate DRR and PO recommendations
    const list = Array.from(uniqueSkus).map(sku => {
      const launchDate = skuLiveDatesMap[sku] || null;
      let activeDays = selectedDrrRange;
      let ageDays = null;

      if (launchDate) {
        const diffTime = today - launchDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        ageDays = diffDays >= 0 ? diffDays : 0;
        
        if (diffDays < 0) {
          activeDays = 0;
        } else {
          activeDays = Math.max(1, Math.min(selectedDrrRange, diffDays));
        }
      }

      const unitsSold = salesCountMap[sku] || 0;
      const drr = activeDays > 0 ? unitsSold / activeDays : 0;

      // Identify if it's a "New Launch" (launched in the last 90 days)
      const isNewLaunch = ageDays !== null && ageDays <= 90;

      // PO Qty Recommendation based on DRR thresholds for New Launches
      let poRecommendation = 0;
      let alertLevel = 'normal'; // 'normal', 'yellow', 'orange', 'red', 'danger'
      let alarmMessage = 'Normal / No Action';

      if (isNewLaunch) {
        if (drr >= 2.0) {
          poRecommendation = 1000;
          alertLevel = 'danger';
          alarmMessage = 'Raise 1000 Qty PO';
        } else if (drr >= 1.5) {
          poRecommendation = 800;
          alertLevel = 'red';
          alarmMessage = 'Raise 800 Qty PO';
        } else if (drr >= 1.0) {
          poRecommendation = 600;
          alertLevel = 'orange';
          alarmMessage = 'Raise 600 Qty PO';
        } else if (drr >= 0.8) {
          poRecommendation = 400;
          alertLevel = 'yellow';
          alarmMessage = 'Raise 400 Qty PO';
        }
      }

      const inventoryQty = latestInventoryData && latestInventoryData.map ? (latestInventoryData.map[sku] || 0) : 0;

      return {
        sku,
        launchDate,
        ageDays,
        unitsSold,
        activeDays,
        drr,
        isNewLaunch,
        poRecommendation,
        alertLevel,
        alarmMessage,
        inventoryQty
      };
    });

    return list;
  }, [data, skuLiveDatesMap, selectedDrrRange, latestInventoryData]);

  const [inventorySortField, setInventorySortField] = useState('drr');
  const [inventorySortOrder, setInventorySortOrder] = useState('desc');

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryTab, selectedDrrRange]);

  const filteredInventory = useMemo(() => {
    return inventoryDrrData.filter(item => {
      // Search filter
      const matchesSearch = item.sku.toLowerCase().includes(inventorySearch.toLowerCase());
      if (!matchesSearch) return false;

      // Tab filter
      if (inventoryTab === 'alerts') {
        return item.poRecommendation > 0;
      }
      if (inventoryTab === 'new_launches') {
        return item.isNewLaunch;
      }
      return true;
    });
  }, [inventoryDrrData, inventorySearch, inventoryTab]);

  const sortedInventory = useMemo(() => {
    return [...filteredInventory].sort((a, b) => {
      let valA = a[inventorySortField];
      let valB = b[inventorySortField];

      // Handle nulls
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (valA < valB) return inventorySortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return inventorySortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInventory, inventorySortField, inventorySortOrder]);

  const paginatedInventory = useMemo(() => {
    const startIdx = (inventoryPage - 1) * 50;
    return sortedInventory.slice(startIdx, startIdx + 50);
  }, [sortedInventory, inventoryPage]);

  const totalInventoryPages = Math.ceil(sortedInventory.length / 50) || 1;

  const validateSalesData = (parsedData) => {
    if (!parsedData || parsedData.length === 0) return [];
    
    const missingColumns = new Set();
    
    parsedData.forEach(row => {
      // Skip empty rows
      const isEmptyRow = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '');
      if (isEmptyRow) return;

      // Create a normalized key version of the raw row for this scan
      const normRow = {};
      for (const k in row) {
        const normKey = k.trim().toLowerCase().replace(/\s+/g, '_');
        normRow[normKey] = row[k];
      }

      // 1. Date check
      const dayKey = Object.keys(normRow).find(k => k === 'day');
      const dateKey = Object.keys(normRow).find(k => k === 'date');
      const dynamicDateKey = Object.keys(normRow).find(k => k.includes('date') && k !== 'parseddate' && k !== 'formatteddate' && k !== 'dispatch_date');
      const matchedDateKey = dayKey || dateKey || dynamicDateKey;
      
      const dateVal = matchedDateKey !== undefined ? normRow[matchedDateKey] : undefined;
      if (dateVal === undefined || dateVal === null || String(dateVal).trim() === '') {
        missingColumns.add('Date');
      }

      // 2. Size check
      const matchedSizeKey = Object.keys(normRow).find(k => k === 'size' || k === 'item_type_size' || k === 'itemtypesize');
      const sizeVal = matchedSizeKey !== undefined ? normRow[matchedSizeKey] : undefined;
      if (sizeVal === undefined || sizeVal === null || String(sizeVal).trim() === '') {
        missingColumns.add('Size');
      }

      // 3. Item Color check
      const matchedColorKey = Object.keys(normRow).find(k => k === 'item_color' || k === 'itemcolor' || k === 'barcode');
      const colorVal = matchedColorKey !== undefined ? normRow[matchedColorKey] : undefined;
      if (colorVal === undefined || colorVal === null || String(colorVal).trim() === '') {
        missingColumns.add('Item Color');
      }

      // 4. Category check
      const matchedCatKey = Object.keys(normRow).find(k => k === 'categories' || k === 'category');
      const catVal = matchedCatKey !== undefined ? normRow[matchedCatKey] : undefined;
      if (catVal === undefined || catVal === null || String(catVal).trim() === '') {
        missingColumns.add('Category');
      }

      // 5. Division check
      const divVal = normRow.division;
      if (divVal === undefined || divVal === null || String(divVal).trim() === '') {
        missingColumns.add('Division');
      }

      // 6. Price check (New SP only - blank only, 0 is allowed!)
      const matchedPriceKey = Object.keys(normRow).find(k => k === 'new_sp' || k === 'newsp');
      const priceVal = matchedPriceKey !== undefined ? normRow[matchedPriceKey] : undefined;
      if (priceVal === undefined || priceVal === null || String(priceVal).trim() === '') {
        missingColumns.add('New SP');
      }

      // 7. Channel check
      const matchedChannelKey = Object.keys(normRow).find(k => k === 'channel_name' || k === 'channelname' || k === 'channel');
      const channelVal = matchedChannelKey !== undefined ? normRow[matchedChannelKey] : undefined;
      if (channelVal === undefined || channelVal === null || String(channelVal).trim() === '') {
        missingColumns.add('Channel');
      }
    });

    return Array.from(missingColumns);
  };

  const saveSalesDataToDb = async (normalizedData, file, targetElement) => {
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < normalizedData.length; i += chunkSize) {
      chunks.push(normalizedData.slice(i, i + chunkSize));
    }

    setIsLoading(true);
    let success = true;
    let errorMessage = "";

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const newFileEntry = {
        name: chunks.length > 1 ? `${file.name} (Part ${i + 1}/${chunks.length})` : file.name,
        record_count: chunk.length,
        data: chunk
      };

      const { error } = await supabase.from('uploaded_files').insert([newFileEntry]);
      if (error) {
        console.error("Upload chunk error:", error);
        success = false;
        errorMessage = error.message;
        break;
      }
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsLoading(false);
    if (targetElement) {
      targetElement.value = null;
    }

    if (success) {
      fetchData();
    } else {
      alert(`Error saving file to database: ${errorMessage}. If the file is too large, it partially uploaded.`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetElement = e.target;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json(ws);
      
      const normalizedData = parsedData.map(row => {
        const normalizedRow = {};
        for (const key in row) {
          const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalizedRow[newKey] = row[key];
        }

        // Find the date field by searching for keys dynamically, giving absolute priority to "day"
        let rawDate = undefined;
        const dayKey = Object.keys(normalizedRow).find(k => k === 'day');
        if (dayKey) {
          rawDate = normalizedRow[dayKey];
        }
        if (rawDate === undefined) {
          rawDate = normalizedRow.date;
        }
        if (rawDate === undefined) {
          const dateKey = Object.keys(normalizedRow).find(k => k.includes('date') && k !== 'parseddate' && k !== 'formatteddate' && k !== 'dispatch_date');
          if (dateKey) {
            rawDate = normalizedRow[dateKey];
          }
        }
        const rawYear = normalizedRow.year; // Check for a separate 'year' column
         
        let dateObj = null;
        if (rawDate) {
          if (rawDate instanceof Date) {
            dateObj = new Date(rawDate);
            if (rawYear && !isNaN(rawYear)) {
              dateObj.setFullYear(parseInt(rawYear));
            }
          } else {
            try {
              let dateStr = rawDate.toString().trim();
              if (rawYear && !isNaN(rawYear)) {
                const yearStr = rawYear.toString().trim();
                if (!dateStr.includes(yearStr)) {
                  dateStr = `${dateStr} ${yearStr}`;
                }
              }
              dateObj = new Date(dateStr);
              if (isNaN(dateObj.getTime())) dateObj = null;
            } catch {
              dateObj = null;
            }
          }
        }

        let monthName = 'Unknown';
        let formattedDate = 'Unknown';
        let fyVal = '2026';

        if (dateObj) {
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          monthName = monthNames[dateObj.getMonth()];
          const day = dateObj.getDate().toString().padStart(2, '0');
          formattedDate = `${day} ${monthNames[dateObj.getMonth()]}`;
          
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth();
          if (year < 2024) {
            fyVal = '2026';
          } else {
            const fyStartYear = month >= 3 ? year : year - 1;
            fyVal = fyStartYear.toString();
          }
          dateObj = correctParsedDate(dateObj, fyVal);
        }

        const priceVal = normalizedRow.new_sp || normalizedRow.newsp || normalizedRow.total_selling_price || normalizedRow.totalsellingprice || normalizedRow.price || 0;
        const parsedPriceVal = parseFloat(priceVal) || 0;

        return {
          parsedDate: dateObj ? dateObj.toISOString() : null,
          monthName,
          formattedDate,
          fy: fyVal,
          priceVal: parsedPriceVal,
          new_sp: normalizedRow.new_sp ?? normalizedRow.newsp ?? null,
          division: normalizedRow.division || 'Unknown',
          channel_name: normalizeChannelName(normalizedRow.channel_name || normalizedRow.channelname || normalizedRow.channel),
          categories: normalizedRow.categories || normalizedRow.category || 'Unknown',
          item_color: normalizedRow.item_color || normalizedRow.itemcolor || normalizedRow.barcode || 'Unknown',
          item_type_size: normalizedRow.item_type_size || normalizedRow.itemtypesize || normalizedRow.size || 'Unknown'
        };
      });

      const missingColumns = validateSalesData(parsedData);

      if (missingColumns.length > 0) {
        setValidationModal({
          isOpen: true,
          missingColumns,
          onConfirm: () => {
            saveSalesDataToDb(normalizedData, file, targetElement);
            setValidationModal(prev => ({ ...prev, isOpen: false }));
          },
          onCancel: () => {
            targetElement.value = null;
            setValidationModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return;
      }

      saveSalesDataToDb(normalizedData, file, targetElement);
    };
    reader.readAsBinaryString(file);
  };

  const handleLiveDatesUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetElement = e.target;

    setIsUploadingLiveDates(true);
    setLiveDatesError('');
    setLiveDatesSuccess('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (parsedData.length === 0) {
          throw new Error("The selected file is empty.");
        }

        // Verify structure
        const firstRow = parsedData[0];
        const normalizedKeys = Object.keys(firstRow).map(k => k.trim().toLowerCase().replace(/\s+/g, '_'));
        const hasSku = normalizedKeys.some(k => 
          k.includes('sku') || 
          k.includes('item_color') || 
          k.includes('barcode') || 
          k.includes('itemcolor') ||
          k.includes('item_name') ||
          k.includes('style_id')
        );
        const hasDate = normalizedKeys.some(k => k.includes('date') || k.includes('live') || k.includes('launch'));

        if (!hasSku || !hasDate) {
          throw new Error("Invalid file format. The file must contain at least one product column (SKU/Item Color/Barcode) and a launch date column (Live Date/Launch Date).");
        }

        // Custom date string parser for formats like "dd mmm yyyy"
        const parseCustomDateString = (str) => {
          if (!str) return null;
          const s = String(str).trim();
          
          // Try standard Date parsing
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
          
          // Match "dd mmm yyyy" (e.g., "14 Jul 2026") or "dd-mmm-yyyy"
          const match = s.match(/^(\d{1,2})[\s\-]+([a-zA-Z]{3,9})[\s\-]+(\d{4})$/);
          if (match) {
            const day = parseInt(match[1], 10);
            const monthStr = match[2].toLowerCase().substring(0, 3);
            const year = parseInt(match[3], 10);
            
            const months = {
              jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
              jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            
            if (months[monthStr] !== undefined) {
              const date = new Date(year, months[monthStr], day);
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
          }
          return null;
        };

        // Fetch existing launch date files from Supabase to merge
        const { data: existingFiles, error: fetchError } = await supabase
          .from('uploaded_files')
          .select('id, name, data');

        if (fetchError) throw fetchError;

        // Build existing mapping from existing [LAUNCH_DATES] files in database
        const existingMap = {};
        const launchDateFiles = existingFiles.filter(f => (f.name || '').startsWith('[LAUNCH_DATES]'));
        
        launchDateFiles.forEach(f => {
          if (f.data && Array.isArray(f.data)) {
            f.data.forEach(row => {
              const sku = row.sku || row.item_color || row.barcode || row.itemcolor;
              const date = row.live_date || row.launch_date || row.date || row.livedate || row.launchdate;
              if (sku && date) {
                existingMap[String(sku).trim().toUpperCase()] = date;
              }
            });
          }
        });

        let newRecordsCount = 0;

        // Process newly uploaded rows
        const newlyUploadedRows = parsedData.map(row => {
          const norm = {};
          for (const key in row) {
            norm[key.trim().toLowerCase().replace(/\s+/g, '_')] = row[key];
          }
          const sku = norm.sku || norm.item_color || norm.barcode || norm.itemcolor || norm['item_name-color'] || norm.item_name_color || norm.style_id || norm.item_name;
          const liveDateVal = norm.live_date || norm.launch_date || norm.date || norm.livedate || norm.launchdate;

          let formattedDate = null;
          if (liveDateVal) {
            const dateObj = parseCustomDateString(liveDateVal);
            if (dateObj) {
              formattedDate = dateObj.toISOString();
            }
          }

          return {
            sku: sku ? String(sku).trim().toUpperCase() : 'Unknown',
            live_date: formattedDate
          };
        }).filter(r => r.sku !== 'Unknown' && r.live_date !== null);

        // Merge: keep database's existing date if there is a match, else insert the new one
        const mergedData = [];
        const seenSkus = new Set();

        // Add existing ones first to ensure their dates are preserved
        Object.keys(existingMap).forEach(sku => {
          mergedData.push({
            sku,
            live_date: existingMap[sku]
          });
          seenSkus.add(sku);
        });

        // Add newly uploaded ones only if they don't exist yet
        newlyUploadedRows.forEach(row => {
          if (!seenSkus.has(row.sku)) {
            mergedData.push(row);
            seenSkus.add(row.sku);
            newRecordsCount++;
          }
        });

        if (mergedData.length === 0) {
          throw new Error("No launch date records were parsed.");
        }

        // Delete all old launch date files from database to replace with merged data
        const fileIdsToDelete = launchDateFiles.map(f => f.id);
        if (fileIdsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('uploaded_files')
            .delete()
            .in('id', fileIdsToDelete);

          if (deleteError) throw deleteError;
        }

        // Upload merged file
        const newFileEntry = {
          name: `[LAUNCH_DATES] SKU Live Dates.xlsx`,
          record_count: mergedData.length,
          data: mergedData
        };

        const { error: insertError } = await supabase
          .from('uploaded_files')
          .insert([newFileEntry]);

        if (insertError) throw insertError;

        setLiveDatesSuccess(`Uploaded. Added ${newRecordsCount} new SKUs. Total SKUs: ${mergedData.length}.`);
        fetchData(); // Reload metadata and data
      } catch (err) {
        console.error(err);
        setLiveDatesError(err.message || "An error occurred while uploading live dates.");
      } finally {
        setIsUploadingLiveDates(false);
        if (targetElement) {
          targetElement.value = null;
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const saveReconciliationDataToDb = async (normalizedData, targetMonth, targetYear) => {
    try {
      setIsReconciling(true);
      setRecoError('');
      setRecoSuccess('');

      // 1. Fetch metadata of all files from Supabase to filter matches
      const { data: dbFiles, error: fetchError } = await supabase
        .from('uploaded_files')
        .select('id, name, data');

      if (fetchError) throw fetchError;

      // Map months to their common abbreviation
      const monthAbbrs = {
        'January': 'jan',
        'February': 'feb',
        'March': 'mar',
        'April': 'apr',
        'May': 'may',
        'June': 'jun',
        'July': 'jul',
        'August': 'aug',
        'September': 'sep',
        'October': 'oct',
        'November': 'nov',
        'December': 'dec'
      };

      const targetMonthLower = targetMonth.toLowerCase();
      const targetAbbr = monthAbbrs[targetMonth];

      // Filter file records to delete
      const filesToDelete = dbFiles.filter(f => {
        const name = f.name || '';
        // Skip return and inventory files
        if (name.startsWith('[RETURN]') || name.startsWith('[INVENTORY]')) return false;

        const lowerName = name.toLowerCase();
        const matchesMonth = lowerName.includes(targetMonthLower) || (targetAbbr && lowerName.includes(targetAbbr));
        if (!matchesMonth) return false;

        // Verify that at least one row in the file belongs to the target year
        if (f.data && Array.isArray(f.data) && f.data.length > 0) {
          const firstRow = f.data[0];
          
          // Check financial year property first
          const rowFy = firstRow.fy || firstRow.FY;
          if (rowFy && rowFy.toString() === targetYear) {
            return true;
          }

          // Fallback to date parsing
          const dateStr = firstRow.parsedDate || firstRow.parseddate || firstRow.date || firstRow.day;
          if (dateStr) {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
              const rowYear = dateObj.getFullYear();
              if (rowYear.toString() === targetYear) return true;
              // Fallback for legacy 2001 parser bug: if targetYear is 2026, also match any year < 2024
              if (targetYear === '2026' && rowYear < 2024) return true;
            }
          }
        }
        return false;
      });

      const fileIdsToDelete = filesToDelete.map(f => f.id);
      const deletedFileNames = filesToDelete.map(f => f.name);

      console.log(`Reconciliation: deleting files for ${targetMonth} ${targetYear}:`, deletedFileNames);

      // 2. Delete matched files from Supabase
      if (fileIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('uploaded_files')
          .delete()
          .in('id', fileIdsToDelete);

        if (deleteError) throw deleteError;
      }

      // 3. Upload new reconciled file in chunks
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < normalizedData.length; i += chunkSize) {
        chunks.push(normalizedData.slice(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const newFileEntry = {
          name: chunks.length > 1 
            ? `[RECO] ${targetMonth} ${targetYear} Reconciled Sales (Part ${i + 1}/${chunks.length})`
            : `[RECO] ${targetMonth} ${targetYear} Reconciled Sales`,
          record_count: chunk.length,
          data: chunk
        };

        const { error: insertError } = await supabase
          .from('uploaded_files')
          .insert([newFileEntry]);

        if (insertError) throw insertError;

        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Success!
      setRecoSuccess(`Successfully reconciled ${targetMonth} ${targetYear}. Deleted ${fileIdsToDelete.length} old sales file(s) and uploaded new reconciled sales records.`);
      setRecoFile(null);
      
      // Reset file input element if found
      const fileInput = document.getElementById('reco-file-input');
      if (fileInput) fileInput.value = '';

      // Refresh dashboard data
      fetchData();

    } catch (err) {
      console.error(err);
      setRecoError(err.message || 'An error occurred during reconciliation.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleReconciliationUpload = () => {
    if (!recoFile) {
      setRecoError('Please choose a file to upload.');
      return;
    }
    if (!recoMonth) {
      setRecoError('Please select a month.');
      return;
    }

    setRecoError('');
    setRecoSuccess('');
    setIsReconciling(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (parsedData.length === 0) {
          throw new Error("The selected file is empty.");
        }

        const normalizedData = parsedData.map(row => {
          const normalizedRow = {};
          for (const key in row) {
            const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            normalizedRow[newKey] = row[key];
          }

          let rawDate = undefined;
          const dayKey = Object.keys(normalizedRow).find(k => k === 'day');
          if (dayKey) {
            rawDate = normalizedRow[dayKey];
          }
          if (rawDate === undefined) {
            rawDate = normalizedRow.date;
          }
          if (rawDate === undefined) {
            const dateKey = Object.keys(normalizedRow).find(k => k.includes('date') && k !== 'parseddate' && k !== 'formatteddate' && k !== 'dispatch_date');
            if (dateKey) {
              rawDate = normalizedRow[dateKey];
            }
          }
          const rawYear = normalizedRow.year;

          let dateObj = null;
          if (rawDate) {
            if (rawDate instanceof Date) {
              dateObj = new Date(rawDate);
              if (rawYear && !isNaN(rawYear)) {
                dateObj.setFullYear(parseInt(rawYear));
              }
            } else {
              try {
                let dateStr = rawDate.toString().trim();
                if (rawYear && !isNaN(rawYear)) {
                  const yearStr = rawYear.toString().trim();
                  if (!dateStr.includes(yearStr)) {
                    dateStr = `${dateStr} ${yearStr}`;
                  }
                }
                dateObj = new Date(dateStr);
                if (isNaN(dateObj.getTime())) dateObj = null;
              } catch {
                dateObj = null;
              }
            }
          }

          let monthName = 'Unknown';
          let formattedDate = 'Unknown';
          let fyVal = '2026';

          if (dateObj) {
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            monthName = monthNames[dateObj.getMonth()];
            const day = dateObj.getDate().toString().padStart(2, '0');
            formattedDate = `${day} ${monthNames[dateObj.getMonth()]}`;

            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            if (year < 2024) {
              fyVal = '2026';
            } else {
              const fyStartYear = month >= 3 ? year : year - 1;
              fyVal = fyStartYear.toString();
            }
            dateObj = correctParsedDate(dateObj, fyVal);
          }

          const priceVal = normalizedRow.new_sp || normalizedRow.newsp || normalizedRow.total_selling_price || normalizedRow.totalsellingprice || normalizedRow.price || 0;
          const parsedPriceVal = parseFloat(priceVal) || 0;

          return {
            parsedDate: dateObj ? dateObj.toISOString() : null,
            monthName,
            formattedDate,
            fy: fyVal,
            priceVal: parsedPriceVal,
            new_sp: normalizedRow.new_sp ?? normalizedRow.newsp ?? null,
            division: normalizedRow.division || 'Unknown',
            channel_name: normalizeChannelName(normalizedRow.channel_name || normalizedRow.channelname || normalizedRow.channel),
            categories: normalizedRow.categories || normalizedRow.category || 'Unknown',
            item_color: normalizedRow.item_color || normalizedRow.itemcolor || normalizedRow.barcode || 'Unknown',
            item_type_size: normalizedRow.item_type_size || normalizedRow.itemtypesize || normalizedRow.size || 'Unknown'
          };
        });

        const missingColumns = validateSalesData(parsedData);

        if (missingColumns.length > 0) {
          setValidationModal({
            isOpen: true,
            missingColumns,
            onConfirm: () => {
              saveReconciliationDataToDb(normalizedData, recoMonth, recoYear);
              setValidationModal(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setIsReconciling(false);
              const fileInput = document.getElementById('reco-file-input');
              if (fileInput) fileInput.value = '';
              setRecoFile(null);
              setValidationModal(prev => ({ ...prev, isOpen: false }));
            }
          });
          return;
        }

        saveReconciliationDataToDb(normalizedData, recoMonth, recoYear);

      } catch (err) {
        console.error(err);
        setRecoError(err.message || 'An error occurred during reconciliation.');
        setIsReconciling(false);
      }
    };
    reader.readAsBinaryString(recoFile);
  };

  const handleReturnUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json(ws);
      
      const normalizedData = parsedData.map(row => {
        const normalizedRow = {};
        for (const key in row) {
          const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalizedRow[newKey] = row[key];
        }

        let rawDate = normalizedRow.date_1; // check yellow-marked date column first
        if (rawDate === undefined) {
          rawDate = normalizedRow.date;
        }
        if (rawDate === undefined) {
          const dayKey = Object.keys(normalizedRow).find(k => k === 'day');
          if (dayKey) {
            rawDate = normalizedRow[dayKey];
          }
        }
        if (rawDate === undefined) {
          const dateKey = Object.keys(normalizedRow).find(k => k.includes('date') && k !== 'parseddate' && k !== 'formatteddate' && k !== 'dispatch_date');
          if (dateKey) {
            rawDate = normalizedRow[dateKey];
          }
        }

        const rawYear = normalizedRow.year;
         
        let dateObj = null;
        if (rawDate) {
          if (rawDate instanceof Date) {
            dateObj = new Date(rawDate);
            if (rawYear && !isNaN(rawYear)) {
              dateObj.setFullYear(parseInt(rawYear));
            }
          } else {
            try {
              let dateStr = rawDate.toString().trim();
              if (rawYear && !isNaN(rawYear)) {
                const yearStr = rawYear.toString().trim();
                if (!dateStr.includes(yearStr)) {
                  dateStr = `${dateStr} ${yearStr}`;
                }
              }
              
              if (!isNaN(dateStr) && parseFloat(dateStr) > 40000) {
                dateObj = new Date((parseFloat(dateStr) - 25569) * 86400 * 1000);
              } else {
                dateObj = new Date(dateStr);
              }
              if (isNaN(dateObj.getTime())) dateObj = null;
            } catch {
              dateObj = null;
            }
          }
        }

        let monthName = normalizedRow.month || 'Unknown';
        let formattedDate = 'Unknown';
        let fyVal = '2026';

        if (dateObj) {
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          monthName = monthNames[dateObj.getMonth()];
          const day = dateObj.getDate().toString().padStart(2, '0');
          formattedDate = `${day} ${monthNames[dateObj.getMonth()]}`;
          
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth();
          if (year < 2024) {
            fyVal = '2026';
          } else {
            const fyStartYear = month >= 3 ? year : year - 1;
            if (fyStartYear === 2025) {
              fyVal = '2025';
            } else {
              fyVal = '2026';
            }
          }
          dateObj = correctParsedDate(dateObj, fyVal);
        } else if (typeof monthName === 'string') {
          const monthClean = monthName.trim().toLowerCase();
          const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const idx = monthNames.indexOf(monthClean);
          if (idx !== -1) {
            monthName = monthNames[idx].charAt(0).toUpperCase() + monthNames[idx].slice(1);
          }
        }

        const returnQty = parseFloat(normalizedRow.qty || normalizedRow.return_qty || normalizedRow.returnqty || 1) || 1;
        const rawChannel = normalizedRow.channel_entry || normalizedRow.channel_ledger || normalizedRow.channel || 'Unknown';
        const channelName = normalizeChannelName(rawChannel);
        const itemColor = normalizedRow.item_color || normalizedRow.product_sku_code || normalizedRow.sku || 'Unknown';
        const divisionVal = normalizedRow.division || 'Unknown';
        const categoryVal = normalizedRow.category || normalizedRow.categories || 'Unknown';

        return {
          parsedDate: dateObj ? dateObj.toISOString() : null,
          monthName,
          formattedDate,
          fy: fyVal,
          channel_name: channelName,
          item_color: itemColor,
          return_qty: returnQty,
          division: divisionVal,
          categories: categoryVal,
          is_return: true
        };
      });

      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < normalizedData.length; i += chunkSize) {
        chunks.push(normalizedData.slice(i, i + chunkSize));
      }

      setIsLoading(true);
      let success = true;
      let errorMessage = "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const newFileEntry = {
          name: chunks.length > 1 ? `[RETURN] ${file.name} (Part ${i + 1}/${chunks.length})` : `[RETURN] ${file.name}`,
          record_count: chunk.length,
          data: chunk
        };

        const { error } = await supabase.from('uploaded_files').insert([newFileEntry]);
        if (error) {
          console.error("Upload chunk error:", error);
          success = false;
          errorMessage = error.message;
          break;
        }
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setIsLoading(false);
      e.target.value = null;

      if (success) {
        fetchData();
      } else {
        alert(`Error saving file to database: ${errorMessage}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleInventoryUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const bstr = event.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json(ws);
      
      const normalizedData = parsedData.map(row => {
        const normalizedRow = {};
        for (const key in row) {
          const newKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          normalizedRow[newKey] = row[key];
        }

        const itemColor = normalizedRow.item_color || normalizedRow.itemcolor || normalizedRow.sku || normalizedRow.barcode || 'Unknown';
        const totalInventory = parseFloat(normalizedRow.total_inventory || normalizedRow.totalinventory || normalizedRow.uniware || normalizedRow.qty || normalizedRow.quantity || 0) || 0;

        return {
          item_color: itemColor,
          total_inventory: totalInventory,
          is_inventory: true
        };
      });

      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < normalizedData.length; i += chunkSize) {
        chunks.push(normalizedData.slice(i, i + chunkSize));
      }

      setIsLoading(true);
      
      // Clear local state of old inventory files immediately
      setUploadedFiles(prev => prev.filter(f => !(f.name || '').startsWith('[INVENTORY]')));
      
      // Automatically clear out any old inventory files from database first
      const { error: deleteError } = await supabase
        .from('uploaded_files')
        .delete()
        .like('name', '[INVENTORY]%');
        
      if (deleteError) {
        console.error("Error clearing old inventory files:", deleteError);
        alert(`Failed to delete previous inventory data: ${deleteError.message}`);
        setIsLoading(false);
        return;
      }

      let success = true;
      let errorMessage = "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const newFileEntry = {
          name: chunks.length > 1 ? `[INVENTORY] ${file.name} (Part ${i + 1}/${chunks.length})` : `[INVENTORY] ${file.name}`,
          record_count: chunk.length,
          data: chunk
        };

        const { error } = await supabase.from('uploaded_files').insert([newFileEntry]);
        if (error) {
          console.error("Upload inventory chunk error:", error);
          success = false;
          errorMessage = error.message;
          break;
        }
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setIsLoading(false);
      e.target.value = null;

      if (success) {
        fetchData();
      } else {
        alert(`Error saving inventory file to database: ${errorMessage}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteFile = async (fileId) => {
    const { error } = await supabase.from('uploaded_files').delete().eq('id', fileId);
    if (!error) {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } else {
      alert("Error deleting file.");
    }
  };

  const filterOptions = useMemo(() => {
    if (!data.length) return { months: [], dates: [], divisions: [], channels: [], categories: [] };
    
    const months = new Set();
    const dates = new Set();
    const divisions = new Set();
    const channels = new Set();
    const categories = new Set();

    data.forEach(row => {
      // Dynamic cascading based on Financial Year
      const rowFY = row.fy || 'FY26-27';
      if (selectedFY !== 'All' && rowFY !== selectedFY) return;

      months.add(row.monthName || 'Unknown');
      
      // Cascading logic: Only add dates that match the selected months
      if (selectedMonth.length === 0 || selectedMonth.includes(row.monthName)) {
        dates.add(row.formattedDate || 'Unknown');
      }

      divisions.add(row.division || 'Unknown');
      channels.add(row.channel_name || row.channelname || row.channel || 'Unknown');
      categories.add(row.categories || row.category || 'Unknown');
    });

    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const dateMap = new Map();
    data.forEach(row => {
      if(row.parsedDate && row.formattedDate) {
        dateMap.set(row.formattedDate, row.parsedDate.getTime());
      }
    });

    const sortedDates = Array.from(dates).sort((a,b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return (dateMap.get(a) || 0) - (dateMap.get(b) || 0);
    });

    return {
      months: Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)),
      dates: sortedDates,
      divisions: Array.from(divisions).sort(),
      channels: Array.from(channels).sort(),
      categories: Array.from(categories).sort()
    };
  }, [data, selectedMonth, selectedFY]);

  const goalsMonths = useMemo(() => [
    "April", "May", "June", "July", "August", "September", "October", "November", "December",
    "January", "February", "March"
  ], []);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const month = row.monthName || 'Unknown';
      const date = row.formattedDate || 'Unknown';
      const division = row.division || 'Unknown';
      const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || '';
      const fy = row.fy || 'FY26-27';

      if (selectedFY !== 'All' && fy !== selectedFY) return false;
      if (selectedMonth.length > 0 && !selectedMonth.includes(month)) return false;
      if (selectedDate !== 'All' && date !== selectedDate) return false;
      if (selectedDivision !== 'All' && division !== selectedDivision) return false;
      if (selectedChannels.length > 0 && !selectedChannels.includes(channel)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(category)) return false;
      
      const gender = getGenderFromItemColor(sku);
      if (selectedGenders.length > 0 && !selectedGenders.includes(gender)) return false;

      return true;
    });
  }, [data, selectedMonth, selectedDate, selectedDivision, selectedChannels, selectedCategories, selectedGenders, selectedFY]);

  const filteredReturnData = useMemo(() => {
    return returnData.filter(row => {
      const month = row.monthName || 'Unknown';
      const date = row.formattedDate || 'Unknown';
      const channel = row.channel_name || 'Unknown';
      const division = row.division || 'Unknown';
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || '';
      const fy = row.fy || '2026';

      if (selectedFY !== 'All' && fy !== selectedFY) return false;
      if (selectedMonth.length > 0 && !selectedMonth.includes(month)) return false;
      if (selectedDate !== 'All' && date !== selectedDate) return false;
      if (selectedChannels.length > 0 && !selectedChannels.includes(channel)) return false;
      if (selectedDivision !== 'All' && division !== selectedDivision) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(category)) return false;
      
      const gender = getGenderFromItemColor(sku);
      if (selectedGenders.length > 0 && !selectedGenders.includes(gender)) return false;
      
      return true;
    });
  }, [returnData, selectedMonth, selectedDate, selectedDivision, selectedChannels, selectedCategories, selectedGenders, selectedFY]);

  const prevFilteredData = useMemo(() => {
    const fy25Data = uploadedFiles
      .filter(file => !file.name.startsWith('[RETURN]'))
      .flatMap(file => file.data)
      .filter(row => row.fy === '2025');

    return fy25Data.filter(row => {
      const month = row.monthName || 'Unknown';
      const date = row.formattedDate || 'Unknown';
      const division = row.division || 'Unknown';
      const channel = row.channel_name || 'Unknown';
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || '';

      if (selectedMonthPrev.length > 0 && !selectedMonthPrev.includes(month)) return false;
      if (selectedDatePrev !== 'All' && date !== selectedDatePrev) return false;
      if (selectedDivisionPrev !== 'All' && division !== selectedDivisionPrev) return false;
      if (selectedChannelsPrev.length > 0 && !selectedChannelsPrev.includes(channel)) return false;
      if (selectedCategoriesPrev.length > 0 && !selectedCategoriesPrev.includes(category)) return false;
      
      const gender = getGenderFromItemColor(sku);
      if (selectedGendersPrev.length > 0 && !selectedGendersPrev.includes(gender)) return false;
      
      return true;
    });
  }, [uploadedFiles, selectedMonthPrev, selectedDatePrev, selectedDivisionPrev, selectedChannelsPrev, selectedCategoriesPrev, selectedGendersPrev]);

  const prevFilteredReturnData = useMemo(() => {
    const fy25Return = uploadedFiles
      .filter(file => file.name.startsWith('[RETURN]'))
      .flatMap(file => file.data)
      .filter(row => row.fy === '2025');

    return fy25Return.filter(row => {
      const month = row.monthName || 'Unknown';
      const date = row.formattedDate || 'Unknown';
      const channel = row.channel_name || 'Unknown';
      const division = row.division || 'Unknown';
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || '';

      if (selectedMonthPrev.length > 0 && !selectedMonthPrev.includes(month)) return false;
      if (selectedDatePrev !== 'All' && date !== selectedDatePrev) return false;
      if (selectedChannelsPrev.length > 0 && !selectedChannelsPrev.includes(channel)) return false;
      if (selectedDivisionPrev !== 'All' && division !== selectedDivisionPrev) return false;
      if (selectedCategoriesPrev.length > 0 && !selectedCategoriesPrev.includes(category)) return false;
      
      const gender = getGenderFromItemColor(sku);
      if (selectedGendersPrev.length > 0 && !selectedGendersPrev.includes(gender)) return false;
      
      return true;
    });
  }, [uploadedFiles, selectedMonthPrev, selectedDatePrev, selectedChannelsPrev, selectedDivisionPrev, selectedCategoriesPrev, selectedGendersPrev]);

  const prevFilterOptions = useMemo(() => {
    const fy25Data = uploadedFiles
      .filter(file => !file.name.startsWith('[RETURN]'))
      .flatMap(file => file.data)
      .filter(row => row.fy === '2025');

    if (!fy25Data.length) return { months: [], dates: [], divisions: [], channels: [], categories: [] };
    
    const months = new Set();
    const dates = new Set();
    const divisions = new Set();
    const channels = new Set();
    const categories = new Set();

    fy25Data.forEach(row => {
      months.add(row.monthName || 'Unknown');
      
      if (selectedMonthPrev.length === 0 || selectedMonthPrev.includes(row.monthName)) {
        dates.add(row.formattedDate || 'Unknown');
      }

      divisions.add(row.division || 'Unknown');
      channels.add(row.channel_name || 'Unknown');
      categories.add(row.categories || 'Unknown');
    });

    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const dateMap = new Map();
    fy25Data.forEach(row => {
      if(row.parsedDate && row.formattedDate) {
        dateMap.set(row.formattedDate, row.parsedDate.getTime());
      }
    });

    const sortedDates = Array.from(dates).sort((a,b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return (dateMap.get(a) || 0) - (dateMap.get(b) || 0);
    });

    return {
      months: Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)),
      dates: sortedDates,
      divisions: Array.from(divisions).sort(),
      channels: Array.from(channels).sort(),
      categories: Array.from(categories).sort()
    };
  }, [uploadedFiles, selectedMonthPrev]);

  const prevMetrics = useMemo(() => {
    if (!prevFilteredData.length) return { totalSales: 0, totalUnits: 0, uniqueChannels: 0, uniqueCategories: 0, totalReturns: 0, overallReturnPct: 0 };

    let totalSales = 0;
    let totalUnits = prevFilteredData.length;
    let channels = new Set();
    let categories = new Set();

    prevFilteredData.forEach(row => {
      totalSales += row.priceVal;
      channels.add(row.channel_name || 'Unknown');
      categories.add(row.categories || 'Unknown');
    });

    let totalReturns = 0;
    prevFilteredReturnData.forEach(row => {
      totalReturns += row.return_qty;
    });

    const overallReturnPct = totalUnits > 0 ? (totalReturns / totalUnits) * 100 : 0;

    return {
      totalSales: totalSales.toFixed(2),
      totalUnits,
      uniqueChannels: channels.size,
      uniqueCategories: categories.size,
      totalReturns,
      overallReturnPct
    };
  }, [prevFilteredData, prevFilteredReturnData]);

  const prevChartsData = useMemo(() => {
    if (!prevFilteredData.length) return null;

    const salesByDate = {};
    const salesByChannel = {};
    const salesByDivision = {};
    const salesByCategory = {};

    prevFilteredData.forEach(row => {
      const val = row.priceVal;

      const dateKey = row.formattedDate || 'Unknown';
      const channel = row.channel_name || 'Unknown';
      const division = row.division || 'Unknown';
      const category = row.categories || 'Unknown';

      if (!salesByDate[dateKey]) salesByDate[dateKey] = { sales: 0, units: 0, parsedDate: row.parsedDate };
      salesByDate[dateKey].sales += val;
      salesByDate[dateKey].units += 1;

      if (!salesByChannel[channel]) salesByChannel[channel] = { sales: 0, units: 0 };
      salesByChannel[channel].sales += val;
      salesByChannel[channel].units += 1;

      if (!salesByDivision[division]) salesByDivision[division] = { sales: 0, units: 0 };
      salesByDivision[division].sales += val;
      salesByDivision[division].units += 1;

      if (!salesByCategory[category]) salesByCategory[category] = { sales: 0, units: 0 };
      salesByCategory[category].sales += val;
      salesByCategory[category].units += 1;
    });

    const formatChart = (obj) => Object.entries(obj)
      .map(([name, dataObj]) => ({ name, sales: Math.round(dataObj.sales), units: dataObj.units, value: insightType === 'revenue' ? Math.round(dataObj.sales) : dataObj.units }))
      .sort((a, b) => b.value - a.value);
    
    const dateData = Object.entries(salesByDate)
      .map(([date, dataObj]) => ({ 
        date, 
        sales: Math.round(dataObj.sales), 
        units: dataObj.units, 
        asp: dataObj.units > 0 ? Math.round(dataObj.sales / dataObj.units) : 0,
        timestamp: dataObj.parsedDate ? dataObj.parsedDate.getTime() : 0,
        value: insightType === 'revenue' ? Math.round(dataObj.sales) : dataObj.units 
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      dateData,
      channelData: formatChart(salesByChannel).slice(0, 5),
      divisionData: formatChart(salesByDivision),
      categoryData: formatChart(salesByCategory).slice(0, 5)
    };
  }, [prevFilteredData, insightType]);

  const prevSkuAnalysisData = useMemo(() => {
    if (!prevFilteredData.length) return [];
    
    const returnMap = {};
    prevFilteredReturnData.forEach(row => {
      const sku = row.item_color || 'Unknown';
      if (!returnMap[sku]) {
        returnMap[sku] = 0;
      }
      returnMap[sku] += row.return_qty;
    });

    const skuMap = {};
    
    prevFilteredData.forEach(row => {
      const val = row.priceVal;
      const sku = row.item_color || row.itemcolor || row.barcode || 'Unknown';
      
      if (!skuMap[sku]) {
        skuMap[sku] = { 
          sku, 
          units: 0, 
          revenue: 0, 
          division: row.division || '-', 
          category: row.categories || row.category || '-' 
        };
      }
      skuMap[sku].units += 1;
      skuMap[sku].revenue += val;
    });
    
    let result = Object.values(skuMap)
      .map(item => {
        const returns = returnMap[item.sku] || 0;
        const returnPct = item.units > 0 ? (returns / item.units) * 100 : 0;
        const inventoryVal = latestInventoryData.map[item.sku] || 0;
        return {
          ...item,
          returns,
          returnPct,
          inventory: inventoryVal
        };
      });

    if (skuSearchQueryPrev.trim()) {
      const q = skuSearchQueryPrev.toLowerCase().trim();
      result = result.filter(item => item.sku.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
        if (skuSortFieldPrev === 'returns') {
          return skuSortDirectionPrev === 'desc' ? b.returnPct - a.returnPct : a.returnPct - b.returnPct;
        } else if (skuSortFieldPrev === 'inventory') {
          return skuSortDirectionPrev === 'desc' ? b.inventory - a.inventory : a.inventory - b.inventory;
        } else {
          return skuSortDirectionPrev === 'desc' ? b.units - a.units : a.units - b.units;
        }
      });
  }, [prevFilteredData, prevFilteredReturnData, skuSortFieldPrev, skuSortDirectionPrev, skuSearchQueryPrev, latestInventoryData]);

  const metrics = useMemo(() => {
    if (!filteredData.length) return { totalSales: 0, totalUnits: 0, uniqueChannels: 0, uniqueCategories: 0, totalReturns: 0, overallReturnPct: 0 };

    let totalSales = 0;
    let totalUnits = filteredData.length;
    let channels = new Set();
    let categories = new Set();

    filteredData.forEach(row => {
      totalSales += row.priceVal;
      channels.add(row.channel_name || row.channelname || row.channel || 'Unknown');
      categories.add(row.categories || row.category || 'Unknown');
    });

    let totalReturns = 0;
    filteredReturnData.forEach(row => {
      totalReturns += row.return_qty;
    });

    const overallReturnPct = totalUnits > 0 ? (totalReturns / totalUnits) * 100 : 0;

    return {
      totalSales: totalSales.toFixed(2),
      totalUnits,
      uniqueChannels: channels.size,
      uniqueCategories: categories.size,
      totalReturns,
      overallReturnPct
    };
  }, [filteredData, filteredReturnData]);

  const chartsData = useMemo(() => {
    if (!filteredData.length) return null;

    const salesByDate = {};
    const salesByChannel = {};
    const salesByDivision = {};
    const salesByCategory = {};
    const salesByGender = { 'Girls': { sales: 0, units: 0 }, 'Boys': { sales: 0, units: 0 }, 'Unisex': { sales: 0, units: 0 } };

    filteredData.forEach(row => {
      const val = row.priceVal;

      const dateKey = row.formattedDate || 'Unknown';
      const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
      const division = row.division || 'Unknown';
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || '';

      if (!salesByDate[dateKey]) salesByDate[dateKey] = { sales: 0, units: 0, parsedDate: row.parsedDate };
      salesByDate[dateKey].sales += val;
      salesByDate[dateKey].units += 1;

      if (!salesByChannel[channel]) salesByChannel[channel] = { sales: 0, units: 0 };
      salesByChannel[channel].sales += val;
      salesByChannel[channel].units += 1;

      if (!salesByDivision[division]) salesByDivision[division] = { sales: 0, units: 0 };
      salesByDivision[division].sales += val;
      salesByDivision[division].units += 1;

      if (!salesByCategory[category]) salesByCategory[category] = { sales: 0, units: 0 };
      salesByCategory[category].sales += val;
      salesByCategory[category].units += 1;

      const gender = getGenderFromItemColor(sku);
      salesByGender[gender].sales += val;
      salesByGender[gender].units += 1;
    });

    const formatChart = (obj) => Object.entries(obj)
      .map(([name, dataObj]) => ({ name, sales: Math.round(dataObj.sales), units: dataObj.units, value: insightType === 'revenue' ? Math.round(dataObj.sales) : dataObj.units }))
      .sort((a, b) => b.value - a.value);
    
    const dateData = Object.entries(salesByDate)
      .map(([date, dataObj]) => ({ 
        date, 
        sales: Math.round(dataObj.sales), 
        units: dataObj.units, 
        asp: dataObj.units > 0 ? Math.round(dataObj.sales / dataObj.units) : 0,
        timestamp: dataObj.parsedDate ? dataObj.parsedDate.getTime() : 0,
        value: insightType === 'revenue' ? Math.round(dataObj.sales) : dataObj.units 
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      dateData,
      channelData: formatChart(salesByChannel).slice(0, 5),
      divisionData: formatChart(salesByDivision),
      categoryData: formatChart(salesByCategory).slice(0, 5),
      genderData: Object.entries(salesByGender)
        .map(([name, dataObj]) => ({ 
          name, 
          sales: Math.round(dataObj.sales), 
          units: dataObj.units, 
          value: insightType === 'revenue' ? Math.round(dataObj.sales) : dataObj.units 
        }))
        .filter(entry => entry.value > 0)
    };
  }, [filteredData, insightType]);

  const skuAnalysisData = useMemo(() => {
    if (!filteredData.length) return [];
    
    const returnMap = {};
    filteredReturnData.forEach(row => {
      const sku = row.item_color || 'Unknown';
      if (!returnMap[sku]) {
        returnMap[sku] = 0;
      }
      returnMap[sku] += row.return_qty;
    });

    const skuMap = {};
    
    filteredData.forEach(row => {
      const val = row.priceVal;
      const sku = row.item_color || row.itemcolor || row.barcode || 'Unknown';
      
      if (!skuMap[sku]) {
        skuMap[sku] = { 
          sku, 
          units: 0, 
          revenue: 0, 
          division: row.division || '-', 
          category: row.categories || row.category || '-' 
        };
      }
      skuMap[sku].units += 1;
      skuMap[sku].revenue += val;
    });
    
    let result = Object.values(skuMap)
      .map(item => {
        const returns = returnMap[item.sku] || 0;
        const returnPct = item.units > 0 ? (returns / item.units) * 100 : 0;
        const inventoryVal = latestInventoryData.map[item.sku] || 0;
        return {
          ...item,
          returns,
          returnPct,
          inventory: inventoryVal
        };
      });

    if (skuSearchQuery.trim()) {
      const q = skuSearchQuery.toLowerCase().trim();
      result = result.filter(item => item.sku.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
        if (skuSortField === 'returns') {
          return skuSortDirection === 'desc' ? b.returnPct - a.returnPct : a.returnPct - b.returnPct;
        } else if (skuSortField === 'inventory') {
          return skuSortDirection === 'desc' ? b.inventory - a.inventory : a.inventory - b.inventory;
        } else {
          return skuSortDirection === 'desc' ? b.units - a.units : a.units - b.units;
        }
      });
  }, [filteredData, filteredReturnData, skuSortField, skuSortDirection, skuSearchQuery, latestInventoryData]);

  const topInsights = useMemo(() => {
    if (!filteredData.length) return null;

    const categoryMap = {};
    const skuMap = {};

    filteredData.forEach(row => {
      const val = row.priceVal;
      const units = 1;
      const category = row.categories || row.category || 'Unknown';
      const sku = row.item_color || row.itemcolor || row.barcode || 'Unknown';

      if (!categoryMap[category]) categoryMap[category] = { revenue: 0, units: 0, name: category };
      categoryMap[category].revenue += val;
      categoryMap[category].units += units;

      if (!skuMap[sku]) skuMap[sku] = { revenue: 0, units: 0, name: sku };
      skuMap[sku].revenue += val;
      skuMap[sku].units += units;
    });

    const categories = Object.values(categoryMap);
    const skus = Object.values(skuMap);

    const topCategories = categories.sort((a, b) => b.units - a.units).slice(0, 5);
    const topSkusByUnits = skus.sort((a, b) => b.units - a.units).slice(0, 5);
    const topSkusByRevenue = [...skus].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    
    const skusWithASP = skus.map(s => ({ ...s, asp: s.units > 0 ? s.revenue / s.units : 0 }));
    const topSkusByASP = [...skusWithASP].sort((a, b) => b.asp - a.asp).slice(0, 5);

    return {
      topCategories,
      topSkusByUnits,
      topSkusByRevenue,
      topSkusByASP
    };
  }, [filteredData]);

  const momData = useMemo(() => {
    if (!data.length) return null;
    
    const monthlyStats = {};
    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    data.forEach(row => {
      const month = row.monthName;
      if (!month || month === 'Unknown') return;
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = { revenue: 0, units: 0, channels: {} };
      }
      
      const val = row.priceVal;
      const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
      
      monthlyStats[month].revenue += val;
      monthlyStats[month].units += 1;
      
      if (!monthlyStats[month].channels[channel]) {
        monthlyStats[month].channels[channel] = { revenue: 0, units: 0 };
      }
      monthlyStats[month].channels[channel].revenue += val;
      monthlyStats[month].channels[channel].units += 1;
    });

    const availableMonths = Object.keys(monthlyStats).sort((a,b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    if (availableMonths.length < 2) return null; 
    
    let currentMonthStr = (selectedMonth.length === 1 && availableMonths.includes(selectedMonth[0])) ? selectedMonth[0] : availableMonths[availableMonths.length - 1];
    let currentIdx = monthOrder.indexOf(currentMonthStr);
    
    let prevMonthStr = null;
    for (let i = availableMonths.length - 1; i >= 0; i--) {
      if (monthOrder.indexOf(availableMonths[i]) < currentIdx) {
        prevMonthStr = availableMonths[i];
        break;
      }
    }
    
    if (!prevMonthStr) return null; 
    
    const current = monthlyStats[currentMonthStr];
    const prev = monthlyStats[prevMonthStr];
    
    const calcGrowth = (curr, pr) => pr > 0 ? ((curr - pr) / pr) * 100 : 0;
    
    const revGrowth = calcGrowth(current.revenue, prev.revenue);
    const currAsp = current.units > 0 ? current.revenue / current.units : 0;
    const prevAsp = prev.units > 0 ? prev.revenue / prev.units : 0;
    const aspGrowth = calcGrowth(currAsp, prevAsp);
    
    const allChannels = new Set([...Object.keys(current.channels), ...Object.keys(prev.channels)]);
    const channelGrowth = Array.from(allChannels).map(ch => {
      const cRev = current.channels[ch]?.revenue || 0;
      const pRev = prev.channels[ch]?.revenue || 0;
      const cUnits = current.channels[ch]?.units || 0;
      const pUnits = prev.channels[ch]?.units || 0;
      
      const cAsp = cUnits > 0 ? cRev / cUnits : 0;
      const pAsp = pUnits > 0 ? pRev / pUnits : 0;
      
      return {
        channel: ch,
        currentRevenue: cRev,
        prevRevenue: pRev,
        revenueGrowth: calcGrowth(cRev, pRev),
        currentAsp: cAsp,
        prevAsp: pAsp,
        aspGrowth: calcGrowth(cAsp, pAsp)
      };
    }).sort((a,b) => b.currentRevenue - a.currentRevenue);
    
    return {
      currentMonth: currentMonthStr,
      prevMonth: prevMonthStr,
      revenue: { current: current.revenue, prev: prev.revenue, growth: revGrowth },
      asp: { current: currAsp, prev: prevAsp, growth: aspGrowth },
      channelGrowth
    };
  }, [data, selectedMonth]);

  const productList = useMemo(() => {
    if (!data.length) return [];
    
    // Filter data by selected month, date, and channels first if applicable
    const filteredForList = data.filter(row => {
      if (selectedMonth.length > 0 && !selectedMonth.includes(row.monthName)) return false;
      if (selectedDate !== 'All' && row.formattedDate !== selectedDate) return false;
      if (selectedChannels.length > 0) {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (!selectedChannels.includes(channel)) return false;
      }
      return true;
    });

    const products = new Set();
    filteredForList.forEach(row => {
      const p = row.item_color || row.itemcolor || row.barcode;
      if (p) products.add(p);
    });
    return Array.from(products).sort();
  }, [data, selectedMonth, selectedDate, selectedChannels]);

  const productSizeData = useMemo(() => {
    if (!selectedProduct || !data.length) return null;
    
    const sizeMap = {};
    let totalUnits = 0;

    data.forEach(row => {
      // Apply Month, Date, and Channel filters to the specific product data
      if (selectedMonth.length > 0 && !selectedMonth.includes(row.monthName)) return;
      if (selectedDate !== 'All' && row.formattedDate !== selectedDate) return;
      if (selectedChannels.length > 0) {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (!selectedChannels.includes(channel)) return;
      }

      const p = row.item_color || row.itemcolor || row.barcode;
      if (p === selectedProduct) {
        const size = row.item_type_size || row.itemtypesize || row.size || 'Unknown';
        const val = row.priceVal;
        
        if (!sizeMap[size]) sizeMap[size] = { size, revenue: 0, units: 0 };
        sizeMap[size].revenue += val;
        sizeMap[size].units += 1;
        totalUnits += 1;
      }
    });
    
    const sortedData = Object.values(sizeMap).sort((a, b) => b.revenue - a.revenue);
    const topSize = sortedData.length > 0 ? sortedData.sort((a,b) => b.units - a.units)[0].size : 'N/A';

    return {
      sizes: Object.values(sizeMap).sort((a, b) => b.revenue - a.revenue),
      totalUnits,
      topSize
    };
  }, [selectedProduct, data, selectedMonth, selectedDate, selectedChannels]);

  const productChannelReturnData = useMemo(() => {
    if (!selectedProductReturn || !data.length) return null;
    
    const channelMap = {};
    let totalUnits = 0;
    let totalReturns = 0;

    data.forEach(row => {
      if (selectedMonth.length > 0 && !selectedMonth.includes(row.monthName)) return;
      if (selectedDate !== 'All' && row.formattedDate !== selectedDate) return;
      if (selectedChannels.length > 0) {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (!selectedChannels.includes(channel)) return;
      }

      const p = row.item_color || row.itemcolor || row.barcode;
      if (p === selectedProductReturn) {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (!channelMap[channel]) channelMap[channel] = { channel, units: 0, returns: 0 };
        channelMap[channel].units += 1;
        totalUnits += 1;
      }
    });

    filteredReturnData.forEach(row => {
      const p = row.item_color || 'Unknown';
      if (p === selectedProductReturn) {
        const channel = row.channel_name || 'Unknown';
        const qty = row.return_qty || 1;
        if (!channelMap[channel]) channelMap[channel] = { channel, units: 0, returns: 0 };
        channelMap[channel].returns += qty;
        totalReturns += qty;
      }
    });

    const channels = Object.values(channelMap)
      .map(item => {
        const returnPct = item.units > 0 ? (item.returns / item.units) * 100 : 0;
        return {
          ...item,
          value: item.returns,
          returnPct
        };
      })
      .sort((a, b) => b.returns - a.returns);

    const overallReturnPct = totalUnits > 0 ? (totalReturns / totalUnits) * 100 : 0;

    return {
      channels,
      totalUnits,
      totalReturns,
      overallReturnPct
    };
  }, [selectedProductReturn, data, filteredReturnData, selectedMonth, selectedDate, selectedChannels]);

  const goalMetrics = useMemo(() => {
    if (!data.length) return null;

    let target = null;
    if (selectedMonth.length === 0) {
      target = GOALS["All"];
    } else if (selectedMonth.length === 1) {
      target = GOALS[selectedMonth[0]];
    } else {
      target = {
        revenue: 0,
        units: 0,
        apparel: 0,
        footwear: 0,
        asp: 0
      };
      selectedMonth.forEach(m => {
        const g = GOALS[m];
        if (g) {
          target.revenue += g.revenue;
          target.units += g.units;
          target.apparel += g.apparel;
          target.footwear += g.footwear;
        }
      });
      target.asp = target.units > 0 ? target.revenue / target.units : 850;
    }
    if (!target) return null;

    let actualRevenue = 0;
    let actualUnits = 0;
    let actualApparel = 0;
    let actualFootwear = 0;
    
    const monthData = data.filter(row => {
      if (row.fy !== '2026') return false;
      if (selectedMonth.length > 0 && !selectedMonth.includes(row.monthName)) return false;
      return true;
    });

    monthData.forEach(row => {
      const val = row.priceVal;
      actualRevenue += val;
      actualUnits += 1;
      
      const divStr = (row.division || '').toLowerCase();
      const catStr = (row.categories || row.category || '').toLowerCase();
      
      const isFootwear = ['sandal', 'mould', 'flip flop', 'ballerina', 'shoe', 'sneaker', 'footwear', 'heel', 'flat', 'boot', 'slipper'].some(v => catStr.includes(v) || divStr.includes(v));
      if (isFootwear) {
        actualFootwear += 1;
      } else {
        actualApparel += 1;
      }
    });

    const actualAsp = actualUnits > 0 ? actualRevenue / actualUnits : 0;

    return {
      target,
      actual: {
        revenue: actualRevenue,
        units: actualUnits,
        asp: actualAsp,
        apparel: actualApparel,
        footwear: actualFootwear
      }
    };
  }, [data, selectedMonth]);


  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value);
  
  const formatShortCurrency = (value) => {
    const val = Number(value) || 0;
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
    return formatCurrency(val);
  };

  const formatShortNumber = (value) => {
    const val = Number(value) || 0;
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(1)} L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
    return formatNumber(val);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const isRevenue = insightType === 'revenue' && payload[0].dataKey !== 'asp';
      const val = payload[0].payload.value || payload[0].value;
      
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          <p className="value" style={{ color: payload[0].color || 'var(--accent-color)' }}>
            {payload[0].dataKey === 'asp' 
              ? `ASP: ${formatCurrency(val)}`
              : isRevenue ? formatCurrency(val) : `${formatNumber(val)} Units`}
          </p>
          {payload[0].payload.units !== undefined && payload[0].dataKey !== 'asp' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {isRevenue 
                ? `${formatNumber(payload[0].payload.units)} Units` 
                : `Revenue: ${formatCurrency(payload[0].payload.sales)}`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const ReturnsCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const returns = payload[0].payload.returns || 0;
      const units = payload[0].payload.units || 0;
      const returnPct = payload[0].payload.returnPct || 0;
      
      return (
        <div className="custom-tooltip">
          <p className="label">Size {label}</p>
          <p className="value" style={{ color: payload[0].color || 'var(--accent-color)' }}>
            {returns} Returns ({returnPct.toFixed(0)}%)
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Total Units Sold: {units}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
      />
    </g>
  );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const RADIAN = Math.PI / 180;
  // Position label 25px outside the outer radius for clear alignment
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const textAnchor = x > cx ? 'start' : 'end';

  if (percent < 0.01) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="var(--text-primary)" 
      textAnchor={textAnchor} 
      dominantBaseline="central" 
      fontSize="12" 
      fontWeight="700"
    >
      {`${name.toUpperCase()}: ${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

  if (!session) {
    return (
      <div className="auth-container">
        {/* Floating Background Elements */}
        <div className="auth-bg-shapes">
          <div className="floating-icon" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>
            <BarChart2 size={48} />
          </div>
          <div className="floating-icon" style={{ top: '65%', left: '15%', animationDelay: '-5s' }}>
            <TrendingUp size={64} />
          </div>
          <div className="floating-icon" style={{ top: '25%', left: '85%', animationDelay: '-10s' }}>
            <Activity size={56} />
          </div>
          <div className="floating-icon" style={{ top: '75%', left: '80%', animationDelay: '-15s' }}>
            <BarChart size={40} />
          </div>
          <div className="floating-icon" style={{ top: '40%', left: '50%', animationDelay: '-2s' }}>
            <Layers size={32} />
          </div>
          <div className="floating-icon" style={{ top: '10%', left: '60%', animationDelay: '-8s' }}>
            <ShoppingBag size={44} />
          </div>
          <div className="floating-icon" style={{ top: '85%', left: '40%', animationDelay: '-12s' }}>
            <DollarSign size={50} />
          </div>
          <div className="floating-icon" style={{ top: '30%', left: '25%', animationDelay: '-3s' }}>
            <PieChartIcon size={38} />
          </div>
          <div className="floating-icon" style={{ top: '50%', left: '85%', animationDelay: '-9s' }}>
            <Database size={42} />
          </div>
          <div className="floating-icon" style={{ top: '10%', left: '35%', animationDelay: '-1s' }}>
            <Globe size={30} />
          </div>
          <div className="floating-icon" style={{ top: '80%', left: '65%', animationDelay: '-6s' }}>
            <Cpu size={36} />
          </div>
          <div className="floating-icon" style={{ top: '45%', left: '5%', animationDelay: '-7s' }}>
            <Search size={40} />
          </div>
          <div className="floating-icon" style={{ top: '20%', left: '45%', animationDelay: '-4s' }}>
            <Target size={52} />
          </div>
          <div className="floating-icon" style={{ top: '85%', left: '15%', animationDelay: '-11s' }}>
            <TrendingDown size={34} />
          </div>
          <div className="floating-icon" style={{ top: '60%', left: '92%', animationDelay: '-14s' }}>
            <Activity size={48} />
          </div>
        </div>

        {/* Purple United Kids Logo - Top Left */}
        <div className="login-brand-left-mobile-hide" style={{ 
          position: 'absolute', 
          top: '1.5rem', 
          left: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}>
            <GlowingLogoIcon size={28} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontWeight: 800, 
              fontSize: '1.1rem',
              letterSpacing: '0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.2
            }}>
              Purple United <span style={{ color: 'var(--accent-color)' }}>Kids</span>
            </div>
          </div>
        </div>
        
        {/* Glowing Logo MN - Top Right */}
        <div 
          onClick={() => window.location.reload()}
          className="login-brand-wrapper right"
        >
          <span>MN</span>
          <div className="brand-icon-box">
            <Activity size={22} color="#fff" style={{ display: 'block', transform: 'translateY(1px)' }} />
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-graphic" style={{
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '3.5rem 3rem',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Background Glows */}
            <div style={{
              position: 'absolute',
              top: '-20%',
              left: '-20%',
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            
            {/* Tech grid overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              opacity: 0.85,
              pointerEvents: 'none'
            }} />

            {/* Glowing Analytical Dashboard Mockup */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
              
              {/* Modern Glass Dashboard Card 1 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25), inset 0 0 20px rgba(255,255,255,0.05)',
                transform: 'perspective(1000px) rotateY(-4deg) rotateX(4deg)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>Live Analytics</span>
                    <h4 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', textShadow: '0 0 10px rgba(255,255,255,0.3)', color: '#fff' }}>$142,850.40</h4>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}>
                    <TrendingUp size={12} color="#fff" />
                    +42.5%
                  </div>
                </div>

                {/* Glowing SVG Mini Sparkline chart */}
                <div style={{ height: '70px', width: '100%', marginTop: '1.5rem', position: 'relative' }}>
                  <svg viewBox="0 0 300 70" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                      </linearGradient>
                      <filter id="neonGlowSpark" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {/* Area under the line */}
                    <path 
                      d="M0,70 L0,55 Q30,35 60,45 Q90,55 120,25 Q150,-5 180,35 Q210,75 240,20 Q270,-35 300,10 L300,70 Z" 
                      fill="url(#sparklineGrad)" 
                    />
                    {/* Line */}
                    <path 
                      d="M0,55 Q30,35 60,45 Q90,55 120,25 Q150,-5 180,35 Q210,75 240,20 Q270,-35 300,10" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      filter="url(#neonGlowSpark)"
                    />
                    {/* Pulsing glow dots */}
                    <circle cx="150" cy="15" r="5" fill="#ffffff" filter="url(#neonGlowSpark)" />
                    <circle cx="300" cy="10" r="5" fill="#ffffff" filter="url(#neonGlowSpark)" />
                  </svg>
                </div>
              </div>

              {/* Modern Glass Dashboard Card 2 */}
              <div style={{
                display: 'flex',
                gap: '1.25rem',
                transform: 'perspective(1000px) rotateY(-4deg) rotateX(4deg) translateZ(20px)'
              }}>
                {/* Metric 1 */}
                <div style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: '0 15px 30px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Radial progress ring SVG */}
                    <svg width="48" height="48" viewBox="0 0 36 36" style={{ overflow: 'visible' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ffffff" strokeWidth="3" 
                        strokeDasharray="80 20" strokeDashoffset="25" strokeLinecap="round"
                        filter="url(#neonGlowSpark)"
                      />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800 }}>80%</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.75, textTransform: 'uppercase', display: 'block' }}>Target</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Completed</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: '0 15px 30px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 36 36" style={{ overflow: 'visible' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ffffff" strokeWidth="3" 
                        strokeDasharray="64 36" strokeDashoffset="25" strokeLinecap="round"
                        filter="url(#neonGlowSpark)"
                      />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800 }}>64%</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.75, textTransform: 'uppercase', display: 'block' }}>Efficiency</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Optimal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle brand graphic details at the bottom */}
            <div style={{
              position: 'absolute',
              bottom: '2.5rem',
              left: '3rem',
              zIndex: 2,
              opacity: 0.85
            }}>
              <h5 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em', margin: 0, textTransform: 'uppercase' }}>Dyno Data Engine v2.6</h5>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, margin: '4px 0 0 0', opacity: 0.8 }}>Predictive Analytics & Real-Time Syncing</p>
            </div>
          </div>
          
          <div className="auth-form-container">
              <div className="auth-header">
                <h2>Welcome to<br/>Dyno Dashboard</h2>
                <p>Please enter your credentials to continue.</p>
              </div>

              {/* Role Differentiator Selector */}
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '1.5rem',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('user');
                    setAuthError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: loginRole === 'user' ? 'linear-gradient(135deg, #ba54f5 0%, #8965e0 100%)' : 'transparent',
                    boxShadow: loginRole === 'user' ? '0 4px 15px rgba(186, 84, 245, 0.25)' : 'none',
                    color: loginRole === 'user' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  User Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('admin');
                    setAuthError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: loginRole === 'admin' ? 'linear-gradient(135deg, #ba54f5 0%, #8965e0 100%)' : 'transparent',
                    boxShadow: loginRole === 'admin' ? '0 4px 15px rgba(186, 84, 245, 0.25)' : 'none',
                    color: loginRole === 'admin' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  Admin Mode
                </button>
              </div>

              {authError && <div className="auth-error">{authError}</div>}

              <form className="auth-form" onSubmit={handleAuth}>
                <div className="auth-form-group">
                  <input 
                    className="auth-input"
                    type="email" 
                    placeholder="Email Address"
                    value={authEmail} 
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-form-group" style={{ position: 'relative' }}>
                  <input 
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password" 
                    value={authPassword} 
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="auth-submit-row">
                  <button type="submit" className="auth-submit" disabled={isLoading} style={{ marginLeft: 'auto' }}>
                    {isLoading ? 'WAIT...' : `LOGIN AS ${loginRole.toUpperCase()}`} 
                    {!isLoading && <span style={{ marginLeft: '4px' }}>→</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
  }

  const renderSortHeader = (field, label, alignLeft = false) => {
    const isActive = inventorySortField === field;
    return (
      <th 
        onClick={() => {
          setInventorySortField(field);
          setInventorySortOrder(prev => {
            if (inventorySortField !== field) return 'desc';
            return prev === 'asc' ? 'desc' : 'asc';
          });
        }}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        className="sortable-header"
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          justifyContent: alignLeft ? 'flex-start' : 'center',
          transition: 'color 0.2s'
        }}>
          <span>{label}</span>
          <span style={{ 
            fontSize: '0.75rem', 
            opacity: isActive ? 1 : 0.3,
            color: isActive ? 'var(--accent-color)' : 'inherit'
          }}>
            {isActive ? (inventorySortOrder === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div 
            className="brand"
            onClick={() => setActivePage('dashboard')}
            style={{ cursor: 'pointer' }}
            title="Go to Dashboard"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#4a148c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease-in-out'
              }}>
                <GlowingLogoIcon size={24} white={true} />
              </div>
              <span style={{ 
                fontWeight: 800, 
                fontSize: '1.1rem', 
                color: '#fff', 
                letterSpacing: '0.03em',
                lineHeight: 1.2
              }}>
                Purple United <span style={{ color: '#4a148c' }}>Kids</span>
              </span>
            </div>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
          <nav className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => { setActivePage('dashboard'); setIsMobileMenuOpen(false); }}>
              <Home size={20} />
              <span>Dashboard</span>
            </div>
            <div className={`nav-item ${activePage === 'trends' ? 'active' : ''}`} onClick={() => { setActivePage('trends'); setIsMobileMenuOpen(false); }}>
              <BarChart2 size={20} />
              <span>Trends</span>
            </div>
            <div className={`nav-item ${activePage === 'insights' ? 'active' : ''}`} onClick={() => { setActivePage('insights'); setIsMobileMenuOpen(false); }}>
              <Star size={20} />
              <span>Insights</span>
            </div>
            <div className={`nav-item ${activePage === 'product_level' ? 'active' : ''}`} onClick={() => { setActivePage('product_level'); setIsMobileMenuOpen(false); }}>
              <Layers size={20} />
              <span>Product Level</span>
            </div>
            <div className={`nav-item ${activePage === 'intelli_report' ? 'active' : ''}`} onClick={() => { setActivePage('intelli_report'); setIsMobileMenuOpen(false); }}>
              <Cpu size={20} />
              <span>Intelli Report</span>
            </div>
            <div className={`nav-item ${activePage === 'goals' ? 'active' : ''}`} onClick={() => { setActivePage('goals'); setIsMobileMenuOpen(false); }}>
              <Target size={20} />
              <span>Target & Goals</span>
            </div>
            <div className={`nav-item ${activePage === 'inventory' ? 'active' : ''}`} onClick={() => { setActivePage('inventory'); setIsMobileMenuOpen(false); }}>
              <Package size={20} />
              <span>Inventory</span>
            </div>
            <div className={`nav-item ${activePage === 'previous_years' ? 'active' : ''}`} onClick={() => { setActivePage('previous_years'); setIsMobileMenuOpen(false); }}>
              <Database size={20} />
              <span>Previous Years</span>
            </div>
            {userRole === 'admin' && (
              <>
                <div className={`nav-item ${activePage === 'raw_files' ? 'active' : ''}`} onClick={() => { setActivePage('raw_files'); setIsMobileMenuOpen(false); }}>
                  <FileText size={20} />
                  <span>Raw Files</span>
                </div>
                <div className={`nav-item ${activePage === 'reco' ? 'active' : ''}`} onClick={() => { setActivePage('reco'); setIsMobileMenuOpen(false); }}>
                  <RefreshCw size={20} />
                  <span>Reco Section</span>
                </div>
              </>
            )}
            
            <div className="mobile-only-logout">
              <button className="sidebar-logout" onClick={handleLogout} style={{ marginTop: '1rem' }}>
                <LogOut size={16} />
                <span>Logout ({userRole})</span>
              </button>
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom desktop-only-logout">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout ({userRole})</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header" style={{ justifyContent: 'space-between', width: '100%' }}>
          <div className="title-group">
            <h1>
              {activePage === 'raw_files' && 'Raw Files Management'}
              {activePage === 'reco' && 'Sales Reconciliation'}
              {activePage === 'dashboard' && 'Sales Overview'}
              {activePage === 'trends' && 'Performance Trends'}
              {activePage === 'insights' && 'Top Performers & Insights'}
              {activePage === 'product_level' && 'Product Level Analysis'}
              {activePage === 'intelli_report' && 'Intelli Report'}
              {activePage === 'goals' && 'Target & Goal Tracking'}
              {activePage === 'inventory' && 'Inventory & PO Planning'}
              {activePage === 'previous_years' && 'Previous Years Performance'}
            </h1>
            <p>Real-time insights from your daily reports</p>
          </div>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="glowing-text-avatar">
              <span>
                MN
              </span>
            </div>
          </div>
        </header>

        {activePage === 'raw_files' && userRole === 'admin' ? (
          <div className="dashboard-content">
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '2rem' }}>
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Upload New Sales File</h3>
                </div>
                <div className="upload-btn-wrapper">
                  <button className="upload-btn" disabled={isLoading}>
                    <UploadCloud size={20} />
                    {isLoading ? 'Uploading...' : 'Upload Excel / CSV'}
                  </button>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={isLoading} />
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Push your daily sales report containing channels, pricing, dates, divisions, categories, and items.
                </p>
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Upload Returns File</h3>
                </div>
                <div className="upload-btn-wrapper">
                  <button className="upload-btn" disabled={isLoading} style={{ background: 'linear-gradient(135deg, #ba54f5 0%, #8965e0 100%)' }}>
                    <UploadCloud size={20} />
                    {isLoading ? 'Uploading...' : 'Upload Returns Excel / CSV'}
                  </button>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleReturnUpload} disabled={isLoading} />
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Push your customer returns report containing items, date_1, channel entry, qty, division, and category.
                </p>
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Upload Inventory File</h3>
                </div>
                <div className="upload-btn-wrapper">
                  <button className="upload-btn" disabled={isLoading} style={{ background: 'linear-gradient(135deg, #00f2c4 0%, #1d8cf8 100%)', color: '#1d213b' }}>
                    <UploadCloud size={20} />
                    {isLoading ? 'Uploading...' : 'Upload Inventory Excel / CSV'}
                  </button>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleInventoryUpload} disabled={isLoading} />
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Push your current inventory report containing item color codes and total inventory quantities.
                </p>
              </div>

              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Upload SKU Live Dates</h3>
                </div>
                <div className="upload-btn-wrapper">
                  <button className="upload-btn" disabled={isUploadingLiveDates} style={{ background: 'linear-gradient(135deg, #ff8d72 0%, #ff6491 100%)' }}>
                    <UploadCloud size={20} />
                    {isUploadingLiveDates ? 'Uploading...' : 'Upload Live Dates Excel / CSV'}
                  </button>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleLiveDatesUpload} disabled={isUploadingLiveDates} />
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Append new product launch dates in "dd mmm yyyy" format. Matching SKU launch dates in the database are ignored.
                </p>
                {liveDatesError && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(244,67,54,0.1)', borderRadius: '6px', color: '#e57373', fontSize: '0.8rem' }}>
                    ⚠ {liveDatesError}
                  </div>
                )}
                {liveDatesSuccess && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(76,175,80,0.1)', borderRadius: '6px', color: '#81c784', fontSize: '0.8rem' }}>
                    ✓ {liveDatesSuccess}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Uploaded Files Database</h3>
              </div>
              
              {!uploadedFiles.length ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>No files uploaded yet. Start by uploading your first report.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Date Pushed</th>
                        <th>Records</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFiles.map((file) => {
                        const isRet = (file.name || '').startsWith('[RETURN]');
                        const isInv = (file.name || '').startsWith('[INVENTORY]');
                        const displayName = isRet 
                          ? file.name.replace('[RETURN] ', '') 
                          : isInv 
                            ? file.name.replace('[INVENTORY] ', '') 
                            : file.name;
                        return (
                          <tr key={file.id}>
                            <td style={{ fontWeight: 600 }}>{displayName}</td>
                            <td>
                              {isRet ? (
                                <span style={{ color: '#8965e0', background: 'rgba(137, 101, 224, 0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>Returns</span>
                              ) : isInv ? (
                                <span style={{ color: '#00f2c4', background: 'rgba(0, 242, 196, 0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>Inventory</span>
                              ) : (
                                <span style={{ color: '#ba54f5', background: 'rgba(186, 84, 245, 0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>Sales</span>
                              )}
                            </td>
                            <td>
                              {file.uploadDate.toLocaleDateString()} at {file.uploadDate.toLocaleTimeString()}
                            </td>
                            <td style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{formatNumber(file.recordCount)}</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {file.data.length > 0 ? (
                                 <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>Loaded</span>
                              ) : (
                                 <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>Syncing...</span>
                              )}
                            </td>
                            <td>
                              <button 
                                className="delete-btn" 
                                onClick={() => handleDeleteFile(file.id)}
                                title="Remove file from dashboard"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activePage === 'previous_years' ? (
          <div className="dashboard-content">
            {!isFY25Loaded && (
              <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
                <Database size={64} color="var(--accent-color)" style={{ marginBottom: '1.5rem', opacity: 0.85 }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Historical Insights (FY25-26)</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  To optimize dashboard load times, previous years' files are not loaded by default. 
                  Click below to securely fetch the FY25-26 dataset from the database.
                </p>
                {isFY25Loading ? (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>Downloading historical database...</span>
                      <span>{fy25Progress.current} / {fy25Progress.total} files</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${fy25Progress.total > 0 ? (fy25Progress.current / fy25Progress.total) * 100 : 0}%`, background: 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={loadFY25Data} 
                    className="upload-btn" 
                    style={{ margin: '0 auto', fontSize: '1.05rem', padding: '0.75rem 2rem' }}
                  >
                    Load Previous Years Data (FY25-26)
                  </button>
                )}
              </div>
            )}

            {isFY25Loaded && (
              <>
                {/* Insight toggle for previous years page */}
                <div className="insight-toggle-container">
                  <div className="toggle-group">
                    <button 
                      className={`toggle-btn ${insightType === 'revenue' ? 'active' : ''}`}
                      onClick={() => setInsightType('revenue')}
                    >
                      Revenue Insights
                    </button>
                    <button 
                      className={`toggle-btn ${insightType === 'units' ? 'active' : ''}`}
                      onClick={() => setInsightType('units')}
                    >
                      Unit Insights
                    </button>
                  </div>
                </div>

                {/* Custom filters for previous years */}
                <div className="filters-container">
                  <CustomMultiSelect 
                    values={selectedMonthPrev} 
                    options={prevFilterOptions.months} 
                    onChange={(val) => {
                      setSelectedMonthPrev(val);
                      setSelectedDatePrev('All');
                    }} 
                    placeholder="All Months" 
                  />
                  <CustomSelect 
                    value={selectedDatePrev} 
                    options={prevFilterOptions.dates} 
                    onChange={setSelectedDatePrev} 
                    placeholder="All Dates" 
                  />
                  <CustomSelect 
                    value={selectedDivisionPrev} 
                    options={prevFilterOptions.divisions} 
                    onChange={setSelectedDivisionPrev} 
                    placeholder="All Divisions" 
                  />
                  <CustomMultiSelect 
                    values={selectedChannelsPrev} 
                    options={prevFilterOptions.channels} 
                    onChange={setSelectedChannelsPrev} 
                    placeholder="All Channels" 
                  />
                  <CustomMultiSelect 
                    values={selectedCategoriesPrev} 
                    options={prevFilterOptions.categories} 
                    onChange={setSelectedCategoriesPrev} 
                    placeholder="All Categories" 
                  />
                  <CustomMultiSelect 
                    values={selectedGendersPrev} 
                    options={['Boys', 'Girls', 'Unisex']} 
                    onChange={setSelectedGendersPrev} 
                    placeholder="All Genders" 
                  />
                </div>

                {/* Top Metrics */}
                <div className="dashboard-grid">
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Total Revenue</h3>
                      <div className="metric-value">{formatCurrency(prevMetrics.totalSales)}</div>
                    </div>
                    <div className="metric-icon"><DollarSign size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Total Units</h3>
                      <div className="metric-value">{formatNumber(prevMetrics.totalUnits)}</div>
                    </div>
                    <div className="metric-icon"><ShoppingBag size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Return (%)</h3>
                      <div className="metric-value">
                        {formatNumber(prevMetrics.totalReturns)} ({prevMetrics.overallReturnPct.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="metric-icon"><TrendingDown size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Active Channels</h3>
                      <div className="metric-value">{prevMetrics.uniqueChannels}</div>
                    </div>
                    <div className="metric-icon"><Layers size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Avg Selling Price</h3>
                      <div className="metric-value">
                        {prevMetrics.totalUnits > 0 
                          ? formatCurrency(prevMetrics.totalSales / prevMetrics.totalUnits) 
                          : formatCurrency(0)}
                      </div>
                    </div>
                    <div className="metric-icon"><TrendingUp size={24} /></div>
                  </div>
                </div>

                {prevChartsData ? (
                  <div className="chart-grid">
                    {/* Sales by Channel */}
                    <div className="card full-width-chart">
                      <div className="card-header">
                        <h3 className="card-title">Top Channels ({insightType === 'revenue' ? 'Revenue' : 'Units'})</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={prevChartsData.channelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} width={120} />
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Bar 
                              dataKey="value" 
                              radius={[0, 4, 4, 0]}
                              activeBar={{ 
                                stroke: 'var(--accent-color)', 
                                strokeWidth: 2,
                                fillOpacity: 0.8
                              }}
                            >
                              {prevChartsData.channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getChannelColor(entry.name)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Sales by Division */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">{insightType === 'revenue' ? 'Revenue by Division' : 'Units by Division'}</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie
                              data={prevChartsData.divisionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 35 : 45}
                              outerRadius={isMobile ? 70 : 90}
                              paddingAngle={5}
                              dataKey="value"
                              activeShape={renderActiveShape}
                              style={{ cursor: 'pointer' }}
                            >
                              {prevChartsData.divisionData.map((entry, index) => {
                                const name = (entry.name || '').toLowerCase();
                                const isFootwear = name.includes('footwear');
                                const fill = isFootwear ? '#00f2c4' : '#ba54f5';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                              })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Legend 
                              formatter={(value) => {
                                const totalDivisionVal = prevChartsData.divisionData ? prevChartsData.divisionData.reduce((sum, d) => sum + d.value, 0) : 0;
                                const item = prevChartsData.divisionData ? prevChartsData.divisionData.find(d => d.name.toLowerCase() === value.toLowerCase()) : null;
                                const pct = totalDivisionVal > 0 && item ? ((item.value / totalDivisionVal) * 100).toFixed(1) : '0.0';
                                return (
                                  <span style={{ 
                                    color: '#ffffff', 
                                    fontSize: 'var(--legend-font-size, 18px)', 
                                    fontWeight: 'var(--legend-font-weight, 800)', 
                                    marginLeft: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                  }}>
                                    {value}: {pct}%
                                  </span>
                                );
                              }}
                              iconSize={14}
                              wrapperStyle={{ paddingTop: '1.5rem' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Top Categories */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Top Categories ({insightType === 'revenue' ? 'Revenue' : 'Units'})</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={prevChartsData.categoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Bar 
                              dataKey="value" 
                              radius={[4, 4, 0, 0]}
                              activeBar={{ 
                                stroke: 'var(--accent-color)', 
                                strokeWidth: 2,
                                fillOpacity: 0.8
                              }}
                            >
                              {prevChartsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
                    <BarChart2 size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <p>No chart data available for the selected previous years filters.</p>
                  </div>
                )}

                {/* Top Selling Items Table */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Top Selling Items</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e1e2f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', width: '220px' }}>
                      <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                      <input 
                        type="text"
                        placeholder="Search SKU..."
                        value={skuSearchQueryPrev}
                        onChange={(e) => setSkuSearchQueryPrev(e.target.value)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '100%', padding: '2px 0' }}
                      />
                      {skuSearchQueryPrev && (
                        <button onClick={() => setSkuSearchQueryPrev('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Item Color (SKU)</th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>Units Sold</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdownPrev(activeTableFilterDropdownPrev === 'units' ? null : 'units');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortFieldPrev === 'units' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Units Sold"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdownPrev === 'units' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdownPrev === 'units' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'units' && skuSortDirectionPrev === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'units' && skuSortDirectionPrev === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('units');
                                    setSkuSortDirectionPrev('desc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'units' && skuSortDirectionPrev === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'units' && skuSortDirectionPrev === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('units');
                                    setSkuSortDirectionPrev('asc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>Return(%)</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdownPrev(activeTableFilterDropdownPrev === 'returns' ? null : 'returns');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortFieldPrev === 'returns' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Return(%)"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdownPrev === 'returns' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdownPrev === 'returns' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'returns' && skuSortDirectionPrev === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'returns' && skuSortDirectionPrev === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('returns');
                                    setSkuSortDirectionPrev('desc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'returns' && skuSortDirectionPrev === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'returns' && skuSortDirectionPrev === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('returns');
                                    setSkuSortDirectionPrev('asc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                          <th>Total Revenue</th>
                          <th>Avg Selling Price</th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>{latestInventoryData.date ? `Inventory (LU-${formatLUDate(latestInventoryData.date)})` : 'Inventory (LU-N/A)'}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdownPrev(activeTableFilterDropdownPrev === 'inventory' ? null : 'inventory');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortFieldPrev === 'inventory' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Inventory"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdownPrev === 'inventory' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdownPrev === 'inventory' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'inventory' && skuSortDirectionPrev === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'inventory' && skuSortDirectionPrev === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('inventory');
                                    setSkuSortDirectionPrev('desc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortFieldPrev === 'inventory' && skuSortDirectionPrev === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortFieldPrev === 'inventory' && skuSortDirectionPrev === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortFieldPrev('inventory');
                                    setSkuSortDirectionPrev('asc');
                                    setActiveTableFilterDropdownPrev(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {prevSkuAnalysisData.slice(0, 100).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.sku}</td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatNumber(item.units)}</td>
                            <td style={{ fontWeight: 600, color: item.returns > 0 ? '#ff8d72' : 'var(--text-secondary)' }}>
                              {item.returns} ({item.returnPct.toFixed(0)}%)
                            </td>
                            <td>{formatCurrency(item.revenue)}</td>
                            <td>{formatCurrency(item.revenue / item.units)}</td>
                            <td style={{ fontWeight: 600, color: (latestInventoryData.map[item.sku] || 0) > 0 ? '#00f2c4' : 'var(--text-secondary)' }}>
                              {formatNumber(latestInventoryData.map[item.sku] || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activePage === 'reco' && userRole === 'admin' ? (
          <div className="dashboard-content">
            <div className="card" style={{ marginBottom: '2rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(186, 84, 245, 0.15)', borderRadius: '12px', color: 'var(--accent-color)' }}>
                  <RefreshCw size={32} />
                </div>
                <div>
                  <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                    Sales Reconciliation (Reco Section)
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                    Upload corrected sales data for a specific month. Deletes all old sales files for that month automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-grid grid-split-12-08" style={{ gap: '2rem' }}>
              <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                    Reconciliation Configuration
                  </h3>
                  <button 
                    onClick={() => setValidationModal({
                      isOpen: true,
                      missingColumns: ['Size', 'Item Color', 'Selling Price', 'Channel'],
                      onConfirm: () => setValidationModal(prev => ({ ...prev, isOpen: false })),
                      onCancel: () => setValidationModal(prev => ({ ...prev, isOpen: false }))
                    })}
                    style={{
                      background: 'rgba(186, 84, 245, 0.1)',
                      border: '1px solid rgba(186, 84, 245, 0.2)',
                      borderRadius: '8px',
                      color: 'var(--accent-color)',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Preview Modal Design
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Select Month */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Month to Reconcile</label>
                      <CustomSelect 
                        value={recoMonth} 
                        options={monthsList} 
                        onChange={(val) => {
                          setRecoMonth(val);
                          setRecoError('');
                          setRecoSuccess('');
                        }} 
                        placeholder="Select Month" 
                      />
                    </div>

                    {/* Select Year */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Year to Reconcile</label>
                      <CustomSelect 
                        value={recoYear} 
                        options={yearsList} 
                        onChange={(val) => {
                          setRecoYear(val);
                          setRecoError('');
                          setRecoSuccess('');
                        }} 
                        placeholder="Select Year" 
                      />
                    </div>
                  </div>

                  {/* Choose Excel File */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Upload Reconciled Excel File</label>
                    <div className="upload-btn-wrapper" style={{ width: '100%' }}>
                      <button className="upload-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <UploadCloud size={20} />
                        {recoFile ? recoFile.name : 'Choose Excel/CSV File'}
                      </button>
                      <input 
                        id="reco-file-input" 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={(e) => {
                          setRecoFile(e.target.files[0]);
                          setRecoError('');
                          setRecoSuccess('');
                        }}
                        disabled={isReconciling}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Warnings / Error Messages */}
                {recoError && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' }}>
                    {recoError}
                  </div>
                )}

                {/* Success Message */}
                {recoSuccess && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 242, 196, 0.1)', border: '1px solid rgba(0, 242, 196, 0.2)', borderRadius: '8px', color: '#00f2c4', fontSize: '0.9rem' }}>
                    {recoSuccess}
                  </div>
                )}

                {/* Reconcile Button */}
                <button 
                  onClick={handleReconciliationUpload}
                  disabled={isReconciling || !recoFile || !recoMonth}
                  className="upload-btn" 
                  style={{ 
                    marginTop: '1rem', 
                    fontSize: '1.05rem', 
                    padding: '0.85rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: (isReconciling || !recoFile || !recoMonth) ? 0.5 : 1,
                    cursor: (isReconciling || !recoFile || !recoMonth) ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #ef4444 0%, #ff8d72 100%)'
                  }}
                >
                  {isReconciling ? 'Performing Reconciliation...' : 'Upload & Reconcile'}
                </button>
              </div>

              <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                  How Reconciliation Works
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>⚠</div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Automated Old Data Deletion</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        The moment you click reconcile, the database locates all existing sales files for the selected month (e.g. 6-May, 12-14 May) and deletes them.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Returns & Inventory Unaffected</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        Inventory files (`[INVENTORY]`) and Returns files (`[RETURN]`) are excluded from deletion and remain fully intact.
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ color: '#ba54f5', fontWeight: 'bold', fontSize: '1.1rem' }}>⚡</div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Split Chunk Upload</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        The new corrected sales spreadsheet is split into 1000-row chunks and uploaded to Supabase, marked as `[RECO] Reconciled Sales`.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activePage === 'inventory' ? (
          <div className="dashboard-content">
            {/* Top Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div className="card metric-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                height: '140px',
                marginBottom: 0
              }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Tracked SKUs</h3>
                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {inventoryDrrData.length}
                </div>
              </div>

              <div className="card metric-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                height: '140px',
                marginBottom: 0
              }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>New Launches (≤ 90 Days)</h3>
                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {inventoryDrrData.filter(item => item.isNewLaunch).length}
                </div>
              </div>

              <div className="card metric-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                height: '140px',
                marginBottom: 0
              }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Active PO Alarms</h3>
                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {inventoryDrrData.filter(item => item.poRecommendation > 0).length}
                </div>
              </div>

              <div className="card metric-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                height: '140px',
                marginBottom: 0
              }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Avg DRR (New Launches)</h3>
                <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                  {(() => {
                    const newLaunches = inventoryDrrData.filter(item => item.isNewLaunch);
                    if (newLaunches.length === 0) return '0.00';
                    const sum = newLaunches.reduce((acc, curr) => acc + curr.drr, 0);
                    return (sum / newLaunches.length).toFixed(2);
                  })()}
                </div>
              </div>
            </div>

            {/* Inventory List Card */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>
                    Product Daily Run Rate (DRR) & PO Planning
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                    Calculated from sales records relative to the present date
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Calculate DRR Range:</span>
                  <div className="custom-select-wrapper" ref={drrDropdownRef} style={{ minWidth: '160px' }}>
                    <div 
                      className={`custom-select-trigger ${isRangeDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsRangeDropdownOpen(!isRangeDropdownOpen)}
                    >
                      <span>Past {selectedDrrRange} Days</span>
                      <ChevronDown size={16} />
                    </div>
                    {isRangeDropdownOpen && (
                      <div className="custom-select-options" style={{ zIndex: 100 }}>
                        {[5, 15, 30, 45, 60, 90].map(val => (
                          <div 
                            key={val}
                            className={`custom-select-option ${selectedDrrRange === val ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedDrrRange(val);
                              setIsRangeDropdownOpen(false);
                            }}
                          >
                            Past {val} Days
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls bar (Tabs & Search) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setInventoryTab('all')}
                    className={`toggle-btn ${inventoryTab === 'all' ? 'active' : ''}`}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    All Tracked SKUs ({inventoryDrrData.length})
                  </button>
                  <button 
                    onClick={() => setInventoryTab('alerts')}
                    className={`toggle-btn ${inventoryTab === 'alerts' ? 'active' : ''}`}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    Active PO Alarms ({inventoryDrrData.filter(i => i.poRecommendation > 0).length})
                  </button>
                  <button 
                    onClick={() => setInventoryTab('new_launches')}
                    className={`toggle-btn ${inventoryTab === 'new_launches' ? 'active' : ''}`}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                  >
                    New Launches (≤ 90d) ({inventoryDrrData.filter(i => i.isNewLaunch).length})
                  </button>
                </div>

                <div className="search-bar" style={{ maxWidth: '300px', width: '100%', margin: 0 }}>
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Search SKU / Item Color..." 
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                  />
                  {inventorySearch && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setInventorySearch('')} />}
                </div>
              </div>

              {/* Sync warning banner */}
              {downloadProgress.active && (
                <div style={{
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.25)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#ffe082'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>⏳</span>
                  <div>
                    <strong>Syncing sales history...</strong> Calculations are updating in real-time as background data files download ({downloadProgress.current} of {downloadProgress.total} batches loaded).
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="table-responsive">
                <table className="raw-files-table">
                  <thead>
                    <tr>
                      {renderSortHeader('sku', 'SKU / Item Color', true)}
                      {renderSortHeader('launchDate', 'Live Date')}
                      {renderSortHeader('ageDays', 'Age (Days Live)')}
                      {renderSortHeader('unitsSold', `Units Sold (${selectedDrrRange}D)`)}
                      {renderSortHeader('inventoryQty', 'Current Inventory')}
                      {renderSortHeader('drr', 'DRR')}
                      {renderSortHeader('poRecommendation', 'PO Recommendation')}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventory.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                          No products found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedInventory.map((item) => {
                        return (
                          <tr key={item.sku}>
                            <td style={{ fontWeight: 600, color: '#fff' }}>{item.sku}</td>
                            <td>
                              {item.launchDate ? (
                                new Date(item.launchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Not Uploaded</span>
                              )}
                            </td>
                            <td>
                              {item.ageDays !== null ? (
                                item.isNewLaunch ? (
                                  <span style={{ 
                                    background: 'rgba(186, 84, 245, 0.1)', 
                                    color: '#ba54f5', 
                                    padding: '0.2rem 0.6rem', 
                                    borderRadius: '6px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 700,
                                    border: '1px solid rgba(186, 84, 245, 0.2)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    New Launch ({item.ageDays}d)
                                  </span>
                                ) : (
                                  <span>{item.ageDays} days</span>
                                )
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.unitsSold}</td>
                            <td style={{ fontWeight: 600 }}>{item.inventoryQty}</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{item.drr.toFixed(2)}</td>
                            <td>
                              {item.poRecommendation > 0 ? (
                                <button 
                                  onClick={() => setActivePoItem(item)}
                                  style={{
                                    background: item.alertLevel === 'danger' ? 'rgba(186, 84, 245, 0.15)' :
                                                item.alertLevel === 'red' ? 'rgba(244, 67, 54, 0.15)' :
                                                item.alertLevel === 'orange' ? 'rgba(255, 152, 0, 0.15)' :
                                                'rgba(255, 193, 7, 0.15)',
                                    color: item.alertLevel === 'danger' ? '#ba54f5' :
                                           item.alertLevel === 'red' ? '#e57373' :
                                           item.alertLevel === 'orange' ? '#ffb74d' :
                                           '#ffd54f',
                                    border: item.alertLevel === 'danger' ? '1px solid rgba(186, 84, 245, 0.3)' :
                                            item.alertLevel === 'red' ? '1px solid rgba(244, 67, 54, 0.3)' :
                                            item.alertLevel === 'orange' ? '1px solid rgba(255, 152, 0, 0.3)' :
                                            '1px solid rgba(255, 193, 7, 0.3)',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '20px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: item.alertLevel === 'danger' ? '0 0 10px rgba(186, 84, 245, 0.1)' : 'none',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.filter = 'brightness(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.filter = 'brightness(1)';
                                  }}
                                >
                                  🚨 {item.alarmMessage}
                                </button>
                              ) : (
                                <span style={{
                                  background: 'rgba(76, 175, 80, 0.1)',
                                  color: '#81c784',
                                  border: '1px solid rgba(76, 175, 80, 0.2)',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '20px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}>
                                  ✓ Normal / No PO
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {sortedInventory.length > 50 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Showing {Math.min(sortedInventory.length, (inventoryPage - 1) * 50 + 1)} to {Math.min(sortedInventory.length, inventoryPage * 50)} of {sortedInventory.length} products
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      disabled={inventoryPage === 1}
                      onClick={() => setInventoryPage(prev => Math.max(1, prev - 1))}
                      className="upload-btn"
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.85rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: inventoryPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: inventoryPage === 1 ? 0.5 : 1
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={inventoryPage === totalInventoryPages}
                      onClick={() => setInventoryPage(prev => Math.min(totalInventoryPages, prev + 1))}
                      className="upload-btn"
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.85rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: inventoryPage === totalInventoryPages ? 'not-allowed' : 'pointer',
                        opacity: inventoryPage === totalInventoryPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PO Mail Confirmation Modal */}
            {activePoItem && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
              }}>
                <div className="card" style={{
                  width: '90%',
                  maxWidth: '550px',
                  padding: '2rem',
                  background: 'rgba(30, 30, 47, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
                }}>
                  <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                    Confirm PO Mail Details
                  </h3>

                  {emailSuccess && (
                    <div style={{
                      background: 'rgba(76, 175, 80, 0.15)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      color: '#81c784',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}>
                      ✓ {emailSuccess}
                    </div>
                  )}

                  {emailError && (
                    <div style={{
                      background: 'rgba(244, 67, 54, 0.15)',
                      border: '1px solid rgba(244, 67, 54, 0.3)',
                      color: '#e57373',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap'
                    }}>
                      ⚠ {emailError}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>SKU:</span>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '0.9rem' }}>{activePoItem.sku}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Recommended PO:</span>
                        <strong style={{ display: 'block', color: 'var(--accent-color)', fontSize: '0.9rem' }}>{activePoItem.poRecommendation} Qty</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Units Sold ({selectedDrrRange}D):</span>
                        <strong style={{ display: 'block', color: '#fff' }}>{activePoItem.unitsSold} units</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Current Inventory:</span>
                        <strong style={{ display: 'block', color: '#fff' }}>{activePoItem.inventoryQty} units</strong>
                      </div>
                    </div>

                    <div>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Recipient Email:</label>
                      <input 
                        type="email" 
                        disabled={isSendingEmail || !!emailSuccess}
                        value={poMailRecipient}
                        onChange={(e) => setPoMailRecipient(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.9rem',
                          opacity: (isSendingEmail || emailSuccess) ? 0.6 : 1
                        }}
                        placeholder="Enter recipient email..."
                      />
                    </div>

                    <div>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Subject:</label>
                      <input 
                        type="text" 
                        disabled={isSendingEmail || !!emailSuccess}
                        value={poMailSubject}
                        onChange={(e) => setPoMailSubject(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.9rem',
                          opacity: (isSendingEmail || emailSuccess) ? 0.6 : 1
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Email Message Draft:</label>
                      <textarea 
                        disabled={isSendingEmail || !!emailSuccess}
                        value={poMailBody}
                        onChange={(e) => setPoMailBody(e.target.value)}
                        rows="8"
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          opacity: (isSendingEmail || emailSuccess) ? 0.6 : 1
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button 
                      disabled={isSendingEmail}
                      onClick={() => setActivePoItem(null)}
                      className="toggle-btn"
                      style={{
                        padding: '0.6rem 1.5rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-secondary)',
                        cursor: isSendingEmail ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isSendingEmail || !!emailSuccess}
                      onClick={handleSendPoEmail}
                      className="toggle-btn active"
                      style={{
                        padding: '0.6rem 1.5rem',
                        background: 'linear-gradient(135deg, #ba54f5 0%, #ff8d72 100%)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: (isSendingEmail || emailSuccess) ? 'not-allowed' : 'pointer',
                        opacity: (isSendingEmail || emailSuccess) ? 0.6 : 1
                      }}
                    >
                      {isSendingEmail ? 'Sending Email...' : 'Confirm & Send Email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !data.length ? (
          <div className="empty-state">
            <FileText size={64} />
            <h2>No Data Available</h2>
            <p>
              {userRole === 'admin' 
                ? "Please go to the Raw Files section to upload your first sales report."
                : "No data has been uploaded yet. Please contact an Administrator."}
            </p>
            {userRole === 'admin' && (
              <button className="upload-btn" style={{ marginTop: '1rem' }} onClick={() => setActivePage('raw_files')}>
                Go to Raw Files
              </button>
            )}
          </div>
        ) : (
          <div className="dashboard-content">
            
            {(activePage === 'dashboard' || activePage === 'trends') && (
              <div className="insight-toggle-container">
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${insightType === 'revenue' ? 'active' : ''}`}
                    onClick={() => setInsightType('revenue')}
                  >
                    Revenue Insights
                  </button>
                  <button 
                    className={`toggle-btn ${insightType === 'units' ? 'active' : ''}`}
                    onClick={() => setInsightType('units')}
                  >
                    Unit Insights
                  </button>
                </div>
              </div>
            )}

            {/* Global Filters */}
            {activePage !== 'raw_files' && activePage !== 'intelli_report' && activePage !== 'previous_years' && (
              <div className="filters-container">
                {activePage !== 'goals' && (
                  <CustomSelect 
                    value={selectedFY} 
                    options={['2026']} 
                    onChange={(val) => {
                      setSelectedFY(val);
                      setSelectedMonth([]);
                      setSelectedDate('All');
                    }} 
                    placeholder="Select Year" 
                  />
                )}
                <CustomMultiSelect 
                  values={selectedMonth} 
                  options={activePage === 'goals' ? goalsMonths : filterOptions.months} 
                  onChange={(val) => {
                    setSelectedMonth(val);
                    setSelectedDate('All'); // Reset date filter
                  }} 
                  placeholder="All Months" 
                />
                
                {activePage !== 'goals' && (
                  <>
                    <CustomSelect value={selectedDate} options={filterOptions.dates} onChange={setSelectedDate} placeholder="All Dates" />
                    {activePage !== 'product_level' && (
                      <CustomSelect value={selectedDivision} options={filterOptions.divisions} onChange={setSelectedDivision} placeholder="All Divisions" />
                    )}
                  </>
                )}
                
                {activePage !== 'insights' && activePage !== 'goals' && (
                  <>
                    <CustomMultiSelect values={selectedChannels} options={filterOptions.channels} onChange={setSelectedChannels} placeholder="All Channels" />
                    {activePage !== 'product_level' && (
                      <>
                        <CustomMultiSelect values={selectedCategories} options={filterOptions.categories} onChange={setSelectedCategories} placeholder="All Categories" />
                        <CustomMultiSelect values={selectedGenders} options={['Boys', 'Girls', 'Unisex']} onChange={setSelectedGenders} placeholder="All Genders" />
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Progress Bar Indicator */}
            {downloadProgress.active && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Activity size={20} className="pulsing-logo" style={{ marginBottom: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>Syncing historical records...</span>
                    <span>{downloadProgress.current} / {downloadProgress.total} batches</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(downloadProgress.current / downloadProgress.total) * 100}%`, background: 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'insights' && topInsights && (
              <div className="chart-grid">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', textTransform: 'uppercase' }}>
                      <Star size={18} color="var(--accent-color)" /> Top 5 Categories
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {topInsights.topCategories.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: idx < 4 ? '1px solid var(--card-border)' : 'none' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }} title={item.name}>{idx + 1}. {item.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatNumber(item.units)} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', textTransform: 'uppercase' }}>
                      <ShoppingBag size={18} color="var(--accent-color)" /> Top 5 Products (Units)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {topInsights.topSkusByUnits.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: idx < 4 ? '1px solid var(--card-border)' : 'none' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }} title={item.name}>{idx + 1}. {item.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{formatNumber(item.units)} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', textTransform: 'uppercase' }}>
                      <DollarSign size={18} color="var(--accent-color)" /> Top 5 Products (Revenue)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {topInsights.topSkusByRevenue.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: idx < 4 ? '1px solid var(--card-border)' : 'none' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }} title={item.name}>{idx + 1}. {item.name}</span>
                        <span style={{ color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: 600 }}>{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', textTransform: 'uppercase' }}>
                      <TrendingUp size={18} color="var(--accent-color)" /> Top 5 Products (ASP)
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {topInsights.topSkusByASP.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: idx < 4 ? '1px solid var(--card-border)' : 'none' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }} title={item.name}>{idx + 1}. {item.name}</span>
                        <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>{formatCurrency(item.asp)} / unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activePage === 'product_level' && (
              <div className="product-search-section">
                <div className="card" style={{ marginBottom: '2rem' }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={20} color="var(--accent-color)" />
                      Search Product
                    </h3>
                  </div>
                  <div className="search-box-container">
                    <input 
                      type="text" 
                      className="auth-input" 
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                      placeholder="Search Product"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && productSearch.trim()) {
                          // Try exact match first, then case-insensitive, then partial
                          const exactMatch = productList.find(p => p === productSearch);
                          const caseMatch = productList.find(p => p.toLowerCase() === productSearch.toLowerCase());
                          const partialMatch = productList.find(p => p.toLowerCase().includes(productSearch.toLowerCase()));
                          
                          const match = exactMatch || caseMatch || partialMatch;
                          if (match) {
                            setSelectedProduct(match);
                            setProductSearch(match);
                          }
                        }
                      }}
                    />
                    {productSearch && !selectedProduct && (
                      <div className="search-suggestions">
                        {productList
                          .filter(p => p.toLowerCase().includes(productSearch.toLowerCase()))
                          .slice(0, 15)
                          .map(p => (
                            <div 
                              key={p} 
                              className="suggestion-item"
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductSearch(p);
                              }}
                            >
                              <Search size={14} style={{ opacity: 0.5 }} />
                              {p}
                            </div>
                          ))}
                        {productList.filter(p => p.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <div className="suggestion-item" style={{ color: 'var(--text-secondary)', cursor: 'default' }}>
                            No products found matching "{productSearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedProduct && productSizeData && (
                  <div className="card" style={{ position: 'relative' }}>
                    <button 
                      onClick={() => { setSelectedProduct(null); setProductSearch(''); }}
                      style={{ 
                        position: 'absolute', 
                        top: '1.5rem', 
                        left: '1.5rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        color: 'var(--text-secondary)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      title="Clear Selection"
                    >
                      <X size={18} />
                    </button>

                    <div className="card-header" style={{ textAlign: 'center', paddingLeft: '3rem' }}>
                      <h3 className="card-title">Size Wise Performance: {selectedProduct}</h3>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Units: </span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{formatNumber(productSizeData.totalUnits)}</span>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Top Size: </span>
                          <span style={{ fontWeight: 700, color: '#10b981' }}>{productSizeData.topSize}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '400px', marginTop: '2rem' }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={productSizeData.sizes} layout="vertical" margin={{ left: 40, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="size" 
                            type="category" 
                            stroke="var(--text-secondary)" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            content={<CustomTooltip />} 
                            cursor={false} 
                          />
                          <Bar 
                            dataKey="revenue" 
                            radius={[0, 4, 4, 0]} 
                            barSize={25}
                            activeBar={{ 
                              stroke: 'var(--accent-color)', 
                              strokeWidth: 2,
                              fillOpacity: 0.8
                            }}
                          >
                            {productSizeData.sizes.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                       <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                         {productSizeData.sizes.slice(0, 6).map((item, idx) => (
                           <div key={idx} style={{ textAlign: 'center' }}>
                             <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Size {item.size}</div>
                             <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '4px 0' }}>{formatCurrency(item.revenue)}</div>
                             <div style={{ color: 'var(--accent-color)', fontSize: '0.85rem' }}>{item.units} Units</div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                )}

                {/* Product Returns Search Section */}
                <div className="card" style={{ marginBottom: '2rem', marginTop: '2rem' }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Search size={20} color="var(--accent-color)" />
                      Search Product (Returns)
                    </h3>
                  </div>
                  <div className="search-box-container">
                    <input 
                      type="text" 
                      className="auth-input" 
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                      placeholder="Search Product for Returns"
                      value={productSearchReturn}
                      onChange={(e) => {
                        setProductSearchReturn(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && productSearchReturn.trim()) {
                          const exactMatch = productList.find(p => p === productSearchReturn);
                          const caseMatch = productList.find(p => p.toLowerCase() === productSearchReturn.toLowerCase());
                          const partialMatch = productList.find(p => p.toLowerCase().includes(productSearchReturn.toLowerCase()));
                          
                          const match = exactMatch || caseMatch || partialMatch;
                          if (match) {
                            setSelectedProductReturn(match);
                            setProductSearchReturn(match);
                          }
                        }
                      }}
                    />
                    {productSearchReturn && !selectedProductReturn && (
                      <div className="search-suggestions">
                        {productList
                          .filter(p => p.toLowerCase().includes(productSearchReturn.toLowerCase()))
                          .slice(0, 15)
                          .map(p => (
                            <div 
                              key={p} 
                              className="suggestion-item"
                              onClick={() => {
                                setSelectedProductReturn(p);
                                setProductSearchReturn(p);
                              }}
                            >
                              <Search size={14} style={{ opacity: 0.5 }} />
                              {p}
                            </div>
                          ))}
                        {productList.filter(p => p.toLowerCase().includes(productSearchReturn.toLowerCase())).length === 0 && (
                          <div className="suggestion-item" style={{ color: 'var(--text-secondary)', cursor: 'default' }}>
                            No products found matching "{productSearchReturn}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedProductReturn && productChannelReturnData && (
                  <div className="card" style={{ position: 'relative', marginBottom: '2rem' }}>
                    <button 
                      onClick={() => { setSelectedProductReturn(null); setProductSearchReturn(''); }}
                      style={{ 
                        position: 'absolute', 
                        top: '1.5rem', 
                        left: '1.5rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: 'none', 
                        color: 'var(--text-secondary)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                      title="Clear Selection"
                    >
                      <X size={18} />
                    </button>

                    <div className="card-header" style={{ textAlign: 'center', paddingLeft: '3rem' }}>
                      <h3 className="card-title">Channel Wise Performance (Returns): {selectedProductReturn}</h3>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Units: </span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{formatNumber(productChannelReturnData.totalUnits)}</span>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Return %: </span>
                          <span style={{ fontWeight: 700, color: '#ff8d72' }}>{productChannelReturnData.overallReturnPct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: '400px', marginTop: '2rem' }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart data={productChannelReturnData.channels} layout="vertical" margin={{ left: 40, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="channel" 
                            type="category" 
                            stroke="var(--text-secondary)" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={120}
                          />
                          <Tooltip 
                            content={<ReturnsCustomTooltip />} 
                            cursor={false} 
                          />
                          <Bar 
                            dataKey="returns" 
                            radius={[0, 4, 4, 0]} 
                            barSize={25}
                            activeBar={{ 
                              stroke: 'var(--accent-color)', 
                              strokeWidth: 2,
                              fillOpacity: 0.8
                            }}
                          >
                            {productChannelReturnData.channels.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                       <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                         {productChannelReturnData.channels.slice(0, 6).map((item, idx) => (
                           <div key={idx} style={{ textAlign: 'center' }}>
                             <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.channel}>{item.channel}</div>
                             <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '4px 0', color: 'var(--text-primary)' }}>{item.units} Units</div>
                             <div style={{ color: '#ff8d72', fontSize: '0.85rem', fontWeight: 600 }}>{item.returns} Returns</div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePage === 'dashboard' && (
              <>
                {/* Top Metrics */}
                <div className="dashboard-grid">
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Total Revenue</h3>
                      <div className="metric-value">{formatCurrency(metrics.totalSales)}</div>
                    </div>
                    <div className="metric-icon"><DollarSign size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Total Units</h3>
                      <div className="metric-value">{formatNumber(metrics.totalUnits)}</div>
                    </div>
                    <div className="metric-icon"><ShoppingBag size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Return (%)</h3>
                      <div className="metric-value">
                        {formatNumber(metrics.totalReturns)} ({metrics.overallReturnPct.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="metric-icon"><TrendingDown size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Active Channels</h3>
                      <div className="metric-value">{metrics.uniqueChannels}</div>
                    </div>
                    <div className="metric-icon"><Layers size={24} /></div>
                  </div>
                  <div className="card metric-card">
                    <div className="metric-info">
                      <h3>Avg Selling Price</h3>
                      <div className="metric-value">
                        {metrics.totalUnits > 0 
                          ? formatCurrency(metrics.totalSales / metrics.totalUnits) 
                          : formatCurrency(0)}
                      </div>
                    </div>
                    <div className="metric-icon"><TrendingUp size={24} /></div>
                  </div>
                </div>

                {chartsData && (
                  <div className="chart-grid">
                    {/* Sales by Channel */}
                    <div className="card full-width-chart">
                      <div className="card-header">
                        <h3 className="card-title">Top Channels ({insightType === 'revenue' ? 'Revenue' : 'Units'})</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={chartsData.channelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} width={120} />
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Bar 
                              dataKey="value" 
                              radius={[0, 4, 4, 0]}
                              activeBar={{ 
                                stroke: 'var(--accent-color)', 
                                strokeWidth: 2,
                                fillOpacity: 0.8
                              }}
                            >
                              {chartsData.channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getChannelColor(entry.name)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Sales by Division */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">{insightType === 'revenue' ? 'Revenue by Division' : 'Units by Division'}</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie
                              data={chartsData.divisionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 35 : 45}
                              outerRadius={isMobile ? 70 : 90}
                              paddingAngle={5}
                              dataKey="value"
                              activeShape={renderActiveShape}
                              style={{ cursor: 'pointer' }}
                            >
                              {chartsData.divisionData.map((entry, index) => {
                                const name = (entry.name || '').toLowerCase();
                                const isFootwear = name.includes('footwear');
                                const fill = isFootwear ? '#00f2c4' : '#ba54f5';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                              })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Legend 
                              formatter={(value) => {
                                const totalDivisionVal = chartsData.divisionData ? chartsData.divisionData.reduce((sum, d) => sum + d.value, 0) : 0;
                                const item = chartsData.divisionData ? chartsData.divisionData.find(d => d.name.toLowerCase() === value.toLowerCase()) : null;
                                const pct = totalDivisionVal > 0 && item ? ((item.value / totalDivisionVal) * 100).toFixed(1) : '0.0';
                                return (
                                  <span style={{ 
                                    color: '#ffffff', 
                                    fontSize: 'var(--legend-font-size, 18px)', 
                                    fontWeight: 'var(--legend-font-weight, 800)', 
                                    marginLeft: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                  }}>
                                    {value}: {pct}%
                                  </span>
                                );
                              }}
                              iconSize={14}
                              wrapperStyle={{ paddingTop: '1.5rem' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Sales by Gender */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">{insightType === 'revenue' ? 'Revenue by Gender' : 'Units by Gender'}</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie
                              data={chartsData.genderData}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 35 : 45}
                              outerRadius={isMobile ? 70 : 90}
                              paddingAngle={5}
                              dataKey="value"
                              activeShape={renderActiveShape}
                              style={{ cursor: 'pointer' }}
                            >
                              {chartsData.genderData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getGenderColor(entry.name)} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Legend 
                              formatter={(value) => {
                                const totalGenderVal = chartsData.genderData ? chartsData.genderData.reduce((sum, d) => sum + d.value, 0) : 0;
                                const item = chartsData.genderData ? chartsData.genderData.find(d => d.name === value) : null;
                                const pct = totalGenderVal > 0 && item ? ((item.value / totalGenderVal) * 100).toFixed(1) : '0.0';
                                return (
                                  <span style={{ 
                                    color: '#ffffff', 
                                    fontSize: 'var(--legend-font-size, 18px)', 
                                    fontWeight: 'var(--legend-font-weight, 800)', 
                                    marginLeft: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                  }}>
                                    {value}: {pct}%
                                  </span>
                                );
                              }}
                              iconSize={14}
                              wrapperStyle={{ paddingTop: '1.5rem' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Top Categories */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">Top Categories ({insightType === 'revenue' ? 'Revenue' : 'Units'})</h3>
                      </div>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={chartsData.categoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Bar 
                              dataKey="value" 
                              radius={[4, 4, 0, 0]}
                              activeBar={{ 
                                stroke: 'var(--accent-color)', 
                                strokeWidth: 2,
                                fillOpacity: 0.8
                              }}
                            >
                              {chartsData.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Selling Items Table */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Top Selling Items</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e1e2f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', width: '220px' }}>
                      <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                      <input 
                        type="text"
                        placeholder="Search SKU..."
                        value={skuSearchQuery}
                        onChange={(e) => setSkuSearchQuery(e.target.value)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '100%', padding: '2px 0' }}
                      />
                      {skuSearchQuery && (
                        <button onClick={() => setSkuSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Item Color (SKU)</th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>Units Sold</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdown(activeTableFilterDropdown === 'units' ? null : 'units');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortField === 'units' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Units Sold"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdown === 'units' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdown === 'units' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'units' && skuSortDirection === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'units' && skuSortDirection === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('units');
                                    setSkuSortDirection('desc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'units' && skuSortDirection === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'units' && skuSortDirection === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('units');
                                    setSkuSortDirection('asc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>Return(%)</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdown(activeTableFilterDropdown === 'returns' ? null : 'returns');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortField === 'returns' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Return(%)"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdown === 'returns' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdown === 'returns' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'returns' && skuSortDirection === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'returns' && skuSortDirection === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('returns');
                                    setSkuSortDirection('desc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'returns' && skuSortDirection === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'returns' && skuSortDirection === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('returns');
                                    setSkuSortDirection('asc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                          <th>Total Revenue</th>
                          <th>Avg Selling Price</th>
                          <th style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                              <span>{latestInventoryData.date ? `Inventory (LU-${formatLUDate(latestInventoryData.date)})` : 'Inventory (LU-N/A)'}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableFilterDropdown(activeTableFilterDropdown === 'inventory' ? null : 'inventory');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: skuSortField === 'inventory' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s'
                                }}
                                title="Sort Inventory"
                              >
                                <ChevronDown size={14} style={{ transform: activeTableFilterDropdown === 'inventory' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </button>
                            </div>
                            {activeTableFilterDropdown === 'inventory' && (
                              <div 
                                className="custom-select-options"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 50,
                                  minWidth: '120px',
                                  marginTop: '4px',
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--card-border)',
                                  borderRadius: 'var(--radius-sm)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                  padding: '4px 0'
                                }}
                              >
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'inventory' && skuSortDirection === 'desc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'inventory' && skuSortDirection === 'desc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('inventory');
                                    setSkuSortDirection('desc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  High to low
                                </div>
                                <div 
                                  className="custom-select-option" 
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',
                                    color: skuSortField === 'inventory' && skuSortDirection === 'asc' ? 'var(--accent-color)' : 'var(--text-primary)',
                                    fontWeight: skuSortField === 'inventory' && skuSortDirection === 'asc' ? '700' : 'normal'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSkuSortField('inventory');
                                    setSkuSortDirection('asc');
                                    setActiveTableFilterDropdown(null);
                                  }}
                                >
                                  Low to high
                                </div>
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuAnalysisData.slice(0, 100).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.sku}</td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatNumber(item.units)}</td>
                            <td style={{ fontWeight: 600, color: item.returns > 0 ? '#ff8d72' : 'var(--text-secondary)' }}>
                              {item.returns} ({item.returnPct.toFixed(0)}%)
                            </td>
                            <td>{formatCurrency(item.revenue)}</td>
                            <td>{formatCurrency(item.revenue / item.units)}</td>
                            <td style={{ fontWeight: 600, color: (latestInventoryData.map[item.sku] || 0) > 0 ? '#00f2c4' : 'var(--text-secondary)' }}>
                              {formatNumber(latestInventoryData.map[item.sku] || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activePage === 'trends' && chartsData && (
              <div className="chart-grid">
                {/* Main Trend Chart */}
                <div className="card full-width-chart">
                  <div className="card-header">
                    <h3 className="card-title">{insightType === 'revenue' ? 'Revenue Trend over Time' : 'Units Sold Trend over Time'}</h3>
                  </div>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={chartsData.dateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                        <YAxis 
                          stroke="var(--text-secondary)" 
                          tick={{fill: 'var(--text-secondary)'}} 
                          tickFormatter={(value) => insightType === 'revenue' ? `₹${value/1000}k` : value} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="value" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-color)', stroke: 'var(--accent-color)', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ASP Trend Chart */}
                <div className="card full-width-chart">
                  <div className="card-header">
                    <h3 className="card-title">Average Selling Price (ASP) Trend</h3>
                  </div>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart data={chartsData.dateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                        <YAxis 
                          stroke="var(--text-secondary)" 
                          tick={{fill: 'var(--text-secondary)'}} 
                          tickFormatter={(value) => `₹${value}`} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Line type="monotone" dataKey="asp" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-color)', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            {activePage === 'intelli_report' && (
              <div className="dashboard-content">
                <div className="card" style={{ marginBottom: '2rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(186, 84, 245, 0.1)', borderRadius: '12px', color: 'var(--accent-color)' }}>
                      <Cpu size={32} />
                    </div>
                    <div>
                      <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                        {reportType === 'inventory' 
                          ? 'Intelli Inventory Report' 
                          : reportType === 'business' 
                            ? 'Weekly Business Intelli Report' 
                            : 'Sale Report'}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                        {reportType === 'inventory' 
                          ? 'Generate intelligent inventory replenishment data, bestselling analysis, and full stock listings.'
                          : reportType === 'business'
                            ? 'Generate channel-wise weekly sales and return statistics for a single month performance review.'
                            : 'Download sales report with all standard sales columns for any custom date range (up to 3 months).'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid grid-split-12-08" style={{ gap: '2rem' }}>
                  <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                      Report Configuration
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Report Type Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Report Type</label>
                        <CustomSelect 
                          value={reportType === 'inventory' 
                            ? 'Intelli Inventory Report' 
                            : reportType === 'business' 
                              ? 'Weekly Business Intelli Report' 
                              : 'Sale Report'} 
                          options={['Intelli Inventory Report', 'Weekly Business Intelli Report', 'Sale Report']} 
                          onChange={(val) => {
                            if (val === 'Intelli Inventory Report') {
                              setReportType('inventory');
                            } else if (val === 'Weekly Business Intelli Report') {
                              setReportType('business');
                            } else {
                              setReportType('sale_report');
                            }
                            setReportError('');
                          }} 
                          placeholder="Select Report Type" 
                        />
                      </div>

                      {/* Financial Year Selector */}
                      {reportType !== 'sale_report' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Financial Year</label>
                          <CustomSelect 
                            value={selectedReportFY === 'FY25' ? 'FY25 (2024-25)' : 'FY26 (2025-26)'} 
                            options={['FY25 (2024-25)', 'FY26 (2025-26)']} 
                            onChange={(val) => {
                              setSelectedReportFY(val.startsWith('FY25') ? 'FY25' : 'FY26');
                            }} 
                            placeholder="Select Year" 
                          />
                        </div>
                      )}

                      {/* Month Selectors based on Report Type */}
                      {reportType === 'inventory' && (
                        <div className="grid-split-2" style={{ display: 'grid', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>From Month</label>
                            <CustomSelect 
                              value={reportStartMonth} 
                              options={monthsList} 
                              onChange={(val) => {
                                setReportStartMonth(val);
                                // Automatically set reportEndMonth to the next month to assist the user
                                const idx = monthsList.indexOf(val);
                                if (idx !== -1) {
                                  setReportEndMonth(monthsList[(idx + 1) % 12]);
                                }
                              }} 
                              placeholder="Start Month" 
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>To Month</label>
                            <CustomSelect 
                              value={reportEndMonth} 
                              options={monthsList} 
                              onChange={(val) => {
                                setReportEndMonth(val);
                              }} 
                              placeholder="End Month" 
                            />
                          </div>
                        </div>
                      )}

                      {reportType === 'business' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Month</label>
                          <CustomSelect 
                            value={selectedReportMonth} 
                            options={monthsList} 
                            onChange={(val) => {
                              setSelectedReportMonth(val);
                            }} 
                            placeholder="Select Month" 
                          />
                        </div>
                      )}

                      {reportType === 'sale_report' && (
                        <div className="grid-split-2" style={{ display: 'grid', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Start Date</label>
                            <input 
                              type="date" 
                              value={saleReportStartDate} 
                              onChange={(e) => {
                                setSaleReportStartDate(e.target.value);
                                setReportError('');
                              }}
                              className="custom-date-picker"
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>End Date</label>
                            <input 
                              type="date" 
                              value={saleReportEndDate} 
                              onChange={(e) => {
                                setSaleReportEndDate(e.target.value);
                                setReportError('');
                              }}
                              className="custom-date-picker"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Validation Warnings / Error Messages */}
                    {reportError && (
                      <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' }}>
                        {reportError}
                      </div>
                    )}

                    {reportType === 'inventory' && !validateConsecutiveMonths(reportStartMonth, reportEndMonth) && (
                      <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 141, 114, 0.08)', border: '1px solid rgba(255, 141, 114, 0.15)', borderRadius: '8px', color: '#ff8d72', fontSize: '0.85rem' }}>
                        Please select exactly a 2-month range (e.g. April to May, Dec to Jan).
                      </div>
                    )}

                    {selectedReportFY === 'FY25' && !isFY25Loaded && (
                      <div style={{ padding: '1rem', background: 'rgba(255, 141, 114, 0.08)', border: '1px solid rgba(255, 141, 114, 0.15)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#ff8d72' }}>
                          FY25 historical database has not been loaded into local memory yet.
                        </p>
                        {isFY25Loading ? (
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <span>Downloading database...</span>
                              <span>{fy25Progress.current} / {fy25Progress.total} files</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${fy25Progress.total > 0 ? (fy25Progress.current / fy25Progress.total) * 100 : 0}%`, background: 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={loadFY25Data} 
                            className="upload-btn" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', alignSelf: 'flex-start' }}
                          >
                            Load FY25 Database
                          </button>
                        )}
                      </div>
                    )}

                    {reportType === 'inventory' && isInventoryLoading && (
                      <div style={{ padding: '0.75rem 1rem', background: 'rgba(0, 242, 196, 0.08)', border: '1px solid rgba(0, 242, 196, 0.15)', borderRadius: '8px', color: '#00f2c4', fontSize: '0.85rem' }}>
                        Loading current inventory silently in the background...
                      </div>
                    )}

                    {/* Download Button */}
                    <button 
                      onClick={reportType === 'inventory' ? downloadIntelliReport : reportType === 'business' ? downloadWeeklyBusinessReport : downloadSaleReport}
                      disabled={
                        isGeneratingReport || 
                        (reportType === 'inventory' && isInventoryLoading) || 
                        (selectedReportFY === 'FY25' && !isFY25Loaded) || 
                        (reportType === 'inventory' && !validateConsecutiveMonths(reportStartMonth, reportEndMonth)) ||
                        (reportType === 'sale_report' && (!saleReportStartDate || !saleReportEndDate))
                      }
                      className="upload-btn" 
                      style={{ 
                        marginTop: '1rem', 
                        fontSize: '1.05rem', 
                        padding: '0.85rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: (
                          isGeneratingReport || 
                          (reportType === 'inventory' && isInventoryLoading) || 
                          (selectedReportFY === 'FY25' && !isFY25Loaded) || 
                          (reportType === 'inventory' && !validateConsecutiveMonths(reportStartMonth, reportEndMonth)) ||
                          (reportType === 'sale_report' && (!saleReportStartDate || !saleReportEndDate))
                        ) ? 0.5 : 1,
                        cursor: (
                          isGeneratingReport || 
                          (reportType === 'inventory' && isInventoryLoading) || 
                          (selectedReportFY === 'FY25' && !isFY25Loaded) || 
                          (reportType === 'inventory' && !validateConsecutiveMonths(reportStartMonth, reportEndMonth)) ||
                          (reportType === 'sale_report' && (!saleReportStartDate || !saleReportEndDate))
                        ) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isGeneratingReport 
                        ? 'Generating Report...' 
                        : (reportType === 'inventory' && isInventoryLoading) 
                          ? 'Loading Inventory...' 
                          : reportType === 'sale_report'
                            ? 'Download Sales Report'
                            : 'Download Intelligent Report'}
                    </button>
                  </div>

                  <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                      What's inside the report?
                    </h3>
                    {reportType === 'inventory' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Sheet 1: Inventory Levels</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>All active SKUs in stock sorted from highest to lowest stock counts.</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Sheet 2: Bestselling Analysis</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>Bestselling items for the selected 2-month span, showing units sold, revenue, and matching inventory levels.</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#ba54f5', fontWeight: 'bold', fontSize: '1.1rem' }}>⚡</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Sheet 3: Alarming Stock Replenishment</strong>
                              <span style={{ background: 'rgba(186, 84, 245, 0.15)', color: 'var(--accent-color)', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Python Powered</span>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Highlights items in high demand (sales velocity) with critically low inventory. Provides Days of Cover (DOC) and recommended replenishment order quantities.
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : reportType === 'business' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Weekly Sales (Qty & Value)</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Tracks sales quantity and revenue (value) channel-by-channel across Weeks 1 to 5.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Weekly Returns (Qty)</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Tracks customer returns quantity channel-by-channel across Weeks 1 to 5.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#ba54f5', fontWeight: 'bold', fontSize: '1.1rem' }}>⚡</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Total Monthly Summary Row</strong>
                              <span style={{ background: 'rgba(186, 84, 245, 0.15)', color: 'var(--accent-color)', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Python Powered</span>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Compiles aggregate monthly sales quantities, revenues, and returns, with dynamic Excel formulas for cross-channel verification.
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Transaction Level Sales Rows</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Downloads all standard transaction columns: Date, Month, FY, Price, Division, Channel, Category, Color, and Size.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#00f2c4', fontWeight: 'bold', fontSize: '1.1rem' }}>✓</div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.95rem' }}>Custom Date Range (Max 3 Months)</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Extracts sales logs matching your selected start and end dates with simple input validation.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div style={{ color: '#ba54f5', fontWeight: 'bold', fontSize: '1.1rem' }}>⚡</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>Instant Browser Download</strong>
                              <span style={{ background: 'rgba(186, 84, 245, 0.15)', color: 'var(--accent-color)', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>SheetJS Powered</span>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                              Processes, auto-fits columns, and writes the spreadsheet file directly in the client browser for speed and efficiency.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {false && (
              <div className="dashboard-content">
                {!momData ? (
                   <div className="empty-state" style={{ height: '300px' }}>
                     <TrendingUp size={48} />
                     <h2>Not Enough Data</h2>
                     <p>You need at least two months of data to calculate Month-over-Month growth.</p>
                   </div>
                ) : (
                  <>
                    <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2rem' }}>
                      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Growth Comparison</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>Comparing <strong>{momData.currentMonth}</strong> against <strong>{momData.prevMonth}</strong></p>
                    </div>

                    <div className="dashboard-grid grid-split-2">
                      <div className="card metric-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>Total Revenue Growth</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{formatCurrency(momData.revenue.current)}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.25rem', fontWeight: 600, color: momData.revenue.growth >= 0 ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
                            {momData.revenue.growth >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                            {Math.abs(momData.revenue.growth).toFixed(1)}%
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>vs {formatCurrency(momData.revenue.prev)} in {momData.prevMonth}</p>
                      </div>

                      <div className="card metric-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 600 }}>ASP (Avg Selling Price) Growth</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{formatCurrency(momData.asp.current)}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.25rem', fontWeight: 600, color: momData.asp.growth >= 0 ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
                            {momData.asp.growth >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                            {Math.abs(momData.asp.growth).toFixed(1)}%
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>vs {formatCurrency(momData.asp.prev)} in {momData.prevMonth}</p>
                      </div>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                      <div className="card-header">
                        <h3 className="card-title">Channel-wise Growth</h3>
                      </div>
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Channel</th>
                              <th>Revenue ({momData.currentMonth})</th>
                              <th>Revenue ({momData.prevMonth})</th>
                              <th>Rev Growth</th>
                              <th>ASP ({momData.currentMonth})</th>
                              <th>ASP ({momData.prevMonth})</th>
                              <th>ASP Growth</th>
                            </tr>
                          </thead>
                          <tbody>
                            {momData.channelGrowth.map((ch, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{ch.channel}</td>
                                <td>{formatCurrency(ch.currentRevenue)}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(ch.prevRevenue)}</td>
                                <td style={{ color: ch.revenueGrowth >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {ch.revenueGrowth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {Math.abs(ch.revenueGrowth).toFixed(1)}%
                                  </div>
                                </td>
                                <td>{formatCurrency(ch.currentAsp)}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(ch.prevAsp)}</td>
                                <td style={{ color: ch.aspGrowth >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {ch.aspGrowth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {Math.abs(ch.aspGrowth).toFixed(1)}%
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activePage === 'goals' && (
              <div className="dashboard-content">
                <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', padding: '2rem' }}>
                  <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Target vs Achievement For FY 2026-2027</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Comparing actual performance against goals for <strong>{selectedMonth.length === 0 ? 'All Months' : selectedMonth.join(', ')}</strong> ({
                      selectedMonth.length === 0 
                        ? 'FY 2026-2027' 
                        : selectedMonth.every(m => ['January', 'February', 'March'].includes(m)) ? '2027' : '2026'
                    })
                  </p>
                </div>

                {goalMetrics ? (
                  <div className="dashboard-grid grid-split-2">
                    {/* Revenue Goal */}
                    <div className="card metric-card goal-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <h3 className="goal-title">Revenue Target</h3>
                      <Target size={24} color="var(--accent-color)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div className="goal-value desktop-only">{formatCurrency(goalMetrics.actual.revenue)}</div>
                          <div className="goal-value mobile-only">{formatShortCurrency(goalMetrics.actual.revenue)}</div>
                          <div className="goal-label">Achieved</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="goal-target desktop-only">{formatCurrency(goalMetrics.target.revenue)}</div>
                          <div className="goal-target mobile-only">{formatShortCurrency(goalMetrics.target.revenue)}</div>
                          <div className="goal-label">Goal</div>
                        </div>
                      </div>
                      <div className="goal-progress-bg">
                        <div className="goal-progress-bar" style={{ width: `${Math.min((goalMetrics.actual.revenue / goalMetrics.target.revenue) * 100, 100)}%`, background: goalMetrics.actual.revenue >= goalMetrics.target.revenue ? '#10b981' : 'var(--accent-color)' }}></div>
                      </div>
                      <div className="goal-footer" style={{ color: goalMetrics.actual.revenue >= goalMetrics.target.revenue ? '#10b981' : '#f59e0b' }}>
                        <span>{((goalMetrics.actual.revenue / goalMetrics.target.revenue) * 100).toFixed(1)}% Completed</span>
                        <span className="desktop-only">{goalMetrics.actual.revenue < goalMetrics.target.revenue ? `${formatCurrency(goalMetrics.target.revenue - goalMetrics.actual.revenue)} Left` : 'Goal Exceeded!'}</span>
                        <span className="mobile-only">{goalMetrics.actual.revenue < goalMetrics.target.revenue ? `${formatShortCurrency(goalMetrics.target.revenue - goalMetrics.actual.revenue)} Left` : 'Exceeded!'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Units Goal */}
                  <div className="card metric-card goal-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <h3 className="goal-title">Total Units Target</h3>
                      <ShoppingBag size={24} color="var(--accent-color)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div className="goal-value desktop-only">{formatNumber(goalMetrics.actual.units)}</div>
                          <div className="goal-value mobile-only">{formatShortNumber(goalMetrics.actual.units)}</div>
                          <div className="goal-label">Sold</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="goal-target desktop-only">{formatNumber(goalMetrics.target.units)}</div>
                          <div className="goal-target mobile-only">{formatShortNumber(goalMetrics.target.units)}</div>
                          <div className="goal-label">Goal</div>
                        </div>
                      </div>
                      <div className="goal-progress-bg">
                        <div className="goal-progress-bar" style={{ width: `${Math.min((goalMetrics.actual.units / goalMetrics.target.units) * 100, 100)}%`, background: goalMetrics.actual.units >= goalMetrics.target.units ? '#10b981' : 'var(--accent-color)' }}></div>
                      </div>
                      <div className="goal-footer" style={{ color: goalMetrics.actual.units >= goalMetrics.target.units ? '#10b981' : '#f59e0b' }}>
                        <span>{((goalMetrics.actual.units / goalMetrics.target.units) * 100).toFixed(1)}% Completed</span>
                        <span className="desktop-only">{goalMetrics.actual.units < goalMetrics.target.units ? `${formatNumber(goalMetrics.target.units - goalMetrics.actual.units)} Left` : 'Goal Exceeded!'}</span>
                        <span className="mobile-only">{goalMetrics.actual.units < goalMetrics.target.units ? `${formatShortNumber(goalMetrics.target.units - goalMetrics.actual.units)} Left` : 'Exceeded!'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Apparel Goal */}
                  <div className="card metric-card goal-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <h3 className="goal-title">Apparel Target (Units)</h3>
                      <Layers size={24} color="var(--accent-color)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div className="goal-value desktop-only">{formatNumber(goalMetrics.actual.apparel)}</div>
                          <div className="goal-value mobile-only">{formatShortNumber(goalMetrics.actual.apparel)}</div>
                          <div className="goal-label">Sold</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="goal-target desktop-only">{formatNumber(goalMetrics.target.apparel)}</div>
                          <div className="goal-target mobile-only">{formatShortNumber(goalMetrics.target.apparel)}</div>
                          <div className="goal-label">Goal</div>
                        </div>
                      </div>
                      <div className="goal-progress-bg">
                        <div className="goal-progress-bar" style={{ width: `${Math.min((goalMetrics.actual.apparel / goalMetrics.target.apparel) * 100, 100)}%`, background: goalMetrics.actual.apparel >= goalMetrics.target.apparel ? '#10b981' : 'var(--accent-color)' }}></div>
                      </div>
                      <div className="goal-footer" style={{ color: goalMetrics.actual.apparel >= goalMetrics.target.apparel ? '#10b981' : '#f59e0b' }}>
                        <span>{((goalMetrics.actual.apparel / goalMetrics.target.apparel) * 100).toFixed(1)}% Completed</span>
                        <span className="desktop-only">{goalMetrics.actual.apparel < goalMetrics.target.apparel ? `${formatNumber(goalMetrics.target.apparel - goalMetrics.actual.apparel)} Left` : 'Goal Exceeded!'}</span>
                        <span className="mobile-only">{goalMetrics.actual.apparel < goalMetrics.target.apparel ? `${formatShortNumber(goalMetrics.target.apparel - goalMetrics.actual.apparel)} Left` : 'Exceeded!'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footwear Goal */}
                  <div className="card metric-card goal-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <h3 className="goal-title">Footwear Target (Units)</h3>
                      <ShoppingBag size={24} color="var(--accent-color)" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div className="goal-value desktop-only">{formatNumber(goalMetrics.actual.footwear)}</div>
                          <div className="goal-value mobile-only">{formatShortNumber(goalMetrics.actual.footwear)}</div>
                          <div className="goal-label">Sold</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="goal-target desktop-only">{formatNumber(goalMetrics.target.footwear)}</div>
                          <div className="goal-target mobile-only">{formatShortNumber(goalMetrics.target.footwear)}</div>
                          <div className="goal-label">Goal</div>
                        </div>
                      </div>
                      <div className="goal-progress-bg">
                        <div className="goal-progress-bar" style={{ width: `${Math.min((goalMetrics.actual.footwear / goalMetrics.target.footwear) * 100, 100)}%`, background: goalMetrics.actual.footwear >= goalMetrics.target.footwear ? '#10b981' : 'var(--accent-color)' }}></div>
                      </div>
                      <div className="goal-footer" style={{ color: goalMetrics.actual.footwear >= goalMetrics.target.footwear ? '#10b981' : '#f59e0b' }}>
                        <span>{((goalMetrics.actual.footwear / goalMetrics.target.footwear) * 100).toFixed(1)}% Completed</span>
                        <span className="desktop-only">{goalMetrics.actual.footwear < goalMetrics.target.footwear ? `${formatNumber(goalMetrics.target.footwear - goalMetrics.actual.footwear)} Left` : 'Goal Exceeded!'}</span>
                        <span className="mobile-only">{goalMetrics.actual.footwear < goalMetrics.target.footwear ? `${formatShortNumber(goalMetrics.target.footwear - goalMetrics.actual.footwear)} Left` : 'Exceeded!'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* ASP Comparison */}
                  <div className="card metric-card goal-card asp-card" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <h3 className="goal-title">ASP Performance</h3>
                      <TrendingUp size={24} color="var(--accent-color)" />
                    </div>
                    <div className="asp-comparison-container">
                       <div className="asp-side">
                         <div className="asp-value" style={{ color: goalMetrics.actual.asp >= goalMetrics.target.asp ? '#10b981' : '#ef4444' }}>
                           {formatCurrency(goalMetrics.actual.asp)}
                         </div>
                         <div className="goal-label">Actual ASP</div>
                       </div>
                       <div className="asp-vs">VS</div>
                       <div className="asp-side">
                         <div className="asp-value">
                           {formatCurrency(goalMetrics.target.asp)}
                         </div>
                         <div className="goal-label">Target ASP</div>
                       </div>
                    </div>
                  </div>

                  </div>
                ) : (
                  <div className="empty-state" style={{ height: '300px' }}>
                    <Target size={48} color="var(--accent-color)" />
                    <h2>No Target</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>No target or goals have been configured for <strong>{selectedMonth}</strong> in this year.</p>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
        
        {/* Special Premium Footer Section */}
        <footer style={{
          marginTop: '4rem',
          padding: '2rem 0 1rem 0',
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Developed with ❤️ by</span>
            <span style={{ 
              fontWeight: 700, 
              color: '#ffffff',
              background: 'linear-gradient(135deg, #ba54f5, #e14eca)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em'
            }}>MANAN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>© 2026 Manan. All rights reserved.</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span style={{ 
              color: 'var(--accent-color)', 
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.1em'
            }}>Premium Business Analytics</span>
          </div>
        </footer>
      </main>

      {/* Custom Premium Validation Modal */}
      {validationModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '520px',
            margin: '1.5rem',
            padding: '2.5rem',
            background: 'rgba(30, 30, 40, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 100px rgba(186, 84, 245, 0.1)',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Header Icon */}
            <div style={{
              margin: '0 auto',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)'
            }}>
              <RefreshCw size={32} style={{ animation: 'spin-slow 6s linear infinite' }} />
            </div>

            {/* Title & Desc */}
            <div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.35rem',
                fontWeight: 700,
                margin: '0 0 0.5rem 0'
              }}>
                Warning: Missing Column Data
              </h3>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                margin: 0
              }}>
                The uploaded file has missing or empty values for:
              </p>
            </div>

            {/* Badges List */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {validationModal.missingColumns.map((col, idx) => (
                <span key={idx} style={{
                  padding: '0.4rem 0.8rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  color: '#ff8d72',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em'
                }}>
                  {col}
                </span>
              ))}
            </div>

            {/* Prompt Text */}
            <p style={{
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 500,
              margin: 0
            }}>
              Are you sure you want to go ahead without these columns?
            </p>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '0.5rem'
            }}>
              <button
                onClick={validationModal.onCancel}
                className="upload-btn"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-primary)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel Upload
              </button>
              <button
                onClick={validationModal.onConfirm}
                className="upload-btn"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444 0%, #ff8d72 100%)',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  color: '#ffffff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Yes, Go Ahead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
