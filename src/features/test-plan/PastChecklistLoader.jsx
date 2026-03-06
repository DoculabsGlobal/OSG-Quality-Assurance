import { useState, useEffect, useCallback } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { apiCall } from '../../services/api';

export default function PastChecklistLoader({ clientName, onLoad }) {
  const { allCollections } = useCollections();
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientName) { setPlans([]); return; }
    let cancelled = false;
    (async () => {
      setIsLoading(true); setSelectedId('');
      try {
        const checklistColName = clientName + ': Test Plans';
        const col = allCollections.find(c => { const n = (c.name || '').toLowerCase(); return n === checklistColName.toLowerCase() || n === (clientName + ': Checklists').toLowerCase(); });
        if (!col) { setPlans([]); setIsLoading(false); return; }
        const members = await apiCall('/collections/' + col.id + '/members?limit=1000');
        const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);
        if (memberIds.length === 0) { setPlans([]); setIsLoading(false); return; }
        const clientKey = clientName.toLowerCase().split(' - ')[0].split(':')[0].trim();
        const docs = [];
        await Promise.all(memberIds.map(async (id) => {
          try { const doc = await apiCall('/objects/' + id); if (!doc || !doc.name) return; const name = (doc.name || '').toLowerCase(); if (name.includes('master') || name.includes('template')) return; if (clientKey && !name.includes(clientKey)) return; docs.push(doc); } catch (e) { /* skip */ }
        }));
        if (!cancelled) setPlans(docs);
      } catch (e) { if (!cancelled) setPlans([]); }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientName, allCollections]);

  const handleLoad = useCallback(() => {
    const plan = plans.find(p => p.id === selectedId);
    if (plan) onLoad(plan.id, plan.name, plan.content?.source);
  }, [selectedId, plans, onLoad]);

  return (
    <div style={{ marginTop: 12 }}>
      <label className="input-label">Select Test Plan</label>
      <select className="checklist-dropdown" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        {isLoading ? <option value="">Loading...</option> : plans.length === 0 ? <option value="">No test plans found</option> : (
          <><option value="">-- Select a test plan --</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>
        )}
      </select>
      <button className="btn btn-primary" style={{ marginTop: 10, width: '100%' }} onClick={handleLoad} disabled={!selectedId}>Load Test Plan</button>
    </div>
  );
}
