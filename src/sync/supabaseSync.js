import { supabase } from '../supabaseClient.js';
import { searchSaleOrders, fetchSaleOrdersWithConcurrency } from '../uniware/ordersClient.js';
import { transformRealtimeOrders } from '../sales/realtimeTransform.js';

export function getTodayStartIST() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);

  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDate = istNow.getUTCDate();

  // Construct UTC timestamp corresponding to IST 00:00:00 (Start of Day)
  const istStartMs = Date.UTC(istYear, istMonth, istDate, 0, 0, 0) - istOffsetMs;
  return new Date(istStartMs).toISOString();
}

export function getTodayRealtimeFileName() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const day = istNow.getUTCDate().toString().padStart(2, '0');
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthShort[istNow.getUTCMonth()];
  const year = istNow.getUTCFullYear();
  return `[REALTIME_SYNC] ${day} ${month} ${year}`;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function getLastSyncTime() {
  if (typeof localStorage === 'undefined') return null;
  const saved = localStorage.getItem('dyno_last_sync_time');
  return saved ? new Date(saved) : null;
}

export function canTriggerManualSync() {
  const last = getLastSyncTime();
  if (!last) return true;
  return (Date.now() - last.getTime()) >= COOLDOWN_MS;
}

export function getCooldownRemainingSeconds() {
  const last = getLastSyncTime();
  if (!last) return 0;
  const elapsed = Date.now() - last.getTime();
  if (elapsed >= COOLDOWN_MS) return 0;
  return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
}

export const CONFIG_DELETED_SYNC_DATES = '[CONFIG] deleted_sync_dates';

/**
 * Fetch persistent set of deleted past sync dates from Supabase
 */
export async function getDeletedSyncDates() {
  try {
    const { data } = await supabase
      .from('uploaded_files')
      .select('id, data')
      .eq('name', CONFIG_DELETED_SYNC_DATES)
      .limit(1);

    if (data && data.length > 0 && Array.isArray(data[0].data)) {
      return new Set(data[0].data);
    }
  } catch (err) {
    console.warn('[Sync Config] Error reading deleted sync dates:', err);
  }
  return new Set();
}

/**
 * Add a past date string (e.g. '22 Sep 2026') to the persistent deleted blocklist
 */
export async function markSyncDateAsDeleted(dateStr) {
  if (!dateStr) return;
  const cleanDateStr = dateStr.replace('[REALTIME_SYNC]', '').trim();
  try {
    const { data: existing } = await supabase
      .from('uploaded_files')
      .select('id, data')
      .eq('name', CONFIG_DELETED_SYNC_DATES)
      .limit(1);

    let dates = [cleanDateStr];
    if (existing && existing.length > 0) {
      const currentList = Array.isArray(existing[0].data) ? existing[0].data : [];
      dates = Array.from(new Set([...currentList, cleanDateStr]));
      await supabase
        .from('uploaded_files')
        .update({
          data: dates,
          record_count: dates.length,
          upload_date: new Date().toISOString()
        })
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('uploaded_files')
        .insert([{
          name: CONFIG_DELETED_SYNC_DATES,
          data: dates,
          record_count: dates.length,
          upload_date: new Date().toISOString()
        }]);
    }
    console.log(`[Sync Config] Marked ${cleanDateStr} as permanently deleted`);
  } catch (err) {
    console.warn('[Sync Config] Failed to record deleted sync date:', err);
  }
}

/**
 * Check if an uploaded manual Excel sales file covers a specific date
 */
