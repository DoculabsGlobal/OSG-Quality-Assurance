import { useState, useCallback } from 'react';
import { REQUIRED_COLLECTIONS, SUGGESTED_COLLECTIONS } from '../../constants/config';
import { createClientFolders } from '../../services/collections';
import { useCollections } from '../../context/CollectionContext';

export default function SetupModal({ isOpen, onClose }) {
  const { loadCollections } = useCollections();
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [dynamicTypes, setDynamicTypes] = useState([...SUGGESTED_COLLECTIONS]);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const addCustomType = useCallback(() => {
    const val = customInput.trim();
    if (!val || dynamicTypes.includes(val)) return;
    setDynamicTypes(prev => [...prev, val]);
    setCustomInput('');
  }, [customInput, dynamicTypes]);

  const removeType = useCallback((idx) => {
    setDynamicTypes(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!clientName.trim()) { setError('Client name required'); return; }
    if (!projectName.trim()) { setError('Project name required'); return; }
    setIsCreating(true);
    setError('');
    try {
      await createClientFolders(clientName.trim(), projectName.trim(), dynamicTypes.filter(Boolean));
      await loadCollections();
      setClientName(''); setProjectName(''); setDynamicTypes([...SUGGESTED_COLLECTIONS]);
      onClose();
    } catch (e) { setError(e.message); }
    setIsCreating(false);
  }, [clientName, projectName, dynamicTypes, loadCollections, onClose]);

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
    borderRadius: 6, fontFamily: 'inherit', fontSize: 13,
    background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 440, padding: '18px 22px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 2 }}>New Client Setup</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>Create folder structure for a new client</p>

        {/* Two-column: Client + Project */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <label className="input-label" style={{ fontSize: 11, marginBottom: 2 }}>Client Name</label>
            <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. BNY Mellon" />
          </div>
          <div>
            <label className="input-label" style={{ fontSize: 11, marginBottom: 2 }}>Project Name</label>
            <input style={inputStyle} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Mortgage Transfer" />
          </div>
        </div>

        {/* Reference folders — inline chips */}
        <label className="input-label" style={{ fontSize: 11, marginBottom: 3 }}>Reference Folders</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {dynamicTypes.map((t, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 4, fontSize: 11,
              background: 'var(--accent-soft)', border: '1px solid var(--border)',
            }}>
              {t}
              <button onClick={() => removeType(i)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: 13, lineHeight: 1, padding: 0,
              }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, flex: 1, fontSize: 12, padding: '5px 8px' }}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add folder..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomType(); } }}
          />
          <button className="btn btn-secondary" onClick={addCustomType} style={{ padding: '4px 10px', fontSize: 11 }}>+ Add</button>
        </div>

        {/* Output folders — compact inline list */}
        <label className="input-label" style={{ fontSize: 11, marginBottom: 3 }}>Output Folders <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>— system managed</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {REQUIRED_COLLECTIONS.map(req => (
            <span key={req.key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 4, fontSize: 11,
              background: 'var(--bg)', border: '1px solid var(--border-soft)',
              color: 'var(--text-3)',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {req.label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '7px 16px', fontSize: 13 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating} style={{ padding: '7px 16px', fontSize: 13 }}>
            {isCreating ? 'Creating...' : 'Create Folders'}
          </button>
        </div>
        {error && <div className="error" style={{ marginTop: 6, fontSize: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
