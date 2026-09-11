import { Country, GameScore, UserSettings, GameMode, TimerMode } from '../types/game';
import BUNDLED_COUNTRIES from '../data/countriesData.json';

export const STORAGE_KEYS = {
  SCORE: 'guessTheCountry.score',
  SETTINGS: 'guessTheCountry.settings',
  SOLVED_COUNTRIES: 'guessTheCountry.solvedCountries',
  GLOBE_MISTAKES: 'guessTheCountry.globeMistakes',
};

export function getFlagUrl(alpha2: string): string {
  if (!alpha2) return '';
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}flags/${alpha2.toLowerCase()}.png`;
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      let mode: GameMode = 'globe';
      if (parsed.gameMode === 'flag-to-name' || parsed.gameMode === 'name-to-flag') {
        mode = parsed.gameMode;
      } else if (parsed.questionType === 'name-to-flag') {
        mode = 'name-to-flag';
      } else if (parsed.gameMode === 'globe') {
        mode = 'globe';
      }

      let timer: TimerMode = 'relaxed';
      if (parsed.timerMode === 'timed' || parsed.timerMode === 'per-question' || parsed.timerMode === 'blitz') {
        timer = 'timed';
      }

      return {
        soundEnabled: parsed.soundEnabled ?? true,
        gameMode: mode,
        timerMode: timer,
        theme: parsed.theme || 'deep-space',
        continentFilter: parsed.continentFilter || 'all',
        adminTestMode: parsed.adminTestMode ?? false,
      };
    }
  } catch {
    // fallback
  }

  return {
    soundEnabled: true,
    gameMode: 'globe',
    timerMode: 'relaxed',
    theme: 'deep-space',
    continentFilter: 'all',
    adminTestMode: false,
  };
}

export function loadGlobeMistakes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GLOBE_MISTAKES);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveGlobeMistakes(mistakes: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GLOBE_MISTAKES, String(mistakes));
  } catch {
    // ignore
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadScore(): GameScore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCORE);
    if (!raw) return { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
    const parsed = JSON.parse(raw);
    return {
      right: Number(parsed.right) || 0,
      wrong: Number(parsed.wrong) || 0,
      total: Number(parsed.total) || 0,
      currentStreak: Number(parsed.currentStreak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
    };
  } catch {
    return { right: 0, wrong: 0, total: 0, currentStreak: 0, bestStreak: 0 };
  }
}

export function saveScore(score: GameScore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCORE, JSON.stringify(score));
  } catch {
    // ignore
  }
}

export function loadSolvedCountryAlphas(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SOLVED_COUNTRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveSolvedCountryAlphas(alphas: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SOLVED_COUNTRIES, JSON.stringify(alphas));
  } catch {
    // ignore
  }
}

/**
 * Completely clears active game progress (scores, solved countries, mistakes)
 * so a completed session never persists or duplicates on refresh.
 */
export function clearGameProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCORE);
    localStorage.removeItem(STORAGE_KEYS.SOLVED_COUNTRIES);
    localStorage.removeItem(STORAGE_KEYS.GLOBE_MISTAKES);
  } catch {
    // ignore
  }
}

export function getLocalDataInfo(): { count: number; downloadedAt: string | null } {
  return {
    count: (BUNDLED_COUNTRIES as Country[]).length,
    downloadedAt: 'Offline Ready (100% Local)',
  };
}

export async function loadCountries(): Promise<{ countries: Country[]; source: 'bundled' }> {
  const list = (BUNDLED_COUNTRIES as Country[]).map((c) => ({
    ...c,
    flagUrl: getFlagUrl(c.alpha2),
  }));
  return { countries: list, source: 'bundled' };
}

export async function forceRefreshLocalData(): Promise<Country[]> {
  return (BUNDLED_COUNTRIES as Country[]).map((c) => ({
    ...c,
    flagUrl: getFlagUrl(c.alpha2),
  }));
}
