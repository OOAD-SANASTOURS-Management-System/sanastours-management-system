import React from 'react';

/**
 * The one status badge.
 *
 * Fix 8.12: six copies of this component existed - this one plus an inlined
 * version in Dashboard, CustomerDashboard, MyBookings, MyPayments, MyInquiries
 * and MyQuotations - each with a different colour map, so the same status
 * rendered in different colours on different screens, and anything they did not
 * list fell through to grey-on-grey.
 *
 * Statuses are grouped by what they mean, so a value that is "good" on one
 * screen cannot be a different colour on another:
 *   green  - settled or complete
 *   blue   - in progress right now
 *   orange - waiting on somebody
 *   grey   - inactive or closed without action
 *   red    - cancelled, rejected or needing attention
 */

const GREEN = 'bg-green-600 text-white';
const BLUE = 'bg-[#1d4ed8] text-white';
const ORANGE = 'bg-[#f97316] text-white';
const GREY = 'bg-gray-500 text-white';
const RED = 'bg-red-600 text-white';

const STATUS_STYLES = {
  // settled / complete
  active: GREEN,
  confirmed: GREEN,
  completed: GREEN,
  paid: GREEN,
  verified: GREEN,
  available: GREEN,
  accepted: GREEN,
  // An inquiry that has been answered with a quotation. 'quoted' is the older
  // spelling, kept for rows written before the change.
  'quotation sent': GREEN,
  quoted: GREEN,
  booked: GREEN,
  approved: GREEN,

  // happening now
  ongoing: BLUE,
  assigned: BLUE,
  partial: BLUE,

  // waiting on somebody
  pending: ORANGE,
  new: ORANGE,
  sent: ORANGE,
  'sent to customer': ORANGE,
  reviewing: ORANGE,
  allocated: ORANGE,
  scheduled: ORANGE,

  // inactive / closed quietly
  draft: GREY,
  inactive: GREY,
  expired: GREY,
  suspended: GREY,
  refunded: GREY,

  // needs attention
  cancelled: RED,
  rejected: RED,
  failed: RED,
  deleted: RED,
  maintenance: RED
};

/**
 * Statuses that read differently to a customer than to the office.
 *
 * "Sent to Customer" describes what the office did; to the person reading it,
 * the useful fact is that the ball is in their court. Only the wording
 * changes - the stored status, the colour and every rule that reads it stay
 * exactly as they are.
 */
export const CUSTOMER_LABELS = {
  'sent to customer': 'Awaiting your response',
  sent: 'Awaiting your response'
};

/** The customer-facing wording for a status, or the status itself. */
export const customerLabel = (status) =>
  CUSTOMER_LABELS[String(status || '').toLowerCase()] || status;

/**
 * @param audience 'customer' re-words the few statuses written from the
 *                 office's point of view. Anything else shows them as stored.
 */
/**
 * Payment statuses, worded for the customer rather than the office.
 *
 * Kept apart from CUSTOMER_LABELS because "Rejected" means something
 * different on a quotation than on a payment, and My Quotations uses that
 * map: folding them together would have a rejected quotation reading
 * "Payment rejected".
 */
export const CUSTOMER_PAYMENT_LABELS = {
  paid: 'Payment confirmed',
  rejected: 'Payment rejected',
  pending: 'Awaiting confirmation'
};

const StatusBadge = ({ status, fallback = '', audience }) => {
  const stored = status || fallback;
  if (!stored) return null;
  const key = String(stored).toLowerCase();
  const label = audience === 'customer-payment' ? (CUSTOMER_PAYMENT_LABELS[key] || stored)
              : audience === 'customer' ? customerLabel(stored)
              : stored;
  // Colour always comes from the stored status, so the same state is the same
  // colour on both sides of the app.
  const style = STATUS_STYLES[key] || 'bg-gray-200 text-gray-800';
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
