import { Country, Round, GameMode, GameEdition } from '../types/game';
import { loadGeoFeatures, getNeighboringCountries } from './countriesGeo';
import { getFlagUrl, getEarthTextureUrls } from './countriesApi';

export interface PreloadProgress {
  stage: string;
  percent: number;
}

let hasStartedBackgroundPrewarm = false;
let isGeoWarm = false;
let areTexturesWarm = false;
export const preloadedImageUrls = new Set<string>();

export function isImagePreloaded(url: string): boolean {
  return !!url && preloadedImageUrls.has(url);
}

export function markImagePreloaded(url: string): void {
  if (url) {
    preloadedImageUrls.add(url);
  }
}

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
export async function preloadGeoData(edition: GameEdition = 'world'): Promise<boolean> {
  try {
    const features = await loadGeoFeatures(edition);
    isGeoWarm = features.length > 0;
    return isGeoWarm;
  } catch (err) {
    console.warn('Preloading GeoJSON failed, will retry at render:', err);
    return false;
  }
}

/**
 * Preloads all flags for the active edition in batches
 * so that every single flag renders instantly from memory without delays.
 */
export async function preloadEditionFlags(
  countryList: Country[]
): Promise<void> {
  if (!countryList || countryList.length === 0) return;

  const lowUrls: string[] = [];
  const highUrls: string[] = [];

  for (const c of countryList) {
    const low = c.lowFlagUrl || getFlagUrl(c.alpha2, 'low');
    const high = c.flagUrl || getFlagUrl(c.alpha2, 'high');
    if (low) lowUrls.push(low);
    if (high) highUrls.push(high);
  }

  // Preload in batches of 20 with concurrent promise execution
  const batchSize = 20;
  for (let i = 0; i < highUrls.length; i += batchSize) {
    const highBatch = highUrls.slice(i, i + batchSize);
    const lowBatch = lowUrls.slice(i, i + batchSize);
    await Promise.all([
      ...highBatch.map((url) => preloadImage(url, 3000)),
      ...lowBatch.map((url) => preloadImage(url, 2500)),
    ]);
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

  const highList = Array.from(highUrls);
  const lowList = Array.from(lowUrls);
  if (highList.length === 0 && lowList.length === 0) {
    if (onProgress) onProgress(100);
    return true;
  }

  let completed = 0;
  const total = highList.length;
  const promises = highList.map((url) =>
    preloadImage(url, 3500).then((res) => {
      completed++;
      if (onProgress && total > 0) {
        onProgress(Math.round((completed / total) * 100));
      }
      return res;
    })
  );

  // Also warm low-res flags concurrently
  lowList.forEach((url) => preloadImage(url, 2000));

  await Promise.all(promises);
  return true;
}

/**
 * Proactively preloads and hardware-decodes all flags for the next N questions
 * in the background. High-res flags load first, followed by low-res warming.
 */
export async function preloadUpcomingQuestionsFlags(
  unsolvedPool: Country[],
  countryList: Country[],
  gameMode: GameMode,
  lookaheadCount: number = 6
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

  // Preload and hardware-decode high-res flags first
  await Promise.all(Array.from(highUrls).map((url) => preloadImage(url, 3500)));

  // Concurrently warm low-res fallbacks
  Promise.all(Array.from(lowUrls).map((url) => preloadImage(url, 2500))).catch(() => {});
}

/**
 * Coordinates all game resources required before starting gameplay countdown,
 * including both the active round and lookahead preloading for upcoming questions.
 */
export async function preloadAllGameResources(
  round: Round | null,
  gameMode: GameMode,
  onProgressUpdate?: (progress: PreloadProgress) => void,
  upcomingContext?: { unsolvedPool: Country[]; countryList: Country[] },
  edition: GameEdition = 'world'
): Promise<void> {
  const update = (stage: string, percent: number) => {
    if (onProgressUpdate) {
      onProgressUpdate({ stage, percent: Math.min(100, Math.max(0, percent)) });
    }
  };

  const isGlobeMode = gameMode === 'globe';

  if (isGlobeMode) {
    // Stage 1: GeoJSON Cartography (0% -> 35%)
    const geoStageLabel =
      edition === 'us-states'
        ? 'Calibrating 3D US State Cartography...'
        : edition === 'br-states'
        ? 'Calibrating 3D Brazilian State Cartography...'
        : 'Calibrating 3D Earth Cartography & Polygons...';
    update(geoStageLabel, 15);
    await preloadGeoData(edition);
    update('Cartography Calibrated', 35);

    // Stage 2: Earth Textures (35% -> 70%)
    update('Loading 3D Earth Textures & Topology...', 45);
    await preloadEarthTextures((p) => {
      update('Loading 3D Earth Textures & Topology...', 35 + Math.round((p * 35) / 100));
    });
    update('Globe Textures Ready', 70);

    // Stage 3: Round Flags + Lookahead (70% -> 100%)
    const flagStageLabel =
      edition === 'us-states' || edition === 'br-states'
        ? 'Acquiring State Flags for Current & Upcoming Rounds...'
        : 'Acquiring National Flags for Current & Upcoming Rounds...';
    update(flagStageLabel, 75);
    const preloadTasks: Promise<any>[] = [];

    if (round) {
      preloadTasks.push(
        preloadRoundFlags(round, (p) => {
          update(flagStageLabel, 70 + Math.round((p * 20) / 100));
        })
      );
    }

    if (upcomingContext && upcomingContext.countryList.length > 0) {
      preloadTasks.push(preloadEditionFlags(upcomingContext.countryList));
      if (upcomingContext.unsolvedPool.length > 0) {
        preloadTasks.push(
          preloadUpcomingQuestionsFlags(
            upcomingContext.unsolvedPool,
            upcomingContext.countryList,
            gameMode,
            6
          )
        );
      }
    }

    await Promise.all(preloadTasks);
    update('Expedition Ready! Launching...', 100);
  } else {
    // Standard Card Quiz Mode
    const flagStageLabel =
      edition === 'us-states' || edition === 'br-states'
        ? 'Acquiring State Flags for Current & Upcoming Rounds...'
        : 'Acquiring National Flags for Current & Upcoming Rounds...';
    update(flagStageLabel, 20);
    const preloadTasks: Promise<any>[] = [];

    if (round) {
      preloadTasks.push(
        preloadRoundFlags(round, (p) => {
          update(flagStageLabel, 20 + Math.round((p * 70) / 100));
        })
      );
    }

    if (upcomingContext && upcomingContext.countryList.length > 0) {
      preloadTasks.push(preloadEditionFlags(upcomingContext.countryList));
      if (upcomingContext.unsolvedPool.length > 0) {
        preloadTasks.push(
          preloadUpcomingQuestionsFlags(
            upcomingContext.unsolvedPool,
            upcomingContext.countryList,
            gameMode,
            6
          )
        );
      }
    }

    await Promise.all(preloadTasks);
    update('Expedition Ready! Launching...', 100);
  }

  // Slight 120ms delay at 100% to ensure smooth visual transition
  await new Promise((resolve) => setTimeout(resolve, 120));
}

/**
 * Background pre-warm: runs silently on landing page mount so by the time
 * the player clicks 'Play', heavy assets and flags are already loaded in browser cache.
 */
export function startBackgroundPrewarm(
  edition: GameEdition = 'world',
  countryList?: Country[]
): void {
  if (hasStartedBackgroundPrewarm) return;
  hasStartedBackgroundPrewarm = true;

  const runner = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 600));

  runner(() => {
    preloadGeoData(edition)
      .catch(() => {})
      .then(() => preloadEarthTextures())
      .catch(() => {});

    if (countryList && countryList.length > 0) {
      preloadEditionFlags(countryList).catch(() => {});
    }
  });
}

export function areResourcesWarm(): boolean {
  return isGeoWarm && areTexturesWarm;
}
