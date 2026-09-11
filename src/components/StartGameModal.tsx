import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Lock,
  User,
  X,
  Compass,
  Layers,
  Clock,
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
  onStart: (playerName: string, config?: { mode?: GameMode; continent?: ContinentFilter; timer?: TimerMode }) => void;
  onEnableAdmin: () => void;
  onClose?: () => void;
  allowClose?: boolean;
}

const GAME_MODES: { id: GameMode; label: string; icon: string }[] = [
  { id: 'globe', label: '3D Globe', icon: '🌍' },
  { id: 'flag-to-name', label: 'Flag ➔ Name', icon: '🏁' },
  { id: 'name-to-flag', label: 'Name ➔ Flag', icon: '🔤' },
];

const CONTINENT_OPTIONS: { id: ContinentFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All World', icon: '🌍' },
  { id: 'Africa', label: 'Africa', icon: '🌍' },
  { id: 'Americas', label: 'Americas', icon: '🌎' },
  { id: 'Asia', label: 'Asia', icon: '🌏' },
  { id: 'Europe', label: 'Europe', icon: '🌍' },
  { id: 'Oceania', label: 'Oceania', icon: '🌏' },
];

const TIMER_OPTIONS: { id: TimerMode; label: string; icon: string }[] = [
  { id: 'timed', label: '10s Timed', icon: '⏱️' },
  { id: 'relaxed', label: 'Relaxed', icon: '🧘' },
];

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
  const [selectedMode, setSelectedMode] = useState<GameMode>(gameMode);
  const [selectedContinent, setSelectedContinent] = useState<ContinentFilter>(continentFilter);
  const [selectedTimer, setSelectedTimer] = useState<TimerMode>(timerMode);

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
      setSelectedMode(gameMode);
      setSelectedContinent(continentFilter);
      setSelectedTimer(timerMode);
      setIsAdminModeRequested(false);
      setAdminPassword('');
      setAdminFeedback(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialPlayerName, gameMode, continentFilter, timerMode]);

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

    // Start game with selected configuration
    onStart(cleanName || 'World Explorer', {
      mode: selectedMode,
      continent: selectedContinent,
      timer: selectedTimer,
    });
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
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isAdminModeRequested ? (
          /* Normal View: Enter Explorer Name and pick Game Setup */
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
                <Globe size={28} />
              </div>
              <h2 className="start-modal-title">New Expedition Setup</h2>
              <p className="start-modal-subtitle">
                Select your game mode, territory, and explorer name to launch
              </p>
              {isAdmin && (
                <div className="start-mode-pill admin" style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} />
                  <span>Admin Mode Active</span>
                </div>
              )}
            </div>

            <div className="start-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Game Mode Selector */}
              <div className="main-config-row">
                <span className="main-config-label">
                  <Compass size={13} /> Mode:
                </span>
                <div className="main-mode-pills">
                  {GAME_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`main-mode-pill ${selectedMode === m.id ? 'active' : ''}`}
                      onClick={() => setSelectedMode(m.id)}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continent Selector */}
              <div className="main-config-row">
                <span className="main-config-label">
                  <Layers size={13} /> Region:
                </span>
                <div className="main-continent-pills">
                  {CONTINENT_OPTIONS.map((cont) => (
                    <button
                      key={cont.id}
                      type="button"
                      className={`main-continent-pill ${selectedContinent === cont.id ? 'active' : ''}`}
                      onClick={() => setSelectedContinent(cont.id)}
                    >
                      <span>{cont.icon}</span>
                      <span>{cont.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Mode Selector */}
              <div className="main-config-row">
                <span className="main-config-label">
                  <Clock size={13} /> Pacing:
                </span>
                <div className="main-timer-pills">
                  {TIMER_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`main-timer-pill ${selectedTimer === t.id ? 'active' : ''}`}
                      onClick={() => setSelectedTimer(t.id)}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Sign Input */}
              <div className="start-input-group" style={{ marginTop: '0.2rem' }}>
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
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn-primary start-btn-launch" style={{ marginTop: '0.2rem' }}>
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
                    padding: '0.6rem',
                    fontSize: '0.82rem',
                    borderRadius: 10,
                  }}
                >
                  Cancel / Keep Playing
                </button>
              )}
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
                      {adminFeedback.type === 'success' ? (
                        <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <span>{adminFeedback.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isVerifying || !adminPassword.trim()}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    }}
                  >
                    {isVerifying ? 'Verifying Password…' : 'Authenticate as Admin'}
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <ShieldCheck size={18} />
                    <span>Admin Mode Activated</span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setIsAdminModeRequested(false);
                      onStart('Admin', { mode: selectedMode, continent: selectedContinent, timer: selectedTimer });
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 10 }}
                  >
                    Launch Game as Admin
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
