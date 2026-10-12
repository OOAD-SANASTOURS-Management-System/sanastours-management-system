import { useCallback, useEffect, useRef, useState } from 'react';

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

/** The ordered steps of a tour, as the API and both driver screens use them. */
export const TOUR_STEPS = [
  'Tour Started',
  'Dropped at Destination',
  'Return Journey Started',
  'Tour Ended'
];

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

/** The next step a driver has not yet recorded, or null when the tour is done. */
export const nextStepFor = (updates) =>
  TOUR_STEPS.find((step) => !(updates || []).some((u) => u.stepName === step)) || null;

/** dd Mmm yyyy, or a dash when there is no date. */
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

export const bookingRef = (booking) => `BK-${String(booking?.bookingId ?? '').padStart(3, '0')}`;

/**
 * Data that keeps itself current.
 *
 * The driver screens fetched once on mount, so a tour assigned, confirmed or
 * cancelled by the office while the driver had the page open never appeared -
 * the driver had to know to reload. This refetches on a timer and whenever
 * they come back to the tab, which is when a stale screen actually misleads
 * somebody. Polling is enough here: these are small reads, a tour changes a
 * handful of times a day, and it needs nothing of the server.
 *
 * @param loader an async function returning the data
 * @param deps   re-run and restart polling when these change
 */
export const useLiveData = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Held in a ref so a new function identity on every render does not restart
  // the timer; the effect depends on `deps` alone.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refresh = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setUpdatedAt(new Date());
    } catch (e) {
      console.error('Could not refresh driver data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = () => { if (active && !document.hidden) refresh(); };

    refresh();
    const timer = setInterval(run, 30000);
    // Coming back to the tab is the moment a stale screen matters most.
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, updatedAt, refresh };
};
