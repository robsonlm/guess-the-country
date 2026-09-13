import { Country, Round, GameMode } from '../types/game';
import { loadGeoFeatures, getNeighboringCountries } from './countriesGeo';
import { getFlagUrl } from './countriesApi';

export interface PreloadProgress {
  stage: string;
  percent: number;
}

let hasStartedBackgroundPrewarm = false;
let isGeoWarm = false;
let areTexturesWarm = false;
const preloadedImageUrls = new Set<string>();

/**
 * Preloads an image and decodes it so it's ready in GPU memory without jank.
 * If decoding fails (e.g. unsupported in test or network issue), falls back to onload/onerror safely.
 */
export function preloadImage(url: string, timeoutMs: number = 6000): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (preloadedImageUrls.has(url)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (settled) return;
      preloadedImageUrls.add(url);
      if (typeof img.decode === 'function') {
        img.decode()
          .then(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(true);
            }
          })
          .catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(true);
            }
          });
      } else {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

/**
 * Preload high-definition 3D Earth texture maps
 */
export async function preloadEarthTextures(
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;

  const blueMarbleUrl = `${cleanBase}textures/earth-blue-marble.jpg`;
  const topologyUrl = `${cleanBase}textures/earth-topology.png`;

  let finished = 0;
  const urls = [blueMarbleUrl, topologyUrl];

  const promises = urls.map((url) =>
    preloadImage(url, 7000).then((res) => {
      finished++;
      if (onProgress) {
        onProgress(Math.round((finished / urls.length) * 100));
      }
      return res;
    })
  );

  const results = await Promise.all(promises);
  areTexturesWarm = true;
  return results.every(Boolean);
}

/**
 * Preload the GeoJSON dataset for 3D Globe boundaries
 */
export async function preloadGeoData(): Promise<boolean> {
  try {
    const features = await loadGeoFeatures();
    isGeoWarm = features.length > 0;
    return isGeoWarm;
  } catch (err) {
    console.warn('Preloading GeoJSON failed, will retry at render:', err);
    return false;
  }
}

/**
 * Preloads all flags required for the current round
 */
export async function preloadRoundFlags(
  round: Round,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const urlsToPreload = new Set<string>();

  // Target country flag
  if (round.targetCountry) {
    const targetUrl = round.targetCountry.flagUrl || getFlagUrl(round.targetCountry.alpha2);
    if (targetUrl) urlsToPreload.add(targetUrl);
  }

  // Options flags
  if (Array.isArray(round.options)) {
    round.options.forEach((opt) => {
      if (opt.country) {
        const flagUrl = opt.country.flagUrl || getFlagUrl(opt.country.alpha2);
        if (flagUrl) urlsToPreload.add(flagUrl);
      }
    });
  }

  // Final three targets if applicable
  if (Array.isArray(round.finalThreeTargets)) {
    round.finalThreeTargets.forEach((c) => {
      const flagUrl = c.flagUrl || getFlagUrl(c.alpha2);
      if (flagUrl) urlsToPreload.add(flagUrl);
    });
  }

  const urlList = Array.from(urlsToPreload);
  if (urlList.length === 0) {
    if (onProgress) onProgress(100);
    return true;
  }

  let completed = 0;
  const promises = urlList.map((url) =>
    preloadImage(url, 4000).then((res) => {
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / urlList.length) * 100));
      }
      return res;
    })
  );

  await Promise.all(promises);
  return true;
}

/**
 * Proactively preloads and hardware-decodes all flags for the next N questions
 * in the background so round transitions after Question 1 are instantaneous.
 */
export async function preloadUpcomingQuestionsFlags(
  unsolvedPool: Country[],
  countryList: Country[],
  gameMode: GameMode,
  lookaheadCount: number = 3
): Promise<void> {
  if (!unsolvedPool || unsolvedPool.length === 0) return;

  const flagUrls = new Set<string>();
  const isGlobe = gameMode === 'globe';
  const optionCount = isGlobe ? 3 : 4;

  const countToPreload = Math.min(lookaheadCount, unsolvedPool.length);

  for (let i = 0; i < countToPreload; i++) {
    const target = unsolvedPool[i];
    if (!target) continue;

    const targetUrl = target.flagUrl || getFlagUrl(target.alpha2);
    if (targetUrl) flagUrls.add(targetUrl);

    if (isGlobe) {
      const distractorPool = unsolvedPool.filter((c) => c.alpha2 !== target.alpha2);
      const distractors = getNeighboringCountries(target, distractorPool, optionCount - 1);
      distractors.forEach((d) => {
        const dUrl = d.flagUrl || getFlagUrl(d.alpha2);
        if (dUrl) flagUrls.add(dUrl);
      });
    } else {
      for (let j = 0; j < optionCount - 1; j++) {
        const randIdx = (i * (optionCount - 1) + j) % countryList.length;
        const d = countryList[randIdx];
        if (d) {
          const dUrl = d.flagUrl || getFlagUrl(d.alpha2);
          if (dUrl) flagUrls.add(dUrl);
        }
      }
    }
  }

  // Preload and hardware-decode in parallel
  await Promise.all(Array.from(flagUrls).map((url) => preloadImage(url, 5000)));
}

