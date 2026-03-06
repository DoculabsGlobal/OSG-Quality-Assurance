import { useState, useCallback, useRef, useEffect } from 'react';
import { apiCall } from '../../services/api';
import { fetchDocumentContent } from '../../services/documents';
import { parseValidationStats } from '../../utils/parseValidationStats';
import { deduplicateValidations } from '../../utils/deduplicateValidations';
import { escapeHtml } from '../../utils/escape';

/**
 * Combined audit dashboard + polling hook.
 * Manages: loading validations, 5s incremental polling, dedup, stats, cache.
 */
export function useAuditDashboard() {
  const [reports, setReports] = useState([]);       // deduped parsed cache
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [qaColId, setQaColId] = useState(null);
  const [dashboardClient, setDashboardClient] = useState('');
  const knownIds = useRef(new Set());
  const allDocs = useRef([]);
  const pollInterval = useRef(null);

  // Stats derived from reports
  const passed = reports.filter(p => !p.stats || p.stats.fail === 0).length;
  const failed = reports.filter(p => p.stats && p.stats.fail > 0).length;
  const stats = { total: reports.length, passed, failed };

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (!qaColId) return;

    pollInterval.current = setInterval(async () => {
      try {
        if (!qaColId || !dashboardClient) return;
        const members = await apiCall('/collections/' + qaColId + '/members?limit=1000');
        const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);
        const newIds = memberIds.filter(id => !knownIds.current.has(id));
        if (newIds.length === 0) return;

        const newDocs = [];
        await Promise.all(newIds.map(async (id) => {
          try {
            const doc = await apiCall('/objects/' + id);
            if (doc && doc.name) { newDocs.push(doc); knownIds.current.add(id); }
          } catch (e) { /* skip */ }
        }));

        if (newDocs.length === 0) return;

        const newParsed = [];
        await Promise.all(newDocs.map(async (doc) => {
          try {
            const content = await fetchDocumentContent(doc.content?.source);
            const s = parseValidationStats(content);
            newParsed.push({ doc, stats: s, content });
          } catch (e) { newParsed.push({ doc, stats: null, content: null }); }
        }));

        allDocs.current.push(...newDocs);
        setReports(prev => {
          const merged = [...prev, ...newParsed];
          const deduped = deduplicateValidations(merged);
          deduped.sort((a, b) => new Date(b.doc.updated_at || b.doc.created_at || 0) - new Date(a.doc.updated_at || a.doc.created_at || 0));
          return deduped;
        });
      } catch (e) { /* silent — next poll retries */ }
    }, 5000);

    setIsPolling(true);
  }, [qaColId, dashboardClient, stopPolling]);

  // Cleanup on unmount
  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  /**
   * Load the full audit dashboard for a client.
   */
  const loadDashboard = useCallback(async (clientName, allCollections) => {
    if (!clientName) return;
    stopPolling();
    setDashboardClient(clientName);
    setIsLoading(true);
    knownIds.current = new Set();
    allDocs.current = [];
    setReports([]);

    try {
      const clientKey = clientName.toLowerCase().split(' - ')[0].split(':')[0].trim();
      const qaCol = allCollections.find(c => {
        const n = (c.name || '').toLowerCase();
        return n.includes(clientKey) && (n.includes('completed qa') || n.includes('completed_qa'));
      });

      if (!qaCol) {
        setQaColId(null);
        setIsLoading(false);
        return;
      }

      setQaColId(qaCol.id);

      const members = await apiCall('/collections/' + qaCol.id + '/members?limit=1000');
      const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);

      if (memberIds.length === 0) {
        setIsLoading(false);
        // Start polling even with empty — new docs may arrive
        setTimeout(() => startPolling(), 100);
        return;
      }

      // Fetch all docs
      const docs = [];
      await Promise.all(memberIds.map(async (id) => {
        try {
          const doc = await apiCall('/objects/' + id);
          if (doc && doc.name) { docs.push(doc); knownIds.current.add(id); }
        } catch (e) { /* skip */ }
      }));
      allDocs.current = docs;

      // Fetch content + parse
      const parsed = [];
      await Promise.all(docs.map(async (doc) => {
        try {
          const content = await fetchDocumentContent(doc.content?.source);
          const s = parseValidationStats(content);
          parsed.push({ doc, stats: s, content });
        } catch (e) { parsed.push({ doc, stats: null, content: null }); }
      }));

      const deduped = deduplicateValidations(parsed);
      deduped.sort((a, b) => new Date(b.doc.updated_at || b.doc.created_at || 0) - new Date(a.doc.updated_at || a.doc.created_at || 0));
      setReports(deduped);
    } catch (e) {
      console.error('Audit dashboard error:', e);
    }

    setIsLoading(false);
    setTimeout(() => startPolling(), 100);
  }, [stopPolling, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setReports([]);
    setQaColId(null);
    setDashboardClient('');
    knownIds.current = new Set();
    allDocs.current = [];
  }, [stopPolling]);

  return {
    reports, stats, isLoading, isPolling, qaColId, dashboardClient,
    loadDashboard, startPolling, stopPolling, reset,
  };
}
