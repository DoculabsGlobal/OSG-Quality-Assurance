import { useState, useEffect, useRef, useCallback } from 'react';
import { escapeHtml } from '../../utils/escape';

/**
 * Client data lookup popover — shows full row data for a matched account/consumer.
 * Positioned near the clicked element, auto-closes on outside click.
 */
export default function LookupPopover({ data, headers, keyCol, fileName, position, onClose }) {
  const popoverRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!data) return;
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && !e.target.classList.contains('lookup-link')) {
        onClose();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [data, onClose]);

  if (!data || !position) return null;

  const keyVal = keyCol ? data[keyCol] : '';
  const title = keyVal ? 'Account ' + keyVal : 'Client Data Match';

  // Filter out empty values
  const fields = (headers || []).filter(h => {
    const val = data[h];
    return val !== '' && val !== undefined && val !== null;
  });

  return (
    <div
      ref={popoverRef}
      className="lookup-popover show"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 10000,
      }}
    >
      <div className="lookup-popover-header">
        <span className="lookup-title" id="lookupTitle">{title}</span>
        <button className="lookup-close" onClick={onClose}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="lookup-popover-body">
        {fields.length === 0 ? (
          <div className="lookup-nomatch">No data fields found</div>
        ) : (
          fields.map(h => (
            <div key={h} className="lookup-row">
              <span className="lookup-field" title={h}>{h}</span>
              <span className="lookup-value">{String(data[h])}</span>
            </div>
          ))
        )}
      </div>
      <div className="lookup-source">Source: {fileName || 'Client Data'}</div>
    </div>
  );
}
