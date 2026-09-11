import React from 'react';
import { Timer } from 'lucide-react';
import { TimerMode } from '../types/game';

interface TimerBarProps {
  timerMode: TimerMode;
  timeLeft: number;
  maxTime: number;
}

export const TimerBar: React.FC<TimerBarProps> = ({ timerMode, timeLeft, maxTime }) => {
  if (timerMode === 'relaxed') return null;

  const percentage = Math.max(0, Math.min(100, (timeLeft / (maxTime || 10)) * 100));
  const isCritical = timeLeft <= 3;

  return (
    <div className={`timer-bar-container ${isCritical ? 'critical' : ''}`}>
      <div className="timer-info-row">
        <div className="timer-label">
          <Timer size={14} className="timer-icon" />
          <span>10s Speed Timer</span>
        </div>
        <span className="timer-digits">{timeLeft}s</span>
      </div>

      <div className="timer-track">
        <div
          className={`timer-fill ${isCritical ? 'critical' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
