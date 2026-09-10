import React from 'react';
import { Timer, Zap } from 'lucide-react';
import { TimerMode } from '../types/game';

interface TimerBarProps {
  timerMode: TimerMode;
  timeLeft: number;
  maxTime: number;
}

export const TimerBar: React.FC<TimerBarProps> = ({ timerMode, timeLeft, maxTime }) => {
  if (timerMode === 'none') return null;

  const percentage = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const isCritical = timeLeft <= 3 || (timerMode === 'blitz' && timeLeft <= 10);

  return (
    <div className={`timer-bar-container ${isCritical ? 'critical' : ''}`}>
      <div className="timer-info-row">
        <div className="timer-label">
          {timerMode === 'blitz' ? <Zap size={14} className="timer-icon" /> : <Timer size={14} className="timer-icon" />}
          <span>{timerMode === 'blitz' ? 'Blitz 60s Mode' : 'Flag Timer'}</span>
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
