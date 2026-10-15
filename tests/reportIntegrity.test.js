import test from 'node:test';
import assert from 'node:assert/strict';
import { syncReportIdentity, selectSalesReports, uniqueSalesItems, saveSyncReport } from '../src/sync/reportIntegrity.js';

function database(initial = []) {
  const rows = new Map(initial.map(r => [r.id, structuredClone(r)]));
  const client = { rows, from() {
    let operation = 'read', payload, filters = [], one = false;
    const q = {
      select() { return q; }, single() { one = true; return q; },
      in(k,v) { filters.push(r => v.includes(r[k])); return q; },
      eq(k,v) { filters.push(r => r[k] === v); return q; },
      neq(k,v) { filters.push(r => r[k] !== v); return q; },
      like(k,v) { filters.push(r => r[k].startsWith(v.replace('%',''))); return q; },
      lte(k,v) { filters.push(r => Date.parse(r[k]) <= Date.parse(v)); return q; },
      or(v) { const time = v.split('upload_date.lte.')[1]; filters.push(r => r.name.startsWith('[REALTIME_SYNC]') || Date.parse(r.upload_date) <= Date.parse(time)); return q; },
      upsert(value, opts) { assert.deepEqual(opts, {onConflict:'id',ignoreDuplicates:true}); operation='insert'; payload=value; return q; },
      update(value) { operation='update'; payload=value; return q; },
      async throwOnError() {
        // Interleave concurrent requests at every DB roundtrip.
        await Promise.resolve();
        if (operation === 'insert' && !rows.has(payload.id)) rows.set(payload.id, structuredClone(payload));
        const found = [...rows.values()].filter(r => filters.every(fn => fn(r)));
        if (operation === 'update') for (const row of found) rows.set(row.id, {...row,...structuredClone(payload)});
        return {data: structuredClone(one ? found[0] : found)};
      }
    }; return q;
  }};
  return client;
}
const live = '[REALTIME_SYNC] 14 Oct 2026', daily = '[DAILY_SYNC] 14 Oct 2026';
const item = (id, price = 10) => ({orderCode:'order',orderItemCode:id,itemSku:'same-sku',priceVal:price});
const snapshot = (name, rows = [item('one')]) => ({name,data:rows});
const active = db => [...db.rows.values()].filter(r => !r.name.startsWith('[CONFIG]'));

test('both report types and unpadded dates share the same valid primary key', () => {
  assert.equal(syncReportIdentity(live).id, '00000000-0000-5000-8000-000020261014');
  assert.equal(syncReportIdentity(live).id,syncReportIdentity(daily).id);
  assert.equal(syncReportIdentity('[DAILY_SYNC] 1 Jan 2027').id,syncReportIdentity('[REALTIME_SYNC] 01 Jan 2027').id);
  assert.equal(syncReportIdentity('[DAILY_SYNC] 31 Feb 2026'),null);
});
test('two concurrent first saves create one report; later snapshot wins', async () => {
  const db=database();
  await Promise.all([saveSyncReport(db,snapshot(live),'2026-10-14T10:00:00Z'),saveSyncReport(db,snapshot(live,[item('two')]),'2026-10-14T11:00:00Z')]);
  assert.equal(active(db).length,1); assert.equal(active(db)[0].data[0].orderItemCode,'two');
  await saveSyncReport(db,snapshot(live),'2026-10-14T09:00:00Z');
  assert.equal(active(db)[0].data[0].orderItemCode,'two');
});
test('midnight finalization and a late realtime writer cannot double or downgrade sales', async () => {
  const db=database();
  await Promise.all([saveSyncReport(db,snapshot(daily,[item('one'),item('two')]),'2026-10-14T18:31:00Z'),saveSyncReport(db,snapshot(live),'2026-10-14T18:32:00Z')]);
  assert.equal(active(db).length,1); assert.equal(active(db)[0].name,daily); assert.equal(active(db)[0].record_count,2);
});
test('legacy daily and realtime copies are preserved as recovery archives', async () => {
  const old=[{id:'old-live',...snapshot(live),upload_date:'2026-10-14T18:20:00Z'}, {id:'old-daily',...snapshot(daily,[item('one'),item('two')]),upload_date:'2026-10-14T18:31:00Z'}];
  const db=database(old);
  await saveSyncReport(db,snapshot(live),'2026-10-14T19:00:00Z');
  assert.equal(active(db).length,1); assert.equal(active(db)[0].name,daily);
  assert.deepEqual(db.rows.get('old-daily').data,old[1].data);
  assert.ok(db.rows.get('old-daily').name.startsWith('[CONFIG]'));
});
test('empty snapshots fail before touching saved records', async () => {
  const db=database(); await saveSyncReport(db,snapshot(daily),'2026-10-14T19:00:00Z');
  await assert.rejects(saveSyncReport(db,snapshot(daily,[]),'2026-10-14T20:00:00Z'),/empty/);
  assert.equal(active(db)[0].record_count,1);
});
test('display prefers finalized report regardless of a newer live upload', () => {
  const files=[{id:'live',name:live,upload_date:'2026-10-15T10:00:00Z'},{id:'daily',name:daily,upload_date:'2026-10-15T01:00:00Z'},{id:'next',name:'[REALTIME_SYNC] 15 Oct 2026'}, {id:'config',name:'[CONFIG] recovery'}];
  assert.deepEqual(selectSalesReports(files).map(f=>f.id),['daily','next']);
});
test('item-level dedup preserves separate same-SKU units and rows without IDs', () => {
  const rows=[item('one'),item('one'),item('two'),{itemSku:'same-sku'},{itemSku:'same-sku'}];
  assert.equal(uniqueSalesItems(rows).length,4);
});
