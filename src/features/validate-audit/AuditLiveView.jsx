import { AUDIT_TOTAL_STEPS } from '../../constants/config';

const STEP_MESSAGES = [
  'Launching parallel validation workstreams',
  'Extracting consumer data from after samples',
  'Verifying against client data records',
  'Checking lockbox & barcode specs',
  'Validating fee schedules & disclosures',
  'Validating against test plan',
  'Compiling findings into audit report',
  'Consolidating master audit document',
];

/**
 * Compact live audit progress view — single screen, no scrolling.
 * Timer + progress bar + step list + batch status + live text.
 */
export default function AuditLiveView({
  liveText, subtext, timerText, progressPercent, currentStep, showRetry, onRetry,
  batches = [], batchStatuses = [],
}) {
  const colors = { pending: 'var(--text-3)', running: 'var(--accent)', done: 'var(--pass)', error: 'var(--fail)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Live status text */}
      <div className="processing-indicator" style={{ margin: 0, padding: '8px 0' }}>
        <div className="breath-dot" />
        <span style={{ fontSize: 13 }}>{liveText || 'Initializing validation agents...'}</span>
      </div>

      {/* Main progress card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
        {/* Timer + progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>Validation Progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono', monospace" }}>{timerText}</span>
        </div>

        <div style={{ background: 'var(--bg)', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            background: 'linear-gradient(90deg,var(--accent),var(--pass))',
            height: '100%', width: progressPercent + '%',
            transition: 'width 1s ease',
          }} />
        </div>

        {/* Steps — compact two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 16px', marginBottom: batches.length > 0 ? 12 : 0 }}>
          {STEP_MESSAGES.map((msg, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '2px 0' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--pass)' : isActive ? 'var(--accent)' : 'var(--border)',
                  ...(isActive ? { animation: 'breathe 2s ease-in-out infinite' } : {}),
                }} />
                <span style={{ color: isDone ? 'var(--pass)' : isActive ? 'var(--text)' : 'var(--text-3)' }}>{msg}</span>
              </div>
            );
          })}
        </div>

        {/* Batch status — compact inline row */}
        {batches.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {batches.map((batch, i) => {
                const st = batchStatuses[i] || { status: 'pending', text: 'pending' };
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', borderRadius: 4, fontSize: 11,
                    background: 'var(--bg)', border: '1px solid var(--border-soft)',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[st.status] || 'var(--text-3)' }} />
                    <span style={{ color: 'var(--text-2)' }}>B{batch.batchNumber}</span>
                    <span style={{ color: 'var(--text-3)' }}>{st.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subtext + retry */}
      <div style={{ textAlign: 'center', padding: '2px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{subtext || 'Agents are working — typically 8–12 minutes'}</span>
        {showRetry && (
          <button onClick={onRetry} style={{
            display: 'block', margin: '10px auto 0', padding: '8px 24px',
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
