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

  it('resolves US state feature codes correctly to US-XX and preserves world countries', () => {
    // US States
    expect(resolveFeatureAlpha2({ ISO_A2: 'US-AL', POSTAL: 'AL' })).toBe('US-AL');
    expect(resolveFeatureAlpha2({ ISO_A2_EH: 'US-CA', POSTAL: 'CA' })).toBe('US-CA');
    expect(resolveFeatureAlpha2({ POSTAL: 'TX' })).toBe('US-TX');
    expect(resolveFeatureAlpha2({ code: 'NY' })).toBe('US-NY');

    // World Countries that share postal codes with US state abbreviations
    expect(resolveFeatureAlpha2({ ISO_A2: 'CA', POSTAL: 'CA', NAME: 'Canada' })).toBe('CA');
    expect(resolveFeatureAlpha2({ ISO_A2: 'AR', POSTAL: 'AR', NAME: 'Argentina' })).toBe('AR');
    expect(resolveFeatureAlpha2({ ISO_A2: 'IN', POSTAL: 'IN', NAME: 'India' })).toBe('IN');
    expect(resolveFeatureAlpha2({ ISO_A2: 'CO', POSTAL: 'CO', NAME: 'Colombia' })).toBe('CO');
    expect(resolveFeatureAlpha2({ ISO_A2: 'AL', POSTAL: 'AL', NAME: 'Albania' })).toBe('AL');
    expect(resolveFeatureAlpha2({ ISO_A2: 'IL', POSTAL: 'IL', NAME: 'Israel' })).toBe('IL');
    expect(resolveFeatureAlpha2({ ISO_A2: 'ID', POSTAL: 'ID', NAME: 'Indonesia' })).toBe('ID');
    expect(resolveFeatureAlpha2({ ISO_A2: 'FR' })).toBe('FR');
  });

  it('isolates br-states entries from world and us-states leaderboards', () => {
    addLeaderboardEntry({
      playerName: 'Carla',
      edition: 'br-states',
      gameMode: 'globe',
      continentFilter: 'all',
      brRegionFilter: 'Nordeste',
      timerMode: 'timed',
      totalCountries: 9,
      conqueredCount: 9,
      mistakesCount: 0,
      accuracy: 100,
      timeElapsedSeconds: 50,
      bestStreak: 9,
    });

    // Query BR states Nordeste: should include Carla.
    const brResults = getFilteredLeaderboard('br-states', 'globe', 'Nordeste', 'timed');
    expect(brResults.length).toBe(1);
    expect(brResults[0].playerName).toBe('Carla');
    expect(brResults[0].edition).toBe('br-states');
    expect(brResults[0].brRegionFilter).toBe('Nordeste');

    // Query BR states Sudeste: should be empty (different region).
    const brSudeste = getFilteredLeaderboard('br-states', 'globe', 'Sudeste', 'timed');
    expect(brSudeste.length).toBe(0);

    // Query US-states: should still be empty (cross-edition isolation).
    const usResults = getFilteredLeaderboard('us-states', 'globe', 'all', 'timed');
    expect(usResults.length).toBe(0);

    // Query world: should still be empty (cross-edition isolation).
    const worldResults = getFilteredLeaderboard('world', 'globe', 'all', 'timed');
    expect(worldResults.length).toBe(0);
  });
});
