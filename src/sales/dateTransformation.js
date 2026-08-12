const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Transform date into exact Dyno schema fields in Asia/Kolkata timezone:
 * - formattedDate: "12 Aug" (dd mmm)
 * - monthName: "August"
 * - fy: "2026" (Indian FY logic: Month >= April ? Year + 1 : Year)
 */
export function transformDate(input) {
  let date;

  if (typeof input === 'number') {
    date = new Date(input);
  } else if (typeof input === 'string') {
    date = new Date(input);
  } else if (input instanceof Date) {
    date = input;
  } else {
    date = new Date();
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Convert UTC timestamp to IST (+5:30)
  const utcMs = date.getTime();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcMs + istOffsetMs);

  const day = istDate.getUTCDate();
  const monthIdx = istDate.getUTCMonth();
  const year = istDate.getUTCFullYear();

  const formattedDay = String(day).padStart(2, '0');
  const monthName = MONTH_NAMES[monthIdx];
  const formattedDate = `${formattedDay} ${monthName}`; // e.g. "12 August"

  // Indian Fiscal Year start year logic: April (idx 3) to March (idx 2)
  const fyYear = monthIdx >= 3 ? year : year - 1;
  const fy = String(fyYear);

  return {
    formattedDate,
    monthName,
    fy,
    parsedDate: date.toISOString()
  };
}
