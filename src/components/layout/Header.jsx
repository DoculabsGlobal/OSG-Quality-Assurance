import { useAuth } from '../../context/AuthContext';
import { LS } from '../../constants/config';

/**
 * Application header bar with logo, connection status, reset, dark mode, and logout.
 * Replaces: <header class="header"> block + toggleMode + mode-toggle button
 */
export default function Header({ onReset }) {
  const { isConnected, logout } = useAuth();

  function toggleMode() {
    const html = document.documentElement;
    if (html.getAttribute('data-mode') === 'moonlit') {
      html.removeAttribute('data-mode');
      localStorage.removeItem(LS.MODE);
    } else {
      html.setAttribute('data-mode', 'moonlit');
      localStorage.setItem(LS.MODE, 'moonlit');
    }
  }

  return (
    <header className="header">
      <div className="logo-section">
        <div className="logo">OSG</div>
        <div>
          <div className="brand-name">QA Platform</div>
          <div className="brand-sub">Library + Validation</div>
        </div>
      </div>
      <div className="header-actions">
        <div className="status-badge">
          <div className={`status-dot ${isConnected ? '' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button className="btn-header" onClick={onReset}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Reset
        </button>
        <button className="btn-header" onClick={toggleMode} title="Toggle moonlit mode">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
        <button className="btn-header" onClick={logout}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
