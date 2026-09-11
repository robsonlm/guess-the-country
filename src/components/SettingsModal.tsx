import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Volume2,
  Palette,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { UserSettings, ThemeMode } from '../types/game';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  localInfo: { count: number; downloadedAt: string | null };
  onSaveSettings: (newSettings: Partial<UserSettings>) => void;
  onResetScore: () => void;
  onReSyncData: () => void;
}

const THEMES: { id: ThemeMode; name: string; color: string }[] = [
  { id: 'deep-space', name: 'Deep Space', color: '#6366f1' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#06b6d4' },
  { id: 'vintage-atlas', name: 'Vintage Atlas', color: '#d97706' },
  { id: 'emerald-forest', name: 'Emerald', color: '#10b981' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  localInfo,
  onSaveSettings,
  onResetScore,
  onReSyncData,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [adminTestMode, setAdminTestMode] = useState<boolean>(!!settings.adminTestMode);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSoundEnabled(settings.soundEnabled);
      setTheme(settings.theme);
      setAdminTestMode(!!settings.adminTestMode);
      setShowConfirmReset(false);
      setIsSyncing(false);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      soundEnabled,
      theme,
      adminTestMode,
    });
    onClose();
  };

  const handleDisableAdminMode = () => {
    setAdminTestMode(false);
  };

  const handleResetClick = () => {
    if (!showConfirmReset) {
      setShowConfirmReset(true);
      return;
    }
    onResetScore();
    setShowConfirmReset(false);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onReSyncData();
    setIsSyncing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 className="modal-title">Game Settings & Customization</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} style={{ maxHeight: '72vh', overflowY: 'auto' }}>


          {/* Theme Selector */}
          <div className="form-group">
            <label className="form-label">
              <Palette size={15} style={{ display: 'inline', marginRight: 5 }} />
              Visual Theme
            </label>
            <div className="theme-options-grid">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  className={`theme-chip ${theme === th.id ? 'active' : ''}`}
                  onClick={() => setTheme(th.id)}
                >
                  <span className="theme-color-dot" style={{ backgroundColor: th.color }} />
                  <span>{th.name}</span>
                  {theme === th.id && <Check size={14} className="theme-check" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Haptics toggle */}
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-title">Sound Effects & Haptics</span>
              <span className="toggle-desc">Web Audio chimes and mobile vibration</span>
            </div>
            <button
              type="button"
              className={`icon-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label="Toggle sound"
            >
              <Volume2
                size={18}
                style={{ color: soundEnabled ? 'var(--primary-light)' : 'var(--text-dim)' }}
              />
            </button>
          </div>

          {/* Local Data Storage Status Card */}
          <div className="toggle-row" style={{ background: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.25)' }}>
            <div className="toggle-info">
              <span className="toggle-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c7d2fe' }}>
                <HardDrive size={16} style={{ color: 'var(--primary-light)' }} />
                Offline Database & Flags
              </span>
              <span className="toggle-desc" style={{ color: '#94a3b8' }}>
                {localInfo.count} sovereign UN countries & flags stored locally (100% offline, 0 API calls)
              </span>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={handleSyncClick}
              title="Reload local offline dataset"
              disabled={isSyncing}
            >
              <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
            </button>
          </div>

          {/* Admin Mode Status & Logout (Only visible when Admin Mode is active) */}
          {adminTestMode && (
            <div
              className="toggle-row"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
              }}
            >
              <div className="toggle-info">
                <span
                  className="toggle-title"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#34d399',
                  }}
                >
                  <ShieldCheck size={16} style={{ color: '#10b981' }} />
                  Admin Mode Active
                </span>
                <span className="toggle-desc" style={{ color: '#a7f3d0' }}>
                  ⚡ Correct answers locked to position #2 & global leaderboard controls authorized.
                </span>
              </div>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleDisableAdminMode}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                Logout Admin
              </button>
            </div>
          )}

          {/* Reset Score Action */}
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-title">Reset Progress</span>
              <span className="toggle-desc">Clear scores, mastery progress, and current streaks</span>
            </div>
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleResetClick}
            >
              <RotateCcw size={14} style={{ display: 'inline', marginRight: 4 }} />
              {showConfirmReset ? 'Confirm Reset?' : 'Reset Score & Mastery'}
            </button>
          </div>

          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem' }}>
            <button type="button" className="segment-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
