import React from 'react';
import { Check, X, Percent, Trophy } from 'lucide-react';
import { GameScore } from '../types/game';

interface ScoreBoardProps {
  score: GameScore;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ score }) => {
  const percentage = score.total === 0 ? '0.0' : ((score.right / score.total) * 100).toFixed(1);

  return (
    <section className="score-board" id="score" aria-label="Game Scores">
      <div className="score-card">
        <span className="score-label">
          <Check size={14} className="score-icon" /> Right
        </span>
        <span className="score-value success" id="right">
          {score.right}
        </span>
      </div>

      <div className="score-card">
        <span className="score-label">
          <X size={14} className="score-icon" /> Wrong
        </span>
        <span className="score-value danger" id="wrong">
          {score.wrong}
        </span>
      </div>

      <div className="score-card">
        <span className="score-label">
          <Percent size={14} className="score-icon" /> Accuracy
        </span>
        <span className="score-value highlight">
          <span id="total-per">{percentage}</span>%
        </span>
        <span style={{ display: 'none' }} id="total">
          {score.total}
        </span>
      </div>

      <div className="score-card">
        <span className="score-label">
          <Trophy size={14} className="score-icon" /> Best Streak
        </span>
        <span className="score-value" style={{ color: '#fbbf24' }}>
          {score.bestStreak}
        </span>
      </div>
    </section>
  );
};
