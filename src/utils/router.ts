export type AppRoute = 'home' | 'play';

/**
 * Returns the base URL configured for the app (e.g. '/guess-the-country/' or '/').
 */
export function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Determines the active route ('home' or 'play') based on the current window location.
 */
export function getCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return 'home';

  const pathname = window.location.pathname;
  const hash = (window.location.hash || '').toLowerCase();
  const search = window.location.search || '';

  // 1. Check for query parameter from 404.html redirect (e.g., ?p=/play or ?route=play)
  if (search.includes('p=/play') || search.includes('p=play') || search.includes('route=play')) {
    return 'play';
  }

  // 2. Check for hash-based navigation fallback (e.g., #/play or #play)
  if (hash === '#/play' || hash === '#play' || hash.startsWith('#/play')) {
    return 'play';
  }

  // 3. Check pathname routing
  const normalizedPath = pathname.replace(/\/$/, '');
  if (normalizedPath.endsWith('/play') || normalizedPath === '/play') {
    return 'play';
  }

  return 'home';
}

/**
 * Formats the full URL path for a given route.
 */
export function getPathForRoute(route: AppRoute): string {
  const base = getBaseUrl().replace(/\/$/, '');
  if (route === 'play') {
    return `${base}/play`;
  }
  return base.length > 0 ? `${base}/` : '/';
}

/**
 * Pushes or replaces the browser history state for the specified route.
 */
export function navigateToRoute(route: AppRoute, replace = false): void {
  if (typeof window === 'undefined') return;

  const currentRoute = getCurrentRoute();
  const targetPath = getPathForRoute(route);

  // If already at the target route, don't create duplicate history entries
  if (currentRoute === route && window.location.pathname === targetPath) {
    return;
  }

  if (replace) {
    window.history.replaceState({ route }, '', targetPath);
  } else {
    window.history.pushState({ route }, '', targetPath);
  }
}
