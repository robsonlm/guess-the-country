import React from 'react';
import { Globe2, Flame, Volume2, VolumeX, Settings as SettingsIcon, Zap, Trophy } from 'lucide-react';
import { UserSettings } from '../types/game';

interface HeaderProps {
  currentStreak: number;
  level: number;
  optionCount: number;
  settings: UserSettings;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onToggleMode?: () => void;
  onOpenLeaderboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStreak,
  level,
  optionCount,
  settings,
  onToggleSound,
  onOpenSettings,
  onToggleMode,
  onOpenLeaderboard,
}) => {
  const isGlobeMode = settings.gameMode === 'globe';

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon" aria-hidden="true">
          <Globe2 size={22} />
        </div>
        <div>
          <h1 className="brand-title">Guess the Country</h1>
        </div>
      </div>

      <div className="header-actions">
        {onToggleMode && (
          <button
            type="button"
            className={`action-btn ${isGlobeMode ? 'active' : ''}`}
            onClick={onToggleMode}
            title={isGlobeMode ? 'Switch to Classic Cards Mode' : 'Switch to 3D Globe Mode'}
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '9999px',
              border: isGlobeMode ? '1px solid rgba(42, 157, 143, 0.7)' : '1px solid var(--border)',
              background: isGlobeMode ? 'rgba(42, 157, 143, 0.25)' : 'var(--bg-card)',
              color: isGlobeMode ? '#48cae4' : 'var(--text)',
            }}
          >
            {isGlobeMode ? '🌍 3D Globe' : '🎴 Cards'}
          </button>
        )}
        {settings.gameMode === 'progressive' && (
          <div
            className="level-badge"
            title={`Level ${level}: ${optionCount} country choices`}
          >
            <Zap size={13} style={{ color: '#818cf8' }} />
            <span>Lvl {level} ({optionCount})</span>
          </div>
        )}

        {currentStreak > 0 && (
          <div
            className={`streak-badge ${currentStreak >= 3 ? 'active' : ''}`}
            title={`Current streak: ${currentStreak} correct in a row!`}
          >
            <Flame size={16} className="streak-flame" />
            <span>{currentStreak}</span>
          </div>
        )}

        {onOpenLeaderboard && (
          <button
            className="icon-btn"
            onClick={onOpenLeaderboard}
            title="Global Leaderboards & Hall of Fame"
            aria-label="Global Leaderboards"
            type="button"
            style={{ color: '#ffd166' }}
          >
            <Trophy size={18} />
          </button>
        )}

        <button
          className="icon-btn"
          onClick={onToggleSound}
          title={settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          aria-label={settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          type="button"
        >
          {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Game Settings"
          aria-label="Game Settings"
          id="settings-btn"
          type="button"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
};
