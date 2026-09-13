import React, { useState, useRef, useEffect } from 'react';
import { Lock, Mail, User, Eye, EyeOff, X, AlertCircle, Compass, LogIn, UserPlus } from 'lucide-react';
import { usePlayerAuth } from '../hooks/usePlayerAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'register';
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  promptMessage,
}) => {
  const { login, register } = usePlayerAuth();
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setTimeout(() => {
        if (initialMode === 'register') {
          nameInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const res = await login(email, password);
        if (res.success) {
          onSuccess?.();
          onClose();
        } else {
          setErrorMessage(res.error || 'Sign in failed. Please check your credentials.');
        }
      } else {
        const res = await register(email, password, displayName);
        if (res.success) {
          onSuccess?.();
          onClose();
        } else {
          setErrorMessage(res.error || 'Registration failed. Please check your details.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div
        className="modal-content auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '92%',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          borderRadius: '18px',
          padding: '1.75rem',
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="modal-close-btn"
          title="Close modal"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 0.75rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.5)',
            }}
          >
            <Compass size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {mode === 'signin' ? 'Explorer Sign In' : 'Create Explorer Account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', margin: '0.35rem 0 0' }}>
            {promptMessage ||
              (mode === 'signin'
                ? 'Sign in to record your scores and explore the globe.'
                : 'Create your account to join the global expedition.')}
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'signin' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: mode === 'signin' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <LogIn size={14} /> Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'register' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <UserPlus size={14} /> New Explorer
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="fade-in"
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {mode === 'register' && (
            <div className="start-input-group">
              <label
                htmlFor="register-display-name"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                }}
              >
                <User size={13} style={{ color: '#0ea5e9' }} /> Explorer Call Sign (Name):
              </label>
              <input
                id="register-display-name"
                ref={nameInputRef}
                type="text"
                className="start-text-input"
                placeholder="e.g. Atlas, Marco Polo..."
                value={displayName}
                maxLength={24}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          <div className="start-input-group">
            <label
              htmlFor="auth-email-input"
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}
            >
              <Mail size={13} style={{ color: '#0ea5e9' }} /> Email Address:
            </label>
            <input
              id="auth-email-input"
              ref={emailInputRef}
              type="email"
              className="start-text-input"
              placeholder="explorer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username email"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(0, 0, 0, 0.25)',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div className="start-input-group">
            <label
              htmlFor="auth-password-input"
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}
            >
              <Lock size={13} style={{ color: '#0ea5e9' }} /> Password:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                className="start-password-input"
                placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 2.4rem 0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '10px',
              marginTop: '0.4rem',
              background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
              boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading || !email.trim() || !password ? 0.7 : 1,
            }}
          >
            {isLoading
              ? mode === 'signin'
                ? 'Signing In…'
                : 'Creating Account…'
              : mode === 'signin'
              ? 'Sign In & Play'
              : 'Create Account & Play'}
          </button>
        </form>
      </div>
    </div>
  );
};
