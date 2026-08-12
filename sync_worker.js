/**
 * Standalone 24/7 Real-Time Sync Worker for DynoDashboard
 * 
 * Runs in background independently from browser.
 * Ingests live Uniware orders from 12:01 AM IST to present,
 * applies dynamic pricing, enriches catalog, and saves to Supabase.
 * 
 * Usage:
 *   node sync_worker.js         (runs continuous 5-min loop)
 *   node sync_worker.js --once  (runs single sync execution)
 */

import { createClient } from '@supabase/supabase-js';
import { searchSaleOrders, fetchSaleOrdersWithConcurrency } from './src/uniware/ordersClient.js';
import { transformRealtimeOrders } from './src/sales/realtimeTransform.js';
import { getTodayStartIST, getTodayRealtimeFileName } from './src/sync/supabaseSync.js';

const SUPABASE_URL = 'https://vvruwxrhwppozvrprcix.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wEN47XUvThFsrpIZcPX35A_xkPbdJQ1';
const ADMIN_EMAIL = 'manannegi17@gmail.com';
const ADMIN_PASSWORD = 'Manan@dyno@17';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runWorkerSync() {
  const timestamp = new Date().toISOString();
  console.log(`\n========================================`);
  console.log(`[${timestamp}] Starting Uniware Real-Time Sync...`);

  // 1. Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  if (authError || !authData?.session) {
    console.error('Supabase authentication failed:', authError?.message);
    return;
  }

  // 2. Rolling window starting at 12:01 AM IST
  const fromDate = getTodayStartIST();
  const fileName = getTodayRealtimeFileName();
  const toDate = new Date(Date.now() - 60000).toISOString();

  console.log(`Ingesting orders from ${fromDate} to ${toDate} (Target: ${fileName})...`);

  // 3. Search orders
  const searchResult = await searchSaleOrders({ fromDate, toDate });
  const orderCodes = searchResult.orderCodes || [];
  console.log(`Discovered ${orderCodes.length} order(s) in Uniware`);

  if (orderCodes.length === 0) {
    console.log('No orders found in current window.');
    return;
  }

  // 4. Fetch full order details with concurrency
  const fetchResult = await fetchSaleOrdersWithConcurrency(orderCodes, 5);
  const orders = fetchResult.orders || [];

  // 5. Transform orders with dynamic pricing & item directory lookup
  const normalizedRows = await transformRealtimeOrders(orders);
  console.log(`Transformed into ${normalizedRows.length} normalized sales rows`);

  // 6. Save/Upsert to Supabase uploaded_files
  const newFileEntry = {
    name: fileName,
    upload_date: new Date().toISOString(),
    record_count: normalizedRows.length,
    data: normalizedRows
  };

  const { data: existing } = await supabase
    .from('uploaded_files')
    .select('id')
    .eq('name', fileName);

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from('uploaded_files')
      .update(newFileEntry)
      .eq('id', existing[0].id);

    if (updateError) {
      console.error('Failed to update Supabase record:', updateError.message);
    } else {
      console.log(`Successfully updated '${fileName}' (${normalizedRows.length} rows) in Supabase!`);
    }
  } else {
    const { error: insertError } = await supabase
      .from('uploaded_files')
      .insert([newFileEntry]);

    if (insertError) {
      console.error('Failed to insert Supabase record:', insertError.message);
    } else {
      console.log(`Successfully created '${fileName}' (${normalizedRows.length} rows) in Supabase!`);
    }
  }
}

// CLI Execution Mode
const isOnce = process.argv.includes('--once');

if (isOnce) {
  runWorkerSync().then(() => process.exit(0));
} else {
  console.log('Dyno 24/7 Background Sync Worker Started (Every 5 minutes)');
  runWorkerSync();
  setInterval(runWorkerSync, 5 * 60 * 1000);
}