/**
 * Coordinates all game resources required before starting gameplay countdown,
 * including both the active round and lookahead preloading for the next 3 questions.
 */
export async function preloadAllGameResources(
  round: Round | null,
  gameMode: GameMode,
  onProgressUpdate?: (progress: PreloadProgress) => void,
  upcomingContext?: { unsolvedPool: Country[]; countryList: Country[] }
): Promise<void> {
  const update = (stage: string, percent: number) => {
    if (onProgressUpdate) {
      onProgressUpdate({ stage, percent: Math.min(100, Math.max(0, percent)) });
    }
  };

  const isGlobeMode = gameMode === 'globe';

  if (isGlobeMode) {
    // Stage 1: GeoJSON Cartography (0% -> 35%)
    update('Calibrating 3D Earth Cartography & Polygons...', 15);
    await preloadGeoData();
    update('Cartography Calibrated', 35);

    // Stage 2: Earth Textures (35% -> 70%)
    update('Rendering High-Resolution Blue Marble Textures...', 45);
    await preloadEarthTextures((p) => {
      update('Rendering High-Resolution Blue Marble Textures...', 35 + Math.round((p * 35) / 100));
    });
    update('Textures Loaded', 70);

    // Stage 3: Round 1 Flags + Lookahead Next 3 Questions (70% -> 100%)
    update('Acquiring National Flags for Current & Upcoming Rounds...', 75);
    const preloadTasks: Promise<any>[] = [];

    if (round) {
      preloadTasks.push(
        preloadRoundFlags(round, (p) => {
          update('Acquiring National Flags for Current & Upcoming Rounds...', 70 + Math.round((p * 20) / 100));
        })
      );
    }

    if (upcomingContext && upcomingContext.unsolvedPool.length > 0) {
      preloadTasks.push(
        preloadUpcomingQuestionsFlags(
          upcomingContext.unsolvedPool,
          upcomingContext.countryList,
          gameMode,
          3
        )
      );
    }

    await Promise.all(preloadTasks);
    update('Expedition Ready! Launching...', 100);
  } else {
    // Standard Card Quiz Mode
    update('Acquiring National Flags for Current & Upcoming Rounds...', 20);
    const preloadTasks: Promise<any>[] = [];

    if (round) {
      preloadTasks.push(
        preloadRoundFlags(round, (p) => {
          update('Acquiring National Flags for Current & Upcoming Rounds...', 20 + Math.round((p * 70) / 100));
        })
      );
    }

    if (upcomingContext && upcomingContext.unsolvedPool.length > 0) {
      preloadTasks.push(
        preloadUpcomingQuestionsFlags(
          upcomingContext.unsolvedPool,
          upcomingContext.countryList,
          gameMode,
          3
        )
      );
    }

    await Promise.all(preloadTasks);
    update('Expedition Ready! Launching...', 100);
  }

  // Slight 180ms delay at 100% to ensure smooth visual transition
  await new Promise((resolve) => setTimeout(resolve, 180));
}

/**
 * Background pre-warm: runs silently on landing page mount so by the time
 * the player clicks 'Play', the heavy assets (>4MB) are already loaded in browser cache.
 */
export function startBackgroundPrewarm(): void {
  if (hasStartedBackgroundPrewarm) return;
  hasStartedBackgroundPrewarm = true;

  const runner = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1200));

  runner(() => {
    preloadGeoData()
      .catch(() => {})
      .then(() => {
        return preloadEarthTextures();
      })
      .catch(() => {});
  });
}

export function areResourcesWarm(): boolean {
  return isGeoWarm && areTexturesWarm;
}
