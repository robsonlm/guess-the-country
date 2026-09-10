import React from 'react';
import { Trophy, CheckCircle2, RotateCcw, Percent, Flame, Award } from 'lucide-react';
import { GameScore } from '../types/game';

interface VictoryModalProps {
  score: GameScore;
  totalCountries: number;
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  totalCountries,
  onPlayAgain,
}) => {
  const percentage = score.total === 0 ? '100' : ((score.right / score.total) * 100).toFixed(1);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content victory-content" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <div className="victory-icon-wrapper pop-in">
          <Trophy size={48} className="victory-trophy" />
        </div>

        <h2 className="victory-title">World Flag Grand Master!</h2>
        <p className="victory-subtitle">
          Incredible! You have correctly identified all <strong>{totalCountries}</strong> world country flags!
        </p>

        {/* Stats Grid */}
        <div className="victory-stats-grid">
          <div className="victory-stat-box">
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            <span className="victory-stat-num">{score.right}</span>
            <span className="victory-stat-label">Flags Conquered</span>
          </div>

          <div className="victory-stat-box">
            <Percent size={16} style={{ color: 'var(--primary-light)' }} />
            <span className="victory-stat-num">{percentage}%</span>
            <span className="victory-stat-label">Accuracy Rate</span>
          </div>

          <div className="victory-stat-box">
            <Flame size={16} style={{ color: '#f59e0b' }} />
            <span className="victory-stat-num">{score.bestStreak}</span>
            <span className="victory-stat-label">Best Streak</span>
          </div>

          <div className="victory-stat-box">
            <Award size={16} style={{ color: '#ec4899' }} />
            <span className="victory-stat-num">{score.total}</span>
            <span className="victory-stat-label">Total Attempts</span>
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
            onClick={onPlayAgain}
          >
            <RotateCcw size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Play Again / Restart Journey
          </button>
        </div>
      </div>
    </div>
  );
};
