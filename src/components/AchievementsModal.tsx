import React from 'react';
import { X, Trophy, Lock, CheckCircle2 } from 'lucide-react';
import { Achievement } from '../types/game';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;
  const total = achievements.length;
  const percentage = ((unlockedCount / total) * 100).toFixed(0);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content achievements-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={20} style={{ color: '#fbbf24' }} />
            <h2 className="modal-title">Trophy Shelf & Achievements</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close achievements">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Progress Overview */}
          <div className="achievements-summary-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {unlockedCount} of {total} Trophies Unlocked
              </span>
              <span className="mastered-pct-badge">{percentage}%</span>
            </div>
            <div className="mastered-progress-track" style={{ height: 6, borderRadius: 3, marginTop: '0.6rem' }}>
              <div
                className="mastered-progress-fill"
                style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)' }}
              />
            </div>
          </div>

          {/* Achievements List */}
          <div className="achievements-grid">
            {achievements.map((ach) => {
              const isUnlocked = ach.unlockedAt !== null;
              return (
                <div
                  key={ach.id}
                  className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="achievement-icon-wrapper">
                    {isUnlocked ? (
                      <span className="achievement-emoji">{ach.icon}</span>
                    ) : (
                      <Lock size={18} className="achievement-lock" />
                    )}
                  </div>

                  <div className="achievement-details">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4 className="achievement-name">{ach.title}</h4>
                      {isUnlocked && <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />}
                    </div>
                    <p className="achievement-desc">{ach.description}</p>
                    {isUnlocked && ach.unlockedAt && (
                      <span className="achievement-date">
                        Unlocked on {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
