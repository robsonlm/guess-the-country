import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  preloadImage,
  preloadRoundFlags,
  preloadAllGameResources,
  preloadUpcomingQuestionsFlags,
} from './resourcePreloader';
import { Round } from '../types/game';

describe('resourcePreloader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      'Image',
      vi.fn().mockImplementation(() => {
        const imgInstance: any = {
          onload: null,
          onerror: null,
          decode: vi.fn().mockResolvedValue(undefined),
          set src(_val: string) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 5);
          },
        };
        return imgInstance;
      })
    );
  });

  it('handles empty image URLs gracefully', async () => {
    const res = await preloadImage('');
    expect(res).toBe(false);
  });

  it('preloads round flags successfully', async () => {
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
    const progressReports: Array<{ stage: string; percent: number }> = [];
    await preloadAllGameResources(null, 'flag-to-name', (p) => {
      progressReports.push(p);
    });

    expect(progressReports.length).toBeGreaterThan(0);
    const last = progressReports[progressReports.length - 1];
    expect(last.percent).toBe(100);
  });

  it('preloads upcoming questions flags for the next 3 questions', async () => {
    const testCountries = [
      { name: 'Spain', alpha2: 'ES', flagUrl: 'https://flags.test/es.png', capital: 'Madrid', region: 'Europe', population: 47000000 },
      { name: 'Italy', alpha2: 'IT', flagUrl: 'https://flags.test/it.png', capital: 'Rome', region: 'Europe', population: 60000000 },
      { name: 'Portugal', alpha2: 'PT', flagUrl: 'https://flags.test/pt.png', capital: 'Lisbon', region: 'Europe', population: 10000000 },
      { name: 'Greece', alpha2: 'GR', flagUrl: 'https://flags.test/gr.png', capital: 'Athens', region: 'Europe', population: 10000000 },
    ];

    await expect(
      preloadUpcomingQuestionsFlags(testCountries, testCountries, 'globe', 3)
    ).resolves.not.toThrow();
  });

  it('tracks preloaded images and warms edition flags', async () => {
    const { isImagePreloaded, markImagePreloaded, preloadEditionFlags } = await import(
      './resourcePreloader'
    );
    expect(isImagePreloaded('https://flags.test/sample.png')).toBe(false);
    markImagePreloaded('https://flags.test/sample.png');
    expect(isImagePreloaded('https://flags.test/sample.png')).toBe(true);

    const testStates = [
      { name: 'California', alpha2: 'US-CA', flagUrl: '/flags/us-states/ca.png', lowFlagUrl: '/flags/us-states/low/ca.png' },
      { name: 'Texas', alpha2: 'US-TX', flagUrl: '/flags/us-states/tx.png', lowFlagUrl: '/flags/us-states/low/tx.png' },
    ] as any;

    await expect(preloadEditionFlags(testStates)).resolves.not.toThrow();
    expect(isImagePreloaded('/flags/us-states/low/ca.png')).toBe(true);
    expect(isImagePreloaded('/flags/us-states/low/tx.png')).toBe(true);
  });
});
