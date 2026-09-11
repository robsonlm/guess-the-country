import { Globe2, Flame, Volume2, VolumeX, Trophy, Settings as SettingsIcon, User, ShieldCheck, Home } from 'lucide-react';
import { UserSettings } from '../types/game';

interface HeaderProps {
  currentStreak: number;
  level?: number;
  optionCount?: number;
  settings: UserSettings;
  playerName?: string;
  onOpenProfile?: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onToggleMode?: () => void;
  onOpenLeaderboard?: () => void;
  onNavigateHome?: () => void;
  isInGame?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentStreak,
  settings,
  playerName,
  onOpenProfile,
  onToggleSound,
  onOpenSettings,
  onToggleMode,
  onOpenLeaderboard,
  onNavigateHome,
  isInGame = false,
}) => {
  const isGlobeMode = settings.gameMode === 'globe';

  const getModeButtonInfo = () => {
    switch (settings.gameMode) {
      case 'globe':
        return {
          labelFull: '🌍 3D Globe',
          labelCompact: '🌍 Globe',
          title: 'Mode: 3D Earth Globe (Click to switch to Flag ➔ Name)',
        };
      case 'flag-to-name':
        return {
          labelFull: '🏁 Flag ➔ Name',
          labelCompact: '🏁 Flags',
          title: 'Mode: Flag ➔ Name (Click to switch to Name ➔ Flag)',
        };
      case 'name-to-flag':
        return {
          labelFull: '🔤 Name ➔ Flag',
          labelCompact: '🔤 Reverse',
          title: 'Mode: Name ➔ Flag (Click to switch to 3D Globe)',
        };
      default:
        return {
          labelFull: '🌍 3D Globe',
          labelCompact: '🌍 Globe',
          title: 'Switch mode',
        };
    }
  };

  const modeInfo = getModeButtonInfo();

  return (
    <header className="app-header">
      <div
        className={`brand-section ${onNavigateHome ? 'clickable' : ''}`}
        onClick={onNavigateHome}
        role={onNavigateHome ? 'button' : undefined}
        tabIndex={onNavigateHome ? 0 : undefined}
        title={onNavigateHome ? 'Return to Main Menu' : undefined}
        style={{ cursor: onNavigateHome ? 'pointer' : 'default' }}
      >
        <div className="brand-icon" aria-hidden="true">
          <Globe2 size={22} />
        </div>
        <div>
          <h1 className="brand-title">
            <span className="brand-title-full">Guess the Country</span>
            <span className="brand-title-compact">Guess Country</span>
          </h1>
        </div>
      </div>

      <div className="header-actions">
        {isInGame && onNavigateHome && (
          <button
            type="button"
            className="icon-btn header-home-btn"
            onClick={onNavigateHome}
            title="Return to Main Menu"
            aria-label="Main Menu"
          >
            <Home size={17} />
          </button>
        )}

        {playerName && (
          <button
            type="button"
            className="action-btn header-player-btn"
            onClick={onOpenProfile}
            title={`Player: ${playerName} (Click to change explorer name or enter ADMINMODE)`}
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '5px 11px',
              borderRadius: '9999px',
              border: settings.adminTestMode
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              background: settings.adminTestMode
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              color: settings.adminTestMode ? '#34d399' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {settings.adminTestMode ? (
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
            ) : (
              <User size={14} style={{ color: 'var(--primary-light)' }} />
            )}
            <span className="header-player-name">
              {playerName}
            </span>
          </button>
        )}
        {isInGame && onToggleMode && (
          <button
            type="button"
            className={`action-btn header-mode-toggle-btn ${isGlobeMode ? 'active' : ''}`}
            onClick={onToggleMode}
            title={modeInfo.title}
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
            <span className="header-mode-full-text">{modeInfo.labelFull}</span>
            <span className="header-mode-compact-text">{modeInfo.labelCompact}</span>
          </button>
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
