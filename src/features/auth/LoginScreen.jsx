import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Login screen — shown when user is not authenticated.
 * Replaces: #loginGate HTML block + attemptLogin function
 */
export default function LoginScreen() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const code = inputRef.current?.value.trim();
    if (!code || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    const result = await login(code);
    if (!result.success) {
      setError(result.error);
      inputRef.current.value = '';
      inputRef.current.focus();
      inputRef.current.style.borderColor = 'var(--fail)';
      setTimeout(() => {
        if (inputRef.current) inputRef.current.style.borderColor = 'var(--border)';
      }, 1500);
    }

    setIsSubmitting(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 340, width: '100%', padding: 20 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>
            OSG
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2 }}>
            QA Platform
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="password"
            placeholder="Enter access code"
            autoComplete="off"
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            style={{
              width: '100%', padding: '12px 16px',
              border: '1px solid var(--border)', borderRadius: 8,
              fontFamily: 'inherit', fontSize: 15,
              background: 'var(--surface)', color: 'var(--text)',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          onMouseOver={(e) => { e.target.style.opacity = '0.85'; }}
          onMouseOut={(e) => { e.target.style.opacity = '1'; }}
          style={{
            width: '100%', marginTop: 12, padding: 11,
            border: 'none', borderRadius: 8,
            background: 'var(--accent)', color: 'white',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
        >
          {isSubmitting ? 'Connecting...' : 'Sign In'}
        </button>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--fail)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-3)' }}>
          Contact your administrator for access
        </div>
      </div>
    </div>
  );
}
