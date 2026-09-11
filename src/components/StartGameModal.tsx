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
  Lock,
  User,
  X,
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
    if (!adminPassword.trim() || isVerifying) return;

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
        message: err.message || 'Verification failed. Please check network connection.',
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
    <div
      className="modal-overlay fade-in"
      style={{ zIndex: 1200 }}
      onClick={allowClose && onClose ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-content start-game-modal ${isAdminModeRequested ? 'admin-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!isAdminModeRequested ? (
          /* Normal View: Enter Explorer Name */
          <form onSubmit={handleNameSubmit}>
            <div className="start-modal-header">
              {allowClose && onClose && (
                <button
                  type="button"
                  className="start-modal-close-btn"
                  onClick={onClose}
                  title="Close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              )}

              <div className="start-modal-icon">
                <Globe size={30} />
              </div>
              <h2 className="start-modal-title">Explorer Identification</h2>
              <p className="start-modal-subtitle">
                Enter your explorer call sign to track your rank on the global leaderboard
              </p>
            </div>

            <div className="start-modal-body">
              {/* Game Setup Badges */}
              <div className="start-mode-pill-row">
                <span className="start-mode-pill">{getGameModeLabel()}</span>
                <span className="start-mode-pill">
                  🌍 {continentFilter === 'all' ? 'All Continents' : continentFilter}
                </span>
                <span
                  className={`start-mode-pill ${timerMode === 'timed' ? 'timed' : 'relaxed'}`}
                >
                  {timerMode === 'timed' ? '⏱️ 10s Timed' : '☕ Relaxed'}
                </span>
                {isAdmin && <span className="start-mode-pill admin">⚡ Admin Active</span>}
              </div>

              {/* Call Sign Input */}
              <div className="start-input-group">
                <label htmlFor="player-name-input" className="start-input-label">
                  <User size={14} style={{ color: 'var(--primary-light)' }} />
                  <span>Call Sign / Explorer Name:</span>
                </label>
                <input
                  id="player-name-input"
                  ref={inputRef}
                  type="text"
                  className="start-text-input"
                  placeholder="e.g. Atlas Explorer"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={24}
                  required
                  autoFocus
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn-primary start-btn-launch">
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
                    padding: '0.65rem',
                    fontSize: '0.85rem',
                    borderRadius: 10,
                  }}
                >
                  Continue as {playerName || 'Explorer'}
                </button>
              )}

              <div className="start-hint-text">
                Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>Enter</kbd> to launch immediately
              </div>
            </div>
          </form>
        ) : (
          /* Admin Password Verification View */
          <div>
            <div className="start-modal-header">
              <div className="start-modal-icon admin">
                <Lock size={26} />
              </div>
              <h2 className="start-modal-title">Admin Authorization</h2>
              <p className="start-modal-subtitle">
                Username <strong>ADMINMODE</strong> detected. Please enter the administrator password.
              </p>
            </div>

            <div className="start-modal-body">
              {!adminFeedback || adminFeedback.type !== 'success' ? (
                <form onSubmit={handleVerifyAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="start-input-group">
                    <label htmlFor="admin-password-input" className="start-input-label">
                      <KeyRound size={14} style={{ color: '#f87171' }} />
                      <span>Admin Password (from Firebase):</span>
                    </label>
                    <div className="start-password-input-wrapper">
                      <input
                        id="admin-password-input"
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        className="start-password-input"
                        placeholder="Enter admin password..."
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="start-password-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
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
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{adminFeedback.message}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
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
                        flex: 1.4,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <ShieldCheck size={22} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Admin Mode Activated!</strong>
                      <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: 2 }}>
                        Option #2 answer locking and global leaderboard controls authorized.
                      </div>
                    </div>
                  </div>

                  <div className="start-input-group">
                    <label htmlFor="admin-display-name" className="start-input-label">
                      <User size={14} style={{ color: '#34d399' }} />
                      <span>Explorer Name for this session:</span>
                    </label>
                    <input
                      id="admin-display-name"
                      type="text"
                      className="start-text-input"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Admin"
                      maxLength={24}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary start-btn-launch"
                    onClick={handleLaunchAdminGame}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Shield size={18} />
                    <span>Launch Game as Admin</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
