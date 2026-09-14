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
  KeyRound,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { GameMode, ContinentFilter, TimerMode, GameEdition, USRegionFilter } from '../types/game';
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
import { verifyAdminPassword } from '../services/firebase';
import '../styles/App.css';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentSubmittedEntryId?: string | null;
  defaultEdition?: GameEdition;
  defaultGameMode?: GameMode;
  defaultContinent?: ContinentFilter;
  defaultUsRegion?: USRegionFilter;
  defaultTimerMode?: TimerMode;
  isAdmin?: boolean;
}

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'least-mistakes', label: 'Fewest Mistakes', icon: <Target size={13} />, desc: 'Ranked by highest accuracy & fewest errors' },
  { id: 'fastest', label: 'Fastest Speed', icon: <Zap size={13} />, desc: 'Ranked by lowest elapsed completion time' },
  { id: 'highest-streak', label: 'Best Streak', icon: <Flame size={13} />, desc: 'Ranked by longest consecutive streak' },
];

const EDITION_OPTIONS: { id: GameEdition; label: string; icon: string }[] = [
  { id: 'world', label: 'World Countries', icon: '🌐' },
  { id: 'us-states', label: 'US State Flags', icon: '🇺🇸' },
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

const US_REGION_FILTERS: { id: USRegionFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All 50 States', icon: '🇺🇸' },
  { id: 'Northeast', label: 'Northeast', icon: '🌲' },
  { id: 'Midwest', label: 'Midwest', icon: '🌾' },
  { id: 'South', label: 'South', icon: '☀️' },
  { id: 'West', label: 'West', icon: '🏔️' },
];

const TIMER_MODES: { id: TimerMode; label: string; icon: string }[] = [
  { id: 'timed', label: '10s Timed', icon: '⏱️' },
  { id: 'relaxed', label: 'Relaxed', icon: '🧘' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  recentSubmittedEntryId = null,
  defaultEdition = 'world',
  defaultGameMode = 'globe',
  defaultContinent = 'all',
  defaultUsRegion = 'all',
  defaultTimerMode = 'timed',
  isAdmin = false,
}) => {
  const [selectedEdition, setSelectedEdition] = useState<GameEdition>(defaultEdition);
  const [selectedMode, setSelectedMode] = useState<GameMode>(defaultGameMode);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>(defaultContinent);
  const [selectedUsRegion, setSelectedUsRegion] = useState<USRegionFilter>(defaultUsRegion);
  const [selectedTimerMode, setSelectedTimerMode] = useState<TimerMode>(defaultTimerMode);
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>(
    defaultTimerMode === 'timed' ? 'fastest' : 'least-mistakes'
  );

  // Hidden filters state - collapsed by default for clean mobile layout
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [isSessionAdmin, setIsSessionAdmin] = useState(isAdmin);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [, setRefreshKey] = useState(0);
  const isFirebaseActive = isFirebaseConfigured();

  // Keep state in sync with defaults when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedEdition(defaultEdition);
      setSelectedMode(defaultGameMode);
      setSelectedContinent(defaultContinent);
      setSelectedUsRegion(defaultUsRegion);
      setSelectedTimerMode(defaultTimerMode);
      setSelectedCategory(defaultTimerMode === 'timed' ? 'fastest' : 'least-mistakes');
      setIsSessionAdmin(isAdmin);
      setIsFiltersOpen(false);
    }
  }, [isOpen, defaultEdition, defaultGameMode, defaultContinent, defaultUsRegion, defaultTimerMode, isAdmin]);

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

  const allLeaderboardEntries = loadLeaderboard();

  // Helper counts to grey out empty leaderboard options
  const getEditionCount = (edition: GameEdition) =>
    allLeaderboardEntries.filter((e) => (e.edition || 'world') === edition).length;

  const getModeCount = (mode: GameMode) =>
    allLeaderboardEntries.filter(
      (e) => (e.edition || 'world') === selectedEdition && e.gameMode === mode
    ).length;

  const getScopeCount = (scope: ContinentFilter | USRegionFilter) =>
    allLeaderboardEntries.filter((e) => {
      if ((e.edition || 'world') !== selectedEdition) return false;
      if (e.gameMode !== selectedMode) return false;
      if (selectedEdition === 'us-states') {
        return (e.usRegionFilter || 'all') === scope;
      }
      return (e.continentFilter || 'all') === scope;
    }).length;

  const getTimerCount = (timer: TimerMode) =>
    allLeaderboardEntries.filter((e) => {
      if ((e.edition || 'world') !== selectedEdition) return false;
      if (e.gameMode !== selectedMode) return false;
      if (selectedEdition === 'us-states') {
        if ((e.usRegionFilter || 'all') !== selectedUsRegion) return false;
      } else {
        if ((e.continentFilter || 'all') !== selectedContinent) return false;
      }
      return (e.timerMode || 'timed') === timer;
    }).length;

  // Query strictly for this exact game type combination
  const selectedScope: ContinentFilter | USRegionFilter =
    selectedEdition === 'us-states' ? selectedUsRegion : selectedContinent;

  const entries = getFilteredLeaderboard(
    selectedEdition,
    selectedMode,
    selectedScope,
    selectedTimerMode,
    selectedCategory
  );
  const topThree = entries.slice(0, 3);

  const handleClearAll = async () => {
    let authorized = isSessionAdmin;

    if (!authorized) {
      const code = window.prompt(
        '🔒 Admin Authentication Required\nEnter admin password to authorize clearing the leaderboard:'
      );
      if (!code) return;
      
      try {
        const verifyRes = await verifyAdminPassword(code);
        if (verifyRes.success) {
          authorized = true;
          setIsSessionAdmin(true);
        } else {
          alert(`❌ Unauthorized: ${verifyRes.error || 'Invalid administrator password.'}`);
          return;
        }
      } catch (err: any) {
        alert(`❌ Verification error: ${err.message || 'Could not verify admin password'}`);
        return;
      }
    }

    const confirmed = window.confirm(
      '⚠️ Admin Action: Are you sure you want to permanently clear ALL leaderboard records globally across all modes and devices?'
    );
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await clearAllLeaderboardEntries();
      setRefreshKey((prev) => prev + 1);
      alert('✅ Leaderboard successfully cleared globally.');
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
        return '3D Globe';
      case 'flag-to-name':
        return 'Flag ➔ Name';
      case 'name-to-flag':
        return 'Name ➔ Flag';
      default:
        return mode;
    }
  };

  const getModeIcon = (mode: GameMode) => {
    switch (mode) {
      case 'globe':
        return '🌍';
      case 'flag-to-name':
        return '🏁';
      case 'name-to-flag':
        return '🔤';
      default:
        return '🌍';
    }
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 110 }} role="dialog" aria-modal="true">
      <div className="modal-content leaderboard-modal-content">
        {/* Header */}
        <div className="modal-header leaderboard-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="leaderboard-trophy-icon">
              <Trophy size={18} style={{ color: '#ffd166' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
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
                  <Globe2 size={10} />
                  <span>
                    {isSyncing
                      ? 'Syncing...'
                      : isFirebaseActive
                      ? 'Live'
                      : 'Sync'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close Leaderboard">
            <X size={18} />
          </button>
        </div>

        {/* Collapsible Active Filter Summary Bar */}
        <div className="leaderboard-active-filter-strip">
          <div className="leaderboard-summary-chips" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
            <span className="leaderboard-summary-chip edition">
              {selectedEdition === 'us-states' ? '🇺🇸 US States' : '🌐 World'}
            </span>
            <span className="leaderboard-summary-chip mode">
              {getModeIcon(selectedMode)} {getModeLabel(selectedMode)}
            </span>
            <span className="leaderboard-summary-chip scope">
              {selectedEdition === 'us-states'
                ? selectedUsRegion === 'all'
                  ? '🇺🇸 All 50 States'
                  : `📍 ${selectedUsRegion}`
                : selectedContinent === 'all'
                ? '🌍 All World'
                : `📍 ${selectedContinent}`}
            </span>
            <span className="leaderboard-summary-chip timer">
              {selectedTimerMode === 'timed' ? '⏱️ 10s Timed' : '🧘 Relaxed'}
            </span>
          </div>

          <button
            type="button"
            className={`leaderboard-filter-toggle-btn ${isFiltersOpen ? 'active' : ''}`}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            title={isFiltersOpen ? 'Close filters' : 'Change edition, game mode or scope filters'}
            aria-expanded={isFiltersOpen}
          >
            <SlidersHorizontal size={12} />
            <span>{isFiltersOpen ? 'Hide' : 'Filter'}</span>
            {isFiltersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Expandable Filter Drawer (Hidden after selection for clean screen) */}
        {isFiltersOpen && (
          <div className="leaderboard-filters-drawer fade-in">
            {/* Row 1: Edition */}
            <div className="leaderboard-filter-group">
              <span className="leaderboard-filter-label">
                <Globe2 size={11} /> Edition:
              </span>
              <div className="leaderboard-filter-pills">
                {EDITION_OPTIONS.map((ed) => {
                  const count = getEditionCount(ed.id);
                  const isSelected = selectedEdition === ed.id;
                  const isGreyedOut = count === 0 && !isSelected;

                  return (
                    <button
                      key={ed.id}
                      type="button"
                      disabled={isGreyedOut}
                      className={`leaderboard-filter-pill ${isSelected ? 'active' : ''} ${
                        isGreyedOut ? 'empty-disabled' : ''
                      }`}
                      onClick={() => {
                        if (!isGreyedOut) {
                          setSelectedEdition(ed.id);
                        }
                      }}
                      title={
                        isGreyedOut
                          ? `No records for ${ed.label}`
                          : `${ed.label} (${count} records)`
                      }
                    >
                      <span>{ed.icon}</span>
                      <span>{ed.label}</span>
                      {count > 0 && <span className="pill-count-badge">({count})</span>}
                      {isSelected && <Check size={11} style={{ marginLeft: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Game Mode */}
            <div className="leaderboard-filter-group">
              <span className="leaderboard-filter-label">
                <Layers size={11} /> Mode:
              </span>
              <div className="leaderboard-filter-pills">
                {GAME_MODES.map((m) => {
                  const count = getModeCount(m.id);
                  const isSelected = selectedMode === m.id;
                  const isGreyedOut = count === 0 && !isSelected;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isGreyedOut}
                      className={`leaderboard-filter-pill ${isSelected ? 'active' : ''} ${
                        isGreyedOut ? 'empty-disabled' : ''
                      }`}
                      onClick={() => {
                        if (!isGreyedOut) {
                          setSelectedMode(m.id);
                        }
                      }}
                      title={
                        isGreyedOut
                          ? 'No leaderboard records for this mode yet'
                          : `${m.label} (${count} records)`
                      }
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                      {count > 0 && <span className="pill-count-badge">({count})</span>}
                      {isSelected && <Check size={11} style={{ marginLeft: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Scope / Region */}
            <div className="leaderboard-filter-group">
              <span className="leaderboard-filter-label">
                <Compass size={11} /> {selectedEdition === 'us-states' ? 'Region:' : 'Scope:'}
              </span>
              <div className="leaderboard-filter-pills">
                {(selectedEdition === 'us-states' ? US_REGION_FILTERS : CONTINENT_FILTERS).map((scopeItem) => {
                  const count = getScopeCount(scopeItem.id);
                  const isSelected =
                    selectedEdition === 'us-states'
                      ? selectedUsRegion === scopeItem.id
                      : selectedContinent === scopeItem.id;
                  const isGreyedOut = count === 0 && !isSelected;

                  return (
                    <button
                      key={scopeItem.id}
                      type="button"
                      disabled={isGreyedOut}
                      className={`leaderboard-filter-pill ${isSelected ? 'active' : ''} ${
                        isGreyedOut ? 'empty-disabled' : ''
                      }`}
                      onClick={() => {
                        if (!isGreyedOut) {
                          if (selectedEdition === 'us-states') {
                            setSelectedUsRegion(scopeItem.id as USRegionFilter);
                          } else {
                            setSelectedContinent(scopeItem.id as ContinentFilter);
                          }
                          setIsFiltersOpen(false); // Auto-hide filters on scope selection
                        }
                      }}
                      title={
                        isGreyedOut
                          ? `No records for ${scopeItem.label}`
                          : `${scopeItem.label} (${count} records)`
                      }
                    >
                      <span>{scopeItem.icon}</span>
                      <span>{scopeItem.label}</span>
                      {count > 0 && <span className="pill-count-badge">({count})</span>}
                      {isSelected && <Check size={11} style={{ marginLeft: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: Timer Mode */}
            <div className="leaderboard-filter-group">
              <span className="leaderboard-filter-label">
                <Clock size={11} /> Pacing:
              </span>
              <div className="leaderboard-filter-pills">
                {TIMER_MODES.map((t) => {
                  const count = getTimerCount(t.id);
                  const isSelected = selectedTimerMode === t.id;
                  const isGreyedOut = count === 0 && !isSelected;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isGreyedOut}
                      className={`leaderboard-filter-pill ${isSelected ? 'active' : ''} ${
                        isGreyedOut ? 'empty-disabled' : ''
                      }`}
                      onClick={() => {
                        if (!isGreyedOut) {
                          setSelectedTimerMode(t.id);
                          setIsFiltersOpen(false); // Auto-hide filters on selection
                        }
                      }}
                      title={
                        isGreyedOut
                          ? `No records for ${t.label}`
                          : `${t.label} (${count} records)`
                      }
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                      {count > 0 && <span className="pill-count-badge">({count})</span>}
                      {isSelected && <Check size={11} style={{ marginLeft: 3 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
              <button
                type="button"
                className="action-btn"
                style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px' }}
                onClick={() => setIsFiltersOpen(false)}
              >
                Close Filters ▴
              </button>
            </div>
          </div>
        )}

        {/* Sort Ranking Category Tabs & Count */}
        <div className="leaderboard-category-tabs-bar">
          <div className="leaderboard-category-tabs-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`leaderboard-category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.desc}
              >
                <span className="leaderboard-tab-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="leaderboard-records-count">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        {/* Scrollable Leaderboard Data */}
        <div className="leaderboard-body-scrollable">
          {entries.length === 0 ? (
            <div className="leaderboard-empty-state">
              <Award size={36} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                No Records for This Combination Yet
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '340px', margin: '0.3rem auto' }}>
                Play a game in <strong>{selectedEdition === 'us-states' ? 'US State Flags' : 'World Countries'}</strong> (
                {getModeLabel(selectedMode)},{' '}
                {selectedEdition === 'us-states'
                  ? selectedUsRegion === 'all'
                    ? 'All 50 States'
                    : selectedUsRegion
                  : selectedContinent === 'all'
                  ? 'All World'
                  : selectedContinent}
                , {selectedTimerMode === 'timed' ? '10s Timed' : 'Relaxed'}) and set the first record!
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
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[1].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[1].mistakesCount} err ({formatTimeElapsed(topThree[1].timeElapsedSeconds)})</span>
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
                      <div className="podium-medal">🥇 1st</div>
                      <div className="podium-badge" style={{ color: getRankBadgeColor(topThree[0].rankBadge) }}>
                        {topThree[0].rankBadge}
                      </div>
                      <div className="podium-name" title={topThree[0].playerName}>
                        {topThree[0].playerName}
                      </div>
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[0].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[0].mistakesCount} err ({formatTimeElapsed(topThree[0].timeElapsedSeconds)})</span>
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
                      <div className="podium-primary-stat">
                        {selectedCategory === 'fastest' && (
                          <span>⚡ {formatTimeElapsed(topThree[2].timeElapsedSeconds)}</span>
                        )}
                        {selectedCategory === 'least-mistakes' && (
                          <span>🎯 {topThree[2].mistakesCount} err ({formatTimeElapsed(topThree[2].timeElapsedSeconds)})</span>
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

              {/* Rankings Table / List */}
              <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '42px', textAlign: 'center' }}>Rank</th>
                      <th>Player</th>
                      <th style={{ textAlign: 'center' }}>
                        {selectedCategory === 'fastest' ? 'Time' : selectedCategory === 'least-mistakes' ? 'Errors' : 'Streak'}
                      </th>
                      <th style={{ textAlign: 'center' }}>Accuracy</th>
                      <th style={{ textAlign: 'right' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item, index) => {
                      const isRecent = recentSubmittedEntryId === item.id;
                      const rankNum = index + 1;
                      let rankIcon = `#${rankNum}`;
                      if (rankNum === 1) rankIcon = '🥇';
                      else if (rankNum === 2) rankIcon = '🥈';
                      else if (rankNum === 3) rankIcon = '🥉';

                      return (
                        <tr key={item.id} className={isRecent ? 'recent-submission-row' : ''}>
                          <td className="rank-cell">
                            <span className={`rank-pill rank-${rankNum <= 3 ? rankNum : 'other'}`}>
                              {rankIcon} {rankNum > 3 ? rankNum : ''}
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
                              {isRecent && <span className="you-pill">You</span>}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {selectedCategory === 'least-mistakes' ? (
                              <span className={item.mistakesCount === 0 ? 'text-success' : 'text-danger'}>
                                {item.mistakesCount} err
                              </span>
                            ) : selectedCategory === 'highest-streak' ? (
                              <span style={{ color: '#f59e0b' }}>
                                🔥 {item.bestStreak}
                              </span>
                            ) : (
                              <span style={{ color: '#48cae4', fontFamily: 'monospace' }}>
                                ⚡ {formatTimeElapsed(item.timeElapsedSeconds)}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#ffd166', fontSize: '0.75rem' }}>
                            {item.accuracy}%
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {formatTimeElapsed(item.timeElapsedSeconds)}
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

        {/* Footer actions - Protected for Admin only */}
        <div className="modal-footer leaderboard-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {isSessionAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={13} /> Admin
              </span>
              <button
                type="button"
                className="action-btn"
                onClick={handleClearAll}
                disabled={isClearing}
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
                title="Admin: Clear all leaderboard records globally"
              >
                <Trash2 size={12} />
                <span>{isClearing ? 'Clearing...' : 'Clear All'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                opacity: 0.5,
                padding: '4px 6px',
              }}
              title="Admin access required to manage leaderboard data"
            >
              <KeyRound size={12} />
              <span>Admin</span>
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ padding: '5px 18px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
