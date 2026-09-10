import React, { useEffect } from 'react';
import { PauseCircle, Play } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ isOpen, onResume }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onResume]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal-content pause-modal-content pop-in"
        style={{ textAlign: 'center', padding: '2.2rem 1.75rem', maxWidth: 440 }}
      >
        <div className="pause-icon-wrapper">
          <PauseCircle size={52} className="pause-icon" />
        </div>

        <h2 className="pause-modal-title">Game Paused</h2>
        <p className="pause-modal-subtitle">
          You missed the timer <strong>3 times in a row</strong>.
        </p>
        <p className="pause-modal-desc">
          The countdown has been paused so your streak and stats are protected while you take a quick break.
        </p>

        <div style={{ marginTop: '1.8rem' }}>
          <button
            type="button"
            className="btn-primary resume-pulse-btn"
            style={{
              width: '100%',
              padding: '0.95rem 1.25rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
            }}
            onClick={onResume}
          >
            <Play size={20} fill="currentColor" />
            Resume Game
          </button>
          <span style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Press <kbd style={{ padding: '0.15rem 0.4rem', background: 'var(--surface-hover)', borderRadius: 4, border: '1px solid var(--border)' }}>Space</kbd> or <kbd style={{ padding: '0.15rem 0.4rem', background: 'var(--surface-hover)', borderRadius: 4, border: '1px solid var(--border)' }}>Enter</kbd> to resume
          </span>
        </div>
      </div>
    </div>
  );
};
