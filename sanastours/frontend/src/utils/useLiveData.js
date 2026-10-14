import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Data that keeps itself current.
 *
 * Screens that show what somebody else is doing - the office watching a
 * driver's progress, a driver watching for an assignment - fetched once on
 * mount, so whatever changed afterwards never arrived. This refetches on a
 * timer and whenever the tab is brought back into view, which is when a stale
 * screen actually misleads somebody.
 *
 * Polling rather than a live connection on purpose: these are small reads, a
 * tour changes a handful of times a day, and it asks nothing of the server.
 *
 * @param loader an async function returning the data
 * @param deps   re-run and restart polling when these change
 * @param intervalMs how often to refetch while the tab is visible
 */
export const useLiveData = (loader, deps = [], intervalMs = 30000) => {
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
      console.error('Could not refresh', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = () => { if (active && !document.hidden) refresh(); };

    refresh();
    const timer = setInterval(run, intervalMs);
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

export default useLiveData;
