import { describe, it, expect, beforeEach } from 'vitest';
import {
  addLeaderboardEntry,
  getFilteredLeaderboard,
} from './leaderboard';
import { resolveFeatureAlpha2 } from './countriesGeo';

const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  },
  length: 0,
  key: () => null,
};

describe('Leaderboard with World and US-States Editions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly isolates world and us-states entries in separate leaderboards', () => {
    // Add world entry
    addLeaderboardEntry({
      playerName: 'Alice',
      edition: 'world',
      gameMode: 'flag-to-name',
      continentFilter: 'Europe',
      timerMode: 'timed',
      totalCountries: 44,
      conqueredCount: 44,
      mistakesCount: 0,
      accuracy: 100,
      timeElapsedSeconds: 120,
      bestStreak: 44,
    });

    // Add US states entry
    addLeaderboardEntry({
      playerName: 'Bob',
      edition: 'us-states',
      gameMode: 'flag-to-name',
      continentFilter: 'all',
      usRegionFilter: 'Northeast',
      timerMode: 'timed',
      totalCountries: 9,
      conqueredCount: 9,
      mistakesCount: 0,
      accuracy: 100,
      timeElapsedSeconds: 25,
      bestStreak: 9,
    });

    // Query world
    const worldResults = getFilteredLeaderboard('world', 'flag-to-name', 'Europe', 'timed');
    expect(worldResults.length).toBe(1);
    expect(worldResults[0].playerName).toBe('Alice');
    expect(worldResults[0].edition).toBe('world');

    // Query US states Northeast
    const usResults = getFilteredLeaderboard('us-states', 'flag-to-name', 'Northeast', 'timed');
    expect(usResults.length).toBe(1);
    expect(usResults[0].playerName).toBe('Bob');
    expect(usResults[0].edition).toBe('us-states');
    expect(usResults[0].usRegionFilter).toBe('Northeast');

    // Query US states Midwest should be empty
    const emptyUsResults = getFilteredLeaderboard('us-states', 'flag-to-name', 'Midwest', 'timed');
    expect(emptyUsResults.length).toBe(0);
  });

  it('resolves US state feature codes correctly to US-XX', () => {
    expect(resolveFeatureAlpha2({ ISO_A2: 'US-AL', POSTAL: 'AL' })).toBe('US-AL');
    expect(resolveFeatureAlpha2({ ISO_A2_EH: 'US-CA', POSTAL: 'CA' })).toBe('US-CA');
    expect(resolveFeatureAlpha2({ POSTAL: 'TX' })).toBe('US-TX');
    expect(resolveFeatureAlpha2({ code: 'NY' })).toBe('US-NY');
    expect(resolveFeatureAlpha2({ ISO_A2: 'FR' })).toBe('FR');
  });
});
