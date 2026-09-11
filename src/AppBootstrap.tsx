import { useEffect, useState } from 'react';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { testFirebaseConnection } from './services/firebase';
import App from './App';

type GateStatus =
  | { phase: 'connecting' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

const CONNECTING_VIEW_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--text-muted)',
  background: 'var(--bg-main, #0b0f19)',
};

const ERROR_VIEW_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'var(--bg-main, #0b0f19)',
};

const ERROR_CARD_STYLE: React.CSSProperties = {
  maxWidth: '480px',
  width: '100%',
  padding: '2rem 1.75rem',
  borderRadius: '20px',
  background: 'var(--surface-card, rgba(22, 28, 45, 0.78))',
  border: '1px solid var(--danger, #f43f5e)',
  boxShadow: '0 16px 40px -8px rgba(0,0,0,0.65)',
  textAlign: 'center',
  color: 'var(--text-main, #f8fafc)',
  fontFamily: 'var(--font-body, sans-serif)',
};

export function AppBootstrap() {
  const [status, setStatus] = useState<GateStatus>({ phase: 'connecting' });

  const runCheck = async () => {
    setStatus({ phase: 'connecting' });
    const result = await testFirebaseConnection();
    if (result.success) {
      setStatus({ phase: 'ready' });
    } else {
      setStatus({
        phase: 'error',
        message:
          result.error ||
          'Unable to reach the Firebase database. The game cannot start until the connection is restored.',
      });
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (status.phase === 'ready') {
    return <App />;
  }

  if (status.phase === 'error') {
    return (
      <div style={ERROR_VIEW_STYLE}>
        <div style={ERROR_CARD_STYLE}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              marginBottom: '0.75rem',
              color: 'var(--danger, #f43f5e)',
              fontFamily: 'var(--font-heading, sans-serif)',
              fontSize: '1.4rem',
              fontWeight: 700,
            }}
          >
            <Database size={22} />
            <span>Database Error</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              background: 'var(--danger-bg, rgba(244, 63, 94, 0.14))',
              border: '1px solid var(--danger, #f43f5e)',
              borderRadius: '12px',
              color: '#fb7185',
              fontSize: '0.9rem',
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{status.message}</span>
          </div>
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted, #94a3b8)',
            }}
          >
            The game has been blocked from loading because the database is unreachable.
          </p>
          <button
            type="button"
            onClick={runCheck}
            style={{
              marginTop: '1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.1rem',
              background: 'var(--brand-gradient, linear-gradient(135deg,#6366f1,#a855f7))',
              border: 'none',
              borderRadius: '9999px',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
            }}
          >
            <RefreshCw size={15} />
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={CONNECTING_VIEW_STYLE}>
      <div
        className="spinner"
        style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: 'var(--primary, #6366f1)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: '1.05rem', fontWeight: 500 }}>
        Connecting to Firebase…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AppBootstrap;