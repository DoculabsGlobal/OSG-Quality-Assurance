import { useState, useCallback } from 'react';
import { REQUIRED_COLLECTIONS } from '../../constants/config';
import { createClientFolders } from '../../services/collections';
import { useCollections } from '../../context/CollectionContext';

/**
 * New Client Setup modal.
 * Creates folder structure for a new client project.
 */
export default function SetupModal({ isOpen, onClose }) {
  const { loadCollections } = useCollections();
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [dynamicTypes, setDynamicTypes] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const addCustomType = useCallback(() => {
    const val = customInput.trim();
    if (!val) return;
    setDynamicTypes(prev => [...prev, val]);
    setCustomInput('');
  }, [customInput]);

  const removeType = useCallback((idx) => {
    setDynamicTypes(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!clientName.trim()) { setError('Client name required'); return; }
    if (!projectName.trim()) { setError('Project name required'); return; }

    setIsCreating(true);
    setError('');

    try {
      const additionalTypes = dynamicTypes.filter(Boolean);
      await createClientFolders(clientName.trim(), projectName.trim(), additionalTypes);
      await loadCollections();
      // Reset and close
      setClientName('');
      setProjectName('');
      setDynamicTypes([]);
      onClose();
    } catch (e) {
      setError(e.message);
    }
    setIsCreating(false);
  }, [clientName, projectName, dynamicTypes, loadCollections, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2>New Client Setup</h2>
        <p>Create folder structure for a new client</p>

        <label className="input-label">Client Name</label>
        <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. BNY Mellon" />

        <label className="input-label">Project Name</label>
        <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Mortgage Servicing Transfer" />

        {/* Dynamic reference folders */}
        <label className="input-label" style={{ marginBottom: 2 }}>Reference Folders</label>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
          Source materials — upload client data, fee schedules, templates, and disclosures here
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
          {dynamicTypes.map((t, i) => (
            <div key={i} className="type-check checked" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 13 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ flex: 1 }}>{t}</span>
              <button className="lib-action-btn" onClick={() => removeType(i)} style={{ color: 'var(--fail)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add folder..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14, background: 'var(--bg)', color: 'var(--text)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomType(); } }}
          />
          <button className="btn btn-secondary" onClick={addCustomType} style={{ padding: '8px 14px' }}>+ Add</button>
        </div>

        {/* Output folders (read-only) */}
        <label className="input-label" style={{ marginBottom: 2 }}>Output Folders</label>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
          System-managed — where QA results, test plans, and reports are written
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {REQUIRED_COLLECTIONS.map(req => (
            <div key={req.key} className="type-check checked" style={{ opacity: 0.55, cursor: 'default', padding: '6px 12px', fontSize: 13 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {req.label}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Folders'}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
