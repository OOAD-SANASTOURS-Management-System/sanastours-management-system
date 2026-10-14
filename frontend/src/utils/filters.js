/**
 * Shared list filtering.
 *
 * Fixes 8.1 and 8.2: every list screen rendered a "Search ..." box and most
 * rendered a Status dropdown, but none of them were wired to anything - 13
 * dead search boxes and 8 dead dropdowns. These helpers give them one
 * behaviour instead of thirteen copies of it.
 */

/** Everything the row can be matched on, flattened to lower-case strings. */
const valuesOf = (row, fields) =>
  fields
    .map((field) => (typeof field === 'function' ? field(row) : row[field]))
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).toLowerCase());

export const matchesQuery = (row, query, fields) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return valuesOf(row, fields).some((v) => v.includes(q));
};

export const matchesStatus = (row, status, statusField) => {
  if (!status) return true;
  const value = typeof statusField === 'function' ? statusField(row) : row[statusField];
  return String(value || '').toLowerCase() === String(status).toLowerCase();
};

/**
 * @param rows      the full list
 * @param options   { query, fields, status, statusField }
 *                  `fields` may hold key names or accessor functions.
 */
export const applyFilters = (rows, { query, fields = [], status, statusField } = {}) =>
  (rows || []).filter(
    (row) => matchesQuery(row, query, fields) && matchesStatus(row, status, statusField)
  );

/** Shared date rules, so the forms stop the mistakes the server now rejects. */
export const checkTravelDates = (start, end, { mustBeFuture = true } = {}) => {
  if (!start || !end) return 'Please choose both a travel start date and an end date.';
  if (new Date(end) < new Date(start)) return 'The travel end date cannot be before the start date.';
  if (mustBeFuture) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(start) < today) return 'The travel start date cannot be in the past.';
  }
  return null;
};

/** Today as yyyy-mm-dd, for the `min` attribute on date inputs. */
export const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The last day of a tour: start date + (durationDays - 1), so a 5-day package
 * beginning on the 15th ends on the 19th.
 *
 * Done in UTC on purpose. Building a Date from a yyyy-mm-dd string and reading
 * it back through toISOString() shifts the day backwards everywhere east of
 * Greenwich - in Sri Lanka (UTC+5:30) midnight local is 18:30 the day before -
 * which would have quietly produced an end date one day early.
 */
export const endDateFor = (startIso, durationDays) => {
  const days = parseInt(durationDays);
  if (!startIso || !days || days < 1) return '';
  const [y, m, d] = startIso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const end = new Date(Date.UTC(y, m - 1, d));
  end.setUTCDate(end.getUTCDate() + (days - 1));
  return end.toISOString().slice(0, 10);
};
