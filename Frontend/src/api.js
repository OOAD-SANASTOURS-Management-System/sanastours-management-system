/**
 * One place for the API's address and for what happens when a session ends.
 *
 * Fix 6.14: `http://localhost:8081` was hard-coded in all 86 fetch calls, so
 * the build could not be pointed at anything else. Set VITE_API_BASE_URL in a
 * .env file to override it.
 *
 * Fix 3.9: nothing handled an expired token. Every page only checked
 * `if (res.ok)`, so a stale session rendered as empty tables reading "No
 * records found" rather than sending the user back to sign in. The backend now
 * answers 401 for an expired or invalid token (and only for that), so a single
 * wrapper around fetch can clear the session and return to the login screen.
 */

export const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8081';

let handlingExpiry = false;

export const handleSessionExpired = () => {
  if (handlingExpiry) return;
  handlingExpiry = true;
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  } catch {
    // Storage can be unavailable in private windows; the reload still works.
  }
  alert('Your session has expired. Please sign in again.');
  window.location.href = '/';
};

/**
 * Install the session-expiry check once, around the global fetch. Doing it here
 * rather than at 86 call sites keeps every existing `fetch(...)` working while
 * giving them all the same behaviour on an expired token.
 */
export const installSessionGuard = () => {
  if (typeof window === 'undefined' || window.__sanasFetchPatched) return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    // Only react to our own API, and only to 401 - a 403 is a legitimate
    // "you may not do that", not a dead session.
    if (response.status === 401 && url.includes('/api/') && !url.includes('/api/auth/login')) {
      handleSessionExpired();
    }
    return response;
  };

  window.__sanasFetchPatched = true;
};
