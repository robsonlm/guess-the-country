import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Zap,
  Target,
  Flame,
  Award,
  X,
  Compass,
  Layers,
  Globe2,
  Clock,
  Trash2,
} from 'lucide-react';
import { GameMode, ContinentFilter, TimerMode } from '../types/game';
import {
  LeaderboardCategory,
  getFilteredLeaderboard,
  formatTimeElapsed,
  syncGlobalLeaderboard,
  isFirebaseConfigured,
  subscribeToFirebaseLeaderboard,
  loadLeaderboard,
  saveLeaderboard,
  mergeAndDeduplicate,
  clearAllLeaderboardEntries,
} from '../services/leaderboard';
import '../styles/App.css';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentSubmittedEntryId?: string | null;
  defaultGameMode?: GameMode;
  defaultContinent?: ContinentFilter;
  defaultTimerMode?: TimerMode;
}

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'least-mistakes', label: 'Fewest Mistakes', icon: <Target size={14} />, desc: 'Ranked by highest accuracy & fewest errors' },
  { id: 'fastest', label: 'Fastest Speed', icon: <Zap size={14} />, desc: 'Ranked by lowest elapsed completion time' },
  { id: 'highest-streak', label: 'Best Streak', icon: <Flame size={14} />, desc: 'Ranked by longest consecutive streak' },
];

const GAME_MODES: { id: GameMode; label: string; icon: string }[] = [
  { id: 'globe', label: '3D Globe', icon: '🌍' },
  { id: 'flag-to-name', label: 'Flag ➔ Name', icon: '🏁' },
  { id: 'name-to-flag', label: 'Name ➔ Flag', icon: '🔤' },
];

const CONTINENT_FILTERS: { id: ContinentFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All World', icon: '🌍' },
  { id: 'Africa', label: 'Africa', icon: '🌍' },
  { id: 'Americas', label: 'Americas', icon: '🌎' },
  { id: 'Asia', label: 'Asia', icon: '🌏' },
  { id: 'Europe', label: 'Europe', icon: '🌍' },
  { id: 'Oceania', label: 'Oceania', icon: '🌏' },
];

