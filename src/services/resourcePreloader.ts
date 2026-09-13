import { Country, Round, GameMode } from '../types/game';
import { loadGeoFeatures, getNeighboringCountries } from './countriesGeo';
import { getFlagUrl, getEarthTextureUrls } from './countriesApi';

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
      const decodePromise = typeof img.decode === 'function' ? img.decode() : null;
      if (decodePromise && typeof decodePromise.then === 'function') {
        decodePromise
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
 * Preload 3D Earth texture maps.
 * Preloads low-resolution textures first for instant globe readiness,
 * then warms high-resolution textures in the background.
 */
export async function preloadEarthTextures(
  onProgress?: (percent: number) => void,
  warmHighResInBackground: boolean = true
): Promise<boolean> {
  const low = getEarthTextureUrls('low');
  const high = getEarthTextureUrls('high');

  const lowUrls = [low.blueMarbleUrl, low.topologyUrl];
  let finished = 0;

  const lowPromises = lowUrls.map((url) =>
    preloadImage(url, 4000).then((res) => {
      finished++;
      if (onProgress) {
        onProgress(Math.round((finished / lowUrls.length) * 100));
      }
      return res;
    })
  );

  const lowResults = await Promise.all(lowPromises);
  areTexturesWarm = true;

  if (warmHighResInBackground) {
    Promise.all([
      preloadImage(high.blueMarbleUrl, 8000),
      preloadImage(high.topologyUrl, 8000),
    ]).catch(() => {});
  }

  return lowResults.every(Boolean);
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
 * Preloads all flags required for the current round.
 * Low-resolution flags are loaded first for instant display,
 * while high-resolution flags are warmed concurrently in background.
 */
export async function preloadRoundFlags(
  round: Round,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const lowUrls = new Set<string>();
  const highUrls = new Set<string>();

  const registerCountry = (c?: Country) => {
    if (!c) return;
    const low = c.lowFlagUrl || getFlagUrl(c.alpha2, 'low');
    const high = c.flagUrl || getFlagUrl(c.alpha2, 'high');
    if (low) lowUrls.add(low);
    if (high) highUrls.add(high);
  };

  // Target country flag
  registerCountry(round.targetCountry);

  // Options flags
  if (Array.isArray(round.options)) {
    round.options.forEach((opt) => registerCountry(opt.country));
  }

  // Final three targets if applicable
  if (Array.isArray(round.finalThreeTargets)) {
    round.finalThreeTargets.forEach(registerCountry);
  }

  const lowList = Array.from(lowUrls);
  if (lowList.length === 0) {
    if (onProgress) onProgress(100);
    return true;
  }

  let completed = 0;
  const promises = lowList.map((url) =>
    preloadImage(url, 3000).then((res) => {
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / lowList.length) * 100));
      }
      return res;
    })
  );

  await Promise.all(promises);

  // Concurrently warm high-res flags in background
  Promise.all(Array.from(highUrls).map((url) => preloadImage(url, 6000))).catch(() => {});

  return true;
}

/**
 * Proactively preloads and hardware-decodes all flags for the next N questions
 * in the background. Low-res flags load first, followed by high-res warming.
 */
export async function preloadUpcomingQuestionsFlags(
  unsolvedPool: Country[],
  countryList: Country[],
  gameMode: GameMode,
  lookaheadCount: number = 3
): Promise<void> {
  if (!unsolvedPool || unsolvedPool.length === 0) return;

  const lowUrls = new Set<string>();
  const highUrls = new Set<string>();
  const isGlobe = gameMode === 'globe';
  const optionCount = isGlobe ? 3 : 4;

  const countToPreload = Math.min(lookaheadCount, unsolvedPool.length);

  const register = (c?: Country) => {
    if (!c) return;
    const low = c.lowFlagUrl || getFlagUrl(c.alpha2, 'low');
    const high = c.flagUrl || getFlagUrl(c.alpha2, 'high');
    if (low) lowUrls.add(low);
    if (high) highUrls.add(high);
  };

  for (let i = 0; i < countToPreload; i++) {
    const target = unsolvedPool[i];
    if (!target) continue;
    register(target);

    if (isGlobe) {
      const distractorPool = unsolvedPool.filter((c) => c.alpha2 !== target.alpha2);
      const distractors = getNeighboringCountries(target, distractorPool, optionCount - 1);
      distractors.forEach(register);
    } else {
      for (let j = 0; j < optionCount - 1; j++) {
        const randIdx = (i * (optionCount - 1) + j) % countryList.length;
        register(countryList[randIdx]);
      }
    }
  }

  // Preload and hardware-decode low-res flags first
  await Promise.all(Array.from(lowUrls).map((url) => preloadImage(url, 3500)));

  // Concurrently warm high-res flags
  Promise.all(Array.from(highUrls).map((url) => preloadImage(url, 6000))).catch(() => {});
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
    update('Loading 3D Earth Textures & Topology...', 45);
    await preloadEarthTextures((p) => {
      update('Loading 3D Earth Textures & Topology...', 35 + Math.round((p * 35) / 100));
    });
    update('Globe Textures Ready', 70);

    // Stage 3: Round 1 Flags + Lookahead Next 3 Questions (70% -> 100%)
    update('Loading Flags for Current & Upcoming Rounds...', 75);
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
