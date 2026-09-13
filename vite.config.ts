import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

function getAppVersion(): string {
  if (process.env.VITE_APP_VERSION) {
    return process.env.VITE_APP_VERSION;
  }
  // Baseline commit count starting point for beta 0.1
  const BASE_COMMITS = 55;
  try {
    const gitCount = parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10);
    if (!isNaN(gitCount)) {
      const decimal = Math.max(1, gitCount - BASE_COMMITS + 1);
      return `beta 0.${decimal}`;
    }
  } catch {
    // Fallback if git is not available
  }
  return 'beta 0.1';
}

const appVersion = getAppVersion();

// https://vite.dev/config/
export default defineConfig({
  base: '/guess-the-country/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 3000,
    open: false,
  },
});
