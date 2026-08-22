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

/**
 * Execute real-time Uniware ingestion and persist to Supabase
 */
export async function syncRealtimeSalesToSupabase(options = {}) {
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

  // Upsert or replace existing [REALTIME_SYNC] entry in uploaded_files
  const { data: existingFiles } = await supabase
    .from('uploaded_files')
    .select('id')
    .eq('name', fileName);

  if (existingFiles && existingFiles.length > 0) {
    const id = existingFiles[0].id;
    await supabase
      .from('uploaded_files')
      .update({
        upload_date: newFileEntry.upload_date,
        record_count: newFileEntry.record_count,
        data: newFileEntry.data
      })
      .eq('id', id);
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
      item_type_size: String(r.item_type_size),
      mrp: r.mrp,
      enrichment_status: r.enrichmentStatus
    }));

    // Chunk upserts in batches of 100
    for (let i = 0; i < supabaseSalesRows.length; i += 100) {
      const chunk = supabaseSalesRows.slice(i, i + 100);
      await supabase
        .from('realtime_sales')
        .upsert(chunk, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[RealtimeSync] Note: realtime_sales table upsert skipped:', err.message);
  }

  const syncTimestamp = new Date();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('dyno_last_sync_time', syncTimestamp.toISOString());
  }

  return {
    success: true,
    ordersCount: orders.length,
    rowsCount: normalizedRows.length,
    rows: normalizedRows,
    timestamp: syncTimestamp
  };
}
