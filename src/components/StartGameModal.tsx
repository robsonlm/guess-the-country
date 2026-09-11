import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { verifyAdminPassword } from '../services/firebase';
import { GameMode, ContinentFilter, TimerMode } from '../types/game';

interface StartGameModalProps {
  isOpen: boolean;
  initialPlayerName: string;
  isAdmin: boolean;
  gameMode: GameMode;
  continentFilter: ContinentFilter;
  timerMode: TimerMode;
  onStart: (playerName: string) => void;
  onEnableAdmin: () => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const StartGameModal: React.FC<StartGameModalProps> = ({
  isOpen,
  initialPlayerName,
  isAdmin,
  gameMode,
  continentFilter,
  timerMode,
  onStart,
  onEnableAdmin,
  onClose,
  allowClose = false,
}) => {
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [isAdminModeRequested, setIsAdminModeRequested] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPlayerName(initialPlayerName);
      setIsAdminModeRequested(false);
      setAdminPassword('');
      setAdminFeedback(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialPlayerName]);

  if (!isOpen) return null;

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();

    // Trigger Admin Password verification when user enters "ADMINMODE" (case-insensitive)
    if (cleanName.toUpperCase() === 'ADMINMODE') {
      setIsAdminModeRequested(true);
      setAdminPassword('');
      setAdminFeedback(null);
      setTimeout(() => passwordInputRef.current?.focus(), 150);
      return;
    }

