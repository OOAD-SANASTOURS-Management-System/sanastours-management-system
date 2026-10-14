/** Small helpers shared by the customer and admin feedback screens. */

const pad = (n) => String(n).padStart(3, '0');

export const feedbackRef = (f) => `FB-${pad(f.feedbackId)}`;
export const bookingRef = (id) => `BK-${pad(id)}`;

const fmt = (value, opts) => new Date(value).toLocaleDateString('en-GB', opts);

/** 06 Jun 2026 */
export const formatDate = (value) =>
  value ? fmt(value, { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/** 15 Sep to 19 Sep 2026 (the year is written once, when both dates share it). */
export const formatRange = (start, end) => {
  if (!start && !end) return '-';
  if (!end) return formatDate(start);
  if (!start) return formatDate(end);
  const sameYear = new Date(start).getFullYear() === new Date(end).getFullYear();
  return sameYear
    ? `${fmt(start, { day: '2-digit', month: 'short' })} to ${formatDate(end)}`
    : `${formatDate(start)} to ${formatDate(end)}`;
};

/** The tours a customer can still rate: Completed, with no feedback yet. */
export const awaitingFeedback = (bookings, feedback) => {
  const rated = new Set((feedback || []).map((f) => f.booking?.bookingId));
  return (bookings || []).filter(
    (b) => String(b.bookingStatus || '').toLowerCase() === 'completed' && !rated.has(b.bookingId)
  );
};

export const average = (list) =>
  list.length ? list.reduce((sum, f) => sum + (f.rating || 0), 0) / list.length : 0;

export const MAX_COMMENT = 500;