export function doesManualFileCoverDate(fileName, day, month0, year) {
  const fn = (fileName || '').toLowerCase();
  if (
    fn.startsWith('[realtime_sync]') ||
    fn.startsWith('[inventory]') ||
    fn.startsWith('[launch_dates]') ||
    fn.startsWith('[return]') ||
    fn.startsWith('[config]') ||
    fn.includes('cancellation') ||
    fn.includes('fy25')
  ) {
    return false;
  }

  const monthNamesLong = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const yLong = monthNamesLong[month0];
  const yShort = monthNamesShort[month0];

  // Monthly reco check: e.g. [RECO] August 2026 Reconciled Sales
  if (fn.includes('[reco]') && (fn.includes(yLong) || fn.includes(yShort))) {
    return true; // covers all days of that month
  }

  if (!fn.includes(yLong) && !fn.includes(yShort) && !fn.includes('.xlsx')) {
    return false;
  }

  // 1. Range check: (18-20), 18-20, 29-30, (4-6)
  const rangeMatches = [...fn.matchAll(/\(?(\d{1,2})\s*[-_to]+\s*(\d{1,2})\)?/g)];
  for (const m of rangeMatches) {
    const startD = parseInt(m[1], 10);
    const endD = parseInt(m[2], 10);
    if (startD <= day && day <= endD) {
      return true;
    }
  }

  // 2. Exact single day match: 22-September, 21-September, 28-July
  const singleRegex = new RegExp('(^|[^\\d])0?' + day + '([^\\d]|$)');
  return singleRegex.test(fn);
}

/**
 * Execute real-time Uniware ingestion and persist to Supabase
 */
let _syncInProgressPromise = null;
let _reconcileInProgressPromise = null;

export async function syncRealtimeSalesToSupabase(options = {}) {
  const { force = false } = options;

  // Prevent multiple concurrent sync operations
  if (_syncInProgressPromise) {
    console.log('[RealtimeSync] Sync already in progress, attaching to existing promise...');
    return _syncInProgressPromise;
  }

  _syncInProgressPromise = (async () => {
    try {
      return await _executeSyncRealtimeSales(options);
    } finally {
      _syncInProgressPromise = null;
    }
  })();

  return _syncInProgressPromise;
}

async function _executeSyncRealtimeSales(options = {}) {
  const { force = false } = options;

  if (!force && !canTriggerManualSync()) {
    const remaining = getCooldownRemainingSeconds();
    throw new Error(`Sync cooldown active. Please wait ${remaining}s before syncing again.`);
  }

  const fromDate = getTodayStartIST();
  const fileName = getTodayRealtimeFileName();
  const now = Date.now();
  const toDate = new Date(now - 60000).toISOString(); // 1-minute buffer

  console.log(`[RealtimeSync] Daily window starting ${fromDate} to ${toDate} (Target: ${fileName})...`);

  // 1. Search Uniware orders
  const searchResult = await searchSaleOrders({ fromDate, toDate, dateType: 'CREATED' });
  const orderCodes = searchResult.orderCodes || [];
  console.log(`[RealtimeSync] Discovered ${orderCodes.length} order(s)`);

  if (orderCodes.length === 0) {
    localStorage.setItem('dyno_last_sync_time', new Date().toISOString());
    return {
      success: true,
      ordersCount: 0,
      rowsCount: 0,
      timestamp: new Date()
    };
  }

  // 2. Fetch full details with concurrency
  const fetchResult = await fetchSaleOrdersWithConcurrency(orderCodes, 5);
  const orders = fetchResult.orders || [];

  // 3. Transform to Dyno Normalized Sales Rows with live catalog enrichment & dynamic SP
  const normalizedRows = await transformRealtimeOrders(orders);
  console.log(`[RealtimeSync] Transformed into ${normalizedRows.length} sales rows`);

  // 4. Persist to Supabase uploaded_files table under [REALTIME_SYNC]
  const newFileEntry = {
    name: fileName,
    upload_date: new Date().toISOString(),
    record_count: normalizedRows.length,
    data: normalizedRows
  };

  // Upsert or replace existing [REALTIME_SYNC] entry in uploaded_files (strictly 1 record per name)
  const { data: existingFiles } = await supabase
    .from('uploaded_files')
    .select('id, upload_date')
    .eq('name', fileName)
    .order('upload_date', { ascending: false });

  if (existingFiles && existingFiles.length > 0) {
    const primaryId = existingFiles[0].id;
    await supabase
      .from('uploaded_files')
      .update({
        upload_date: newFileEntry.upload_date,
        record_count: newFileEntry.record_count,
        data: newFileEntry.data
      })
      .eq('id', primaryId);

    // If multiple duplicate rows exist for this exact name, delete all duplicates immediately
    if (existingFiles.length > 1) {
      const duplicateIds = existingFiles.slice(1).map(f => f.id);
      await supabase
        .from('uploaded_files')
        .delete()
        .in('id', duplicateIds);
      console.log(`[RealtimeSync] Cleaned up ${duplicateIds.length} duplicate entries for ${fileName}`);
    }
  } else {
    await supabase
      .from('uploaded_files')
      .insert([newFileEntry]);
  }

  // 5. Also upsert into dedicated realtime_sales table if table exists
  try {
    const supabaseSalesRows = normalizedRows.map(r => ({
      id: `${r.orderCode}:${r.orderItemCode}`,
      order_code: r.orderCode,
      order_item_code: r.orderItemCode,
      item_sku: r.itemSku,
      parsed_date: r.parsedDate,
      formatted_date: r.formattedDate,
      month_name: r.monthName,
      fy: r.fy,
      price_val: r.priceVal,
      new_sp: r.new_sp,
      division: r.division,
      channel_name: r.channel_name,
      categories: r.categories,
      item_color: r.item_color,
      item_type_size: r.item_type_size,
      mrp: r.mrp,
      synced_at: new Date().toISOString()
    }));

    if (supabaseSalesRows.length > 0) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < supabaseSalesRows.length; i += CHUNK_SIZE) {
        const chunk = supabaseSalesRows.slice(i, i + CHUNK_SIZE);
        await supabase
          .from('realtime_sales')
          .upsert(chunk, { onConflict: 'id' });
      }
    }
  } catch (tableErr) {
    console.warn('[RealtimeSync] realtime_sales table write skipped:', tableErr.message);
  }

  const syncTimestamp = new Date();
  localStorage.setItem('dyno_last_sync_time', syncTimestamp.toISOString());

  return {
    success: true,
    ordersCount: orders.length,
    rowsCount: normalizedRows.length,
    rows: normalizedRows,
    timestamp: syncTimestamp
  };
}

