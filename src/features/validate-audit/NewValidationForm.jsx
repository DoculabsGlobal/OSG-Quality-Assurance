import { useRef } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { getCollectionGroups } from '../../hooks/useCollectionGroups';
import { escapeHtml } from '../../utils/escape';

/**
 * New validation form — test plan gate, reference collections display, file upload, start button.
 */
export default function NewValidationForm({ clientName, onSelectFile, onClearFile, onStart, batchFile, batchFileName }) {
  const { validationUnlocked, approvedChecklistId, allCollections } = useCollections();
  const fileRef = useRef(null);

  // Reference collections for display
  const groups = getCollectionGroups(allCollections);
  const normalizedKey = clientName?.toUpperCase() || '';
  const group = groups[normalizedKey];
  const skipPatterns = ['audit', 'completed qa', 'completed_qa', 'test plan', 'required sampling'];
  const refCollections = group ? group.collections.filter(c => {
    const name = (c.typeName || c.name || '').toLowerCase();
    return !skipPatterns.some(p => name.includes(p));
  }) : [];

  if (!validationUnlocked) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-3)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 8 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p style={{ fontSize: 14 }}>Approve a test plan in the Test Plan Creation tab first</p>
      </div>
    );
  }

  return (
    <div>
      {/* Approved badge + locked client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="approved-badge" style={{ margin: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          <span>Test Plan Approved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 6, margin: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{clientName}</span>
        </div>
      </div>

      {/* Reference collections */}
      {refCollections.length > 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Reference Collections</span>
          </div>
          {refCollections.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{c.typeName || c.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{c._memberCount ?? '?'} docs</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{ padding: '24px 20px', marginBottom: 10 }}>
        <input ref={fileRef} type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) onSelectFile(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        <p>Upload After Sample PDF</p><small>Multi-customer document — will be split into batches automatically</small>
      </div>

      {/* File info */}
      {batchFile && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
          <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>{batchFileName}</span>
          <button onClick={onClearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }} title="Remove file">×</button>
        </div>
      )}

      {/* Start button */}
      <button className="btn btn-primary" style={{ width: '100%', padding: '10px 18px', fontSize: 15, justifyContent: 'center' }} onClick={onStart} disabled={!batchFile}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        Start Validation
      </button>
    </div>
  );
}
