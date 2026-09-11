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
} from 'lucide-react';
import { GameMode, ContinentFilter } from '../types/game';
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
} from '../services/leaderboard';
import '../styles/App.css';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentSubmittedEntryId?: string | null;
  defaultGameMode?: GameMode | 'all';
  defaultContinent?: ContinentFilter | 'all';
}

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'fastest', label: 'Fastest Game', icon: <Zap size={15} />, desc: 'Ranked by lowest elapsed completion time' },
  { id: 'least-mistakes', label: 'Least Mistakes', icon: <Target size={15} />, desc: 'Ranked by highest accuracy & fewest errors' },
  { id: 'highest-streak', label: 'Highest Streak', icon: <Flame size={15} />, desc: 'Ranked by longest consecutive streak' },
  { id: 'overall', label: 'Overall Champions', icon: <Trophy size={15} />, desc: 'Weighted score combining speed, accuracy & streak' },
];

const GAME_MODES: { id: GameMode | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Modes', icon: '🌐' },
  { id: 'globe', label: '3D Globe', icon: '🌍' },
  { id: 'flag-to-name', label: 'Flag ➔ Name', icon: '🏁' },
  { id: 'name-to-flag', label: 'Name ➔ Flag', icon: '🔤' },
];

const CONTINENT_FILTERS: { id: ContinentFilter | 'all'; label: string }[] = [
  { id: 'all', label: 'All World' },
  { id: 'Africa', label: 'Africa' },
  { id: 'Americas', label: 'Americas' },
  { id: 'Asia', label: 'Asia' },
  { id: 'Europe', label: 'Europe' },
  { id: 'Oceania', label: 'Oceania' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  recentSubmittedEntryId = null,
  defaultGameMode = 'all',
  defaultContinent = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('fastest');
  const [selectedMode, setSelectedMode] = useState<GameMode | 'all'>(defaultGameMode);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter | 'all'>(defaultContinent);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setRefreshKey] = useState(0);
  const isFirebaseActive = isFirebaseConfigured();

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

    // Real-time listener for live multi-device updates if Firebase is configured
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

  const entries = getFilteredLeaderboard(selectedCategory, selectedMode, selectedContinent);
  const topThree = entries.slice(0, 3);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="leaderboard-trophy-icon">
              <Trophy size={20} style={{ color: '#ffd166' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Global Hall of Fame
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
                      ? 'Live Firebase Firestore connected across all devices'
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
                {CATEGORIES.find((c) => c.id === selectedCategory)?.desc}
              </div>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close Leaderboard">
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="leaderboard-category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`leaderboard-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="leaderboard-tab-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Filter Controls (Mode & Continent) */}
        <div className="leaderboard-filters-bar">
          <div className="leaderboard-filter-group">
            <span className="leaderboard-filter-label">
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

          <div className="leaderboard-filter-group">
            <span className="leaderboard-filter-label">
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
                  {cont.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="leaderboard-body-scrollable">
          {entries.length === 0 ? (
            <div className="leaderboard-empty-state">
              <Award size={42} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                No Records in This Category Yet
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', margin: '0.4rem auto' }}>
                Complete a game in this mode and be the first pioneer on the global hall of fame!
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
                      <div className="podium-mode">{getModeLabel(topThree[1].gameMode)}</div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[1].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[1].mistakesCount} mistakes ({topThree[1].accuracy}%)</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[1].bestStreak} streak</span>
                        )}
                        {selectedCategory === 'overall' && (
                          <span>🏆 {topThree[1].accuracy}% in {formatTimeElapsed(topThree[1].timeElapsedSeconds)}</span>
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
                      <div className="podium-mode">{getModeLabel(topThree[0].gameMode)}</div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[0].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[0].mistakesCount} mistakes ({topThree[0].accuracy}%)</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[0].bestStreak} streak</span>
                        )}
                        {selectedCategory === 'overall' && (
                          <span>🏆 {topThree[0].accuracy}% in {formatTimeElapsed(topThree[0].timeElapsedSeconds)}</span>
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
                      <div className="podium-mode">{getModeLabel(topThree[2].gameMode)}</div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[2].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[2].mistakesCount} mistakes ({topThree[2].accuracy}%)</span>
                        )}
                        {selectedCategory === 'highest-streak' && (
                          <span>🔥 {topThree[2].bestStreak} streak</span>
                        )}
                        {selectedCategory === 'overall' && (
                          <span>🏆 {topThree[2].accuracy}% in {formatTimeElapsed(topThree[2].timeElapsedSeconds)}</span>
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
                      <th>Mode / Scope</th>
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
                          <td className="mode-cell">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                              {getModeLabel(item.gameMode)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {item.continentFilter === 'all' ? 'All World' : item.continentFilter} (
                              {item.conqueredCount} countries)
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

        {/* Footer actions - No reset button allowed */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing <strong>{entries.length}</strong> persistent hall of fame records
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '6px 20px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