const TIMER_MODES: { id: TimerMode; label: string; icon: string }[] = [
  { id: 'timed', label: '10s Timed', icon: '⏱️' },
  { id: 'relaxed', label: 'Relaxed', icon: '🧘' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  recentSubmittedEntryId = null,
  defaultGameMode = 'globe',
  defaultContinent = 'all',
  defaultTimerMode = 'timed',
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(defaultGameMode);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>(defaultContinent);
  const [selectedTimerMode, setSelectedTimerMode] = useState<TimerMode>(defaultTimerMode);
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>(
    defaultTimerMode === 'timed' ? 'fastest' : 'least-mistakes'
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [, setRefreshKey] = useState(0);
  const isFirebaseActive = isFirebaseConfigured();

  // Keep state in sync with defaults when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(defaultGameMode);
      setSelectedContinent(defaultContinent);
      setSelectedTimerMode(defaultTimerMode);
      setSelectedCategory(defaultTimerMode === 'timed' ? 'fastest' : 'least-mistakes');
    }
  }, [isOpen, defaultGameMode, defaultContinent, defaultTimerMode]);

  // Sync and subscribe to global database on open
  useEffect(() => {
    if (!isOpen) return;

    setIsSyncing(true);
    syncGlobalLeaderboard()
      .then(() => {
        setRefreshKey((prev) => prev + 1);
      })
      .finally(() => {
        setIsSyncing(false);
      });

    if (isFirebaseActive) {
      const unsubscribe = subscribeToFirebaseLeaderboard((remoteEntries) => {
        const local = loadLeaderboard();
        const merged = mergeAndDeduplicate(local, remoteEntries);
        saveLeaderboard(merged);
        setRefreshKey((prev) => prev + 1);
      });
      return () => unsubscribe();
    }
  }, [isOpen, isFirebaseActive]);

  if (!isOpen) return null;

  // Query strictly for this exact game type combination
  const entries = getFilteredLeaderboard(
    selectedMode,
    selectedContinent,
    selectedTimerMode,
    selectedCategory
  );
  const topThree = entries.slice(0, 3);

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear ALL leaderboard records globally across all modes and devices?'
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await clearAllLeaderboardEntries();
      setRefreshKey((prev) => prev + 1);
    } finally {
      setIsClearing(false);
    }
  };

  const getRankBadgeColor = (badge: string) => {
    switch (badge) {
      case 'S+':
        return '#ffd166';
      case 'S':
        return '#06d6a0';
      case 'A':
        return '#48cae4';
      case 'B':
        return '#818cf8';
      default:
        return '#94a3b8';
    }
  };

  const getModeLabel = (mode: GameMode) => {
    switch (mode) {
      case 'globe':
        return '🌍 3D Globe';
      case 'flag-to-name':
        return '🏁 Flag ➔ Name';
      case 'name-to-flag':
        return '🔤 Name ➔ Flag';
      default:
        return mode;
    }
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 110 }} role="dialog" aria-modal="true">
      <div className="modal-content leaderboard-modal-content">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="leaderboard-trophy-icon">
              <Trophy size={20} style={{ color: '#ffd166' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Leaderboard
                </h2>
                <div
                  className="global-live-badge"
                  style={{
                    background: isFirebaseActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    borderColor: isFirebaseActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)',
                    color: isFirebaseActive ? '#34d399' : '#a5b4fc',
                  }}
                  title={
                    isFirebaseActive
                      ? 'Live Firebase Firestore active across all devices'
                      : 'Global cloud sync active'
                  }
                >
                  <Globe2 size={11} />
                  <span>
                    {isSyncing
                      ? 'Syncing...'
                      : isFirebaseActive
                      ? '🟢 Live Firebase'
                      : '🌐 Cloud Sync'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Dedicated standalone board for every game type combination
              </div>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close Leaderboard">
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls: Mode, Continent, Timer Mode */}
        <div className="leaderboard-filters-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
          {/* Row 1: Game Mode */}
          <div className="leaderboard-filter-group">
            <span className="leaderboard-filter-label" style={{ minWidth: '70px' }}>
              <Layers size={12} /> Mode:
            </span>
            <div className="leaderboard-filter-pills">
              {GAME_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`leaderboard-filter-pill ${selectedMode === m.id ? 'active' : ''}`}
                  onClick={() => setSelectedMode(m.id)}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Scope / Continent */}
          <div className="leaderboard-filter-group">
            <span className="leaderboard-filter-label" style={{ minWidth: '70px' }}>
              <Compass size={12} /> Scope:
            </span>
            <div className="leaderboard-filter-pills">
              {CONTINENT_FILTERS.map((cont) => (
                <button
                  key={cont.id}
                  type="button"
                  className={`leaderboard-filter-pill ${selectedContinent === cont.id ? 'active' : ''}`}
                  onClick={() => setSelectedContinent(cont.id)}
                >
                  <span>{cont.icon}</span>
                  <span>{cont.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Timer Mode */}
          <div className="leaderboard-filter-group">
            <span className="leaderboard-filter-label" style={{ minWidth: '70px' }}>
              <Clock size={12} /> Pacing:
            </span>
            <div className="leaderboard-filter-pills">
              {TIMER_MODES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`leaderboard-filter-pill ${selectedTimerMode === t.id ? 'active' : ''}`}
                  onClick={() => setSelectedTimerMode(t.id)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Combination Title Banner & Sort Criteria Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border-card)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--primary-light)' }}>
              {getModeLabel(selectedMode)}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--text)' }}>
              {selectedContinent === 'all' ? 'All World' : selectedContinent}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: '#e9c46a' }}>
              {selectedTimerMode === 'timed' ? '⏱️ 10s Timed' : '🧘 Relaxed'}
            </span>
            <span
              style={{
                marginLeft: '6px',
                fontSize: '0.7rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 6px',
                borderRadius: '999px',
                color: 'var(--text-muted)',
              }}
            >
              {entries.length} record{entries.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Sort Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`leaderboard-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.desc}
              >
                <span className="leaderboard-tab-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body content */}
        <div className="leaderboard-body-scrollable">
          {entries.length === 0 ? (
            <div className="leaderboard-empty-state">
              <Award size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                No Records for This Combination Yet
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '360px', margin: '0.4rem auto' }}>
                Play a game in <strong>{getModeLabel(selectedMode)}</strong> ({selectedContinent === 'all' ? 'All World' : selectedContinent}, {selectedTimerMode === 'timed' ? '10s Timed' : 'Relaxed'}) and be the first to set the world record!
              </p>
            </div>
          ) : (
            <>
              {/* Podium Showcase (Top 3) */}
              {topThree.length > 0 && (
                <div className="leaderboard-podium-container">
                  {/* #2 Silver (left) */}
                  {topThree[1] ? (
                    <div
                      className={`podium-card silver ${recentSubmittedEntryId === topThree[1].id ? 'highlight-recent' : ''}`}
                    >
                      <div className="podium-medal">🥈 2nd</div>
                      <div className="podium-badge" style={{ color: getRankBadgeColor(topThree[1].rankBadge) }}>
                        {topThree[1].rankBadge}
                      </div>
                      <div className="podium-name" title={topThree[1].playerName}>
                        {topThree[1].playerName}
                      </div>
                      <div className="podium-mode">
                        {topThree[1].mistakesCount === 0 ? '🎯 Flawless' : `${topThree[1].mistakesCount} errors`} • {topThree[1].accuracy}%
                      </div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[1].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[1].mistakesCount} errors ({formatTimeElapsed(topThree[1].timeElapsedSeconds)})</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[1].bestStreak} streak</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="podium-card empty" />
                  )}

                  {/* #1 Gold (center) */}
                  {topThree[0] && (
                    <div
                      className={`podium-card gold ${recentSubmittedEntryId === topThree[0].id ? 'highlight-recent' : ''}`}
                    >
                      <div className="podium-crown">👑</div>
                      <div className="podium-medal">🥇 1st Champion</div>
                      <div className="podium-badge" style={{ color: getRankBadgeColor(topThree[0].rankBadge) }}>
                        {topThree[0].rankBadge}
                      </div>
                      <div className="podium-name" title={topThree[0].playerName}>
                        {topThree[0].playerName}
                      </div>
                      <div className="podium-mode">
                        {topThree[0].mistakesCount === 0 ? '🎯 Flawless' : `${topThree[0].mistakesCount} errors`} • {topThree[0].accuracy}%
                      </div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[0].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[0].mistakesCount} errors ({formatTimeElapsed(topThree[0].timeElapsedSeconds)})</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[0].bestStreak} streak</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* #3 Bronze (right) */}
                  {topThree[2] ? (
                    <div
                      className={`podium-card bronze ${recentSubmittedEntryId === topThree[2].id ? 'highlight-recent' : ''}`}
                    >
                      <div className="podium-medal">🥉 3rd</div>
                      <div className="podium-badge" style={{ color: getRankBadgeColor(topThree[2].rankBadge) }}>
                        {topThree[2].rankBadge}
                      </div>
                      <div className="podium-name" title={topThree[2].playerName}>
                        {topThree[2].playerName}
                      </div>
                      <div className="podium-mode">
                        {topThree[2].mistakesCount === 0 ? '🎯 Flawless' : `${topThree[2].mistakesCount} errors`} • {topThree[2].accuracy}%
                      </div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[2].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[2].mistakesCount} errors ({formatTimeElapsed(topThree[2].timeElapsedSeconds)})</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[2].bestStreak} streak</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="podium-card empty" />
                  )}
                </div>
              )}

              {/* Complete Rankings Table */}
              <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Rank</th>
                      <th>Player Name</th>
                      <th style={{ textAlign: 'center' }}>Errors</th>
                      <th style={{ textAlign: 'center' }}>Accuracy</th>
                      <th style={{ textAlign: 'center' }}>Time</th>
                      <th style={{ textAlign: 'center' }}>Streak</th>
                      <th style={{ textAlign: 'right' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item, index) => {
                      const isRecent = recentSubmittedEntryId === item.id;
                      const rankNum = index + 1;
                      let rankIcon = `#${rankNum}`;
                      if (rankNum === 1) rankIcon = '🥇 #1';
                      else if (rankNum === 2) rankIcon = '🥈 #2';
                      else if (rankNum === 3) rankIcon = '🥉 #3';

                      return (
                        <tr key={item.id} className={isRecent ? 'recent-submission-row' : ''}>
                          <td className="rank-cell">
                            <span className={`rank-pill rank-${rankNum <= 3 ? rankNum : 'other'}`}>
                              {rankIcon}
                            </span>
                          </td>
                          <td className="player-cell">
                            <div className="player-info">
                              <span
                                className="player-badge"
                                style={{
                                  borderColor: getRankBadgeColor(item.rankBadge),
                                  color: getRankBadgeColor(item.rankBadge),
                                }}
                              >
                                {item.rankBadge}
                              </span>
                              <span className="player-name">{item.playerName}</span>
                              {isRecent && <span className="you-pill">Your Run</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }} className={item.mistakesCount === 0 ? 'text-success' : 'text-danger'}>
                            {item.mistakesCount}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#ffd166' }}>
                            {item.accuracy}%
                          </td>
                          <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#48cae4' }}>
                            {formatTimeElapsed(item.timeElapsedSeconds)}
                          </td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>
                            {item.bestStreak > 0 ? `🔥 ${item.bestStreak}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer actions with Clear Board option */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            className="action-btn"
            onClick={handleClearAll}
            disabled={isClearing}
            style={{
              fontSize: '0.75rem',
              padding: '4px 10px',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.3)',
            }}
            title="Clear all leaderboard records globally"
          >
            <Trash2 size={13} />
            <span>{isClearing ? 'Clearing...' : 'Clear All Entries'}</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '6px 22px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