/**
 * Returns full 24-hour window from 00:00:00 IST to 23:59:59 IST for a past day
 */
export function getPastDayWindowIST(daysAgo = 1) {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const targetDate = new Date(istNow.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();
  const date = targetDate.getUTCDate();

  const startUtcMs = Date.UTC(year, month, date, 0, 0, 0) - istOffsetMs;
  const endUtcMs = Date.UTC(year, month, date, 23, 59, 59) - istOffsetMs;

  const dayStr = date.toString().padStart(2, '0');
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthShort[month];
  const dateStr = `${dayStr} ${monthName} ${year}`;
  const fileName = `[REALTIME_SYNC] ${dateStr}`;

  return {
    fromDate: new Date(startUtcMs).toISOString(),
    toDate: new Date(endUtcMs).toISOString(),
    fileName,
    dateStr,
    day: date,
    month: month,
    year: year
  };
}

/**
 * Client-Side Audit & Reconciliation Engine:
 * When anyone opens or reloads the dashboard, audits yesterday against Uniware.
 * If deleted by user or covered by a manual file, skips reconciliation and purges obsolete sync file.
 */
export async function reconcileYesterdayClientSide(options = {}) {
  const { threshold = 10, force = false } = options;

  if (_reconcileInProgressPromise) {
    console.log('[Client Reconcile] Reconciliation already in progress, returning active promise...');
    return _reconcileInProgressPromise;
  }

  _reconcileInProgressPromise = (async () => {
    try {
      return await _executeReconcileYesterday(options);
    } finally {
      _reconcileInProgressPromise = null;
    }
  })();

  return _reconcileInProgressPromise;
}

async function _executeReconcileYesterday(options = {}) {
  const { threshold = 10, force = false } = options;
  const daysToCheck = [1];
  const results = [];

  for (const daysAgo of daysToCheck) {
    try {
      const { fromDate, toDate, fileName, dateStr, day, month, year } = getPastDayWindowIST(daysAgo);
      console.log(`[Client Reconcile] Auditing ${fileName} (${fromDate} to ${toDate})...`);

      // 1. Check if user permanently deleted this past sync date
      const deletedDates = await getDeletedSyncDates();
      if (deletedDates.has(dateStr) && !force) {
        console.log(`[Client Reconcile] ${dateStr} was marked as deleted by user. Skipping reconciliation.`);
        // Clean up any remaining sync file if present
        await supabase.from('uploaded_files').delete().eq('name', fileName);
        continue;
      }

      // 2. Fetch Supabase files metadata
      const { data: allFiles, error: fetchErr } = await supabase
        .from('uploaded_files')
        .select('id, name, record_count, upload_date')
        .order('upload_date', { ascending: false })
        .limit(100);

      if (fetchErr || !allFiles) {
        console.warn('[Client Reconcile] Could not query uploaded_files:', fetchErr?.message);
        continue;
      }

      // 3. Check if a manual verified Excel file covers this date
      const manualFile = allFiles.find(f => doesManualFileCoverDate(f.name, day, month, year));

      if (manualFile && !force) {
        console.log(`[Client Reconcile] Manual file exists for ${fileName}: '${manualFile.name}'. Purging sync file and skipping.`);
        await supabase.from('uploaded_files').delete().eq('name', fileName);
        continue;
      }

      // 4. Search Uniware orders count for this 24-hr window
      const searchResult = await searchSaleOrders({ fromDate, toDate, dateType: 'CREATED' });
      const orderCodes = searchResult.orderCodes || [];
      const uniwareCount = orderCodes.length;
      console.log(`[Client Reconcile] Uniware has ${uniwareCount} orders for ${fileName}`);

      if (uniwareCount === 0) continue;

      // 5. Check existing [REALTIME_SYNC] file in Supabase
      const existingFile = allFiles.find(f => f.name === fileName);
      let storedUniqueOrders = 0;
      let storedRecordCount = existingFile?.record_count || 0;

      if (existingFile) {
        const { data: fileDataRes } = await supabase
          .from('uploaded_files')
          .select('data')
          .eq('id', existingFile.id)
          .single();
        if (fileDataRes && fileDataRes.data) {
          const rows = fileDataRes.data;
          storedUniqueOrders = new Set(rows.map(r => r.orderCode).filter(Boolean)).size;
          storedRecordCount = rows.length;
        }
      }

      const diff = Math.abs(uniwareCount - storedUniqueOrders);
      console.log(`[Client Reconcile] Comparison for ${fileName}: Uniware = ${uniwareCount}, Stored = ${storedUniqueOrders} (Units: ${storedRecordCount}), Diff = ${diff}`);

      if (diff > threshold || force || storedRecordCount === 0) {
        console.log(`[Client Reconcile] Discrepancy (${diff} > ${threshold}). Ingesting full 24-hour dataset from Uniware for ${fileName}...`);
        const fetchResult = await fetchSaleOrdersWithConcurrency(orderCodes, 6);
        const orders = fetchResult.orders || [];
        const normalizedRows = await transformRealtimeOrders(orders);

        const newFileEntry = {
          name: fileName,
          upload_date: new Date().toISOString(),
          record_count: normalizedRows.length,
          data: normalizedRows
        };

        // Direct fresh query for existing file records to prevent any race condition
        const { data: currentFiles } = await supabase
          .from('uploaded_files')
          .select('id, upload_date')
          .eq('name', fileName)
          .order('upload_date', { ascending: false });

        if (currentFiles && currentFiles.length > 0) {
          const primaryId = currentFiles[0].id;
          await supabase
            .from('uploaded_files')
            .update(newFileEntry)
            .eq('id', primaryId);

          if (currentFiles.length > 1) {
            const duplicateIds = currentFiles.slice(1).map(f => f.id);
            await supabase
              .from('uploaded_files')
              .delete()
              .in('id', duplicateIds);
            console.log(`[Client Reconcile] Purged ${duplicateIds.length} duplicate entries for ${fileName}`);
          }
          console.log(`[Client Reconcile] Successfully updated ${fileName} with ${normalizedRows.length} units!`);
        } else {
          await supabase
            .from('uploaded_files')
            .insert([newFileEntry]);
          console.log(`[Client Reconcile] Successfully created ${fileName} with ${normalizedRows.length} units!`);
        }

        results.push({ fileName, reconciled: true, units: normalizedRows.length, orders: orders.length, data: normalizedRows });
      } else {
        console.log(`[Client Reconcile] ${fileName} is accurate (Diff: ${diff} <= ${threshold}).`);
      }
    } catch (err) {
      console.warn(`[Client Reconcile] Error auditing past day:`, err.message);
    }
  }

  return results;
}
