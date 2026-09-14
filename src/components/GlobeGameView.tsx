import React, { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'globe.gl';
import {
  Target,
  RotateCw,
  Globe as GlobeIcon,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Check,
  X,
  Send,
  Flag,
  ZoomIn,
  ZoomOut,
  Compass,
  Trophy,
} from 'lucide-react';
import { Country, ChoiceOption, LifelineState, GameEdition } from '../types/game';
import {
  loadGeoFeatures,
  getCountryCoordinates,
  getCountryTargetAltitude,
  resolveFeatureAlpha2,
  GeoFeature,
} from '../services/countriesGeo';
import { getEarthTextureUrls, getFlagUrl } from '../services/countriesApi';
import { ProgressiveFlag } from './ProgressiveFlag';
import '../styles/GlobeGame.css';

interface GlobeGameViewProps {
  edition?: GameEdition;
  targetCountry: Country;
  options: ChoiceOption[];
  onSelect: (index: number) => void;
  selectedOptionIndex: number | null;
  isResolving: boolean;
  conqueredAlphas: string[];
  totalCountriesCount: number;
  mistakesCount: number;
  streak: number;
  lifelineState: LifelineState;
  onUseCapital: () => void;
  disabled?: boolean;
  isAdmin?: boolean;
  isFinalThree?: boolean;
  finalThreeTargets?: Country[];
  onFinalThreeSubmit?: (assignments: Record<string, string>) => {
    success: boolean;
    results: Record<string, boolean>;
  };
  isExploreMode?: boolean;
  onExitExplore?: () => void;
  allCountries?: Country[];
}

const EMPTY_TARGETS: Country[] = [];

export const GlobeGameView: React.FC<GlobeGameViewProps> = ({
  edition,
  targetCountry,
  options,
  onSelect,
  selectedOptionIndex,
  isResolving,
  conqueredAlphas,
  totalCountriesCount,
  mistakesCount,
  streak,
  lifelineState,
  onUseCapital,
  disabled = false,
  isAdmin = false,
  isFinalThree = false,
  finalThreeTargets = EMPTY_TARGETS,
  onFinalThreeSubmit,
  isExploreMode = false,
  onExitExplore,
  allCountries = [],
}) => {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  const isUsStatesEdition =
    edition === 'us-states' ||
    targetCountry?.alpha2?.startsWith('US-') ||
    (allCountries.length > 0 && allCountries[0]?.alpha2?.startsWith('US-'));
  const activeEdition: GameEdition = isUsStatesEdition ? 'us-states' : 'world';

  // Explore Mode state: selected country card & hover highlight
  const [selectedExploreCountry, setSelectedExploreCountry] = useState<Country | null>(null);
  const [hoveredAlpha, setHoveredAlpha] = useState<string | null>(null);

  // Final 3 state
  const [activeTargetIndex, setActiveTargetIndex] = useState<number>(0);
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, string>>(() => {
    if (isAdmin && isFinalThree && finalThreeTargets.length > 0) {
      const initial: Record<string, string> = {};
      finalThreeTargets.forEach((c) => {
        initial[c.alpha2] = c.alpha2;
      });
      return initial;
    }
    return {};
  });
  const [validationResults, setValidationResults] = useState<Record<string, boolean> | null>(null);

  // Reset Final 3 assignments when targets change, or pre-populate if admin
  useEffect(() => {
    if (!isFinalThree) return;
    if (isAdmin && finalThreeTargets.length > 0) {
      const prePopulated: Record<string, string> = {};
      finalThreeTargets.forEach((c) => {
        prePopulated[c.alpha2] = c.alpha2;
      });
      setSelectedAssignments(prePopulated);
    } else {
      setSelectedAssignments({});
    }
    setValidationResults(null);
    setActiveTargetIndex(0);
  }, [finalThreeTargets, isAdmin, isFinalThree]);

  const currentFocusedCountry = isFinalThree && finalThreeTargets.length > 0
    ? finalThreeTargets[activeTargetIndex] || finalThreeTargets[0]
    : targetCountry;

  const conqueredCount = conqueredAlphas.length;
  const conqueredPercent = Math.min(
    100,
    Math.round((conqueredCount / Math.max(1, totalCountriesCount)) * 100)
  );
  const totalAttempts = conqueredCount + mistakesCount;
  const accuracy = totalAttempts > 0 ? Math.round((conqueredCount / totalAttempts) * 100) : 100;

  // 1. Load GeoJSON features on mount or edition change
  useEffect(() => {
    let isMounted = true;
    loadGeoFeatures(activeEdition).then((features) => {
      if (isMounted) {
        setGeoFeatures(features);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeEdition]);

  // 2. Initialize Globe instance
  useEffect(() => {
    if (!globeContainerRef.current) return;

    const width = globeContainerRef.current.clientWidth || 800;
    const height = globeContainerRef.current.clientHeight || 540;

    const lowTextures = getEarthTextureUrls('low');
    const highTextures = getEarthTextureUrls('high');

    const globe = new (Globe as any)(globeContainerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#2a9d8f')
      .atmosphereAltitude(0.22)
      .globeImageUrl(lowTextures.blueMarbleUrl)
      .bumpImageUrl(lowTextures.topologyUrl)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius('radius')
      .pointResolution(24);

    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.8;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 105;
      controls.maxDistance = 650;
    }

    globeInstanceRef.current = globe;
    setIsGlobeReady(true);

    // Progressive upgrade: decode high-res textures in background and swap onto globe
    const highMarbleImg = new Image();
    highMarbleImg.onload = () => {
      if (globeInstanceRef.current) {
        globeInstanceRef.current.globeImageUrl(highTextures.blueMarbleUrl);
      }
    };
    highMarbleImg.src = highTextures.blueMarbleUrl;

    const highBumpImg = new Image();
    highBumpImg.onload = () => {
      if (globeInstanceRef.current) {
        globeInstanceRef.current.bumpImageUrl(highTextures.topologyUrl);
      }
    };
    highBumpImg.src = highTextures.topologyUrl;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width && entry.contentRect.height && globeInstanceRef.current) {
          globeInstanceRef.current.width(entry.contentRect.width);
          globeInstanceRef.current.height(entry.contentRect.height);
        }
      }
    });
    resizeObserver.observe(globeContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (globeContainerRef.current) {
        globeContainerRef.current.replaceChildren();
      }
      globeInstanceRef.current = null;
    };
  }, []);

  // 3. Update Polygons & Rings when features, targetCountry, conqueredAlphas, explore state, or final targets update
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || geoFeatures.length === 0) return;

    const activeTargetAlpha = isExploreMode
      ? selectedExploreCountry?.alpha2.toUpperCase()
      : currentFocusedCountry?.alpha2.toUpperCase();

    const finalTargetAlphas = new Set(
      !isExploreMode && isFinalThree ? finalThreeTargets.map((c) => c.alpha2.toUpperCase()) : []
    );
    const conqueredSet = new Set(conqueredAlphas.map((a) => a.toUpperCase()));
    const hoveredAlphaUpper = hoveredAlpha ? hoveredAlpha.toUpperCase() : null;

    const getFeatureAlpha = (d: any): string => {
      if (!d) return '';
      return (d.alpha2 || d.properties?.alpha2 || resolveFeatureAlpha2(d.properties) || '').toUpperCase();
    };

    // Polygons dataset
    globe
      .polygonsData(geoFeatures)
      .polygonCapColor((d: any) => {
        const a = getFeatureAlpha(d);
        if (a === activeTargetAlpha) {
          return isExploreMode ? 'rgba(255, 183, 3, 0.92)' : 'rgba(247, 127, 0, 0.88)';
        }
        if (isExploreMode && hoveredAlphaUpper && a === hoveredAlphaUpper) {
          return 'rgba(56, 189, 248, 0.75)'; // Hover glow in explore mode
        }
        if (finalTargetAlphas.has(a)) {
          return 'rgba(56, 189, 248, 0.82)'; // Other remaining final targets: Neon sky cyan
        }
        if (conqueredSet.has(a)) {
          return 'rgba(16, 185, 129, 0.65)'; // Conquered country: Emerald green
        }
        return 'rgba(25, 45, 75, 0.42)'; // Default neutral territory
      })
      .polygonSideColor((d: any) => {
        const a = getFeatureAlpha(d);
        if (a === activeTargetAlpha) return 'rgba(247, 127, 0, 0.45)';
        if (isExploreMode && hoveredAlphaUpper && a === hoveredAlphaUpper) return 'rgba(56, 189, 248, 0.35)';
        if (finalTargetAlphas.has(a)) return 'rgba(56, 189, 248, 0.40)';
        if (conqueredSet.has(a)) return 'rgba(16, 185, 129, 0.25)';
        return 'rgba(20, 35, 60, 0.12)';
      })
      .polygonStrokeColor((d: any) => {
        const a = getFeatureAlpha(d);
        if (a === activeTargetAlpha) return '#ffffff';
        if (isExploreMode && hoveredAlphaUpper && a === hoveredAlphaUpper) return '#7dd3fc';
        if (finalTargetAlphas.has(a)) return '#38bdf8';
        if (conqueredSet.has(a)) return '#6ee7b7';
        return 'rgba(72, 202, 228, 0.3)';
      })
      .polygonAltitude((d: any) => {
        const a = getFeatureAlpha(d);
        if (a === activeTargetAlpha) return 0.07;
        if (isExploreMode && hoveredAlphaUpper && a === hoveredAlphaUpper) return 0.035;
        if (finalTargetAlphas.has(a)) return 0.04;
        if (conqueredSet.has(a)) return 0.015;
        return 0.005;
      });

    // Pulsing Rings & Target Beacons
    if (isExploreMode) {
      if (selectedExploreCountry) {
        const coords = getCountryCoordinates(selectedExploreCountry.alpha2);
        globe
          .ringsData([
            {
              lat: coords.lat,
              lng: coords.lng,
              maxR: 5.5,
              propagationSpeed: 2.2,
              repeatPeriod: 1000,
              color: () => '#ffb703',
            },
          ])
          .ringColor((t: any) => (typeof t.color === 'function' ? t.color(t) : t.color))
          .ringMaxRadius('maxR')
          .ringPropagationSpeed('propagationSpeed')
          .ringRepeatPeriod('repeatPeriod')
          .pointsData([
            {
              lat: coords.lat,
              lng: coords.lng,
              color: '#ffb703',
              radius: 0.45,
              altitude: 0.05,
            },
          ]);
      } else {
        globe.ringsData([]).pointsData([]);
      }
    } else if (isFinalThree && finalThreeTargets.length > 0) {
      const rings = finalThreeTargets.map((country) => {
        const coords = getCountryCoordinates(country.alpha2);
        const isActive = country.alpha2.toUpperCase() === activeTargetAlpha;
        return {
          lat: coords.lat,
          lng: coords.lng,
          maxR: isActive ? 6.0 : 3.8,
          propagationSpeed: isActive ? 2.4 : 1.5,
          repeatPeriod: isActive ? 1000 : 1500,
          color: () => (isActive ? '#ff9e00' : '#38bdf8'),
        };
      });

      const points = finalThreeTargets.map((country) => {
        const coords = getCountryCoordinates(country.alpha2);
        const isActive = country.alpha2.toUpperCase() === activeTargetAlpha;
        return {
          lat: coords.lat,
          lng: coords.lng,
          color: isActive ? '#ffb703' : '#38bdf8',
          radius: isActive ? 0.45 : 0.28,
          altitude: 0.05,
        };
      });

      globe
        .ringsData(rings)
        .ringColor((t: any) => (typeof t.color === 'function' ? t.color(t) : t.color))
        .ringMaxRadius('maxR')
        .ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod')
        .pointsData(points);
    } else if (targetCountry) {
      const coords = getCountryCoordinates(targetCountry.alpha2);
      globe
        .ringsData([
          {
            lat: coords.lat,
            lng: coords.lng,
            maxR: 5.5,
            propagationSpeed: 2.2,
            repeatPeriod: 1000,
            color: () => '#ff9e00',
          },
        ])
        .ringColor((t: any) => (typeof t.color === 'function' ? t.color(t) : t.color))
        .ringMaxRadius('maxR')
        .ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod')
        .pointsData([
          {
            lat: coords.lat,
            lng: coords.lng,
            color: '#ffb703',
            radius: 0.45,
            altitude: 0.05,
          },
        ]);
    } else {
      globe.ringsData([]).pointsData([]);
    }
  }, [
    geoFeatures,
    currentFocusedCountry,
    targetCountry,
    conqueredAlphas,
    isFinalThree,
    finalThreeTargets,
    isGlobeReady,
    isExploreMode,
    selectedExploreCountry,
    hoveredAlpha,
  ]);

  // 4. Smooth camera fly-to on target country change, auto-zooming so it fills at least ~30% of screen
  const focusTargetCountry = useCallback(
    (countryToFocus?: Country, duration = 1000) => {
      const globe = globeInstanceRef.current;
      const target = countryToFocus || currentFocusedCountry;
      if (!globe || !target) return;

      const coords = getCountryCoordinates(target.alpha2);
      const targetAltitude = getCountryTargetAltitude(target.alpha2);

      globe.pointOfView(
        {
          lat: coords.lat,
          lng: coords.lng,
          altitude: targetAltitude,
        },
        duration
      );
    },
    [currentFocusedCountry]
  );

  useEffect(() => {
    if (isGlobeReady && currentFocusedCountry && !isExploreMode) {
      focusTargetCountry(currentFocusedCountry, 1200);
    }
  }, [currentFocusedCountry, isGlobeReady, isExploreMode, focusTargetCountry]);

  // 5. Explore Mode Interactive Country Selection (Click & Hover)
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    if (isExploreMode) {
      const getFeatureAlpha = (d: any): string => {
        if (!d) return '';
        return (d.alpha2 || d.properties?.alpha2 || resolveFeatureAlpha2(d.properties) || '').toUpperCase();
      };

      globe.onPolygonHover((polygon: any) => {
        if (globeContainerRef.current) {
          globeContainerRef.current.style.cursor = polygon ? 'pointer' : 'grab';
        }
        const alpha = polygon ? getFeatureAlpha(polygon) : null;
        setHoveredAlpha(alpha);
      });

      globe.onPolygonClick((polygon: any) => {
        if (!polygon) return;
        const alpha = getFeatureAlpha(polygon);
        if (!alpha) return;

        const found = allCountries?.find((c) => c.alpha2.toUpperCase() === alpha);
        if (found) {
          setSelectedExploreCountry(found);
          focusTargetCountry(found, 900);
        } else if (polygon.properties?.NAME || polygon.properties?.ADMIN) {
          const fallback: Country = {
            name: polygon.properties.NAME || polygon.properties.ADMIN,
            alpha2: alpha,
            capital: polygon.properties.CAPITAL || 'N/A',
            region: polygon.properties.CONTINENT || polygon.properties.REGION || 'World',
            subregion: polygon.properties.SUBREGION || '',
            mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(polygon.properties.NAME || '')}`,
            flagUrl: getFlagUrl(alpha, 'high'),
            lowFlagUrl: getFlagUrl(alpha, 'low'),
          };
          setSelectedExploreCountry(fallback);
          focusTargetCountry(fallback, 900);
        }
      });
    } else {
      globe.onPolygonHover(() => {
        if (globeContainerRef.current) {
          globeContainerRef.current.style.cursor = 'grab';
        }
      });
      globe.onPolygonClick(() => {});
    }
  }, [isExploreMode, allCountries, focusTargetCountry]);

  // Auto-rotate toggle
  const toggleAutoRotate = () => {
    const globe = globeInstanceRef.current;
    if (!globe) return;
    const controls = globe.controls();
    if (controls) {
      const next = !isAutoRotating;
      controls.autoRotate = next;
      setIsAutoRotating(next);
    }
  };

  // Interactive Zoom actions
  const handleZoomIn = () => {
    const globe = globeInstanceRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.max(0.08, pov.altitude * 0.65) }, 400);
  };

  const handleZoomOut = () => {
    const globe = globeInstanceRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(3.5, pov.altitude * 1.5) }, 400);
  };

  // Final 3 flag assignment logic
  const handleAssignFlag = (flagOptionIndex: number) => {
    if (isResolving || disabled || !isFinalThree || finalThreeTargets.length === 0) return;

    const chosenFlagCountry = options[flagOptionIndex]?.country;
    if (!chosenFlagCountry) return;

    const currentCountry = finalThreeTargets[activeTargetIndex];
    if (!currentCountry) return;

    const targetAlpha = currentCountry.alpha2;
    const chosenFlagAlpha = chosenFlagCountry.alpha2;

    const updated: Record<string, string> = { ...selectedAssignments };

    // Tapping already-assigned flag toggles it off
    if (updated[targetAlpha] === chosenFlagAlpha) {
      delete updated[targetAlpha];
      setSelectedAssignments(updated);
      setValidationResults(null);
      return;
    }

    // Remove flag from any other country target (1-to-1 match)
    Object.keys(updated).forEach((key) => {
      if (updated[key] === chosenFlagAlpha) {
        delete updated[key];
      }
    });

    updated[targetAlpha] = chosenFlagAlpha;
    setSelectedAssignments(updated);
    setValidationResults(null);

    // Auto-advance to next unassigned country target
    const nextUnassignedIdx = finalThreeTargets.findIndex(
      (c, idx) => idx !== activeTargetIndex && !updated[c.alpha2]
    );

    if (nextUnassignedIdx !== -1) {
      setActiveTargetIndex(nextUnassignedIdx);
      focusTargetCountry(finalThreeTargets[nextUnassignedIdx], 900);
    }
  };

  const handleClearAssignment = (countryAlpha: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isResolving || disabled) return;

    const updated = { ...selectedAssignments };
    delete updated[countryAlpha];
    setSelectedAssignments(updated);
    setValidationResults(null);
  };

  const handleFinalSubmit = () => {
    if (isResolving || disabled || !onFinalThreeSubmit) return;

    const res = onFinalThreeSubmit(selectedAssignments);
    setValidationResults(res.results);
  };

  const assignedCount = finalThreeTargets.filter((c) => !!selectedAssignments[c.alpha2]).length;
  const isAllAssigned = finalThreeTargets.length > 0 && assignedCount === finalThreeTargets.length;

  // Final 3 Keyboard listener for [1], [2], [3] and [Enter]
  useEffect(() => {
    if (!isFinalThree || isResolving || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        handleAssignFlag(num - 1);
      } else if (e.key === 'Enter' && isAllAssigned) {
        handleFinalSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFinalThree, isResolving, disabled, options, isAllAssigned, selectedAssignments, activeTargetIndex, finalThreeTargets]);

  // Escape key listener to deselect country or exit explore mode
  useEffect(() => {
    if (!isExploreMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedExploreCountry) {
          setSelectedExploreCountry(null);
        } else if (onExitExplore) {
          onExitExplore();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExploreMode, selectedExploreCountry, onExitExplore]);

  return (
    <div
      className={`globe-game-container ${isFinalThree ? 'final-three-active' : ''} ${
        isExploreMode ? 'explore-mode-active' : ''
      }`}
    >
      {/* 3D Globe Stage Canvas */}
      <div className="globe-stage">
        <div ref={globeContainerRef} className="globe-canvas-wrapper" />

        {/* Floating Top HUD: Explore Mode vs Gameplay */}
        {isExploreMode ? (
          <div className="globe-hud-top explore-hud">
            <div className="globe-stats-pill-group">
              <div className="globe-stat-badge explore-badge">
                <Compass size={15} style={{ color: '#38bdf8' }} />
                <span className="explore-full-title">
                  <strong>World Atlas Exploration</strong>
                </span>
                <span className="explore-compact-title">
                  <strong>Atlas</strong>
                </span>
              </div>

              <div className="globe-stat-badge conquest" title="Conquered Countries">
                <GlobeIcon size={14} />
                <span className="conquest-full-text">
                  Conquest: <strong>{conqueredCount}</strong> / {totalCountriesCount} ({conqueredPercent}%)
                </span>
                <span className="conquest-compact-text">
                  <strong>{conqueredCount}</strong>/{totalCountriesCount}
                </span>
              </div>
            </div>

            <div className="globe-actions-group">
              <div className="globe-zoom-group">
                <button
                  type="button"
                  className="globe-action-btn globe-zoom-btn"
                  onClick={handleZoomIn}
                  title="Zoom in closer (+)"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  className="globe-action-btn globe-zoom-btn"
                  onClick={handleZoomOut}
                  title="Zoom out (-)"
                >
                  <ZoomOut size={14} />
                </button>
              </div>

              <button
                type="button"
                className={`globe-action-btn ${isAutoRotating ? 'active' : ''}`}
                onClick={toggleAutoRotate}
                title="Toggle globe auto-rotation"
              >
                <RotateCw size={14} />
                <span>{isAutoRotating ? 'Rotating' : 'Auto-Rotate'}</span>
              </button>

              {onExitExplore && (
                <button
                  type="button"
                  className="globe-action-btn victory-return-btn"
                  onClick={onExitExplore}
                  title="Return to Victory Summary"
                >
                  <Trophy size={14} style={{ color: '#ffd166' }} />
                  <span>Victory Screen</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="globe-hud-top">
            <div className="globe-stats-pill-group">
              <div className="globe-stat-badge conquest" title="Conquered Countries">
                <GlobeIcon size={14} />
                <span className="conquest-full-text">
                  Conquest: <strong>{conqueredCount}</strong> / {totalCountriesCount} ({conqueredPercent}%)
                </span>
                <span className="conquest-compact-text">
                  <strong>{conqueredCount}</strong>/{totalCountriesCount} ({conqueredPercent}%)
                </span>
              </div>

              <div
                className={`globe-stat-badge mistakes ${mistakesCount > 0 ? 'danger' : ''}`}
                title="Total Mistakes Made"
              >
                <AlertTriangle size={14} />
                <span className="mistakes-full-text">
                  Mistakes: <strong>{mistakesCount}</strong>
                </span>
                <span className="mistakes-compact-text">
                  <strong>{mistakesCount}</strong>
                </span>
              </div>

              <div className="globe-stat-badge accuracy" title="Conquest Accuracy Rate">
                <Sparkles size={14} />
                <span>Accuracy: {accuracy}%</span>
              </div>

              {streak >= 3 && (
                <div className="globe-stat-badge streak" style={{ borderColor: '#f77f00', color: '#f77f00' }}>
                  🔥 {streak}
                </div>
              )}
            </div>

            {/* Action buttons (Focus country, Zoom controls, rotate) */}
            <div className="globe-actions-group">
              <div className="globe-zoom-group">
                <button
                  type="button"
                  className="globe-action-btn globe-zoom-btn"
                  onClick={handleZoomIn}
                  title="Zoom in closer (+)"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  className="globe-action-btn globe-zoom-btn"
                  onClick={handleZoomOut}
                  title="Zoom out (-)"
                >
                  <ZoomOut size={14} />
                </button>
              </div>

              <button
                type="button"
                className="globe-action-btn"
                onClick={() => focusTargetCountry(currentFocusedCountry, 800)}
                title="Center camera on highlighted country"
              >
                <Target size={14} />
                <span className="focus-text">Focus Target</span>
              </button>

              <button
                type="button"
                className={`globe-action-btn ${isAutoRotating ? 'active' : ''}`}
                onClick={toggleAutoRotate}
                title="Toggle globe auto-rotation"
              >
                <RotateCw size={14} />
                <span>{isAutoRotating ? 'Rotating' : 'Auto-Rotate'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Standard Single-Country Feedback Toast */}
        {!isExploreMode && !isFinalThree && isResolving && selectedOptionIndex !== null && (
          <div
            className={`globe-feedback-toast ${
              selectedOptionIndex >= 0 && options[selectedOptionIndex]?.isCorrect ? 'correct' : 'wrong'
            }`}
          >
            {selectedOptionIndex >= 0 && options[selectedOptionIndex]?.isCorrect ? (
              <>
                <CheckCircle2 size={18} />
                <span>Territory Conquered! +1 Country</span>
              </>
            ) : (
              <>
                <ShieldAlert size={18} />
                <span>Mistake Recorded! Target was {targetCountry.name}</span>
              </>
            )}
          </div>
        )}

        {/* Target Country Clue Pill OR Explore Mode Country Detail Card */}
        {isExploreMode ? (
          selectedExploreCountry ? (
            <div className="globe-explore-country-card fade-in">
              <button
                type="button"
                className="explore-card-close"
                onClick={() => setSelectedExploreCountry(null)}
                title="Close details"
                aria-label="Close details"
              >
                <X size={16} />
              </button>

              <div className="explore-card-flag-box">
                <ProgressiveFlag
                  alpha2={selectedExploreCountry.alpha2}
                  name={selectedExploreCountry.name}
                  flagUrl={selectedExploreCountry.flagUrl}
                  lowFlagUrl={selectedExploreCountry.lowFlagUrl}
                  className="explore-card-flag-img"
                  loading="eager"
                />
              </div>

              <div className="explore-card-info">
                <div className="explore-country-header">
                  <h3 className="explore-country-name">{selectedExploreCountry.name}</h3>
                  {conqueredAlphas.some(
                    (a) => a.toUpperCase() === selectedExploreCountry.alpha2.toUpperCase()
                  ) ? (
                    <span className="explore-status-pill conquered">
                      <CheckCircle2 size={12} /> Conquered
                    </span>
                  ) : (
                    <span className="explore-status-pill unvisited">Unvisited</span>
                  )}
                </div>

                <div className="explore-meta-grid">
                  {selectedExploreCountry.nickname && (
                    <div className="explore-meta-item">
                      <span className="meta-label">Nickname</span>
                      <span className="meta-value">{selectedExploreCountry.nickname}</span>
                    </div>
                  )}
                  {selectedExploreCountry.capital && (
                    <div className="explore-meta-item">
                      <span className="meta-label">{isUsStatesEdition ? 'State Capital' : 'Capital'}</span>
                      <span className="meta-value">{selectedExploreCountry.capital}</span>
                    </div>
                  )}
                  {selectedExploreCountry.region && (
                    <div className="explore-meta-item">
                      <span className="meta-label">Region</span>
                      <span className="meta-value">
                        {selectedExploreCountry.region}
                        {selectedExploreCountry.subregion ? ` • ${selectedExploreCountry.subregion}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="explore-card-actions">
                  <button
                    type="button"
                    className="explore-action-btn"
                    onClick={() => focusTargetCountry(selectedExploreCountry, 800)}
                    title="Center camera on this territory"
                  >
                    <Target size={13} /> Re-center
                  </button>
                  {allCountries && allCountries.length > 1 && (
                    <button
                      type="button"
                      className="explore-action-btn next-btn"
                      onClick={() => {
                        const currentIdx = allCountries.findIndex(
                          (c) => c.alpha2.toUpperCase() === selectedExploreCountry.alpha2.toUpperCase()
                        );
                        const nextIdx = (currentIdx + 1) % allCountries.length;
                        const nextCountry = allCountries[nextIdx];
                        setSelectedExploreCountry(nextCountry);
                        focusTargetCountry(nextCountry, 900);
                      }}
                      title={isUsStatesEdition ? 'Explore next US state' : 'Explore next territory'}
                    >
                      {isUsStatesEdition ? 'Next State →' : 'Next Territory →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="globe-explore-guide-pill fade-in">
              <Sparkles size={14} style={{ color: '#38bdf8' }} />
              <span>
                {isUsStatesEdition
                  ? 'Click any US State on the 3D globe to view its flag and details'
                  : 'Click any country on the 3D globe to view its flag and details'}
              </span>
            </div>
          )
        ) : (
          <div className="globe-target-banner">
            <div className="pulse-dot" />
            <div className="globe-target-content">
              <div className="globe-target-text">
                {isFinalThree ? (
                  <>
                    <span className="banner-full-text">
                      Final {finalThreeTargets.length} Showdown • Target #{activeTargetIndex + 1}
                    </span>
                    <span className="banner-compact-text">
                      Target #{activeTargetIndex + 1}
                    </span>
                  </>
                ) : isUsStatesEdition ? (
                  'Highlighted US State'
                ) : (
                  'Highlighted Territory'
                )}
              </div>
              <div className="globe-target-subtext">
                {currentFocusedCountry?.region ? `Region: ${currentFocusedCountry.region}` : 'Locate on globe'}
                {lifelineState.activeHintText ? ` | ${lifelineState.activeHintText}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conquest Progress Bar (Normal game rounds only) */}
      {!isExploreMode && (
        <div className="globe-conquest-bar-container" title={`Conquest: ${conqueredPercent}%`}>
          <div className="globe-conquest-bar-fill" style={{ width: `${conqueredPercent}%` }} />
        </div>
      )}

      {/* Clues & Lifeline Shortcuts (Normal rounds only) */}
      {!isExploreMode && !isFinalThree && (
        <div className="globe-clues-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <span className="globe-prompt-text" style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Choose the correct flag for the highlighted {isUsStatesEdition ? 'US state' : 'territory'}:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="action-btn"
              onClick={onUseCapital}
              disabled={isResolving || disabled || lifelineState.capitalCredits <= 0 || lifelineState.capitalUsedOnCurrentRound}
              style={{
                fontSize: '0.76rem',
                padding: '3px 9px',
                opacity: lifelineState.capitalCredits <= 0 || lifelineState.capitalUsedOnCurrentRound ? 0.55 : 1,
                cursor: lifelineState.capitalCredits <= 0 || lifelineState.capitalUsedOnCurrentRound ? 'not-allowed' : 'pointer',
              }}
              title={
                lifelineState.capitalUsedOnCurrentRound
                  ? 'Capital clue already used this round'
                  : lifelineState.capitalCredits <= 0
                  ? 'No capital credits remaining (earn +1 every 5 correct streak)'
                  : `Reveal capital clue (${lifelineState.capitalCredits} credit${lifelineState.capitalCredits > 1 ? 's' : ''} available)`
              }
            >
              <HelpCircle size={13} /> Capital Clue ({lifelineState.capitalCredits})
            </button>
          </div>
        </div>
      )}

      {/* FINAL 3 SHOWDOWN MODE INTERACTIVE PANEL OR STANDARD FLAG CHOICES DECK */}
      {!isExploreMode &&
        (isFinalThree ? (
          <div className="final-three-container fade-in">
            <div className="final-three-header">
              <div className="final-three-badge">
                <Sparkles size={13} />
                <span>FINAL {finalThreeTargets.length} SHOWDOWN</span>
              </div>
              <p className="final-three-instruction">
                Select a {isUsStatesEdition ? 'state' : 'territory'}, then pick its flag below.
              </p>
            </div>

            {/* 3 Target Country Cards */}
            <div className="final-three-targets-grid">
              {finalThreeTargets.map((country, idx) => {
                const isFocused = idx === activeTargetIndex;
                const assignedAlpha = selectedAssignments[country.alpha2];
                const assignedOption = options.find((opt) => opt.country.alpha2 === assignedAlpha);
                const isValidated = validationResults !== null;
                const isCorrect = validationResults?.[country.alpha2];

                let statusClass = '';
                if (isValidated) {
                  statusClass = isCorrect ? 'status-correct' : 'status-wrong';
                } else if (isFocused) {
                  statusClass = 'status-focused';
                } else if (assignedAlpha) {
                  statusClass = 'status-assigned';
                }

                return (
                  <div
                    key={country.alpha2}
                    className={`final-target-card ${statusClass}`}
                    onClick={() => {
                      setActiveTargetIndex(idx);
                      focusTargetCountry(country, 900);
                    }}
                  >
                    <div className="final-target-header">
                      <span className="final-target-number">Target #{idx + 1}</span>
                      <button
                        type="button"
                        className="final-target-focus-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTargetIndex(idx);
                          focusTargetCountry(country, 800);
                        }}
                        title={`Focus camera on ${country.name}`}
                      >
                        <Target size={11} />
                      </button>
                    </div>

                    <div className="final-target-name">{country.name}</div>
                    <div className="final-target-region">{country.region || 'World'}</div>

                    {/* Flag Drop Slot */}
                    <div className="final-target-slot">
                      {assignedOption ? (
                        <div className="final-assigned-flag-chip">
                          <ProgressiveFlag
                            alpha2={assignedOption.country.alpha2}
                            name={assignedOption.name}
                            flagUrl={assignedOption.country.flagUrl}
                            lowFlagUrl={assignedOption.country.lowFlagUrl}
                            className="final-assigned-flag-img"
                            loading="eager"
                          />
                          <span className="final-assigned-flag-name">
                            {assignedOption.name}
                          </span>
                          {!isResolving && !disabled && (
                            <button
                              type="button"
                              className="final-assigned-clear-btn"
                              onClick={(e) => handleClearAssignment(country.alpha2, e)}
                              title="Remove assigned flag"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="final-target-empty-slot">
                          <Flag size={11} />
                          <span>Tap flag below</span>
                        </div>
                      )}
                    </div>

                    {/* Post-submit validation status badge */}
                    {isValidated && (
                      <div className={`final-target-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                        {isCorrect ? (
                          <>
                            <Check size={12} />
                            <span>Matched!</span>
                          </>
                        ) : (
                          <>
                            <X size={12} />
                            <span>Mismatch ({country.name})</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3 Flag Cards Deck */}
            <div className="globe-choices-deck" style={{ marginTop: '0.35rem' }}>
              {options.map((option, index) => {
                const assignedTarget = finalThreeTargets.find(
                  (t) => selectedAssignments[t.alpha2] === option.country.alpha2
                );
                const isAssignedToActive =
                  selectedAssignments[finalThreeTargets[activeTargetIndex]?.alpha2] ===
                  option.country.alpha2;

                let cardClass = '';
                if (isAssignedToActive) cardClass = 'assigned-active';
                else if (assignedTarget) cardClass = 'assigned-other';

                const assignedTargetIdx = assignedTarget
                  ? finalThreeTargets.findIndex((t) => t.alpha2 === assignedTarget.alpha2)
                  : -1;

                return (
                  <button
                    key={`${option.country.alpha2}-${index}`}
                    type="button"
                    className={`globe-choice-card ${cardClass}`}
                    onClick={() => handleAssignFlag(index)}
                    disabled={isResolving || disabled}
                  >
                    <span className="globe-choice-keybadge">[{index + 1}]</span>

                    {assignedTargetIdx !== -1 && (
                      <span className="globe-assigned-pill">
                        <Check size={10} />
                        <span className="assigned-full-text">Target #{assignedTargetIdx + 1}</span>
                        <span className="assigned-compact-text">#{assignedTargetIdx + 1}</span>
                      </span>
                    )}

                    <div className="globe-flag-wrapper">
                      {option.country.alpha2 ? (
                        <ProgressiveFlag
                          alpha2={option.country.alpha2}
                          name={option.name}
                          flagUrl={option.country.flagUrl}
                          lowFlagUrl={option.country.lowFlagUrl}
                          className="globe-flag-img"
                          loading="eager"
                        />
                      ) : (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No Flag</div>
                      )}
                    </div>
                    <div className="globe-choice-label">{option.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Submit Final 3 Button */}
            <div className="final-three-actions">
              <button
                type="button"
                className={`final-submit-btn ${isAllAssigned ? 'ready' : ''}`}
                onClick={handleFinalSubmit}
                disabled={!isAllAssigned || isResolving || disabled}
              >
                <Send size={15} />
                <span className="submit-full-text">
                  {isAllAssigned
                    ? `Conquer All ${finalThreeTargets.length} Countries (${assignedCount}/${finalThreeTargets.length})`
                    : `Assign All Flags to Submit (${assignedCount}/${finalThreeTargets.length})`}
                </span>
                <span className="submit-compact-text">
                  {isAllAssigned
                    ? `Conquer All ${finalThreeTargets.length} Countries`
                    : `Assign 3 Flags (${assignedCount}/${finalThreeTargets.length})`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD SINGLE-COUNTRY FLAG CHOICES DECK */
          <div className="globe-choices-deck">
            {options.map((option, index) => {
              let cardState = '';
              if (isResolving) {
                if (option.isCorrect) {
                  cardState = 'correct';
                } else if (selectedOptionIndex === index) {
                  cardState = 'wrong';
                } else {
                  cardState = 'dimmed';
                }
              }

              return (
                <button
                  key={`${option.country.alpha2}-${index}`}
                  type="button"
                  className={`globe-choice-card ${cardState}`}
                  onClick={() => onSelect(index)}
                  disabled={isResolving || disabled}
                >
                  <span className="globe-choice-keybadge">[{index + 1}]</span>
                  <div className="globe-flag-wrapper">
                    {option.country.alpha2 ? (
                      <ProgressiveFlag
                        alpha2={option.country.alpha2}
                        name={option.name}
                        flagUrl={option.country.flagUrl}
                        lowFlagUrl={option.country.lowFlagUrl}
                        className="globe-flag-img"
                        loading="eager"
                      />
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No Flag</div>
                    )}
                  </div>
                  <div className="globe-choice-label">{option.name}</div>
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
};
