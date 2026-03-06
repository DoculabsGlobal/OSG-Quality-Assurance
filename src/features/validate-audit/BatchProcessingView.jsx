/**
 * Chunking progress + batch launch status view.
 * Shown during PDF splitting and agent launching.
 */
export default function BatchProcessingView({
  chunkingPercent, chunkingStatus, chunkingContext,
  batches, batchStatuses, showBatchList,
  onCancel,
}) {
  return (
    <div>
      {/* Chunking progress card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="breath-dot" style={{ width: 8, height: 8 }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Splitting PDF into Batches</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onCancel} className="btn-header" style={{ fontSize: 11, padding: '4px 10px' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Cancel
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>{chunkingPercent}%</span>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ background: 'linear-gradient(90deg,var(--accent),var(--pass))', height: '100%', width: chunkingPercent + '%', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{chunkingStatus}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{chunkingContext}</div>
        </div>

        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span><strong>Text-based PDFs</strong> split instantly. <strong>Scanned PDFs</strong> use OCR (slower). Auto-detected.</span>
          </div>
        </div>
      </div>

      {/* Batch status list */}
      {showBatchList && batches.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="breath-dot" style={{ width: 8, height: 8 }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Launching Validation Agents</span>
            </div>
          </div>
          <div style={{ padding: '14px 18px', maxHeight: 180, overflowY: 'auto' }}>
            {batches.map((batch, i) => {
              const st = batchStatuses[i] || { status: 'pending', text: 'pending' };
              const colors = { pending: 'var(--text-3)', running: 'var(--accent)', done: 'var(--pass)', error: 'var(--fail)' };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[st.status] || 'var(--text-3)' }} />
                  <span style={{ flex: 1 }}>Batch {batch.batchNumber}: {batch.customerCount} customers</span>
                  <span style={{ color: 'var(--text-3)' }}>{st.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
