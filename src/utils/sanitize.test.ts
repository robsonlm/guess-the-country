import { describe, expect, it } from 'vitest';
import {
  sanitizePlayerName,
  hasControlCharacters,
  safeId,
  PLAYER_NAME_MAX_LENGTH,
  PLAYER_NAME_DEFAULT,
} from './sanitize';

describe('sanitizePlayerName', () => {
  it('returns the default for empty or nullish input', () => {
    expect(sanitizePlayerName(null)).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName(undefined)).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('')).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('   ')).toBe(PLAYER_NAME_DEFAULT);
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizePlayerName('  Atlas  ')).toBe('Atlas');
    expect(sanitizePlayerName('\t\nFoo\n')).toBe('Foo');
  });

  it('preserves internal whitespace', () => {
    expect(sanitizePlayerName('Van Der Berg')).toBe('Van Der Berg');
  });

  it('caps names longer than the maximum', () => {
    const long = 'a'.repeat(PLAYER_NAME_MAX_LENGTH + 10);
    const result = sanitizePlayerName(long);
    expect(result.length).toBe(PLAYER_NAME_MAX_LENGTH);
  });

  it('rejects names containing control characters', () => {
    expect(sanitizePlayerName('Hello\x00World')).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('Tab\tName')).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('Newline\nName')).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('Bell\x07Name')).toBe(PLAYER_NAME_DEFAULT);
    expect(sanitizePlayerName('Delete\x7fName')).toBe(PLAYER_NAME_DEFAULT);
  });

  it('preserves printable Unicode including non-ASCII letters and emoji', () => {
    expect(sanitizePlayerName('  Müller  ')).toBe('Müller');
    expect(sanitizePlayerName('Émile')).toBe('Émile');
    expect(sanitizePlayerName('🦊 Fox')).toBe('🦊 Fox');
  });
});

describe('hasControlCharacters', () => {
  it('flags any control character', () => {
    expect(hasControlCharacters('hello\x00')).toBe(true);
    expect(hasControlCharacters('bell\x07')).toBe(true);
    expect(hasControlCharacters('delete\x7f')).toBe(true);
  });

  it('returns false for clean strings and non-strings', () => {
    expect(hasControlCharacters('hello')).toBe(false);
    expect(hasControlCharacters(null)).toBe(false);
    expect(hasControlCharacters(undefined)).toBe(false);
  });
});

describe('safeId', () => {
  it('produces a prefixed id', () => {
    const id = safeId('entry');
    expect(id.startsWith('entry-')).toBe(true);
    expect(id.length).toBeGreaterThan(6);
  });

  it('uses a custom prefix when provided', () => {
    const id = safeId('run');
    expect(id.startsWith('run-')).toBe(true);
  });
});
