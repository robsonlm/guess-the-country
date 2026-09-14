import { GameMode, ContinentFilter, TimerMode, GameEdition, USRegionFilter } from '../types/game';
import {
  saveEntryToFirebase,
  fetchFirebaseLeaderboard,
  isFirebaseConfigured,
  subscribeToFirebaseLeaderboard,
  clearFirebaseLeaderboard,
} from './firebase';
import { safeId, sanitizePlayerName } from '../utils/sanitize';

export { isFirebaseConfigured, subscribeToFirebaseLeaderboard, clearFirebaseLeaderboard };

export type LeaderboardCategory = 'fastest' | 'least-mistakes' | 'highest-streak';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  edition?: GameEdition;
  gameMode: GameMode;
  continentFilter: ContinentFilter;
  usRegionFilter?: USRegionFilter;
  timerMode: TimerMode;
  totalCountries: number;
  conqueredCount: number;
  mistakesCount: number;
  accuracy: number;
  timeElapsedSeconds: number;
  bestStreak: number;
  date: string;
  rankBadge: 'S+' | 'S' | 'A' | 'B' | 'C';
}

export interface LeaderboardPlacementResult {
  entry: LeaderboardEntry;
  fastestRank: number;
  leastMistakesRank: number;
  highestStreakRank: number;
  overallRank: number;
  totalParticipants: number;
}

const LEADERBOARD_KEY = 'guess_the_country_leaderboard_v3';
const LAST_PLAYER_NAME_KEY = 'guess_the_country_last_player_name';

function normalizeEntry(e: LeaderboardEntry): LeaderboardEntry {
  const isUsStates =
    e.edition === 'us-states' ||
    Boolean(e.usRegionFilter) ||
    e.playerName?.includes('US State') ||
    (['Northeast', 'Midwest', 'South', 'West'].includes(e.continentFilter as any));

  const edition: GameEdition = isUsStates ? 'us-states' : 'world';
  const usRegionFilter: USRegionFilter | undefined = isUsStates
    ? (e.usRegionFilter || (['Northeast', 'Midwest', 'South', 'West'].includes(e.continentFilter as any) ? (e.continentFilter as any) : 'all'))
    : undefined;
  const continentFilter: ContinentFilter = isUsStates ? 'all' : (e.continentFilter || 'all');

  return {
    ...e,
    playerName: sanitizePlayerName(e.playerName),
    edition,
    continentFilter,
    usRegionFilter,
    timerMode: e.timerMode || 'timed',
  };
}

export function mergeAndDeduplicate(local: LeaderboardEntry[], remote: LeaderboardEntry[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();

  if (Array.isArray(remote)) {
    remote.forEach((e) => {
      if (e && e.id && e.playerName && !e.id.startsWith('seed-')) {
        map.set(e.id, normalizeEntry(e));
      }
    });
  }

  if (Array.isArray(local)) {
    local.forEach((e) => {
      if (e && e.id && e.playerName && !e.id.startsWith('seed-')) {
        map.set(e.id, normalizeEntry(e));
      }
    });
  }

  return Array.from(map.values()).filter((e) => !e.id.startsWith('seed-'));
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    localStorage.removeItem('guess_the_country_leaderboard');
    localStorage.removeItem('guess_the_country_leaderboard_v2');

    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeAndDeduplicate(parsed, []).filter((e) => !e.id.startsWith('seed-'));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

/**
 * Clears all leaderboard entries locally and in Firestore.
 * The fallback REST bin has been removed; Firestore is the single source of truth.
 */
export async function clearAllLeaderboardEntries(): Promise<void> {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem('guess_the_country_leaderboard_v2');
    localStorage.removeItem('guess_the_country_leaderboard');
  } catch {
    // safe
  }

  if (isFirebaseConfigured()) {
    await clearFirebaseLeaderboard().catch((err) => console.warn('[Firebase] Clear error:', err));
  }
}

/**
 * Synchronizes the leaderboard with Firebase Firestore.
 * Fetches all global entries submitted by all players worldwide,
 * merges them with local records, and returns the unified list.
 */
export async function syncGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const local = loadLeaderboard();

  if (isFirebaseConfigured()) {
    try {
      const firebaseEntries = await fetchFirebaseLeaderboard();
      if (firebaseEntries && firebaseEntries.length > 0) {
        const merged = mergeAndDeduplicate(local, firebaseEntries);
        saveLeaderboard(merged);
        return merged;
      }
      return local;
    } catch (err) {
      console.warn('[Leaderboard] Firebase sync notice:', err);
      return local;
    }
  }

  return local;
}

