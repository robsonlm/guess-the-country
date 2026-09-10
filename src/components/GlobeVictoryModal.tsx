import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Globe, RefreshCw, Eye } from 'lucide-react';

interface GlobeVictoryModalProps {
  isOpen: boolean;
  conqueredCount: number;
  totalCountries: number;
  mistakesCount: number;
  onPlayAgain: () => void;
  onExplore: () => void;
}

export const GlobeVictoryModal: React.FC<GlobeVictoryModalProps> = ({
  isOpen,
  conqueredCount,
  totalCountries,
  mistakesCount,
  onPlayAgain,
  onExplore,
}) => {
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

  return (
    <div className="modal-overlay fade-in" style={{ zIndex: 100 }} role="dialog" aria-modal="true">
      <div
        className="modal-content victory-content"
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          borderColor: 'rgba(42, 157, 143, 0.6)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(42, 157, 143, 0.3)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(42,157,143,0.3) 0%, rgba(13,22,38,0.8) 100%)',
              border: '2px solid #2a9d8f',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(42,157,143,0.5)',
            }}
          >
            <Globe size={38} style={{ color: '#48cae4' }} />
          </div>
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.35rem' }}>
          Entire Globe Conquered!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          You have successfully identified every sovereign territory and country across Planet Earth!
        </p>

        {/* Rank Showcase */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${rankColor}`,
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            boxShadow: `0 0 20px ${rankColor}33`,
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: rankColor,
              lineHeight: 1,
            }}
          >
            {rank}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)' }}>
              Cartographer Rank
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{rankTitle}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
            }}
          >
            <div style={{ color: '#48cae4', fontWeight: 800, fontSize: '1.2rem' }}>
              {conqueredCount} / {totalCountries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conquered</div>
          </div>

          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
            }}
          >
            <div
              style={{
                color: mistakesCount === 0 ? '#10b981' : '#f87171',
                fontWeight: 800,
                fontSize: '1.3rem',
              }}
            >
              {mistakesCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mistakes</div>
          </div>

          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
            }}
          >
            <div style={{ color: '#ffd166', fontWeight: 800, fontSize: '1.3rem' }}>
              {accuracy}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accuracy</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="action-btn"
            onClick={onExplore}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            <Eye size={16} /> Explore Globe
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onPlayAgain}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            <RefreshCw size={16} /> New Expedition
          </button>
        </div>
      </div>
    </div>
  );
};
