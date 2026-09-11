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
  Compass,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Country, ChoiceOption, LifelineState, ContinentFilter } from '../types/game';
import {
  loadGeoFeatures,
  getCountryCoordinates,
  getCountryTargetAltitude,
  GeoFeature,
} from '../services/countriesGeo';
import '../styles/GlobeGame.css';

export const CONTINENT_OPTIONS: { id: ContinentFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All World', icon: '🌍' },
  { id: 'Africa', label: 'Africa', icon: '🌍' },
  { id: 'Americas', label: 'Americas', icon: '🌎' },
  { id: 'Asia', label: 'Asia', icon: '🌏' },
  { id: 'Europe', label: 'Europe', icon: '🌍' },
  { id: 'Oceania', label: 'Oceania', icon: '🌏' },
];

export const CONTINENT_VIEWPOINTS: Record<ContinentFilter, { lat: number; lng: number; altitude: number }> = {
  all: { lat: 20, lng: 0, altitude: 2.5 },
  Africa: { lat: 3.0, lng: 20.0, altitude: 2.1 },
  Americas: { lat: 10.0, lng: -85.0, altitude: 2.4 },
  Asia: { lat: 34.0, lng: 95.0, altitude: 2.3 },
  Europe: { lat: 50.0, lng: 15.0, altitude: 1.8 },
  Oceania: { lat: -22.0, lng: 138.0, altitude: 2.2 },
};

interface GlobeGameViewProps {
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
  isFinalThree?: boolean;
  finalThreeTargets?: Country[];
  onFinalThreeSubmit?: (assignments: Record<string, string>) => {
    success: boolean;
    results: Record<string, boolean>;
  };
  continentFilter?: ContinentFilter;
  onSelectContinent?: (continent: ContinentFilter) => void;
}

