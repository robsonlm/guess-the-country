import React, { useState, useEffect } from 'react';
import {
  Globe2,
  Trophy,
  Sparkles,
  Compass,
  Layers,
  Clock,
  Award,
  ShieldCheck,
  User,
  ArrowRight,
  LogIn,
  Lock,
} from 'lucide-react';
import { GameMode, ContinentFilter, TimerMode, UserSettings, GameScore, Achievement } from '../types/game';
import { getFilteredLeaderboard, formatTimeElapsed } from '../services/leaderboard';
import { sanitizePlayerName } from '../utils/sanitize';

interface MainPageViewProps {
  settings: UserSettings;
  score: GameScore;
  achievements: Achievement[];
  totalCountriesCount: number;
  playerName: string;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
  onStartGame: (name: string, config?: { mode?: GameMode; continent?: ContinentFilter; timer?: TimerMode }) => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenSettings?: () => void;
  onEnableAdmin: () => void;
}

const GAME_MODES: { id: GameMode; label: string; icon: string; desc: string }[] = [
  { id: 'globe', label: '3D Globe', icon: '🌍', desc: 'Pinpoint and conquer highlighted territories on interactive 3D Earth' },
  { id: 'flag-to-name', label: 'Flag ➔ Name', icon: '🏁', desc: 'Match the displayed national flag to the correct country name' },
  { id: 'name-to-flag', label: 'Name ➔ Flag', icon: '🔤', desc: 'Identify the correct flag from the given sovereign country name' },
];

const CONTINENT_OPTIONS: { id: ContinentFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All World', icon: '🌍' },
  { id: 'Africa', label: 'Africa', icon: '🌍' },
  { id: 'Americas', label: 'Americas', icon: '🌎' },
  { id: 'Asia', label: 'Asia', icon: '🌏' },
  { id: 'Europe', label: 'Europe', icon: '🌍' },
  { id: 'Oceania', label: 'Oceania', icon: '🌏' },
];

const TIMER_OPTIONS: { id: TimerMode; label: string; icon: string; desc: string }[] = [
  { id: 'timed', label: '10s Timed', icon: '⏱️', desc: 'Intense 10 seconds per round with bonus speed scoring' },
  { id: 'relaxed', label: 'Relaxed', icon: '🧘', desc: 'Untimed relaxed exploration at your own pace' },
];

