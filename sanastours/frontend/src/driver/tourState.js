import { TOUR_STEPS, nextStepFor } from '../utils/tourSteps';
import { useLiveData } from '../utils/useLiveData';

// The step vocabulary and the refreshing loader are shared with the admin
// screens, so the office and the driver can never show a tour at different
// stages. Re-exported here so the driver screens keep one import.
export { TOUR_STEPS, nextStepFor, useLiveData };

/**
 * Shared state rules for the driver screens.
 *
 * The dashboard and My Tours each had their own copy of "which tours count as
 * upcoming", and both listed the three statuses they expected by name. A
 * booking in any other state - most importantly Pending, which is what a
 * booking is while the office is still arranging it - matched none of them and
 * so appeared on neither screen, even though a driver had been assigned to it.
 * Classifying in one place means the two screens cannot disagree, and that an
 * unfamiliar status shows up somewhere rather than vanishing.
 */

/**
 * Which list a tour belongs in.
 *
 * Anything not finished, running or called off is upcoming - including
 * statuses this code has never heard of. A driver seeing a tour they do not
 * have to drive is a small annoyance; not seeing one they do is a missed trip.
 */
export const classifyTour = (booking) => {
  const status = String(booking?.bookingStatus || '').toLowerCase();
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'ongoing') return 'ongoing';
  return 'upcoming';
};

/** Group a driver's bookings into the four lists, newest trips first. */
export const groupTours = (bookings) => {
  const groups = { upcoming: [], ongoing: [], completed: [], cancelled: [] };
  (bookings || []).forEach((b) => groups[classifyTour(b)].push(b));

  // Upcoming reads best soonest-first; the rest most-recent-first.
  const byDate = (dir) => (a, b) =>
    dir * (new Date(a.travelStartDate || 0) - new Date(b.travelStartDate || 0));
  groups.upcoming.sort(byDate(1));
  groups.ongoing.sort(byDate(1));
  groups.completed.sort(byDate(-1));
  groups.cancelled.sort(byDate(-1));
  return groups;
};

/**
 * The office has assigned this tour but has not confirmed it yet, so the
 * driver should know the details may still change.
 */
export const isUnconfirmed = (booking) =>
  String(booking?.bookingStatus || '').toLowerCase() === 'pending';

/** A cancelled tour must not accept new trip updates. */
export const isCancelled = (booking) => classifyTour(booking) === 'cancelled';

/** dd Mmm yyyy, or a dash when there is no date. */
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

export const bookingRef = (booking) => `BK-${String(booking?.bookingId ?? '').padStart(3, '0')}`;
