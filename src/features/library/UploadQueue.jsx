/**
 * Multi-file upload progress tracker.
 * Shows at the bottom of the library panel during uploads.
 */
export default function UploadQueue({ items, visible, onClear }) {
  if (!visible || items.length === 0) return null;

  return (
    <div className="upload-queue">
      <div className="upload-queue-header">
        <span>Upload Queue</span>
        <button className="lib-action-btn" onClick={onClear} title="Clear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div>
        {items.map(item => (
          <div key={item.id} className="uq-item">
            <span className="uq-item-name">{item.name}</span>
            <span className={`uq-status ${item.state}`}>{item.status}</span>
            {item.state === 'processing' && <div className="uq-spinner" />}
            {item.state === 'complete' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pass)" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {item.state === 'error' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fail)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
