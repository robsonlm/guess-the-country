import React, { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'globe.gl';
import { Target, RotateCw, Globe as GlobeIcon, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { Country, ChoiceOption, LifelineState } from '../types/game';
import { loadGeoFeatures, getCountryCoordinates, GeoFeature } from '../services/countriesGeo';
import '../styles/GlobeGame.css';

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
  onUseRegion: () => void;
  disabled?: boolean;
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
  onUseRegion,
  disabled = false,
}) => {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const globeInstanceRef = useRef<any>(null);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

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
      .globeImageUrl(`${cleanBase}textures/earth-night.jpg`)
      .bumpImageUrl(`${cleanBase}textures/earth-topology.png`);

    // Orbit controls settings
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.8;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 140;
      controls.maxDistance = 500;
    }

    globeInstanceRef.current = globe;
    setIsGlobeReady(true);

    // Responsive resize observer
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

  // 3. Update Polygons & Rings when features, targetCountry, or conqueredAlphas update
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || geoFeatures.length === 0) return;

    const targetAlpha = targetCountry.alpha2.toUpperCase();
    const conqueredSet = new Set(conqueredAlphas.map((a) => a.toUpperCase()));

    // Polygons dataset
    globe
      .polygonsData(geoFeatures)
      .polygonCapColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === targetAlpha) {
          return 'rgba(247, 127, 0, 0.88)'; // Highlight active country in golden neon amber
        }
        if (conqueredSet.has(a)) {
          return 'rgba(16, 185, 129, 0.68)'; // Conquered country in bright emerald
        }
        return 'rgba(25, 45, 75, 0.45)'; // Default neutral dark territory
      })
      .polygonSideColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === targetAlpha) return 'rgba(247, 127, 0, 0.5)';
        if (conqueredSet.has(a)) return 'rgba(16, 185, 129, 0.3)';
        return 'rgba(20, 35, 60, 0.15)';
      })
      .polygonStrokeColor((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === targetAlpha) return '#ffd166';
        if (conqueredSet.has(a)) return '#6ee7b7';
        return 'rgba(72, 202, 228, 0.3)';
      })
      .polygonAltitude((d: any) => {
        const a = (d.alpha2 || '').toUpperCase();
        if (a === targetAlpha) return 0.055;
        if (conqueredSet.has(a)) return 0.015;
        return 0.005;
      });

    // Pulsing Rings data for target country
    const coords = getCountryCoordinates(targetCountry.alpha2);
    globe
      .ringsData([
        {
          lat: coords.lat,
          lng: coords.lng,
          maxR: 4.5,
          propagationSpeed: 2,
          repeatPeriod: 1200,
          color: () => '#f77f00',
        },
      ])
      .ringColor((t: any) => (typeof t.color === 'function' ? t.color(t) : t.color))
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod');
  }, [geoFeatures, targetCountry, conqueredAlphas, isGlobeReady]);

  // 4. Smooth camera fly-to on target country change
  const focusTargetCountry = useCallback(
    (duration = 1000) => {
      const globe = globeInstanceRef.current;
      if (!globe || !targetCountry) return;

      const coords = getCountryCoordinates(targetCountry.alpha2);
      globe.pointOfView(
        {
          lat: coords.lat,
          lng: coords.lng,
          altitude: 1.85,
        },
        duration
      );
    },
    [targetCountry]
  );

  useEffect(() => {
    if (isGlobeReady && targetCountry) {
      focusTargetCountry(1200);
    }
  }, [targetCountry, isGlobeReady, focusTargetCountry]);

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

  return (
    <div className="globe-game-container">
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

          {/* Action buttons (Focus country, rotate) */}
          <div className="globe-actions-group">
            <button
              type="button"
              className="globe-action-btn"
              onClick={() => focusTargetCountry(800)}
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

        {/* Feedback Banner on resolution */}
        {isResolving && selectedOptionIndex !== null && (
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
          <div>
            <div className="globe-target-text">Highlighted Territory on Globe</div>
            <div className="globe-target-subtext">
              Region: {targetCountry.region}
              {targetCountry.subregion ? ` • ${targetCountry.subregion}` : ''}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Choose the correct flag for the highlighted territory:
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!lifelineState.capitalUsed && (
            <button
              type="button"
              className="action-btn"
              onClick={onUseCapital}
              disabled={isResolving || disabled}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              <HelpCircle size={13} /> Capital Clue
            </button>
          )}
          {!lifelineState.regionUsed && (
            <button
              type="button"
              className="action-btn"
              onClick={onUseRegion}
              disabled={isResolving || disabled}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              <GlobeIcon size={13} /> Subregion Clue
            </button>
          )}
        </div>
      </div>

      {/* 3 Flag Options Deck */}
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
    </div>
  );
};
