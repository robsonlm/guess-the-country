import { Achievement, Country, GameScore } from '../types/game';

const ACHIEVEMENTS_STORAGE = 'guessTheCountry.achievements';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-win', title: 'First Steps', description: 'Correctly identify your first national flag', icon: '🌟', unlockedAt: null },
  { id: 'streak-5', title: 'On A Roll', description: 'Reach a streak of 5 correct flags in a row', icon: '🔥', unlockedAt: null },
  { id: 'streak-10', title: 'Flag Scholar', description: 'Reach a streak of 10 correct flags in a row', icon: '⚡', unlockedAt: null },
  { id: 'streak-20', title: 'Geography Inferno', description: 'Reach a streak of 20 correct flags in a row', icon: '🏆', unlockedAt: null },
  { id: 'euro-master', title: 'European Navigator', description: 'Master every country in Europe', icon: '🇪🇺', unlockedAt: null },
  { id: 'asia-master', title: 'Asian Cartographer', description: 'Master every country in Asia', icon: '🌏', unlockedAt: null },
  { id: 'americas-master', title: 'Pan-American Explorer', description: 'Master every country in the Americas', icon: '🌎', unlockedAt: null },
  { id: 'africa-master', title: 'African Pioneer', description: 'Master every country in Africa', icon: '🌍', unlockedAt: null },
  { id: 'oceania-master', title: 'Pacific Voyager', description: 'Master every country in Oceania', icon: '🏝️', unlockedAt: null },
  { id: 'fifty-flags', title: 'Half-Centurion', description: 'Master 50 world country flags', icon: '🎖️', unlockedAt: null },
  { id: 'grand-master', title: 'Grand Cartographer', description: 'Conquer all 250 world country flags!', icon: '👑', unlockedAt: null },
];

export function loadAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return INITIAL_ACHIEVEMENTS.map((initial) => {
          const found = parsed.find((p) => p.id === initial.id);
          return found ? { ...initial, unlockedAt: found.unlockedAt } : initial;
        });
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_ACHIEVEMENTS;
}

export function saveAchievements(achievements: Achievement[]): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE, JSON.stringify(achievements));
  } catch {
    // ignore
  }
}

export function checkNewAchievements(
  currentList: Achievement[],
  score: GameScore,
  solvedAlphas: string[],
  allCountries: Country[]
): { updatedList: Achievement[]; newlyUnlocked: Achievement[] } {
  const newlyUnlocked: Achievement[] = [];
  const solvedSet = new Set(solvedAlphas);

  const regionCounts: Record<string, { total: number; solved: number }> = {};
  allCountries.forEach((c) => {
    const reg = c.region || 'Other';
    if (!regionCounts[reg]) regionCounts[reg] = { total: 0, solved: 0 };
    regionCounts[reg].total++;
    if (solvedSet.has(c.alpha2)) {
      regionCounts[reg].solved++;
    }
  });

  const updatedList = currentList.map((ach) => {
    if (ach.unlockedAt) return ach; // already unlocked

    let shouldUnlock = false;

    if (ach.id === 'first-win' && solvedAlphas.length >= 1) shouldUnlock = true;
    if (ach.id === 'streak-5' && score.currentStreak >= 5) shouldUnlock = true;
    if (ach.id === 'streak-10' && score.currentStreak >= 10) shouldUnlock = true;
    if (ach.id === 'streak-20' && score.currentStreak >= 20) shouldUnlock = true;
    if (ach.id === 'fifty-flags' && solvedAlphas.length >= 50) shouldUnlock = true;
    if (ach.id === 'grand-master' && allCountries.length > 0 && solvedAlphas.length >= allCountries.length) shouldUnlock = true;

    if (ach.id === 'euro-master' && regionCounts['Europe'] && regionCounts['Europe'].solved >= regionCounts['Europe'].total) shouldUnlock = true;
    if (ach.id === 'asia-master' && regionCounts['Asia'] && regionCounts['Asia'].solved >= regionCounts['Asia'].total) shouldUnlock = true;
    if (ach.id === 'americas-master' && regionCounts['Americas'] && regionCounts['Americas'].solved >= regionCounts['Americas'].total) shouldUnlock = true;
    if (ach.id === 'africa-master' && regionCounts['Africa'] && regionCounts['Africa'].solved >= regionCounts['Africa'].total) shouldUnlock = true;
    if (ach.id === 'oceania-master' && regionCounts['Oceania'] && regionCounts['Oceania'].solved >= regionCounts['Oceania'].total) shouldUnlock = true;

    if (shouldUnlock) {
      const unlockedAch = { ...ach, unlockedAt: new Date().toISOString() };
      newlyUnlocked.push(unlockedAch);
      return unlockedAch;
    }

    return ach;
  });

  if (newlyUnlocked.length > 0) {
    saveAchievements(updatedList);
  }

  return { updatedList, newlyUnlocked };
}
