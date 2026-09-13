import { Round, GameMode } from '../types/game';
import { loadGeoFeatures } from './countriesGeo';
import { getFlagUrl } from './countriesApi';

export interface PreloadProgress {
  stage: string;
  percent: number;
}

let hasStartedBackgroundPrewarm = false;
let isGeoWarm = false;
let areTexturesWarm = false;

/**
 * Preloads an image and decodes it so it's ready in GPU memory without jank.
 * If decoding fails (e.g. unsupported in test or network issue), falls back to onload/onerror safely.
 */
export function preloadImage(url: string, timeoutMs: number = 6000): Promise<boolean> {
  if (!url) return Promise.resolve(false);

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
 * Coordinates all game resources required before starting gameplay countdown.
 */
export async function preloadAllGameResources(
  round: Round | null,
  gameMode: GameMode,
  onProgressUpdate?: (progress: PreloadProgress) => void
): Promise<void> {
  const update = (stage: string, percent: number) => {
    if (onProgressUpdate) {
      onProgressUpdate({ stage, percent: Math.min(100, Math.max(0, percent)) });
    }
  };

  const isGlobeMode = gameMode === 'globe';

  if (isGlobeMode) {
    // Stage 1: GeoJSON Cartography (0% -> 40%)
    update('Calibrating 3D Earth Cartography & Polygons...', 15);
    await preloadGeoData();
    update('Cartography Calibrated', 40);

    // Stage 2: Earth Textures (40% -> 75%)
    update('Rendering High-Resolution Blue Marble Textures...', 50);
    await preloadEarthTextures((p) => {
      update('Rendering High-Resolution Blue Marble Textures...', 40 + Math.round((p * 35) / 100));
    });
    update('Textures Loaded', 75);

    // Stage 3: Round Flags (75% -> 100%)
    if (round) {
      update('Acquiring National Ensigns & Flag Standards...', 80);
      await preloadRoundFlags(round, (p) => {
        update('Acquiring National Ensigns & Flag Standards...', 75 + Math.round((p * 25) / 100));
      });
    }

    update('Expedition Ready! Launching...', 100);
  } else {
    // Standard Card Quiz Mode: focus on flag images
    update('Acquiring National Ensigns & Flag Standards...', 20);
    if (round) {
      await preloadRoundFlags(round, (p) => {
        update('Acquiring National Ensigns & Flag Standards...', 20 + Math.round((p * 75) / 100));
      });
    }
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

  // Use requestIdleCallback if available, otherwise setTimeout
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
