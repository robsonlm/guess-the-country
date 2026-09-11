import { Globe2, Flame, Volume2, VolumeX, Trophy, Settings as SettingsIcon, User, ShieldCheck, Home, RotateCcw, Clock } from 'lucide-react';
import { UserSettings } from '../types/game';
import { formatTimeElapsed } from '../services/leaderboard';

interface HeaderProps {
  currentStreak: number;
  level?: number;
  optionCount?: number;
  settings: UserSettings;
  playerName?: string;
  gameElapsedSeconds?: number;
  onOpenProfile?: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onNewGame?: () => void;
  onOpenLeaderboard?: () => void;
  onNavigateHome?: () => void;
  isInGame?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentStreak,
  settings,
  playerName,
  gameElapsedSeconds,
  onOpenProfile,
  onToggleSound,
  onOpenSettings,
  onNewGame,
  onOpenLeaderboard,
  onNavigateHome,
  isInGame = false,
}) => {

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

        {isInGame && typeof gameElapsedSeconds === 'number' && (
          <div
            className="header-timer-badge"
            title={`Elapsed match time: ${formatTimeElapsed(gameElapsedSeconds)} (Pauses when any menu or modal is open)`}
          >
            <Clock size={13} className="header-timer-icon" />
            <span className="header-timer-text">{formatTimeElapsed(gameElapsedSeconds)}</span>
          </div>
        )}

        {isInGame && onNewGame && (
          <button
            type="button"
            className="action-btn header-new-game-btn"
            onClick={onNewGame}
            title="Start a new game (choose mode, continent, timer)"
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '9999px',
              border: '1px solid rgba(42, 157, 143, 0.65)',
              background: 'linear-gradient(135deg, rgba(42, 157, 143, 0.25), rgba(72, 202, 228, 0.2))',
              color: '#48cae4',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RotateCcw size={13} />
            <span className="header-mode-full-text">New Game</span>
            <span className="header-mode-compact-text">New</span>
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
