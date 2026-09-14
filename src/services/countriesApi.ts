import {
  Country,
  GameScore,
  UserSettings,
  GameMode,
  TimerMode,
  GameEdition,
} from '../types/game';
import BUNDLED_COUNTRIES from '../data/countriesData.json';
import BUNDLED_US_STATES from '../data/usStatesData.json';
import BUNDLED_BR_STATES from '../data/brStatesData.json';

export const STORAGE_KEYS = {
  SCORE: 'guessTheCountry.score',
  SETTINGS: 'guessTheCountry.settings',
  SOLVED_COUNTRIES: 'guessTheCountry.solvedCountries',
  GLOBE_MISTAKES: 'guessTheCountry.globeMistakes',
  US_SCORE: 'guessTheCountry.us_score',
  US_SOLVED_STATES: 'guessTheCountry.us_solvedCountries',
  US_GLOBE_MISTAKES: 'guessTheCountry.us_globeMistakes',
  BR_SCORE: 'guessTheCountry.br_score',
  BR_SOLVED_STATES: 'guessTheCountry.br_solvedCountries',
  BR_GLOBE_MISTAKES: 'guessTheCountry.br_globeMistakes',
};

// Centralizes the "alpha2-prefix -> asset folder" mapping so we don't duplicate
// branches for every new state edition. Add a row here when introducing a new
// per-territory edition that ships its own flag folder.
const STATE_FLAG_FOLDERS: Record<string, string> = {
  'US-': 'us-states',
  'BR-': 'br-states',
};

function resolveStateFlagFolder(alpha2: string): string | null {
  if (!alpha2) return null;
  const upper = alpha2.toUpperCase();
  for (const prefix of Object.keys(STATE_FLAG_FOLDERS)) {
    if (upper.startsWith(prefix)) {
      return STATE_FLAG_FOLDERS[prefix];
    }
  }
  return null;
}

export function getFlagUrl(alpha2: string, quality: 'high' | 'low' = 'high'): string {
  if (!alpha2) return '';
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const stateFolder = resolveStateFlagFolder(alpha2);
  if (stateFolder) {
    const code = alpha2.slice(3).toLowerCase();
    const sub = quality === 'low' ? `flags/${stateFolder}/low/` : `flags/${stateFolder}/`;
    return `${cleanBase}${sub}${code}.png`;
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

function editionScoreKey(edition: GameEdition): string {
  if (edition === 'us-states') return STORAGE_KEYS.US_SCORE;
  if (edition === 'br-states') return STORAGE_KEYS.BR_SCORE;
  return STORAGE_KEYS.SCORE;
}

function editionSolvedKey(edition: GameEdition): string {
  if (edition === 'us-states') return STORAGE_KEYS.US_SOLVED_STATES;
  if (edition === 'br-states') return STORAGE_KEYS.BR_SOLVED_STATES;
  return STORAGE_KEYS.SOLVED_COUNTRIES;
}

function editionMistakesKey(edition: GameEdition): string {
  if (edition === 'us-states') return STORAGE_KEYS.US_GLOBE_MISTAKES;
  if (edition === 'br-states') return STORAGE_KEYS.BR_GLOBE_MISTAKES;
  return STORAGE_KEYS.GLOBE_MISTAKES;
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

      const edition: GameEdition =
        parsed.edition === 'us-states'
          ? 'us-states'
          : parsed.edition === 'br-states'
          ? 'br-states'
          : 'world';

      return {
        soundEnabled: parsed.soundEnabled ?? true,
        edition,
        gameMode: mode,
        timerMode: timer,
        theme: parsed.theme || 'deep-space',
        continentFilter: parsed.continentFilter || 'all',
        usRegionFilter: parsed.usRegionFilter || 'all',
        brRegionFilter: parsed.brRegionFilter || 'all',
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
    brRegionFilter: 'all',
  };
}

export function loadGlobeMistakes(edition: GameEdition = 'world'): number {
  try {
    const key = editionMistakesKey(edition);
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveGlobeMistakes(mistakes: number, edition: GameEdition = 'world'): void {
  try {
    const key = editionMistakesKey(edition);
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
    const key = editionScoreKey(edition);
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
    const key = editionScoreKey(edition);
    localStorage.setItem(key, JSON.stringify(score));
  } catch {
    // ignore
  }
}

export function loadSolvedCountryAlphas(edition: GameEdition = 'world'): string[] {
  try {
    const key = editionSolvedKey(edition);
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
    const key = editionSolvedKey(edition);
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
    localStorage.removeItem(editionScoreKey(edition));
    localStorage.removeItem(editionSolvedKey(edition));
    localStorage.removeItem(editionMistakesKey(edition));
  } catch {
    // ignore
  }
}

export function getLocalDataInfo(edition: GameEdition = 'world'): { count: number; downloadedAt: string | null } {
  let count: number;
  if (edition === 'us-states') count = (BUNDLED_US_STATES as Country[]).length;
  else if (edition === 'br-states') count = (BUNDLED_BR_STATES as Country[]).length;
  else count = (BUNDLED_COUNTRIES as Country[]).length;
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

  if (edition === 'br-states') {
    const list = (BUNDLED_BR_STATES as Country[]).map((s) => ({
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
