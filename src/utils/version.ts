/**
 * Application version string dynamically injected by Vite at build time.
 * Automatically tracks git commit count starting at beta 0.1.
 */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : 'beta 0.1';
