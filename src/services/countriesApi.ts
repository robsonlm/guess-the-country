import { Country, GameScore, UserSettings, GameMode, TimerMode, GameEdition } from '../types/game';
import BUNDLED_COUNTRIES from '../data/countriesData.json';
import BUNDLED_US_STATES from '../data/usStatesData.json';

export const STORAGE_KEYS = {
  SCORE: 'guessTheCountry.score',
  SETTINGS: 'guessTheCountry.settings',
  SOLVED_COUNTRIES: 'guessTheCountry.solvedCountries',
  GLOBE_MISTAKES: 'guessTheCountry.globeMistakes',
  US_SCORE: 'guessTheCountry.us_score',
  US_SOLVED_STATES: 'guessTheCountry.us_solvedCountries',
  US_GLOBE_MISTAKES: 'guessTheCountry.us_globeMistakes',
};

export function getFlagUrl(alpha2: string, quality: 'high' | 'low' = 'high'): string {
  if (!alpha2) return '';
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  if (alpha2.toUpperCase().startsWith('US-')) {
    const code = alpha2.slice(3).toLowerCase();
    const folder = quality === 'low' ? 'flags/us-states/low/' : 'flags/us-states/';
    return `${cleanBase}${folder}${code}.png`;
  }
  const folder = quality === 'low' ? 'flags/low/' : 'flags/';
  return `${cleanBase}${folder}${alpha2.toLowerCase()}.png`;
}

export function getLowResFlagUrl(alpha2: string): string {
  return getFlagUrl(alpha2, 'low');
}

export function getEarthTextureUrls(quality: 'high' | 'low' = 'high'): {
  blueMarbleUrl: string;
  topologyUrl: string;
  nightUrl: string;
} {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const folder = quality === 'low' ? 'textures/low/' : 'textures/';
  return {
    blueMarbleUrl: `${cleanBase}${folder}earth-blue-marble.jpg`,
    topologyUrl: `${cleanBase}${folder}earth-topology.png`,
    nightUrl: `${cleanBase}${folder}earth-night.jpg`,
  };
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
        edition: parsed.edition === 'us-states' ? 'us-states' : 'world',
        gameMode: mode,
        timerMode: timer,
        theme: parsed.theme || 'deep-space',
        continentFilter: parsed.continentFilter || 'all',
        usRegionFilter: parsed.usRegionFilter || 'all',
      };
    }
  } catch {
    // fallback
  }

  return {
    soundEnabled: true,
    edition: 'world',
    gameMode: 'globe',
    timerMode: 'relaxed',
    theme: 'deep-space',
    continentFilter: 'all',
    usRegionFilter: 'all',
  };
}

export function loadGlobeMistakes(edition: GameEdition = 'world'): number {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_GLOBE_MISTAKES : STORAGE_KEYS.GLOBE_MISTAKES;
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveGlobeMistakes(mistakes: number, edition: GameEdition = 'world'): void {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_GLOBE_MISTAKES : STORAGE_KEYS.GLOBE_MISTAKES;
    localStorage.setItem(key, String(mistakes));
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

export function loadScore(edition: GameEdition = 'world'): GameScore {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_SCORE : STORAGE_KEYS.SCORE;
    const raw = localStorage.getItem(key);
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

export function saveScore(score: GameScore, edition: GameEdition = 'world'): void {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_SCORE : STORAGE_KEYS.SCORE;
    localStorage.setItem(key, JSON.stringify(score));
  } catch {
    // ignore
  }
}

export function loadSolvedCountryAlphas(edition: GameEdition = 'world'): string[] {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_SOLVED_STATES : STORAGE_KEYS.SOLVED_COUNTRIES;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveSolvedCountryAlphas(alphas: string[], edition: GameEdition = 'world'): void {
  try {
    const key = edition === 'us-states' ? STORAGE_KEYS.US_SOLVED_STATES : STORAGE_KEYS.SOLVED_COUNTRIES;
    localStorage.setItem(key, JSON.stringify(alphas));
  } catch {
    // ignore
  }
}

/**
 * Completely clears active game progress (scores, solved countries, mistakes)
 * so a completed session never persists or duplicates on refresh.
 */
export function clearGameProgress(edition: GameEdition = 'world'): void {
  try {
    if (edition === 'us-states') {
      localStorage.removeItem(STORAGE_KEYS.US_SCORE);
      localStorage.removeItem(STORAGE_KEYS.US_SOLVED_STATES);
      localStorage.removeItem(STORAGE_KEYS.US_GLOBE_MISTAKES);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SCORE);
      localStorage.removeItem(STORAGE_KEYS.SOLVED_COUNTRIES);
      localStorage.removeItem(STORAGE_KEYS.GLOBE_MISTAKES);
    }
  } catch {
    // ignore
  }
}

export function getLocalDataInfo(edition: GameEdition = 'world'): { count: number; downloadedAt: string | null } {
  const count = edition === 'us-states' ? (BUNDLED_US_STATES as Country[]).length : (BUNDLED_COUNTRIES as Country[]).length;
  return {
    count,
    downloadedAt: 'Offline Ready (100% Local)',
  };
}

export async function loadCountries(edition: GameEdition = 'world'): Promise<{ countries: Country[]; source: 'bundled' }> {
  if (edition === 'us-states') {
    const list = (BUNDLED_US_STATES as Country[]).map((s) => ({
      ...s,
      flagUrl: getFlagUrl(s.alpha2, 'high'),
      lowFlagUrl: getFlagUrl(s.alpha2, 'low'),
    }));
    return { countries: list, source: 'bundled' };
  }

  const list = (BUNDLED_COUNTRIES as Country[]).map((c) => ({
    ...c,
    flagUrl: getFlagUrl(c.alpha2, 'high'),
    lowFlagUrl: getFlagUrl(c.alpha2, 'low'),
  }));
  return { countries: list, source: 'bundled' };
}

export async function forceRefreshLocalData(edition: GameEdition = 'world'): Promise<Country[]> {
  const res = await loadCountries(edition);
  return res.countries;
}
