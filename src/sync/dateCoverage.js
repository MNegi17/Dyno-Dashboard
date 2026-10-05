/** Match explicit sales dates, ignoring spreadsheet part numbers. */
export function doesManualFileCoverDate(fileName, day, month0, year, uploadDate) {
  const fn = (fileName || '').toLowerCase().replace(/\s*\(part \d+\/\d+\)/g, '').trim();
  if (/^\[(realtime_sync|daily_sync|inventory|launch_dates|return|config)\]/.test(fn) || /cancel|return|fy\d+/.test(fn)) return false;
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const month = months[month0];
  if (!month) return false;
  const monthPattern = '(?<![a-z])(?:' + month + '|' + month.slice(0, 3) + ')(?![a-z])';
  if (!new RegExp(monthPattern).test(fn)) return false;
  const years = [...fn.matchAll(/(?<!\d)(?:19|20)\d{2}(?!\d)/g)].map(m => Number(m[0]));
  let fileYear = new Set(years).size === 1 ? years[0] : null;
  if (!years.length && uploadDate) fileYear = new Date(new Date(uploadDate).getTime() + 19800000).getUTCFullYear();
  if (fileYear !== year) return false;
  if (fn.startsWith('[reco]')) return true;
  const match = fn.match(new RegExp('(?<!\\d)\\(?(\\d{1,2})(?:\\s*(?:-|_|to)\\s*(\\d{1,2}))?\\)?[\\s_-]*' + monthPattern));
  if (!match) return false;
  const first = Number(match[1]), last = Number(match[2] || match[1]);
  return first >= 1 && first <= day && day <= last && last <= 31;
}
