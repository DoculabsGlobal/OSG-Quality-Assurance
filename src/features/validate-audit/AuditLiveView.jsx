import { AUDIT_TOTAL_STEPS } from '../../constants/config';

const STEP_MESSAGES = [
  'Launching parallel validation workstreams',
  'Extracting consumer data from after samples',
  'Verifying against client data records',
  'Checking lockbox mappings & barcode specifications',
  'Validating fee schedules & state disclosures',
  'Validating against test plan',
  'Compiling findings into audit report',
  'Consolidating master audit document',
];

/**
 * Live audit progress view — timer, progress bar, step list, status text.
 */
export default function AuditLiveView({
  liveText, subtext, timerText, progressPercent, currentStep, showRetry, onRetry,
}) {
  return (
    <div>
      <div className="processing-indicator" style={{ marginBottom: 18 }}>
        <div className="breath-dot" />
        <span>{liveText || 'Initializing validation agents...'}</span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 18 }}>
        {/* Timer header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Validation Progress</span>
          <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono', monospace" }}>{timerText}</span>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'var(--bg)', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            background: 'linear-gradient(90deg,var(--accent),var(--pass))',
            height: '100%', width: progressPercent + '%',
            transition: 'width 1s ease',
          }} />
        </div>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEP_MESSAGES.map((msg, i) => {
            let className = 'audit-step';
            if (i < currentStep) className += ' done';
            else if (i === currentStep) className += ' active';

            return (
              <div key={i} className={className}>
                <div className="audit-step-dot" />
                <span>{msg}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{subtext || 'Agents are working — this typically takes 8–12 minutes'}</span>
        {showRetry && (
          <button onClick={onRetry} style={{
            display: 'block', margin: '14px auto 0', padding: '10px 28px',
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
