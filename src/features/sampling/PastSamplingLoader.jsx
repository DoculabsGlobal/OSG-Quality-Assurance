import { useState, useEffect, useCallback } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { apiCall } from '../../services/api';

/**
 * Dropdown + Load button for loading past sampling reports.
 */
export default function PastSamplingLoader({ clientName, onLoad }) {
  const { allCollections } = useCollections();
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load past reports when client changes
  useEffect(() => {
    if (!clientName) { setReports([]); return; }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setSelectedId('');

      try {
        const colName = clientName + ': Required Sampling';
        const col = allCollections.find(c => (c.name || '').toLowerCase() === colName.toLowerCase());
        if (!col) { setReports([]); setIsLoading(false); return; }

        const members = await apiCall('/collections/' + col.id + '/members?limit=1000');
        const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);
        if (memberIds.length === 0) { setReports([]); setIsLoading(false); return; }

        const clientKey = clientName.toLowerCase().split(' - ')[0].split(':')[0].trim();
        const docs = [];

        await Promise.all(memberIds.map(async (id) => {
          try {
            const doc = await apiCall('/objects/' + id);
            if (!doc || !doc.name) return;
            const name = (doc.name || '').toLowerCase();
            if (clientKey && !name.includes(clientKey)) return;
            docs.push(doc);
          } catch (e) { /* skip */ }
        }));

        if (!cancelled) setReports(docs);
      } catch (e) {
        console.error(e);
        if (!cancelled) setReports([]);
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [clientName, allCollections]);

  const handleLoad = useCallback(() => {
    const report = reports.find(r => r.id === selectedId);
    if (report) {
      onLoad(report.name, report.content?.source);
    }
  }, [selectedId, reports, onLoad]);

  return (
    <div style={{ marginTop: 12 }}>
      <label className="input-label">Select Calculation</label>
      <select
        className="checklist-dropdown"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {isLoading ? (
          <option value="">Loading...</option>
        ) : reports.length === 0 ? (
          <option value="">No past calculations found</option>
        ) : (
          <>
            <option value="">-- Select --</option>
            {reports.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </>
        )}
      </select>
      <button
        className="btn btn-primary"
        style={{ marginTop: 10, width: '100%' }}
        onClick={handleLoad}
        disabled={!selectedId}
      >
        Load Report
      </button>
    </div>
  );
}
