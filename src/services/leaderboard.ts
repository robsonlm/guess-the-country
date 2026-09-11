import { GameMode, ContinentFilter } from '../types/game';

export type LeaderboardCategory = 'fastest' | 'least-mistakes' | 'highest-streak' | 'overall';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  gameMode: GameMode;
  continentFilter: ContinentFilter;
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

const LEADERBOARD_KEY = 'guess_the_country_leaderboard_v2';
const LAST_PLAYER_NAME_KEY = 'guess_the_country_last_player_name';
const GLOBAL_CLOUD_BIN_ID = 'ff808181a067127101a08f93d81e7345';
const CLOUD_API_URL = `https://api.restful-api.dev/objects/${GLOBAL_CLOUD_BIN_ID}`;

// Default hall-of-fame records to seed initially
const SEEDED_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    playerName: 'Atlas Explorer',
    gameMode: 'globe',
    continentFilter: 'all',
    totalCountries: 197,
    conqueredCount: 197,
    mistakesCount: 0,
    accuracy: 100,
    timeElapsedSeconds: 148,
    bestStreak: 197,
    date: '2026-03-01T10:00:00Z',
    rankBadge: 'S+',
  },
  {
    id: 'seed-2',
    playerName: 'Magellan',
    gameMode: 'globe',
    continentFilter: 'all',
    totalCountries: 197,
    conqueredCount: 197,
    mistakesCount: 2,
    accuracy: 99,
    timeElapsedSeconds: 125,
    bestStreak: 94,
    date: '2026-03-02T12:00:00Z',
    rankBadge: 'S',
  },
  {
    id: 'seed-3',
    playerName: 'Vespucci',
    gameMode: 'globe',
    continentFilter: 'Europe',
    totalCountries: 48,
    conqueredCount: 48,
    mistakesCount: 0,
    accuracy: 100,
    timeElapsedSeconds: 38,
    bestStreak: 48,
    date: '2026-03-03T14:30:00Z',
    rankBadge: 'S+',
  },
  {
    id: 'seed-4',
    playerName: 'Captain Cook',
    gameMode: 'progressive',
    continentFilter: 'all',
    totalCountries: 197,
    conqueredCount: 197,
    mistakesCount: 4,
    accuracy: 98,
    timeElapsedSeconds: 164,
    bestStreak: 65,
    date: '2026-03-04T09:15:00Z',
    rankBadge: 'S',
  },
  {
    id: 'seed-5',
    playerName: 'Marco Polo',
    gameMode: 'globe',
    continentFilter: 'Asia',
    totalCountries: 49,
    conqueredCount: 49,
    mistakesCount: 1,
    accuracy: 98,
    timeElapsedSeconds: 42,
    bestStreak: 38,
    date: '2026-03-05T16:45:00Z',
    rankBadge: 'S',
  },
  {
    id: 'seed-6',
    playerName: 'Amelia Air',
    gameMode: 'classic',
    continentFilter: 'Americas',
    totalCountries: 35,
    conqueredCount: 35,
    mistakesCount: 0,
    accuracy: 100,
    timeElapsedSeconds: 29,
    bestStreak: 35,
    date: '2026-03-06T11:20:00Z',
    rankBadge: 'S+',
  },
];

function mergeAndDeduplicate(local: LeaderboardEntry[], remote: LeaderboardEntry[]): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();

  // Add seeded first
  SEEDED_LEADERBOARD.forEach((e) => map.set(e.id, e));

  // Add remote entries
  if (Array.isArray(remote)) {
    remote.forEach((e) => {
      if (e && e.id && e.playerName) {
        map.set(e.id, e);
      }
    });
  }

  // Add local entries
  if (Array.isArray(local)) {
    local.forEach((e) => {
      if (e && e.id && e.playerName) {
        map.set(e.id, e);
      }
    });
  }

  return Array.from(map.values());
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      saveLeaderboard(SEEDED_LEADERBOARD);
      return SEEDED_LEADERBOARD;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeAndDeduplicate(parsed, []);
    }
    return SEEDED_LEADERBOARD;
  } catch {
    return SEEDED_LEADERBOARD;
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
 * Synchronizes the leaderboard with the global shared cloud database.
 * Fetches all global entries submitted by all players worldwide,
 * merges them with local records, and returns the unified list.
 */
export async function syncGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const local = loadLeaderboard();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(CLOUD_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const remoteEntries: LeaderboardEntry[] = json?.data?.entries || [];
      const merged = mergeAndDeduplicate(local, remoteEntries);
      saveLeaderboard(merged);
      return merged;
    }
  } catch {
    // Offline or network fail: fallback to local cache
  }

  return local;
}