/**
 * Asynchronously pushes an updated leaderboard entry to Firebase Firestore.
 * The write is performed by the secure 'submitScore' Cloud Function.
 */
export async function pushGlobalLeaderboard(
  entry: LeaderboardEntry,
  _allEntries: LeaderboardEntry[]
): Promise<void> {
  if (isFirebaseConfigured()) {
    saveEntryToFirebase(entry).catch((err) => console.warn('[Firebase] Background write notice:', err));
  }
}

export function getLastPlayerName(): string {
  try {
    const stored = localStorage.getItem(LAST_PLAYER_NAME_KEY);
    return sanitizePlayerName(stored);
  } catch {
    return 'World Explorer';
  }
}

export function setLastPlayerName(name: string): void {
  try {
    const clean = sanitizePlayerName(name);
    localStorage.setItem(LAST_PLAYER_NAME_KEY, clean);
  } catch {
    // ignore
  }
}

export function calculateRankBadge(mistakes: number, accuracy: number): 'S+' | 'S' | 'A' | 'B' | 'C' {
  if (mistakes === 0 && accuracy === 100) return 'S+';
  if (mistakes <= 3 && accuracy >= 95) return 'S';
  if (mistakes <= 8 && accuracy >= 88) return 'A';
  if (mistakes <= 15 && accuracy >= 80) return 'B';
  return 'C';
}

export function addLeaderboardEntry(
  entryData: Omit<LeaderboardEntry, 'id' | 'date' | 'rankBadge'> & {
    edition?: GameEdition;
    usRegionFilter?: USRegionFilter;
  }
): LeaderboardPlacementResult {
  const currentList = loadLeaderboard();
  const trimmedName = sanitizePlayerName(entryData.playerName);
  setLastPlayerName(trimmedName);
  const targetTimerMode = entryData.timerMode || 'timed';
  const targetEdition: GameEdition = entryData.edition === 'us-states' ? 'us-states' : 'world';
  const targetUsRegion: USRegionFilter = targetEdition === 'us-states' ? (entryData.usRegionFilter || 'all') : 'all';
  const targetContinent: ContinentFilter = targetEdition === 'world' ? (entryData.continentFilter || 'all') : 'all';

  const existingDuplicate = currentList.find((e) => {
    const isSamePlayer = e.playerName.trim().toLowerCase() === trimmedName.toLowerCase();
    const eEdition = e.edition || 'world';
    const isSameScope =
      targetEdition === 'us-states'
        ? (e.usRegionFilter || 'all') === targetUsRegion
        : (e.continentFilter || 'all') === targetContinent;

    const isSameGame =
      eEdition === targetEdition &&
      e.gameMode === entryData.gameMode &&
      isSameScope &&
      (e.timerMode || 'timed') === targetTimerMode &&
      e.timeElapsedSeconds === entryData.timeElapsedSeconds &&
      e.mistakesCount === entryData.mistakesCount &&
      e.conqueredCount === entryData.conqueredCount &&
      e.accuracy === entryData.accuracy;
    if (!isSamePlayer || !isSameGame) return false;

    const diffMs = Math.abs(Date.now() - new Date(e.date).getTime());
    return diffMs < 180000;
  });

  const entryToRank: LeaderboardEntry = existingDuplicate || {
    ...entryData,
    playerName: trimmedName,
    edition: targetEdition,
    continentFilter: targetContinent,
    usRegionFilter: targetEdition === 'us-states' ? targetUsRegion : undefined,
    timerMode: targetTimerMode,
    id: safeId('entry'),
    date: new Date().toISOString(),
    rankBadge: calculateRankBadge(entryData.mistakesCount, entryData.accuracy),
  };

  let updatedList = currentList;
  if (!existingDuplicate) {
    updatedList = [entryToRank, ...currentList];
    saveLeaderboard(updatedList);
    pushGlobalLeaderboard(entryToRank, updatedList);
  }

  const sameScopeList = updatedList.filter((e) => {
    const eEdition = e.edition || 'world';
    if (eEdition !== targetEdition) return false;
    if (e.gameMode !== entryData.gameMode) return false;
    if ((e.timerMode || 'timed') !== targetTimerMode) return false;
    if (targetEdition === 'us-states') {
      return (e.usRegionFilter || 'all') === targetUsRegion;
    }
    return (e.continentFilter || 'all') === targetContinent;
  });

  const fastestSorted = [...sameScopeList].sort((a, b) => {
    if (a.timeElapsedSeconds !== b.timeElapsedSeconds) return a.timeElapsedSeconds - b.timeElapsedSeconds;
    return a.mistakesCount - b.mistakesCount;
  });

  const leastMistakesSorted = [...sameScopeList].sort((a, b) => {
    if (a.mistakesCount !== b.mistakesCount) return a.mistakesCount - b.mistakesCount;
    if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
    return a.timeElapsedSeconds - b.timeElapsedSeconds;
  });

  const highestStreakSorted = [...sameScopeList].sort((a, b) => {
    if (a.bestStreak !== b.bestStreak) return b.bestStreak - a.bestStreak;
    return b.accuracy - a.accuracy;
  });

  const fastestRank = fastestSorted.findIndex((e) => e.id === entryToRank.id) + 1;
  const leastMistakesRank = leastMistakesSorted.findIndex((e) => e.id === entryToRank.id) + 1;
  const highestStreakRank = highestStreakSorted.findIndex((e) => e.id === entryToRank.id) + 1;

  return {
    entry: entryToRank,
    fastestRank: fastestRank > 0 ? fastestRank : 1,
    leastMistakesRank: leastMistakesRank > 0 ? leastMistakesRank : 1,
    highestStreakRank: highestStreakRank > 0 ? highestStreakRank : 1,
    overallRank: leastMistakesRank > 0 ? leastMistakesRank : 1,
    totalParticipants: sameScopeList.length,
  };
}

