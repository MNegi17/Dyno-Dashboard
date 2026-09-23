import * as XLSX from 'xlsx';
import defaultJulyCancellations from '../data/july_2026_cancellations.json';
import { normalizeChannelName } from '../sales/channelNormalization';

const STORAGE_KEY_PREFIX = 'dyno_cancellations_';

/**
 * Normalizes a month key string (e.g. 'July', 'July 2026', 'jul')
 */
export const getMonthKey = (month, year = '2026') => {
  if (!month) return 'all';
  const cleanMonth = String(month).trim().toLowerCase();
  return `${cleanMonth}_${year}`;
};

/**
 * Load cancellations for a given month and year.
 * Defaults to the pre-loaded July 2026 dataset if no custom data exists in localStorage for July.
 */
export const loadCancellations = (month = 'July', year = '2026') => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${getMonthKey(month, year)}`;
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Default seed for July
    const mLower = String(month).toLowerCase();
    if (mLower === 'july' || mLower === 'jul') {
      return normalizeCancellationRows(defaultJulyCancellations, 'July', year);
    }
  } catch (err) {
    console.error('Failed to load cancellations from localStorage:', err);
  }
  return [];
};

/**
 * Save cancellations array for a specific month and year into localStorage
 */
export const saveCancellations = (month, year, rows) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${getMonthKey(month, year)}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(rows));
    }
    return true;
  } catch (err) {
    console.error('Failed to save cancellations to localStorage:', err);
    return false;
  }
};

/**
 * Clear cancellations for a specific month and year
 */
export const clearCancellations = (month, year) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${getMonthKey(month, year)}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return true;
  } catch (err) {
    console.error('Failed to clear cancellations from localStorage:', err);
    return false;
  }
};

/**
 * Normalizes raw cancellation rows from JSON/Excel
 */
export const normalizeCancellationRows = (rawRows, month = 'July', year = '2026') => {
  if (!Array.isArray(rawRows)) return [];

  return rawRows.map(row => {
    const normalizedRow = {};
    for (const k in row) {
      const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '_');
      normalizedRow[cleanKey] = row[k];
    }

    // Extract channel
    const rawChannel = 
      normalizedRow.channel_name ||
      normalizedRow.channel_entry ||
      normalizedRow.channel ||
      row['Channel Name'] ||
      'Unknown';
    const channelName = normalizeChannelName(rawChannel);

    // Extract item color / SKU
    const itemColor = 
      normalizedRow.item_color || 
      normalizedRow.itemcolor || 
      normalizedRow.sku || 
      normalizedRow.product_sku_code || 
      row['Item Color'] || 
      'Unknown';

    // Extract units
    const unitsVal = 
      parseFloat(normalizedRow.units || normalizedRow.qty || normalizedRow.quantity || row['Units'] || 1) || 1;

    // Extract selling price / value
    const priceVal = 
      parseFloat(
        normalizedRow.new_sp || 
        normalizedRow.selling_price || 
        normalizedRow.sp || 
        normalizedRow.price || 
        normalizedRow.total || 
        row['New SP'] || 
        0
      ) || 0;

    return {
      channel_name: channelName,
      raw_channel: rawChannel,
      item_color: itemColor,
      units: unitsVal,
      price: priceVal,
      month: month,
      year: year
    };
  });
};

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file for Cancellations
 */
export const parseCancellationFile = (file, fallbackMonth = 'July', fallbackYear = '2026') => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected'));
    }

    const fileName = file.name || '';
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june', 
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    let detectedMonth = fallbackMonth;
    let detectedYear = fallbackYear;

    const lowerName = fileName.toLowerCase();
    for (const m of months) {
      if (lowerName.includes(m)) {
        detectedMonth = m.charAt(0).toUpperCase() + m.slice(1);
        break;
      }
    }

    const yearMatch = fileName.match(/(202\d)/);
    if (yearMatch) {
      detectedYear = yearMatch[1];
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The selected sheet is empty');
        }

        const normalized = normalizeCancellationRows(rawJson, detectedMonth, detectedYear);

        const totalUnits = normalized.reduce((acc, r) => acc + r.units, 0);
        const totalPrice = normalized.reduce((acc, r) => acc + r.price, 0);

        saveCancellations(detectedMonth, detectedYear, normalized);

        resolve({
          success: true,
          fileName,
          month: detectedMonth,
          year: detectedYear,
          recordCount: normalized.length,
          totalUnits,
          totalPrice,
          rows: normalized
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