export const MainPageView: React.FC<MainPageViewProps> = ({
  settings,
  score,
  achievements,
  totalCountriesCount,
  playerName: initialPlayerName,
  isAdmin = false,
  isLoggedIn = false,
  onOpenAuth,
  onStartGame,
  onOpenLeaderboard,
  onOpenAchievements,
  onEnableAdmin,
}) => {
  const [name, setName] = useState(initialPlayerName);
  const [selectedMode, setSelectedMode] = useState<GameMode>(settings.gameMode);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>(settings.continentFilter);
  const [selectedTimer, setSelectedTimer] = useState<TimerMode>(settings.timerMode);

  useEffect(() => {
    setName(initialPlayerName);
  }, [initialPlayerName]);

  const handleModeChange = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleContinentChange = (continent: ContinentFilter) => {
    setSelectedContinent(continent);
  };

  const handleTimerChange = (timer: TimerMode) => {
    setSelectedTimer(timer);
  };

  const handleLaunch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLoggedIn) {
      onOpenAuth?.();
      return;
    }
    onStartGame(sanitizePlayerName(name || initialPlayerName), {
      mode: selectedMode,
      continent: selectedContinent,
      timer: selectedTimer,
    });
  };

  // Top records for summary widget
  const topRecords = getFilteredLeaderboard(selectedMode, selectedContinent, selectedTimer, 'least-mistakes').slice(0, 3);
  const unlockedAchievementsCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="main-page-container fade-in">
      {/* 1. Hero Header Section */}
      <section className="main-hero-section">
        <div className="main-hero-badge">
          <Sparkles size={14} />
          <span>3D Earth • 200+ Nations • Global Hall of Fame</span>
        </div>
        <h1 className="main-hero-title">
          Conquer the World, <br />
          <span className="gradient-text">One Flag at a Time</span>
        </h1>
        <p className="main-hero-subtitle">
          Test your geography knowledge across interactive 3D globe expeditions and rapid-fire flag challenges. Compete with explorers worldwide on live leaderboards.
        </p>
      </section>

      {/* 2. Quick Launch / Game Setup Card */}
      <section className="main-launch-card">
        <div className="main-card-header">
          <div className="main-card-title-group">
            <div className="main-card-icon">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="main-card-title">Expedition Setup</h2>
              <p className="main-card-subtitle">Choose your explorer name, territory, and game mode</p>
            </div>
          </div>

          {isAdmin && (
            <div className="main-admin-badge">
              <ShieldCheck size={14} />
              <span>Admin Mode Active</span>
            </div>
          )}
        </div>

        {!isLoggedIn && (
          <div
            className="fade-in"
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(59, 130, 246, 0.12))',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              color: '#f8fafc',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#38bdf8' }}>
                  Player Login Required
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Sign in or create an explorer account to explore the globe and post to the hall of fame.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              style={{
                padding: '6px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
              }}
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Explorer Name Form */}
        <form onSubmit={handleLaunch} className="main-setup-form">
          <div className="main-input-group">
            <label className="main-input-label" htmlFor="explorer-name-input">
              <User size={14} /> Explorer Name:
            </label>
            <div className="main-input-wrapper">
              <input
                id="explorer-name-input"
                type="text"
                className="main-text-input"
                placeholder={isLoggedIn ? 'Enter explorer name...' : 'Log in to set explorer name...'}
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onClick={() => {
                  if (!isLoggedIn) onOpenAuth?.();
                }}
              />
            </div>
          </div>
        </form>

        {/* Sign in as Admin button (replaces legacy "ADMINMODE" text entry) */}
        <div className="main-launch-actions" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="action-btn"
            onClick={onEnableAdmin}
            title={isAdmin ? 'Admin Mode is already active' : 'Sign in as administrator'}
            style={{
              fontSize: '0.78rem',
              padding: '6px 14px',
              borderRadius: 9999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={13} />
            <span>{isAdmin ? 'Admin Active' : 'Sign in as Admin'}</span>
          </button>
        </div>

        {/* Game Mode Selector */}
        <div className="main-config-row">
          <span className="main-config-label">
            <Layers size={13} /> Mode:
          </span>
          <div className="main-mode-pills">
            {GAME_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`main-mode-pill ${selectedMode === m.id ? 'active' : ''}`}
                onClick={() => handleModeChange(m.id)}
                title={m.desc}
              >
                <span>{m.icon}</span>
                <span className="main-pill-name">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scope / Continent Selector */}
        <div className="main-config-row">
          <span className="main-config-label">
            <Compass size={13} /> Territory:
          </span>
          <div className="main-continent-pills">
            {CONTINENT_OPTIONS.map((cont) => (
              <button
                key={cont.id}
                type="button"
                className={`main-continent-pill ${selectedContinent === cont.id ? 'active' : ''}`}
                onClick={() => handleContinentChange(cont.id)}
              >
                <span>{cont.icon}</span>
                <span>{cont.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timer Pacing Selector */}
        <div className="main-config-row">
          <span className="main-config-label">
            <Clock size={13} /> Pacing:
          </span>
          <div className="main-timer-pills">
            {TIMER_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`main-timer-pill ${selectedTimer === t.id ? 'active' : ''}`}
                onClick={() => handleTimerChange(t.id)}
                title={t.desc}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="main-launch-actions">
          {isLoggedIn ? (
            <button
              type="button"
              className="main-btn-start-large"
              onClick={() => handleLaunch()}
            >
              <Sparkles size={18} />
              <span>Launch New Expedition</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="main-btn-start-large"
              onClick={onOpenAuth}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                boxShadow: '0 8px 24px -4px rgba(14, 165, 233, 0.45)',
              }}
            >
              <LogIn size={18} />
              <span>Log In to Play</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </section>

      {/* 3. Grid: Live Leaderboard Summary & Game Modes Showcase */}
      <div className="main-features-grid">
        {/* Leaderboard Summary Card */}
        <div className="main-widget-card leaderboard-widget">
          <div className="main-widget-header">
            <div className="main-widget-title-group">
              <Trophy size={18} style={{ color: '#ffd166' }} />
              <h3 className="main-widget-title">Hall of Fame Highlights</h3>
            </div>
            <button
              type="button"
              className="main-widget-action-btn"
              onClick={onOpenLeaderboard}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="main-podium-preview">
            {topRecords.length === 0 ? (
              <div className="main-empty-records">
                <Award size={28} style={{ color: 'var(--text-dim)' }} />
                <span>No records for this combination yet. Be the first champion!</span>
              </div>
            ) : (
              <div className="main-podium-mini-list">
                {topRecords.map((rec, idx) => {
                  let medal = '🥇';
                  let medalClass = 'gold';
                  if (idx === 1) {
                    medal = '🥈';
                    medalClass = 'silver';
                  } else if (idx === 2) {
                    medal = '🥉';
                    medalClass = 'bronze';
                  }

                  return (
                    <div key={rec.id} className={`main-mini-podium-row ${medalClass}`}>
                      <div className="mini-podium-rank">
                        <span>{medal}</span>
                        <span className="mini-podium-badge">{rec.rankBadge}</span>
                      </div>
                      <div className="mini-podium-name">{rec.playerName}</div>
                      <div className="mini-podium-stat">
                        <span>🎯 {rec.mistakesCount} err</span>
                        <span className="mini-podium-time">⚡ {formatTimeElapsed(rec.timeElapsedSeconds)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="main-btn-full-leaderboard"
            onClick={onOpenLeaderboard}
          >
            <Trophy size={14} />
            <span>Open Global Leaderboard</span>
          </button>
        </div>

        {/* Feature Overview Card */}
        <div className="main-widget-card features-widget">
          <div className="main-widget-header">
            <div className="main-widget-title-group">
              <Globe2 size={18} style={{ color: '#48cae4' }} />
              <h3 className="main-widget-title">Game Modes & Features</h3>
            </div>
          </div>

          <div className="main-feature-bullets">
            <div className="main-feature-item">
              <div className="main-feature-icon globe">🌍</div>
              <div>
                <strong>3D Earth Globe Mode:</strong>
                <p>Locate highlighted nations on a rotatable, zoomable 3D planet with atmosphere.</p>
              </div>
            </div>

            <div className="main-feature-item">
              <div className="main-feature-icon clues">💡</div>
              <div>
                <strong>Ask The Atlas Lifelines:</strong>
                <p>Earn Capital Clues and 50/50 eliminations with consecutive win streaks.</p>
              </div>
            </div>

            <div className="main-feature-item">
              <div className="main-feature-icon trophy">🏆</div>
              <div>
                <strong>Trophies & Continent Mastery:</strong>
                <p>Unlock 15+ achievements and track conquered territories region by region.</p>
              </div>
            </div>
          </div>

          <div className="main-stats-strip">
            <div className="main-stat-item">
              <span className="main-stat-num">{totalCountriesCount || 240}+</span>
              <span className="main-stat-lbl">Territories</span>
            </div>
            <div className="main-stat-item" onClick={onOpenAchievements} style={{ cursor: 'pointer' }}>
              <span className="main-stat-num">{unlockedAchievementsCount}/{achievements.length}</span>
              <span className="main-stat-lbl">Trophies</span>
            </div>
            <div className="main-stat-item">
              <span className="main-stat-num">🔥 {score.bestStreak}</span>
              <span className="main-stat-lbl">Best Streak</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
