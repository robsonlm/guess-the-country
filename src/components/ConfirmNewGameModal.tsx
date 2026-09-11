import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ConfirmNewGameModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  streak: number;
  solvedCount: number;
}

export const ConfirmNewGameModal: React.FC<ConfirmNewGameModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  streak,
  solvedCount,
}) => {
  if (!isOpen) return null;

  const hasProgress = streak > 0 || solvedCount > 0;

  return (
    <div
      className="modal-overlay fade-in"
      style={{ zIndex: 1300 }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content confirm-new-game-modal"
        style={{
          maxWidth: '430px',
          padding: '1.4rem',
          borderRadius: '16px',
          background: 'rgba(13, 22, 38, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.9rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Stop Current Game?
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Start fresh with new game options
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
          Are you sure you want to stop the current expedition and start a new game?
          {hasProgress && (
            <span
              style={{
                display: 'block',
                marginTop: '0.5rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 209, 102, 0.1)',
                border: '1px solid rgba(255, 209, 102, 0.25)',
                color: '#ffd166',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              ⚠️ Current streak ({streak}) and mastered progress ({solvedCount}) will be reset.
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              fontWeight: 600,
            }}
          >
            Keep Playing
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.15rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RotateCcw size={15} />
            <span>Yes, Start New</span>
          </button>
        </div>
      </div>
    </div>
  );
};
