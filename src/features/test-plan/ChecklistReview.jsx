import { escapeHtml } from '../../utils/escape';

export default function ChecklistReview({ checklist, customItems, onToggle, onAddCustom, onRemoveCustom, onUpdateCustom }) {
  let currentCategory = null;
  return (
    <div>
      {checklist.map((item, idx) => {
        const showHeader = item.category !== currentCategory;
        if (showHeader) currentCategory = item.category;
        const severityClass = (item.severity || '').toLowerCase().includes('critical') && !(item.severity || '').toLowerCase().includes('non') ? 'severity-critical' : 'severity-noncritical';
        const severityLabel = (item.severity || '').toUpperCase() || 'NON-CRITICAL';
        return (
          <div key={item.id + '-' + idx}>
            {showHeader && <div className="category-header">{item.category}</div>}
            <div className={`checklist-item ${item.checked ? '' : 'removed'}`}>
              <div className="item-checkbox"><input type="checkbox" checked={item.checked} onChange={() => onToggle(item.id)} /></div>
              <div className="item-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="item-id">{item.id}</span><span className="item-text">{item.assertion}</span></div>
                <div className="item-meta"><span className="item-expected">{item.expected || ''}</span> · {item.appliesTo || 'ALL'} · <span className={severityClass}>{severityLabel}</span></div>
              </div>
            </div>
          </div>
        );
      })}
      {customItems.length > 0 && <div className="category-header">ADDITIONAL CHECKS</div>}
      {customItems.map(ci => (
        <div key={ci.id} className="checklist-item custom-item">
          <div className="item-checkbox"><input type="checkbox" checked disabled /></div>
          <div className="item-content" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input type="text" value={ci.assertion} placeholder="What to check..." onChange={(e) => onUpdateCustom(ci.id, 'assertion', e.target.value)} />
            <input type="text" value={ci.expected} placeholder="Expected value..." onChange={(e) => onUpdateCustom(ci.id, 'expected', e.target.value)} style={{ fontSize: 12, color: 'var(--text-2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <select value={ci.severity} onChange={(e) => onUpdateCustom(ci.id, 'severity', e.target.value)} style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 11, background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>
                <option value="NON-CRITICAL">NON-CRITICAL</option><option value="CRITICAL">CRITICAL</option>
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Applies to: ALL</span>
            </div>
          </div>
          <button className="custom-remove" onClick={() => onRemoveCustom(ci.id)} title="Remove"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
      ))}
      <div className="add-item-row" onClick={onAddCustom}>
        <div className="add-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></div>
        <span>Add custom check</span>
      </div>
    </div>
  );
}
