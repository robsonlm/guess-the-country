import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  preloadImage,
  preloadRoundFlags,
  preloadAllGameResources,
} from './resourcePreloader';
import { Round } from '../types/game';

describe('resourcePreloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles empty image URLs gracefully', async () => {
    const res = await preloadImage('');
    expect(res).toBe(false);
  });

  it('preloads round flags successfully', async () => {
    // Mock Image
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      decode: vi.fn().mockResolvedValue(undefined),
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      },
    };
    vi.stubGlobal('Image', vi.fn(() => mockImage));

    const round: Round = {
      targetCountry: {
        name: 'France',
        alpha2: 'FR',
        capital: 'Paris',
        region: 'Europe',
        population: 67000000,
        flagUrl: 'https://flags.test/fr.png',
      },
      options: [
        {
          name: 'France',
          isCorrect: true,
          country: {
            name: 'France',
            alpha2: 'FR',
            capital: 'Paris',
            region: 'Europe',
            population: 67000000,
            flagUrl: 'https://flags.test/fr.png',
          },
        },
        {
          name: 'Germany',
          isCorrect: false,
          country: {
            name: 'Germany',
            alpha2: 'DE',
            capital: 'Berlin',
            region: 'Europe',
            population: 83000000,
            flagUrl: 'https://flags.test/de.png',
          },
        },
      ],
      remainingCount: 10,
      totalCount: 197,
      questionType: 'flag-to-name',
      isFinalThree: false,
    };

    let progressCalls = 0;
    const res = await preloadRoundFlags(round, () => {
      progressCalls++;
    });

    expect(res).toBe(true);
    expect(progressCalls).toBeGreaterThan(0);
  });

  it('orchestrates preloadAllGameResources with progress updates', async () => {
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      decode: vi.fn().mockResolvedValue(undefined),
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 5);
      },
    };
    vi.stubGlobal('Image', vi.fn(() => mockImage));

    const progressReports: Array<{ stage: string; percent: number }> = [];
    await preloadAllGameResources(null, 'flag-to-name', (p) => {
      progressReports.push(p);
    });

    expect(progressReports.length).toBeGreaterThan(0);
    const last = progressReports[progressReports.length - 1];
    expect(last.percent).toBe(100);
  });
});
