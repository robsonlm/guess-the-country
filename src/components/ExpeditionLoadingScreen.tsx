import React from 'react';
import { Globe, Compass, ShieldCheck, Sparkles } from 'lucide-react';

interface ExpeditionLoadingScreenProps {
  progress: number;
  stageMessage: string;
  gameMode?: string;
}

export const ExpeditionLoadingScreen: React.FC<ExpeditionLoadingScreenProps> = ({
  progress,
  stageMessage,
  gameMode = 'globe',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="expedition-loading-overlay" role="alert" aria-busy="true" aria-live="polite">
      <div className="expedition-loading-card">
        {/* Animated Holographic Rings */}
        <div className="radar-animation-container">
          <div className="radar-ring ring-outer" />
          <div className="radar-ring ring-mid" />
          <div className="radar-ring ring-inner" />
          <div className="radar-glow-core">
            {gameMode === 'globe' ? (
              <Globe className="radar-icon spinning-globe-icon" size={44} />
            ) : (
              <Compass className="radar-icon spinning-globe-icon" size={44} />
            )}
          </div>
        </div>

        <div className="expedition-loading-header">
          <div className="expedition-loading-badge">
            <Sparkles size={13} />
            <span>EXPEDITION CALIBRATION</span>
          </div>
          <h2 className="expedition-loading-title">Preparing Your World Tour</h2>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="expedition-progress-wrapper">
          <div className="expedition-progress-header">
            <span className="expedition-stage-label">{stageMessage || 'Synchronizing geographical telemetry...'}</span>
            <span className="expedition-percent-label">{clampedProgress}%</span>
          </div>
          <div className="expedition-progress-track">
            <div
              className="expedition-progress-fill"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>

        {/* Informative Guarantee Note */}
        <div className="expedition-footer-note">
          <ShieldCheck size={14} className="shield-icon" />
          <span>Timer paused. Game will begin instantly when all resources are 100% loaded.</span>
        </div>
      </div>
    </div>
  );
};
