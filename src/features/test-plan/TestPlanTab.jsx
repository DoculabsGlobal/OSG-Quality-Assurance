import { useState, useCallback, useRef, useMemo } from 'react';
import ClientDropdown from '../../components/shared/ClientDropdown';
import SourceToggle from '../../components/shared/SourceToggle';
import ChecklistReview from './ChecklistReview';
import PastChecklistLoader from './PastChecklistLoader';
import { useTestPlan } from './useTestPlan';
import { useCollections } from '../../context/CollectionContext';
import { useDialog } from '../../context/DialogContext';
import { getCollectionGroups } from '../../hooks/useCollectionGroups';
import { escapeHtml } from '../../utils/escape';

const FolderIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
const UploadIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;

export default function TestPlanTab({ onApprove }) {
  const [clientName, setClientName] = useState('');
  const [sourceMode, setSourceMode] = useState('new');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const { allCollections, setApprovedChecklistId, unlockValidation } = useCollections();
  const { alert, confirm } = useDialog();

  const tp = useTestPlan();
  const effectiveCount = useMemo(() => {
    return tp.checklist.filter(i => i.checked).length + tp.customItems.filter(ci => ci.assertion.trim()).length;
  }, [tp.checklist, tp.customItems]);

  const removedCount = useMemo(() => tp.checklist.filter(i => !i.checked).length, [tp.checklist]);
  const addedCount = useMemo(() => tp.customItems.filter(ci => ci.assertion.trim()).length, [tp.customItems]);

  const handleClientChange = useCallback((name) => { setClientName(name); setSourceMode('new'); }, []);
  const handleFileUpload = useCallback((e) => { const file = e.target.files?.[0]; if (file) tp.uploadRequirements(file, clientName); e.target.value = ''; }, [tp.uploadRequirements, clientName]);
  const handleLoadPast = useCallback((docId, docName, source) => { tp.loadPastPlan(docId, docName, source); }, [tp.loadPastPlan]);

  const handleApplyEdits = useCallback(async () => {
    setIsSaving(true);
    try { await tp.applyEdits(); } catch (e) { await alert(e.message, 'Save Failed'); }
    setIsSaving(false);
  }, [tp.applyEdits, alert]);

  const handleApprove = useCallback(async () => {
    if (tp.hasChanges() && !tp.editsApplied) {
      if (!(await confirm('You have unapplied edits. Approve with the original test plan?', { title: 'Unapplied Edits', confirmLabel: 'Approve Anyway' }))) return;
    }
    const docId = tp.approve();
    setApprovedChecklistId(docId);
    unlockValidation();
    if (onApprove) setTimeout(() => onApprove(), 400);
  }, [tp, setApprovedChecklistId, unlockValidation, onApprove, confirm]);

  // Reference collections for approved view
  const refCollections = useMemo(() => {
    if (!clientName) return [];
    const groups = getCollectionGroups(allCollections);
    const group = groups[clientName.toUpperCase()];
    if (!group) return [];
    const skipPatterns = ['audit', 'completed qa', 'completed_qa', 'test plan', 'required sampling'];
    return group.collections.filter(c => { const n = (c.typeName || c.name || '').toLowerCase(); return !skipPatterns.some(p => n.includes(p)); });
  }, [clientName, allCollections]);

  return (
    <div className="workspace-card card-back">
      <div className="workspace-body">
        {/* UPLOAD STATE */}
        {tp.state === 'upload' && (
          <>
            <ClientDropdown value={clientName} onChange={handleClientChange} />
            {clientName && (
              <>
                <SourceToggle name="checklistSource" options={[{ value: 'past', label: 'Past Test Plan', icon: FolderIcon }, { value: 'new', label: 'New Test Plan', icon: UploadIcon }]} value={sourceMode} onChange={setSourceMode} />
                {sourceMode === 'past' && <PastChecklistLoader clientName={clientName} onLoad={handleLoadPast} />}
                {sourceMode === 'new' && (
                  <div style={{ marginTop: 12 }}>
                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()} style={{ padding: '36px 24px' }}>
                      <input type="file" ref={fileInputRef} accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      <p>Upload Requirements Document</p><small>PDF, DOCX, or TXT — generates QA test plan from client requirements</small>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* PROCESSING STATE */}
        {tp.state === 'processing' && (
          <>
            {tp.processingClient && <div className="approved-badge" style={{ marginBottom: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{tp.processingClient}</div>}
            <div className="processing-indicator"><div className="breath-dot" /><span>{tp.processingText}</span></div>
            <div className="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg><p>Analyzing requirements</p></div>
          </>
        )}

        {/* REVIEW STATE */}
        {tp.state === 'review' && (
          <>
            <div className="success-indicator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg><span>{tp.extractedFrom}</span></div>
            {tp.editsApplied && <div className="success-indicator" style={{ background: 'var(--pass-soft)', color: 'var(--pass)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg><span>Edits saved to Vertesia</span></div>}
            <div className="checklist-container">
              <div className="checklist-header"><span className="checklist-title">Generated Test Plan</span><span className="checklist-count">{effectiveCount} items</span></div>
              <div className="checklist-body">
                <ChecklistReview checklist={tp.checklist} customItems={tp.customItems} onToggle={tp.toggleItem} onAddCustom={tp.addCustomItem} onRemoveCustom={tp.removeCustomItem} onUpdateCustom={tp.updateCustomField} />
              </div>
            </div>
            <div className="action-bar">
              <div className="action-info">
                {removedCount > 0 || addedCount > 0 ? (<>{removedCount > 0 && <strong>{removedCount} removed</strong>}{removedCount > 0 && addedCount > 0 && ' · '}{addedCount > 0 && <strong>{addedCount} added</strong>}</>) : 'Review and approve'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleApplyEdits} disabled={!tp.hasChanges() || tp.editsApplied || isSaving}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  {isSaving ? 'Saving...' : 'Apply Edits'}
                </button>
                <button className="btn btn-success" onClick={handleApprove}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Approve
                </button>
              </div>
            </div>
          </>
        )}

        {/* APPROVED STATE */}
        {tp.state === 'approved' && (
          <>
            <div className="success-indicator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg><span>Approved — Ready for validation</span></div>
            <div className="checklist-container" style={{ opacity: 0.85 }}>
              <div className="checklist-header"><span className="checklist-title">Approved Test Plan</span><span className="checklist-count">{effectiveCount} items</span></div>
              <div className="checklist-body">
                {tp.checklist.filter(i => i.checked).map((item, idx) => {
                  const severityClass = (item.severity || '').toLowerCase().includes('critical') && !(item.severity || '').toLowerCase().includes('non') ? 'severity-critical' : 'severity-noncritical';
                  return (
                    <div key={item.id + '-' + idx} className="checklist-item" style={{ pointerEvents: 'none' }}>
                      <div className="item-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="item-id">{item.id}</span><span className="item-text">{item.assertion}</span></div>
                        <div className="item-meta"><span className="item-expected">{item.expected || ''}</span> · {item.appliesTo || 'ALL'} · <span className={severityClass}>{(item.severity || 'NON-CRITICAL').toUpperCase()}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {refCollections.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Reference Collections</div>
                {refCollections.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{c.typeName || c.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{c._memberCount ?? '?'} docs</span>
                  </div>
                ))}
              </div>
            )}
            <div className="action-bar"><div className="action-info">Locked for validation</div><button className="btn btn-secondary" onClick={tp.editAgain}>Edit</button></div>
          </>
        )}

        {/* ERROR STATE */}
        {tp.state === 'error' && (
          <>
            <div className="error-indicator"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg><span>{tp.errorText || 'An error occurred'}</span></div>
            <button className="btn btn-secondary" onClick={tp.reset}>Try Again</button>
          </>
        )}
      </div>
    </div>
  );
}
