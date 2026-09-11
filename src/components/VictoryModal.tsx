import React, { useState } from 'react';
import { Trophy, CheckCircle2, RotateCcw, Percent, Flame, Award, Send } from 'lucide-react';
import { GameMode, ContinentFilter, GameScore } from '../types/game';
import { clearGameProgress } from '../services/countriesApi';
import {
  getLastPlayerName,
  addLeaderboardEntry,
  LeaderboardPlacementResult,
  formatTimeElapsed,
} from '../services/leaderboard';

interface VictoryModalProps {
  score: GameScore;
  totalCountries: number;
  timeElapsedSeconds?: number;
  gameMode?: GameMode;
  continentFilter?: ContinentFilter;
  onPlayAgain: () => void;
  onOpenLeaderboard?: (entryId?: string) => void;
  onSubmitSuccess?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  totalCountries,
  timeElapsedSeconds = 0,
  gameMode = 'flag-to-name',
  continentFilter = 'all',
  onPlayAgain,
  onOpenLeaderboard,
  onSubmitSuccess,
}) => {
  const [playerName, setPlayerName] = useState(getLastPlayerName());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [placementResult, setPlacementResult] = useState<LeaderboardPlacementResult | null>(null);

  const percentageNum = score.total === 0 ? 100 : Math.round((score.right / score.total) * 100);
  const percentageStr = percentageNum.toString();

  const handleLeaderboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted) return;

    // 1. Instantly clear browser cached game progress so refresh never re-submits
    clearGameProgress();

    const result = addLeaderboardEntry({
      playerName: playerName.trim() || 'World Master',
      gameMode,
      continentFilter,
      totalCountries,
      conqueredCount: score.right,
      mistakesCount: score.wrong,
      accuracy: percentageNum,
      timeElapsedSeconds,
      bestStreak: score.bestStreak,
    });

    setPlacementResult(result);
    setIsSubmitted(true);

    // 2. Clear parent game state
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }

    // 3. Automatically redirect player to the Leaderboard modal
    setTimeout(() => {
      if (onOpenLeaderboard) {
        onOpenLeaderboard(result.entry.id);
      }
    }, 1000);
  };

  return (
    <div className="modal-overlay fade-in" role="dialog" aria-modal="true" style={{ zIndex: 100 }}>
      <div
        className="modal-content victory-content"
        style={{
          textAlign: 'center',
          padding: '1.75rem 1.5rem',
          maxWidth: '520px',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div className="victory-icon-wrapper pop-in">
          <Trophy size={44} className="victory-trophy" />
        </div>

        <h2 className="victory-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
          World Flag Grand Master!
        </h2>
        <p className="victory-subtitle" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Incredible! You have correctly identified all <strong>{totalCountries}</strong> world country flags!
        </p>

        {/* Stats Grid */}
        <div className="victory-stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="victory-stat-box">
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            <span className="victory-stat-num">{score.right}</span>
            <span className="victory-stat-label">Flags Conquered</span>
          </div>

          <div className="victory-stat-box">
            <Percent size={16} style={{ color: 'var(--primary-light)' }} />
            <span className="victory-stat-num">{percentageStr}%</span>
            <span className="victory-stat-label">Accuracy Rate</span>
          </div>

          <div className="victory-stat-box">
            <Flame size={16} style={{ color: '#f59e0b' }} />
            <span className="victory-stat-num">{score.bestStreak}</span>
            <span className="victory-stat-label">Best Streak</span>
          </div>

          <div className="victory-stat-box">
            <Award size={16} style={{ color: '#ec4899' }} />
            <span className="victory-stat-num">{formatTimeElapsed(timeElapsedSeconds)}</span>
            <span className="victory-stat-label">Time Elapsed</span>
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
              <div className="leaderboard-input-row">
                <input
                  type="text"
                  className="leaderboard-name-input"
                  placeholder="Enter your name..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={24}
                  required
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
                  <Send size={13} />
                  <span>Submit</span>
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

        <div style={{ marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
            onClick={onPlayAgain}
          >
            <RotateCcw size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Play Again / Restart Journey
          </button>
        </div>
      </div>
    </div>
  );
};