    // Normal game start
    onStart(cleanName || 'World Explorer');
  };

  const handleVerifyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;

    setIsVerifying(true);
    setAdminFeedback(null);

    try {
      const res = await verifyAdminPassword(adminPassword);
      if (res.success) {
        onEnableAdmin();
        setAdminFeedback({
          type: 'success',
          message:
            '⚡ Admin Mode unlocked! Correct answers locked to position #2 and Leaderboard controls authorized.',
        });
        setPlayerName('Admin');
      } else {
        setAdminFeedback({
          type: 'error',
          message: res.error || '❌ Incorrect administrator password.',
        });
      }
    } catch (err: any) {
      setAdminFeedback({
        type: 'error',
        message: err.message || 'Verification failed. Please check network and Firestore rules.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLaunchAdminGame = () => {
    onStart(playerName.trim() || 'Admin');
  };

  const getGameModeLabel = () => {
    switch (gameMode) {
      case 'globe':
        return '🌍 3D Earth Globe';
      case 'flag-to-name':
        return '🏁 Flag ➔ Name';
      case 'name-to-flag':
        return '🔤 Name ➔ Flag';
    }
  };

  return (
    <div className="modal-backdrop fade-in" style={{ zIndex: 1200 }}>
      <div
        className="modal-card start-game-modal zoom-in"
        style={{
          maxWidth: 480,
          width: '92%',
          background: 'linear-gradient(145deg, rgba(23, 32, 54, 0.98), rgba(15, 23, 42, 0.98))',
          border: isAdminModeRequested
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : '1px solid rgba(42, 157, 143, 0.4)',
          boxShadow: isAdminModeRequested
            ? '0 20px 45px rgba(239, 68, 68, 0.25), 0 0 30px rgba(239, 68, 68, 0.15)'
            : '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(42, 157, 143, 0.2)',
          borderRadius: 20,
          padding: '2rem 1.75rem',
        }}
      >
        {!isAdminModeRequested ? (
          /* Normal View: Enter Explorer Name */
          <form onSubmit={handleNameSubmit} className="start-game-form">
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(42, 157, 143, 0.25), rgba(72, 202, 228, 0.25))',
                  border: '1px solid rgba(42, 157, 143, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.85rem',
                  color: '#48cae4',
                }}
              >
                <Globe size={32} />
              </div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Explorer Identification
              </h2>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.35rem',
                  marginBottom: 0,
                }}
              >
                Enter your explorer call sign to track your rank on the global leaderboard
              </p>
            </div>

            {/* Current Game Setup Badges */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {getGameModeLabel()}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                🌍 {continentFilter === 'all' ? 'All Continents' : continentFilter}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: 9999,
                  background:
                    timerMode === 'timed'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  color: timerMode === 'timed' ? '#f87171' : '#34d399',
                  border:
                    timerMode === 'timed'
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {timerMode === 'timed' ? '⏱️ 10s Timed' : '☕ Relaxed'}
              </span>

              {isAdmin && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 9px',
                    borderRadius: 9999,
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontWeight: 700,
                  }}
                >
                  ⚡ Admin Active
                </span>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="player-name-input"
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.45rem',
                }}
              >
                Your Call Sign / Player Name:
              </label>
              <input
                id="player-name-input"
                ref={inputRef}
                type="text"
                className="leaderboard-name-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  outline: 'none',
                }}
                placeholder="e.g. Atlas Explorer"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1.02rem',
                fontWeight: 700,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(42, 157, 143, 0.4)',
              }}
            >
              <span>Start Expedition</span>
              <ArrowRight size={18} />
            </button>

            {allowClose && onClose && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{
                  width: '100%',
                  marginTop: '0.6rem',
                  padding: '0.65rem',
                  fontSize: '0.85rem',
                  borderRadius: 10,
                }}
              >
                Continue as {playerName || 'Explorer'}
              </button>
            )}

            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
              }}
            >
              Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>Enter</kbd> to launch immediately
            </div>
          </form>
        ) : (
          /* Admin Password Verification View */
          <div className="admin-auth-view fade-in">
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                  color: '#f87171',
                }}
              >
                <Lock size={28} />
              </div>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  margin: 0,
                }}
              >
                Admin Authorization
              </h2>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.35rem',
                  marginBottom: 0,
                }}
              >
                The username <strong>ADMINMODE</strong> requires cloud administrator verification.
              </p>
            </div>

            {!adminFeedback || adminFeedback.type !== 'success' ? (
              <form onSubmit={handleVerifyAdminPassword}>
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor="admin-password-input"
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Enter Admin Password (stored in Firebase):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="admin-password-input"
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      className="leaderboard-name-input"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.95rem',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        borderRadius: 12,
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#ffffff',
                        outline: 'none',
                      }}
                      placeholder="Admin password..."
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {adminFeedback && (
                  <div
                    className="fade-in"
                    style={{
                      padding: '0.75rem',
                      borderRadius: 10,
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                      lineHeight: 1.4,
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                      background:
                        adminFeedback.type === 'success'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      border:
                        adminFeedback.type === 'success'
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid rgba(239, 68, 68, 0.3)',
                      color: adminFeedback.type === 'success' ? '#34d399' : '#f87171',
                    }}
                  >
                    {adminFeedback.type === 'success' ? (
                      <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span>{adminFeedback.message}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsAdminModeRequested(false);
                      setPlayerName('World Explorer');
                      setAdminFeedback(null);
                    }}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 10, fontSize: '0.88rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isVerifying || !adminPassword.trim()}
                    style={{
                      flex: 1.3,
                      padding: '0.75rem',
                      borderRadius: 10,
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {isVerifying ? (
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    ) : (
                      <>
                        <KeyRound size={15} />
                        <span>Verify Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success View after unlocking Admin */
              <div className="admin-success-box fade-in">
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34d399',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Admin Mode Enabled!</strong>
                    <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: 2 }}>
                      Correct answers locked to option #2 & global leaderboard clear authorized.
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="admin-display-name"
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Explorer Name for this session:
                  </label>
                  <input
                    id="admin-display-name"
                    type="text"
                    className="leaderboard-name-input"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      fontSize: '0.95rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 12,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#ffffff',
                    }}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Admin"
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleLaunchAdminGame}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Shield size={18} />
                  <span>Launch Game as Admin</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
