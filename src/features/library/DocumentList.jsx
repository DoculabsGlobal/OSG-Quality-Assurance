import { useMemo, useRef } from 'react';
import { escapeHtml } from '../../utils/escape';
import { useDocViewer } from '../../context/DocViewerContext';

/**
 * Renders the document list inside a collection.
 * Includes upload trigger row and optional blank audit creation.
 */
export default function DocumentList({
  documents, collectionName, searchQuery,
  isLoading, error,
  onDelete, onUploadClick, onCreateBlankAudit,
}) {
  const { openDoc } = useDocViewer();

  const isAuditCol = (collectionName || '').toLowerCase().includes('audit');

  const filtered = useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(d => (d.name || '').toLowerCase().includes(q));
  }, [documents, searchQuery]);

  if (isLoading) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="breath-dot" style={{ marginBottom: 12 }} />
        <p>Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <p>Error loading</p>
        <small>{error}</small>
      </div>
    );
  }

  return (
    <>
      {/* Upload trigger row */}
      <div className="collection-upload-row" onClick={onUploadClick}>
        <div className="upload-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span className="upload-label">Upload files to this collection</span>
      </div>

      {/* Create blank audit button */}
      {isAuditCol && (
        <div className="collection-upload-row" onClick={onCreateBlankAudit}
          style={{ borderBottom: '1px solid var(--border-soft)' }}>
          <div className="upload-icon" style={{ color: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <span className="upload-label">Create blank Master Audit</span>
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '30px 24px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>No documents yet</p>
        </div>
      ) : (
        filtered.map(doc => {
          const ext = (doc.name || '').split('.').pop().toUpperCase();
          const date = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '';
          const source = doc.content?.source || '';

          return (
            <div
              key={doc.id}
              className="lib-item"
              data-id={doc.id}
              onClick={() => openDoc(doc.id, doc.name, source)}
            >
              <div className="lib-item-icon document">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="lib-item-info">
                <div className="lib-item-name">{doc.name}</div>
                <div className="lib-item-meta">{ext} · {date}</div>
              </div>
              <div className="lib-item-actions">
                <button
                  className="lib-action-btn"
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id, doc.name); }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