export const GlobeGameView: React.FC<GlobeGameViewProps> = ({
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
  isFinalThree = false,
  finalThreeTargets = [],
  onFinalThreeSubmit,
  continentFilter = 'all',
  onSelectContinent,
}) => {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Final 3 state
  const [activeTargetIndex, setActiveTargetIndex] = useState<number>(0);
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, boolean> | null>(null);

  // Reset Final 3 assignments when targets change
  useEffect(() => {
    setSelectedAssignments({});
    setValidationResults(null);
    setActiveTargetIndex(0);
  }, [finalThreeTargets]);

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

  // 1. Load GeoJSON features on mount
  useEffect(() => {
    let isMounted = true;
    loadGeoFeatures().then((features) => {
      if (isMounted) {
        setGeoFeatures(features);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize Globe instance
  useEffect(() => {
    if (!globeContainerRef.current) return;

    const width = globeContainerRef.current.clientWidth || 800;
    const height = globeContainerRef.current.clientHeight || 540;

    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;

    const globe = new (Globe as any)(globeContainerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#2a9d8f')
      .atmosphereAltitude(0.22)
      .globeImageUrl(`${cleanBase}textures/earth-blue-marble.jpg`)
      .bumpImageUrl(`${cleanBase}textures/earth-topology.png`)
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
      controls.maxDistance = 550;
    }

    globeInstanceRef.current = globe;
    setIsGlobeReady(true);

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
        globeContainerRef.current.innerHTML = '';
      }
      globeInstanceRef.current = null;
    };
  }, []);

  // 3. Update Polygons & Rings when features, targetCountry, conqueredAlphas, or final targets update
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || geoFeatures.length === 0) return;

    const activeTargetAlpha = currentFocusedCountry?.alpha2.toUpperCase();
    const finalTargetAlphas = new Set(
      isFinalThree ? finalThreeTargets.map((c) => c.alpha2.toUpperCase()) : []
    );
    const conqueredSet = new Set(conqueredAlphas.map((a) => a.toUpperCase()));

    // Polygons dataset
    globe
      .polygonsData(geoFeatures)
      .polygonCapColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === activeTargetAlpha) return 'rgba(247, 127, 0, 0.88)';
        if (finalTargetAlphas.has(a)) {
          return 'rgba(56, 189, 248, 0.82)'; // Other remaining final targets: Neon sky cyan
        }
        if (conqueredSet.has(a)) {
          return 'rgba(16, 185, 129, 0.65)'; // Conquered country: Emerald green
        }
        return 'rgba(25, 45, 75, 0.42)'; // Default neutral territory
      })
      .polygonSideColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === activeTargetAlpha) return 'rgba(247, 127, 0, 0.45)';
        if (finalTargetAlphas.has(a)) return 'rgba(56, 189, 248, 0.40)';
        if (conqueredSet.has(a)) return 'rgba(16, 185, 129, 0.25)';
        return 'rgba(20, 35, 60, 0.12)';
      })
      .polygonStrokeColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === activeTargetAlpha) return '#ffd166';
        if (finalTargetAlphas.has(a)) return '#38bdf8';
        if (conqueredSet.has(a)) return '#6ee7b7';
        return 'rgba(72, 202, 228, 0.3)';
      })
      .polygonAltitude((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === activeTargetAlpha) return 0.065;
        if (finalTargetAlphas.has(a)) return 0.04;
        if (conqueredSet.has(a)) return 0.015;
        return 0.005;
      });

    // Pulsing Rings & Target Beacons
    if (isFinalThree && finalThreeTargets.length > 0) {
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
  }, [geoFeatures, currentFocusedCountry, targetCountry, conqueredAlphas, isFinalThree, finalThreeTargets, isGlobeReady]);

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
    if (isGlobeReady && currentFocusedCountry) {
      focusTargetCountry(currentFocusedCountry, 1200);
    }
  }, [currentFocusedCountry, isGlobeReady, focusTargetCountry]);

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

  return (
    <div className="globe-game-container">
      {/* Continent Expedition Quick Selector Bar */}
      {onSelectContinent && (
        <div className="globe-continent-selector-bar">
          <div className="globe-continent-selector-label">
            <Compass size={14} style={{ color: '#48cae4' }} />
            <span>Expedition Continent:</span>
          </div>
          <div className="globe-continent-pills">
            {CONTINENT_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`globe-continent-pill ${continentFilter === c.id ? 'active' : ''}`}
                onClick={() => {
                  if (continentFilter === c.id) return;
                  onSelectContinent(c.id);
                  const view = CONTINENT_VIEWPOINTS[c.id];
                  if (globeInstanceRef.current && view) {
                    globeInstanceRef.current.pointOfView(view, 1000);
                  }
                }}
                disabled={isResolving || disabled}
                title={c.id === 'all' ? 'Conquer all 197 countries' : `Conquer ${c.label} only`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3D Globe Stage Canvas */}
      <div className="globe-stage">
        <div ref={globeContainerRef} className="globe-canvas-wrapper" />

        {/* Floating Top HUD */}
        <div className="globe-hud-top">
          <div className="globe-stats-pill-group">
            <div className="globe-stat-badge conquest" title="Conquered Countries">
              <GlobeIcon size={14} />
              <span>
                Conquest: <strong>{conqueredCount}</strong> / {totalCountriesCount} ({conqueredPercent}%)
              </span>
            </div>

            <div
              className={`globe-stat-badge mistakes ${mistakesCount > 0 ? 'danger' : ''}`}
              title="Total Mistakes Made"
            >
              <AlertTriangle size={14} />
              <span>
                Mistakes: <strong>{mistakesCount}</strong>
              </span>
            </div>

            <div className="globe-stat-badge accuracy" title="Conquest Accuracy Rate">
              <Sparkles size={14} />
              <span>Accuracy: {accuracy}%</span>
            </div>

            {streak >= 3 && (
              <div className="globe-stat-badge" style={{ borderColor: '#f77f00', color: '#f77f00' }}>
                🔥 Streak: {streak}
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
              <span>Focus Target</span>
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

        {/* Standard Single-Country Feedback Toast */}
        {!isFinalThree && isResolving && selectedOptionIndex !== null && (
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

        {/* Target Country Clue Pill at Bottom of Globe */}
        <div className="globe-target-banner">
          <div className="pulse-dot" />
          <div style={{ flex: 1 }}>
            <div className="globe-target-text">
              {isFinalThree
                ? `Final ${finalThreeTargets.length} Showdown • Active Target: Target #${activeTargetIndex + 1}`
                : 'Highlighted Territory'}
            </div>
            <div className="globe-target-subtext">
              Region: {currentFocusedCountry?.region}
              {lifelineState.activeHintText ? ` | ${lifelineState.activeHintText}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Conquest Progress Bar */}
      <div className="globe-conquest-bar-container" title={`Conquest: ${conqueredPercent}%`}>
        <div className="globe-conquest-bar-fill" style={{ width: `${conqueredPercent}%` }} />
      </div>

      {/* Clues & Lifeline Shortcuts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {isFinalThree
            ? `Select and match all ${finalThreeTargets.length} remaining territories to their flags:`
            : 'Choose the correct flag for the highlighted territory:'}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="action-btn"
            onClick={onUseCapital}
            disabled={isResolving || disabled || lifelineState.capitalCredits <= 0 || lifelineState.capitalUsedOnCurrentRound}
            style={{
              fontSize: '0.78rem',
              padding: '4px 10px',
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

      {/* FINAL 3 SHOWDOWN MODE INTERACTIVE PANEL */}
      {isFinalThree ? (
        <div className="final-three-container fade-in">
          <div className="final-three-header">
            <div className="final-three-badge">
              <Sparkles size={15} />
              <span>FINAL {finalThreeTargets.length} CONQUEST</span>
            </div>
            <p className="final-three-instruction">
              Click a target territory card to activate camera, then select its matching flag below.
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
                    focusTargetCountry(country, 800);
                  }}
                  role="button"
                  tabIndex={0}
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
                      title={`Focus camera on Target #${idx + 1}`}
                    >
                      <Target size={12} />
                    </button>
                  </div>

                  <div className="final-target-name">
                    {isValidated ? country.name : `Territory #${idx + 1}`}
                  </div>
                  <div className="final-target-region">{country.subregion || country.region}</div>

                  {/* Assigned Flag Slot Preview */}
                  <div className="final-target-slot">
                    {assignedOption ? (
                      <div className="final-assigned-preview">
                        {assignedOption.country.flagUrl && (
                          <img
                            src={assignedOption.country.flagUrl}
                            alt={`Flag of ${assignedOption.name}`}
                            className="final-assigned-flag-thumb"
                          />
                        )}
                        <span className="final-assigned-flag-name">{assignedOption.name}</span>
                        {!isResolving && (
                          <button
                            type="button"
                            className="final-assigned-clear-btn"
                            onClick={(e) => handleClearAssignment(country.alpha2, e)}
                            title="Unassign flag"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="final-target-empty-slot">
                        <Flag size={14} />
                        <span>{isFocused ? 'Select flag below' : 'Unassigned'}</span>
                      </div>
                    )}
                  </div>

                  {isValidated && (
                    <div className={`final-target-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                      {isCorrect ? (
                        <>
                          <Check size={13} />
                          <span>Correct ({country.name})</span>
                        </>
                      ) : (
                        <>
                          <X size={13} />
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
          <div className="globe-choices-deck" style={{ marginTop: '0.5rem' }}>
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
                      <Check size={11} /> Target #{assignedTargetIdx + 1}
                    </span>
                  )}

                  <div className="globe-flag-wrapper">
                    {option.country.flagUrl ? (
                      <img
                        src={option.country.flagUrl}
                        alt={`Flag of ${option.name}`}
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
              <Send size={16} />
              <span>
                {isAllAssigned
                  ? `Conquer All ${finalThreeTargets.length} Countries (${assignedCount}/${finalThreeTargets.length})`
                  : `Assign All Flags to Submit (${assignedCount}/${finalThreeTargets.length})`}
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
                  {option.country.flagUrl ? (
                    <img
                      src={option.country.flagUrl}
                      alt={`Flag of ${option.name}`}
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
      )}
    </div>
  );
};
