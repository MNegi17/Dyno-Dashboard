// The same date-derived UUID is used by every JS and Python sync writer.
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function syncReportIdentity(name) {
  const match = /^\[(DAILY|REALTIME)_SYNC\]\s+(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(name || '');
  if (!match) return null;
  const month = months.findIndex(m => m.toLowerCase() === match[3].toLowerCase());
  const day = Number(match[2]), year = Number(match[4]);
  const date = new Date(Date.UTC(year, month, day));
  if (month < 0 || date.getUTCDate() !== day || date.getUTCMonth() !== month) return null;
  const key = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const label = `${String(day).padStart(2, '0')} ${months[month]} ${year}`;
  return { id: `00000000-0000-5000-8000-0000${key}`, key, label, finalized: match[1] === 'DAILY',
    names: ['DAILY', 'REALTIME'].flatMap(kind => [...new Set([`[${kind}_SYNC] ${label}`, `[${kind}_SYNC] ${day} ${months[month]} ${year}`])]) };
}

export function selectSalesReports(files) {
  const winners = new Map();
  for (const file of files) {
    const identity = syncReportIdentity(file.name);
    if (!identity) continue;
    const previous = winners.get(identity.key);
    const rank = f => [syncReportIdentity(f.name).finalized ? 1 : 0, Date.parse(f.upload_date || f.uploadDate) || 0, String(f.id)];
    const a = rank(file), b = previous && rank(previous);
    if (!previous || a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])))) winners.set(identity.key, file);
  }
  return files.filter(file => {
    const identity = syncReportIdentity(file.name);
    return !String(file.name).startsWith('[CONFIG]') && (!identity || winners.get(identity.key) === file);
  });
}

// Never deduplicate on SKU: separate items of the same SKU are legitimate sales.
export function uniqueSalesItems(rows) {
  const seen = new Set();
  return rows.filter(row => {
    if (!row.orderCode || !row.orderItemCode || row.orderItemCode === 'undefined') return true;
    const key = JSON.stringify([row.orderCode, row.orderItemCode]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function saveSyncReport(client, entry, snapshotStartedAt) {
  const identity = syncReportIdentity(entry.name);
  if (!identity) throw new Error('Invalid sync report date');
  const rows = uniqueSalesItems(entry.data);
  if (!rows.length) throw new Error('Refusing to replace saved sales with an empty snapshot');
  const payload = { ...entry, id: identity.id, data: rows, record_count: rows.length, upload_date: snapshotStartedAt };
  const { data: existing } = await client.from('uploaded_files').select('*').in('name', identity.names).throwOnError();
  const seed = selectSalesReports(existing || [])[0] || payload;
  // Primary-key conflict handling makes first creation safe across processes/tabs.
  await client.from('uploaded_files').upsert({ ...seed, id: identity.id }, { onConflict: 'id', ignoreDuplicates: true }).throwOnError();
  // An older deployed writer may have archived this reserved ID during rollout.
  await client.from('uploaded_files').update({ ...seed, id: identity.id }).eq('id', identity.id).like('name', '[CONFIG] duplicate archive%').throwOnError();
  if (syncReportIdentity(seed.name).finalized) {
    await client.from('uploaded_files').update({ ...seed, id: identity.id }).eq('id', identity.id).like('name', '[REALTIME_SYNC]%').throwOnError();
  }
  let update = client.from('uploaded_files').update(payload).eq('id', identity.id);
  if (identity.finalized) {
    update = update.or(`name.like.[REALTIME_SYNC]%,upload_date.lte.${snapshotStartedAt}`);
  } else {
    update = update.like('name', '[REALTIME_SYNC]%').lte('upload_date', snapshotStartedAt);
  }
  await update.throwOnError();
  // Archive only after a canonical copy exists; preserve all original data for recovery.
  const { data: duplicates } = await client.from('uploaded_files').select('id,name,upload_date').in('name', identity.names).neq('id', identity.id).throwOnError();
  const { data: canonical } = await client.from('uploaded_files').select('*').eq('id', identity.id).single().throwOnError();
  for (const duplicate of duplicates || []) {
    const final = syncReportIdentity(duplicate.name).finalized;
    const canonicalFinal = syncReportIdentity(canonical.name).finalized;
    if ((final && !canonicalFinal) || (final === canonicalFinal && Date.parse(duplicate.upload_date) > Date.parse(canonical.upload_date))) continue;
    await client.from('uploaded_files').update({ name: `[CONFIG] duplicate archive ${duplicate.name} ${duplicate.id}` })
      .eq('id', duplicate.id).eq('upload_date', duplicate.upload_date).throwOnError();
  }
  return canonical;
}
