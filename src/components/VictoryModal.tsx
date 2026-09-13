import React, { useState, useEffect, useRef } from 'react';
import { Trophy, CheckCircle2, RotateCcw, Percent, Flame, Award, User } from 'lucide-react';
import { GameMode, ContinentFilter, GameScore, TimerMode } from '../types/game';
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
  timerMode?: TimerMode;
  playerName?: string;
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
  timerMode = 'timed',
  playerName: initialPlayerName,
  onPlayAgain,
  onOpenLeaderboard,
  onSubmitSuccess,
}) => {
  const [placementResult, setPlacementResult] = useState<LeaderboardPlacementResult | null>(null);
  const hasSubmittedRef = useRef(false);

  const percentageNum = score.total === 0 ? 100 : Math.round((score.right / score.total) * 100);
  const percentageStr = percentageNum.toString();
  const playerName = initialPlayerName?.trim() || getLastPlayerName();

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    // Instantly clear browser cached game progress so refresh never restores completed state
    clearGameProgress();

    const result = addLeaderboardEntry({
      playerName: playerName.trim() || 'World Master',
      gameMode,
      continentFilter,
      timerMode,
      totalCountries,
      conqueredCount: score.right,
      mistakesCount: score.wrong,
      accuracy: percentageNum,
      timeElapsedSeconds,
      bestStreak: score.bestStreak,
    });

    setPlacementResult(result);
    if (onSubmitSuccess) {
      onSubmitSuccess();
    }
  }, [playerName, gameMode, continentFilter, timerMode, totalCountries, score.right, score.wrong, percentageNum, timeElapsedSeconds, score.bestStreak, onSubmitSuccess]);

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

        {/* Automatic Leaderboard Registration Box */}
        <div className="leaderboard-claim-box">
          <div className="leaderboard-submitted-badge fade-in">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#10b981',
                fontWeight: 700,
                fontSize: '0.92rem',
                marginBottom: '0.35rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Score Automatically Uploaded to Leaderboard</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <User size={13} style={{ color: 'var(--primary-light)' }} />
              <span>Registered Explorer:</span>
              <strong style={{ color: '#f8fafc' }}>{playerName}</strong>
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
                style={{ marginTop: '0.65rem', width: '100%', fontSize: '0.84rem', padding: '7px 12px' }}
              >
                <Trophy size={14} style={{ color: '#ffd166' }} />
                <span>View Rank on Leaderboard</span>
              </button>
            )}
          </div>
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
