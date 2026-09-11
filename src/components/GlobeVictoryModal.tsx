import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Globe,
  RefreshCw,
  Eye,
  Trophy,
  Send,
  CheckCircle2,
  User,
} from 'lucide-react';
import { ContinentFilter, TimerMode } from '../types/game';
import { clearGameProgress } from '../services/countriesApi';
import {
  getLastPlayerName,
  addLeaderboardEntry,
  LeaderboardPlacementResult,
  formatTimeElapsed,
} from '../services/leaderboard';

interface GlobeVictoryModalProps {
  isOpen: boolean;
  conqueredCount: number;
  totalCountries: number;
  mistakesCount: number;
  timeElapsedSeconds?: number;
  bestStreak?: number;
  continentFilter?: ContinentFilter;
  timerMode?: TimerMode;
  onPlayAgain: () => void;
  onExplore: () => void;
  onOpenLeaderboard?: (entryId?: string) => void;
  onSubmitSuccess?: () => void;
}

export const GlobeVictoryModal: React.FC<GlobeVictoryModalProps> = ({
  isOpen,
  conqueredCount,
  totalCountries,
  mistakesCount,
  timeElapsedSeconds = 0,
  bestStreak = 0,
  continentFilter = 'all',
  timerMode = 'timed',
  onPlayAgain,
  onExplore,
  onOpenLeaderboard,
  onSubmitSuccess,
}) => {
  const [playerName] = useState(getLastPlayerName());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [placementResult, setPlacementResult] = useState<LeaderboardPlacementResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 160,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#2a9d8f', '#e9c46a', '#e76f51', '#48cae4', '#10b981', '#f59e0b', '#8b5cf6'],
        });
      } catch {
        // safe
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalGuesses = conqueredCount + mistakesCount;
  const accuracy = totalGuesses > 0 ? Math.round((conqueredCount / totalGuesses) * 100) : 100;

  // Rank Calculation
  let rank = 'C';
  let rankTitle = 'World Pioneer';
  let rankColor = '#94a3b8';

  if (mistakesCount === 0) {
    rank = 'S+';
    rankTitle = 'Flawless Master Cartographer';
    rankColor = '#ffd166';
  } else if (mistakesCount <= 3) {
    rank = 'S';
    rankTitle = 'Grand Explorer';
    rankColor = '#06d6a0';
  } else if (mistakesCount <= 8) {
    rank = 'A';
    rankTitle = 'Veteran Navigator';
    rankColor = '#48cae4';
  } else if (mistakesCount <= 15) {
    rank = 'B';
    rankTitle = 'Skilled Voyager';
    rankColor = '#818cf8';
  }

  const handleLeaderboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted) return;

    // 1. Instantly clear browser cached game progress so refresh never re-submits or restores completed state
    clearGameProgress();

    const result = addLeaderboardEntry({
      playerName: playerName.trim() || 'World Explorer',
      gameMode: 'globe',
      continentFilter,
      timerMode,
      totalCountries,
      conqueredCount,
      mistakesCount,
      accuracy,
      timeElapsedSeconds,
      bestStreak: Math.max(bestStreak, conqueredCount),
    });

    setPlacementResult(result);
    setIsSubmitted(true);

    // 2. Clear parent game state so new game is ready
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }

    // 3. Automatically redirect player to the Leaderboard modal to see their highlighted ranking
    setTimeout(() => {
      if (onOpenLeaderboard) {
        onOpenLeaderboard(result.entry.id);
      }
    }, 1000);
  };

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 100 }} role="dialog" aria-modal="true">
      <div
        className="modal-content victory-content"
        style={{
          maxWidth: '540px',
          textAlign: 'center',
          borderColor: 'rgba(42, 157, 143, 0.6)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(42, 157, 143, 0.3)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(42,157,143,0.3) 0%, rgba(13,22,38,0.8) 100%)',
              border: '2px solid #2a9d8f',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(42,157,143,0.5)',
            }}
          >
            <Globe size={32} style={{ color: '#48cae4' }} />
          </div>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.2rem' }}>
          Entire Globe Conquered!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          You have successfully identified every territory across Planet Earth!
        </p>

        {/* Rank Showcase */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${rankColor}`,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            boxShadow: `0 0 16px ${rankColor}33`,
          }}
        >
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: rankColor,
              lineHeight: 1,
            }}
          >
            {rank}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)' }}>
              Cartographer Rank
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{rankTitle}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}
        >
          <div className="victory-stat-box-mini">
            <div style={{ color: '#48cae4', fontWeight: 800, fontSize: '1.1rem' }}>
              {conqueredCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Conquered</div>
          </div>

          <div className="victory-stat-box-mini">
            <div
              style={{
                color: mistakesCount === 0 ? '#10b981' : '#f87171',
                fontWeight: 800,
                fontSize: '1.1rem',
              }}
            >
              {mistakesCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mistakes</div>
          </div>

          <div className="victory-stat-box-mini">
            <div style={{ color: '#ffd166', fontWeight: 800, fontSize: '1.1rem' }}>
              {accuracy}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Accuracy</div>
          </div>

          <div className="victory-stat-box-mini">
            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'monospace' }}>
              {formatTimeElapsed(timeElapsedSeconds)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Time</div>
          </div>
        </div>

        {/* Claim Spot on Leaderboard Box */}
        <div className="leaderboard-claim-box">
          {!isSubmitted ? (
            <form onSubmit={handleLeaderboardSubmit} className="leaderboard-claim-form">
              <div className="leaderboard-claim-header">
                <Trophy size={16} style={{ color: '#ffd166' }} />
                <span>Submit Score to Global Leaderboard</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.95rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  margin: '0.6rem 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} style={{ color: 'var(--primary-light)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Explorer:</span>
                  <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{playerName}</strong>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <Send size={13} />
                  <span>Submit Score</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="leaderboard-submitted-badge fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} />
                <span>Score Registered! Opening Leaderboard...</span>
              </div>

              {placementResult && (
                <div className="leaderboard-placements-grid">
                  <div className="placement-pill">
                    <span className="placement-label">⚡ Speedrun:</span>
                    <strong className="placement-value">#{placementResult.fastestRank}</strong>
                  </div>
                  <div className="placement-pill">
                    <span className="placement-label">🎯 Least Errors:</span>
                    <strong className="placement-value">#{placementResult.leastMistakesRank}</strong>
                  </div>
                  <div className="placement-pill">
                    <span className="placement-label">🏆 Overall:</span>
                    <strong className="placement-value">#{placementResult.overallRank}</strong>
                  </div>
                </div>
              )}

              {onOpenLeaderboard && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => onOpenLeaderboard(placementResult?.entry.id)}
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  <Trophy size={14} style={{ color: '#ffd166' }} />
                  <span>View Your Rank on Leaderboard</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            className="action-btn"
            onClick={onExplore}
            style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
          >
            <Eye size={15} /> Explore Globe
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onPlayAgain}
            style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} /> New Expedition
          </button>
        </div>
      </div>
    </div>
  );
};
