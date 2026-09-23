import * as XLSX from 'xlsx';
import defaultSeedCancellations from '../data/cancellations_seed.json';
import { normalizeChannelName } from '../sales/channelNormalization';

const REGISTRY_STORAGE_KEY = 'dyno_cancellations_registry_v2';

/**
 * Retrieves the complete registry of cancellations (seed + localStorage).
 */
export const getAllCancellationsRegistry = () => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REGISTRY_STORAGE_KEY) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read cancellations from localStorage:', err);
  }

  // Fallback to bundled seed dataset (July + August 2026)
  return Array.isArray(defaultSeedCancellations) ? [...defaultSeedCancellations] : [];
};

/**
 * Filter cancellations by selectedMonths and selectedFY
 * - selectedMonths: Array of months (e.g. ['April', 'May', 'June', 'July']) or string or [] (All)
 * - selectedFY: e.g. '2026'
 */
export const loadCancellations = (selectedMonths = [], selectedFY = '2026') => {
  const allRecords = getAllCancellationsRegistry();
  const yearStr = String(selectedFY || '2026').trim();

  // Normalize selected months
  let activeMonthNames = [];
  if (Array.isArray(selectedMonths)) {
    activeMonthNames = selectedMonths
      .map(m => String(m).trim().toLowerCase())
      .filter(m => m && m !== 'all' && m !== 'all months');
  } else if (typeof selectedMonths === 'string' && selectedMonths !== 'All') {
    activeMonthNames = [selectedMonths.trim().toLowerCase()];
  }

  return allRecords.filter(row => {
    // Check FY match
    const rowYear = String(row.year || '2026').trim();
    if (yearStr && rowYear !== yearStr) {
      return false;
    }

    // Check Month match
    if (activeMonthNames.length === 0) {
      // If no months selected or "All Months" is selected, return all for this year
      return true;
    }

    const rowMonth = String(row.month || '').trim().toLowerCase();
    return activeMonthNames.includes(rowMonth);
  });
};

/**
 * Save new/uploaded cancellation rows into the persistent registry.
 * Replaces any existing records for the month(s) & year(s) present in the new upload.
 */
export const saveUploadedCancellations = (newRows = []) => {
  try {
    const current = getAllCancellationsRegistry();

    // Identify which month/year combinations are in the new upload
    const uploadedCombos = new Set(
      newRows.map(r => `${String(r.month).toLowerCase()}_${String(r.year).toLowerCase()}`)
    );

    // Keep records from current that are NOT being overwritten by this upload
    const retained = current.filter(r => {
      const combo = `${String(r.month).toLowerCase()}_${String(r.year).toLowerCase()}`;
      return !uploadedCombos.has(combo);
    });

    const updated = [...retained, ...newRows];

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (err) {
    console.error('Failed to save uploaded cancellations:', err);
    throw err;
  }
};

/**
 * Reset cancellations registry to factory seed defaults
 */
export const resetCancellationsToDefault = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(REGISTRY_STORAGE_KEY);
    }
    return defaultSeedCancellations;
  } catch (err) {
    console.error('Failed to reset cancellations:', err);
    return [];
  }
};

/**
 * Clear cancellations for backward compatibility
 */
export const clearCancellations = (month, year) => {
  return resetCancellationsToDefault();
};

/**
 * Normalizes raw cancellation rows from JSON/Excel and validates required columns.
 * Throws an Error if 'Month' or 'Year' columns are missing.
 */
export const normalizeCancellationRows = (rawRows, options = {}) => {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('The uploaded file contains no data rows.');
  }

  // 1. Column Header Validation
  const firstRow = rawRows[0] || {};
  const allKeys = Object.keys(firstRow).map(k => k.trim().toLowerCase().replace(/\s+/g, '_'));

  const hasMonthCol = allKeys.some(k => k === 'month' || k === 'month_name' || k.includes('month'));
  const hasYearCol = allKeys.some(k => k === 'year' || k === 'fy' || k.includes('year'));

  if (!hasMonthCol && !hasYearCol) {
    throw new Error('Upload Failed: Missing required columns "Month" and "Year". Please ensure your cancellation file contains both "Month" (e.g. July, August) and "Year" (e.g. 2026) columns.');
  }
  if (!hasMonthCol) {
    throw new Error('Upload Failed: Missing required column "Month". Please ensure your cancellation file includes a "Month" column (e.g., July, August).');
  }
  if (!hasYearCol) {
    throw new Error('Upload Failed: Missing required column "Year". Please ensure your cancellation file includes a "Year" column (e.g., 2026).');
  }

  // 2. Row-by-Row Normalization and Validation
  return rawRows.map((row, idx) => {
    const normalizedRow = {};
    for (const k in row) {
      const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '_');
      normalizedRow[cleanKey] = row[k];
    }

    // Extract Month
    const rawMonth = 
      normalizedRow.month || 
      normalizedRow.month_name || 
      row['Month'] || 
      row['month'] || 
      options.fallbackMonth || 
      '';
    
    // Extract Year
    const rawYear = 
      normalizedRow.year || 
      normalizedRow.fy || 
      row['Year'] || 
      row['year'] || 
      options.fallbackYear || 
      '';

    if (!rawMonth || !String(rawMonth).trim()) {
      throw new Error(`Row ${idx + 2} is missing a value in the "Month" column.`);
    }
    if (!rawYear || !String(rawYear).trim()) {
      throw new Error(`Row ${idx + 2} is missing a value in the "Year" column.`);
    }

    const cleanMonth = String(rawMonth).trim();
    // Capitalize month: e.g. "july" -> "July"
    const capitalizedMonth = cleanMonth.charAt(0).toUpperCase() + cleanMonth.slice(1).toLowerCase();
    const cleanYear = String(rawYear).trim();

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
      month: capitalizedMonth,
      year: cleanYear
    };
  });
};

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file for Cancellations.
 * Validates required "Month" and "Year" columns and saves to persistent registry.
 */
export const parseCancellationFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected'));
    }

    const fileName = file.name || '';
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The selected Excel sheet contains no rows.');
        }

        // normalizeCancellationRows throws Error if Month or Year column is missing
        const normalized = normalizeCancellationRows(rawJson);

        const totalUnits = normalized.reduce((acc, r) => acc + r.units, 0);
        const totalPrice = normalized.reduce((acc, r) => acc + r.price, 0);

        const uniqueMonths = [...new Set(normalized.map(r => r.month))];
        const uniqueYears = [...new Set(normalized.map(r => r.year))];

        saveUploadedCancellations(normalized);

        resolve({
          success: true,
          fileName,
          months: uniqueMonths,
          years: uniqueYears,
          recordCount: normalized.length,
          totalUnits,
          totalPrice,
          rows: normalized
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
};
