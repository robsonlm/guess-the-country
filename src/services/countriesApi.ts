import { Country, GameScore, UserSettings } from '../types/game';
import BUNDLED_COUNTRIES from '../data/countriesData.json';
import { KNOWN_CENTROIDS } from './countriesGeo';

const PUBLIC_API_URL = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';
const PUBLIC_API_CDN = 'https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json';

export const STORAGE_KEYS = {
  SCORE: 'guessTheCountry.score',
  SETTINGS: 'guessTheCountry.settings',
  LOCAL_DATA: 'guessTheCountry.localCountries',
  LOCAL_TIMESTAMP: 'guessTheCountry.localCountriesTimestamp',
  SOLVED_COUNTRIES: 'guessTheCountry.solvedCountries',
  GLOBE_MISTAKES: 'guessTheCountry.globeMistakes',
};

export function getFlagUrl(alpha2: string): string {
  if (!alpha2) return '';
  return `https://flagcdn.com/w320/${alpha2.toLowerCase()}.png`;
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        soundEnabled: parsed.soundEnabled ?? true,
        gameMode: parsed.gameMode || 'globe',
        questionType: parsed.questionType || 'flag-to-name',
        timerMode: parsed.timerMode || 'none',
        theme: parsed.theme || 'deep-space',
        continentFilter: parsed.continentFilter || 'all',
      };
    }
  } catch {
    // fallback
  }

  return {
    soundEnabled: true,
    gameMode: 'globe',
    questionType: 'flag-to-name',
    timerMode: 'none',
    theme: 'deep-space',
    continentFilter: 'all',
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

function normalizeRawCountries(list: any[]): Country[] {
  return list
    .map((c) => {
      const name = c.name?.common || c.name || '';
      const alpha2 = (c.cca2 || c.alpha2 || '').toUpperCase();
      const capital = Array.isArray(c.capital) && c.capital.length > 0 ? c.capital[0] : (c.capital || '');
      const region = c.region || '';
      const subregion = c.subregion || '';
      const mapUrl =
        c.maps?.googleMaps ||
        c.mapUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
      const flagUrl = getFlagUrl(alpha2);

      return { name, alpha2, capital, region, subregion, mapUrl, flagUrl };
    })
    .filter((c) => c.name && c.alpha2 && c.alpha2.length === 2 && KNOWN_CENTROIDS[c.alpha2] !== undefined);
}

async function downloadCountriesFromApi(signal?: AbortSignal): Promise<Country[]> {
  let res: Response | null = null;
  try {
    res = await fetch(PUBLIC_API_URL, { signal });
  } catch {
    res = await fetch(PUBLIC_API_CDN, { signal });
  }

  if (!res || !res.ok) throw new Error(`Failed to fetch countries: HTTP ${res?.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid country data format');

  return normalizeRawCountries(data);
}

export function saveLocalCountries(countries: Country[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAL_DATA, JSON.stringify(countries));
    localStorage.setItem(STORAGE_KEYS.LOCAL_TIMESTAMP, new Date().toISOString());
  } catch (err) {
    console.warn('Unable to persist countries to localStorage:', err);
  }
}

export function getLocalCountries(): Country[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length === (BUNDLED_COUNTRIES as Country[]).length &&
        parsed.every((c) => c && KNOWN_CENTROIDS[c.alpha2])
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function getLocalDataInfo(): { count: number; downloadedAt: string | null } {
  const local = getLocalCountries();
  const timestamp = localStorage.getItem(STORAGE_KEYS.LOCAL_TIMESTAMP);
  return {
    count: local ? local.length : (BUNDLED_COUNTRIES as Country[]).length,
    downloadedAt: timestamp ? new Date(timestamp).toLocaleDateString() : 'Ready',
  };
}

export async function loadCountries(
  signal?: AbortSignal
): Promise<{ countries: Country[]; source: 'local' | 'downloaded' | 'bundled' }> {
  const local = getLocalCountries();
  if (local && local.length >= 50) {
    return { countries: local, source: 'local' };
  }

  try {
    const downloaded = await downloadCountriesFromApi(signal);
    if (downloaded.length >= 50) {
      saveLocalCountries(downloaded);
      return { countries: downloaded, source: 'downloaded' };
    }
  } catch (err) {
    console.warn('Remote download failed, using bundled offline database:', err);
  }

  const bundled = normalizeRawCountries(BUNDLED_COUNTRIES as Country[]);
  saveLocalCountries(bundled);
  return { countries: bundled, source: 'bundled' };
}

export async function forceRefreshLocalData(): Promise<Country[]> {
  const downloaded = await downloadCountriesFromApi();
  saveLocalCountries(downloaded);
  return downloaded;
}