/**
 * Asynchronously pushes updated leaderboard entries to the shared global cloud database.
 */
export async function pushGlobalLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    await fetch(CLOUD_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'guess-the-country-leaderboard',
        data: { entries },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // safe background sync fail
  }
}

export function getLastPlayerName(): string {
  try {
    return localStorage.getItem(LAST_PLAYER_NAME_KEY) || 'World Explorer';
  } catch {
    return 'World Explorer';
  }
}

export function setLastPlayerName(name: string): void {
  try {
    localStorage.setItem(LAST_PLAYER_NAME_KEY, name.trim());
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
  entryData: Omit<LeaderboardEntry, 'id' | 'date' | 'rankBadge'>
): LeaderboardPlacementResult {
  const currentList = loadLeaderboard();
  const trimmedName = entryData.playerName?.trim() || 'Anonymous Explorer';
  setLastPlayerName(trimmedName);

  const rankBadge = calculateRankBadge(entryData.mistakesCount, entryData.accuracy);

  const newEntry: LeaderboardEntry = {
    ...entryData,
    id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    playerName: trimmedName,
    date: new Date().toISOString(),
    rankBadge,
  };

  const updatedList = [newEntry, ...currentList];
  saveLeaderboard(updatedList);

  // Trigger background cloud sync so all players across the world receive this score
  pushGlobalLeaderboard(updatedList);

  // Compute player's ranks in the relevant category scope
  const sameScopeList = updatedList.filter(
    (e) => e.gameMode === entryData.gameMode && e.continentFilter === entryData.continentFilter
  );

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

  const computeOverallScore = (e: LeaderboardEntry) =>
    e.accuracy * 1000 - e.timeElapsedSeconds * 3 - e.mistakesCount * 60 + e.bestStreak * 25;

  const overallSorted = [...sameScopeList].sort((a, b) => computeOverallScore(b) - computeOverallScore(a));

  const fastestRank = fastestSorted.findIndex((e) => e.id === newEntry.id) + 1;
  const leastMistakesRank = leastMistakesSorted.findIndex((e) => e.id === newEntry.id) + 1;
  const highestStreakRank = highestStreakSorted.findIndex((e) => e.id === newEntry.id) + 1;
  const overallRank = overallSorted.findIndex((e) => e.id === newEntry.id) + 1;

  return {
    entry: newEntry,
    fastestRank: fastestRank > 0 ? fastestRank : 1,
    leastMistakesRank: leastMistakesRank > 0 ? leastMistakesRank : 1,
    highestStreakRank: highestStreakRank > 0 ? highestStreakRank : 1,
    overallRank: overallRank > 0 ? overallRank : 1,
    totalParticipants: sameScopeList.length,
  };
}

export function getFilteredLeaderboard(
  category: LeaderboardCategory,
  gameModeFilter: GameMode | 'all',
  continentFilter: ContinentFilter | 'all'
): LeaderboardEntry[] {
  const allEntries = loadLeaderboard();

  let filtered = allEntries;
  if (gameModeFilter !== 'all') {
    filtered = filtered.filter((e) => e.gameMode === gameModeFilter);
  }
  if (continentFilter !== 'all') {
    filtered = filtered.filter((e) => e.continentFilter === continentFilter);
  }

  // Sorting based on category
  const sorted = [...filtered].sort((a, b) => {
    if (category === 'fastest') {
      if (a.timeElapsedSeconds !== b.timeElapsedSeconds) {
        return a.timeElapsedSeconds - b.timeElapsedSeconds;
      }
      return a.mistakesCount - b.mistakesCount;
    }

    if (category === 'least-mistakes') {
      if (a.mistakesCount !== b.mistakesCount) {
        return a.mistakesCount - b.mistakesCount;
      }
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    }

    if (category === 'highest-streak') {
      if (a.bestStreak !== b.bestStreak) {
        return b.bestStreak - a.bestStreak;
      }
      return b.accuracy - a.accuracy;
    }

    // Default 'overall' score
    const scoreA = a.accuracy * 1000 - a.timeElapsedSeconds * 3 - a.mistakesCount * 60 + a.bestStreak * 25;
    const scoreB = b.accuracy * 1000 - b.timeElapsedSeconds * 3 - b.mistakesCount * 60 + b.bestStreak * 25;
    return scoreB - scoreA;
  });

  return sorted;
}

export function formatTimeElapsed(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}