/**
 * Returns strictly the leaderboard for a game combination (edition + gameMode + scopeFilter + timerMode).
 */
export function getFilteredLeaderboard(
  editionOrMode: GameEdition | GameMode,
  modeOrContinent: GameMode | ContinentFilter,
  scopeOrTimer: ContinentFilter | USRegionFilter | TimerMode,
  timerOrCategory?: TimerMode | LeaderboardCategory,
  optionalCategory: LeaderboardCategory = 'least-mistakes'
): LeaderboardEntry[] {
  let edition: GameEdition = 'world';
  let gameMode: GameMode = 'globe';
  let scopeFilter: ContinentFilter | USRegionFilter = 'all';
  let timerMode: TimerMode = 'timed';
  let category: LeaderboardCategory = 'least-mistakes';

  // Check if called with (edition, gameMode, scope, timerMode, category)
  if (editionOrMode === 'world' || editionOrMode === 'us-states') {
    edition = editionOrMode;
    gameMode = modeOrContinent as GameMode;
    scopeFilter = scopeOrTimer as ContinentFilter | USRegionFilter;
    timerMode = (timerOrCategory as TimerMode) || 'timed';
    category = optionalCategory;
  } else {
    // Legacy call: (gameMode, continentFilter, timerMode, category)
    gameMode = editionOrMode as GameMode;
    scopeFilter = modeOrContinent as ContinentFilter;
    timerMode = (scopeOrTimer as TimerMode) || 'timed';
    category = (timerOrCategory as LeaderboardCategory) || 'least-mistakes';
  }

  const allEntries = loadLeaderboard();

  const filtered = allEntries.filter((e) => {
    const eEdition = e.edition || 'world';
    if (eEdition !== edition) return false;
    if (e.gameMode !== gameMode) return false;
    if ((e.timerMode || 'timed') !== timerMode) return false;

    if (edition === 'us-states') {
      return (e.usRegionFilter || 'all') === scopeFilter;
    }
    return (e.continentFilter || 'all') === scopeFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (category === 'fastest') {
      if (a.timeElapsedSeconds !== b.timeElapsedSeconds) {
        return a.timeElapsedSeconds - b.timeElapsedSeconds;
      }
      return a.mistakesCount - b.mistakesCount;
    }

    if (category === 'highest-streak') {
      if (a.bestStreak !== b.bestStreak) {
        return b.bestStreak - a.bestStreak;
      }
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    }

    if (a.mistakesCount !== b.mistakesCount) {
      return a.mistakesCount - b.mistakesCount;
    }
    if (a.accuracy !== b.accuracy) {
      return b.accuracy - a.accuracy;
    }
    if (a.timeElapsedSeconds !== b.timeElapsedSeconds) {
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    }
    return b.bestStreak - a.bestStreak;
  });

  return sorted;
}

export function formatTimeElapsed(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
