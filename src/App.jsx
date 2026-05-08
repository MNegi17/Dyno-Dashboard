import { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { UploadCloud, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Layers, BarChart2, Home, Star, Activity, FileText, Trash2, LogOut, ChevronDown, Eye, EyeOff, Target, Menu, Search, X } from 'lucide-react';
import { supabase } from './supabaseClient';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

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

const getChannelColor = (channelName) => {
  if (!channelName) return COLORS[0];
  const name = channelName.toLowerCase();
  if (name.includes('myntra')) return '#ff3f6c'; // Myntra Pink
  if (name.includes('flipkart')) return '#ffc200'; // Flipkart Yellow
  if (name.includes('d2c') || name.includes('shopify') || name.includes('website')) return '#10b981'; // D2C Green
  if (name.includes('amazon')) return '#ff9900'; // Amazon Orange
  if (name.includes('firstcry')) return '#f97316'; // Firstcry Orange
  if (name.includes('nykaa')) return '#fc2779'; // Nykaa Pink
  if (name.includes('ajio')) return '#2c4152'; // Ajio Dark Blue
  if (name.includes('tatacliq') || name.includes('tata')) return '#eb0028'; // Tata Red
  
  // Fallback to consistent color from COLORS array
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
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

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user'); // 'admin' or 'user'
  
  // Auth Form State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [requestAdmin, setRequestAdmin] = useState(false);
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

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFY, setSelectedFY] = useState('FY26-27');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUserRole(session.user.user_metadata?.role || 'user');
        fetchData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setUserRole(session.user.user_metadata?.role || 'user');
      } else {
        setUploadedFiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        startBackgroundDownload(formatted);
      }
    } else if (error) {
      console.error("Error fetching metadata.", error);
    }
  };

  const startBackgroundDownload = async (files) => {
    setDownloadProgress({ active: true, current: 0, total: files.length });
    
    // We will build up the files array as they arrive
    let currentFilesState = [...files];

    for (let i = 0; i < files.length; i++) {
      const fileId = files[i].id;
      const { data, error } = await supabase.from('uploaded_files').select('data').eq('id', fileId).single();
      
      if (!error && data && data.data) {
        // Rehydrate dates
        const parsedRows = data.data.map(row => ({
          ...row,
          parsedDate: row.parsedDate ? new Date(row.parsedDate) : null
        }));
        
        currentFilesState[i].data = parsedRows;
        // Trigger React re-render with the new chunk
        setUploadedFiles([...currentFilesState]);
      }
      
      setDownloadProgress({ active: true, current: i + 1, total: files.length });
    }
    
    setDownloadProgress({ active: false, current: 0, total: 0 });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthError(error.message);
      } else {
        fetchData();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: {
          data: {
            role: 'user'
          }
        }
      });
      if (error) setAuthError(error.message);
      else {
        setAuthError("Signup successful! You can now log in.");
        setIsLogin(true);
      }
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  const data = useMemo(() => {
    return uploadedFiles.flatMap(file => file.data);
  }, [uploadedFiles]);

  const handleFileUpload = (e) => {
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

        const rawDate = normalizedRow.date;
        let dateObj = null;
        if (rawDate) {
          if (rawDate instanceof Date) {
            dateObj = rawDate;
          } else {
            try {
              dateObj = new Date(rawDate);
              if (isNaN(dateObj.getTime())) dateObj = null;
            } catch {
              dateObj = null;
            }
          }
        }

        if (dateObj) {
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          normalizedRow.parsedDate = dateObj;
          normalizedRow.monthName = monthNames[dateObj.getMonth()];
          const day = dateObj.getDate().toString().padStart(2, '0');
          normalizedRow.formattedDate = `${day} ${monthNames[dateObj.getMonth()]}`;
        } else {
          normalizedRow.parsedDate = null;
          normalizedRow.monthName = 'Unknown';
          normalizedRow.formattedDate = 'Unknown';
        }

        const priceVal = normalizedRow.new_sp || normalizedRow.newsp || normalizedRow.total_selling_price || normalizedRow.totalsellingprice || normalizedRow.price || 0;
        normalizedRow.priceVal = parseFloat(priceVal) || 0;

        return normalizedRow;
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
        
        // Brief pause to allow the database to breathe between heavy inserts
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setIsLoading(false);
      e.target.value = null;

      if (success) {
        fetchData();
      } else {
        alert(`Error saving file to database: ${errorMessage}. If the file is too large, it partially uploaded.`);
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
      months.add(row.monthName || 'Unknown');
      
      // Cascading logic: Only add dates that match the selected month
      if (selectedMonth === 'All' || row.monthName === selectedMonth) {
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
  }, [data, selectedMonth]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const month = row.monthName || 'Unknown';
      const date = row.formattedDate || 'Unknown';
      const division = row.division || 'Unknown';
      const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
      const category = row.categories || row.category || 'Unknown';

      if (selectedMonth !== 'All' && month !== selectedMonth) return false;
      if (selectedDate !== 'All' && date !== selectedDate) return false;
      if (selectedDivision !== 'All' && division !== selectedDivision) return false;
      if (selectedChannel !== 'All' && channel !== selectedChannel) return false;
      if (selectedCategory !== 'All' && category !== selectedCategory) return false;

      return true;
    });
  }, [data, selectedMonth, selectedDate, selectedDivision, selectedChannel, selectedCategory]);

  const metrics = useMemo(() => {
    if (!filteredData.length) return { totalSales: 0, totalUnits: 0, uniqueChannels: 0, uniqueCategories: 0 };

    let totalSales = 0;
    let totalUnits = filteredData.length;
    let channels = new Set();
    let categories = new Set();

    filteredData.forEach(row => {
      totalSales += row.priceVal;
      channels.add(row.channel_name || row.channelname || row.channel || 'Unknown');
      categories.add(row.categories || row.category || 'Unknown');
    });

    return {
      totalSales: totalSales.toFixed(2),
      totalUnits,
      uniqueChannels: channels.size,
      uniqueCategories: categories.size
    };
  }, [filteredData]);

  const chartsData = useMemo(() => {
    if (!filteredData.length) return null;

    const salesByDate = {};
    const salesByChannel = {};
    const salesByDivision = {};
    const salesByCategory = {};

    filteredData.forEach(row => {
      const val = row.priceVal;

      const dateKey = row.formattedDate || 'Unknown';
      const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
      const division = row.division || 'Unknown';
      const category = row.categories || row.category || 'Unknown';

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
  }, [filteredData, insightType]);

  const skuAnalysisData = useMemo(() => {
    if (!filteredData.length) return [];
    
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
    
    return Object.values(skuMap)
      .sort((a, b) => b.units - a.units);
  }, [filteredData]);

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
    
    let currentMonthStr = selectedMonth !== 'All' && availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[availableMonths.length - 1];
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
    
    // Filter data by selected month, date, and channel first if applicable
    const filteredForList = data.filter(row => {
      if (selectedMonth !== 'All' && row.monthName !== selectedMonth) return false;
      if (selectedDate !== 'All' && row.formattedDate !== selectedDate) return false;
      if (selectedChannel !== 'All') {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (channel !== selectedChannel) return false;
      }
      return true;
    });

    const products = new Set();
    filteredForList.forEach(row => {
      const p = row.item_color || row.itemcolor || row.barcode;
      if (p) products.add(p);
    });
    return Array.from(products).sort();
  }, [data, selectedMonth, selectedDate]);

  const productSizeData = useMemo(() => {
    if (!selectedProduct || !data.length) return null;
    
    const sizeMap = {};
    let totalUnits = 0;

    data.forEach(row => {
      // Apply Month, Date, and Channel filters to the specific product data
      if (selectedMonth !== 'All' && row.monthName !== selectedMonth) return;
      if (selectedDate !== 'All' && row.formattedDate !== selectedDate) return;
      if (selectedChannel !== 'All') {
        const channel = row.channel_name || row.channelname || row.channel || 'Unknown';
        if (channel !== selectedChannel) return;
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
  }, [selectedProduct, data, selectedMonth, selectedDate, selectedChannel]);

  const goalMetrics = useMemo(() => {
    if (!data.length) return null;

    let target = GOALS[selectedMonth];
    if (!target) return null;

    let actualRevenue = 0;
    let actualUnits = 0;
    let actualApparel = 0;
    let actualFootwear = 0;
    
    const monthData = selectedMonth === 'All' ? data : data.filter(row => row.monthName === selectedMonth);

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

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    if (percent < 0.05) return null;
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="600">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-graphic"></div>
          
          <div className="auth-form-container">
            <div className="auth-header">
              <h2>Welcome to Dyno</h2>
              <p>{isLogin ? 'Sign in to your Dyno Dashboard account to continue.' : 'Create a new Dyno Dashboard account to get started.'}</p>
            </div>

            {authError && <div className="auth-error">{authError}</div>}

            <form className="auth-form" onSubmit={handleAuth}>
              <div className="auth-form-group">
                <input 
                  className="auth-input"
                  type="email" 
                  placeholder="email or username" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>
              <div className="auth-form-group" style={{ position: 'relative' }}>
                <input 
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="password" 
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

              {isLogin && (
                <div className="auth-remember-forgot">
                  <label className="auth-remember">
                    <input type="checkbox" />
                    Remember
                  </label>
                  <span className="auth-forgot">Forgot your password?</span>
                </div>
              )}

              <div className="auth-submit-row">
                <button type="submit" className="auth-submit" disabled={isLoading}>
                  {isLoading ? 'WAIT...' : (isLogin ? 'NEXT' : 'CREATE')} 
                  {!isLoading && <span style={{ marginLeft: '4px' }}>→</span>}
                </button>
              </div>
            </form>

            <div className="auth-toggle">
              {isLogin ? "Create account" : "Already have an account?"}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity className="brand-icon" size={28} />
              Dyno
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
            <div className={`nav-item ${activePage === 'growth' ? 'active' : ''}`} onClick={() => { setActivePage('growth'); setIsMobileMenuOpen(false); }}>
              <TrendingUp size={20} />
              <span>MoM Growth</span>
            </div>
            <div className={`nav-item ${activePage === 'goals' ? 'active' : ''}`} onClick={() => { setActivePage('goals'); setIsMobileMenuOpen(false); }}>
              <Target size={20} />
              <span>Target & Goals</span>
            </div>
            {userRole === 'admin' && (
              <div className={`nav-item ${activePage === 'raw_files' ? 'active' : ''}`} onClick={() => { setActivePage('raw_files'); setIsMobileMenuOpen(false); }}>
                <FileText size={20} />
                <span>Raw Files</span>
              </div>
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
              {activePage === 'dashboard' && 'Sales Overview'}
              {activePage === 'trends' && 'Performance Trends'}
              {activePage === 'insights' && 'Top Performers & Insights'}
              {activePage === 'product_level' && 'Product Level Analysis'}
              {activePage === 'growth' && 'Month-over-Month Growth'}
              {activePage === 'goals' && 'Target & Goal Tracking'}
            </h1>
            <p>Real-time insights from your daily reports</p>
          </div>
        </header>

        {activePage === 'raw_files' && userRole === 'admin' ? (
          <div className="dashboard-content">
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">Upload New File</h3>
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
                        <th>Date Pushed</th>
                        <th>Records</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedFiles.map((file) => (
                        <tr key={file.id}>
                          <td style={{ fontWeight: 600 }}>{file.name}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
            {activePage !== 'raw_files' && activePage !== 'growth' && (
              <div className="filters-container">
                {activePage === 'goals' && (
                  <CustomSelect 
                    value={selectedFY} 
                    options={['FY26-27', 'FY27-28']} 
                    onChange={setSelectedFY} 
                    placeholder="Select FY" 
                  />
                )}
                <CustomSelect 
                  value={selectedMonth} 
                  options={filterOptions.months} 
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
                    <CustomSelect value={selectedChannel} options={filterOptions.channels} onChange={setSelectedChannel} placeholder="All Channels" />
                    {activePage !== 'product_level' && (
                      <CustomSelect value={selectedCategory} options={filterOptions.categories} onChange={setSelectedCategory} placeholder="All Categories" />
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
                      <ResponsiveContainer width="100%" height="100%">
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
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={25}>
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
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartsData.channelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} width={120} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartsData.divisionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={110}
                              paddingAngle={5}
                              dataKey="value"
                              labelLine={false}
                              label={renderCustomizedLabel}
                            >
                              {chartsData.divisionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
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
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartsData.categoryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
                  <div className="card-header">
                    <h3 className="card-title">Top Selling Items</h3>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Item Color (SKU)</th>
                          <th>Units Sold</th>
                          <th>Total Revenue</th>
                          <th>Avg Selling Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuAnalysisData.slice(0, 100).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.sku}</td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatNumber(item.units)}</td>
                            <td>{formatCurrency(item.revenue)}</td>
                            <td>{formatCurrency(item.revenue / item.units)}</td>
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
                    <ResponsiveContainer width="100%" height="100%">
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
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartsData.dateData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                        <YAxis 
                          stroke="var(--text-secondary)" 
                          tick={{fill: 'var(--text-secondary)'}} 
                          tickFormatter={(value) => `₹${value}`} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="asp" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-color)', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'growth' && (
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

                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                  <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Target vs Achievement</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Comparing actual performance against goals for <strong>{selectedMonth}</strong> ({selectedFY})</p>
                </div>

                {selectedFY === 'FY27-28' ? (
                  <div className="empty-state" style={{ height: '300px' }}>
                    <Target size={48} />
                    <h2>Target Not set yet</h2>
                    <p>Goals and targets for the financial year 2027-2028 have not been configured.</p>
                  </div>
                ) : goalMetrics ? (
                  <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                ) : null}

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
