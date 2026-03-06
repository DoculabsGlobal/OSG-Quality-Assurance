import { useState, useCallback } from 'react';
import AuditStatsBar from './AuditStatsBar';
import AuditResultsTable from './AuditResultsTable';
import AuditExportButton from './AuditExportButton';
import { useDocViewer } from '../../context/DocViewerContext';
import { parseValidationStats } from '../../utils/parseValidationStats';
import { fetchDocumentContent } from '../../services/documents';
import { styleAuditSections, createLinkifyAuditReport } from '../../utils/auditPostProcessors';
import LookupPopover from '../../components/modals/LookupPopover';

/**
 * Previous validations view — stats bar, searchable results table, export button.
 * Now with audit post-processors and client data lookup popover.
 */
export default function AuditDashboard({ reports, stats, isLoading, isPolling, allCollections, clientName, clientData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupData, setLookupData] = useState(null);
  const [lookupPosition, setLookupPosition] = useState(null);
  const { openDoc } = useDocViewer();

  const handleShowLookup = useCallback((event, anchor, rowData) => {
    event.stopPropagation();
    const rect = anchor.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;
    if (top + 420 > window.innerHeight) top = rect.top - 420 - 8;
    if (left + 380 > window.innerWidth) left = window.innerWidth - 390;
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    setLookupData(rowData);
    setLookupPosition({ top, left });
  }, []);

  const closeLookup = useCallback(() => {
    setLookupData(null);
    setLookupPosition(null);
  }, []);

  const filtered = searchQuery
    ? reports.filter(p => {
        const q = searchQuery.toLowerCase();
        const name = (p.doc.name || '').toLowerCase();
        const consumer = (p.stats?.consumer || '').toLowerCase();
        const account = (p.stats?.account || '').toLowerCase();
        const batch = (p.stats?.batch || '').toLowerCase();
        return name.includes(q) || consumer.includes(q) || account.includes(q) || batch.includes(q);
      })
    : reports;

  const handleOpenReport = useCallback(async (idx) => {
    const p = reports[idx];
    if (!p) return;

    if (!p.content && p.doc.content?.source) {
      try {
        p.content = await fetchDocumentContent(p.doc.content.source);
        p.stats = parseValidationStats(p.content);
      } catch (e) { return; }
    }

    // Build post-processors with client data context
    const postProcessors = [styleAuditSections];
    if (clientData?.isLoaded) {
      postProcessors.push(createLinkifyAuditReport(clientData, handleShowLookup));
    }

    openDoc(p.doc.id, p.doc.name || 'Validation Report', p.doc.content?.source, { postProcessors });
  }, [reports, openDoc, clientData, handleShowLookup]);

  return (
    <>
      <AuditStatsBar stats={stats} />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Completed Validations
            {isPolling && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pass)', animation: 'breathe 2s ease-in-out infinite' }} title="Live updating every 5s" />
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', width: 160 }}
            />
          </div>
        </div>

        <div style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>
              <div className="breath-dot" style={{ margin: '0 auto 10px' }} />
              Loading validations...
            </div>
          ) : (
            <AuditResultsTable reports={filtered} onOpenReport={handleOpenReport} />
          )}
        </div>
      </div>

      <AuditExportButton reports={reports} clientName={clientName} allCollections={allCollections} />

      {/* Client data lookup popover */}
      <LookupPopover
        data={lookupData}
        headers={clientData?.headers}
        keyCol={clientData?.keyCol}
        fileName={clientData?.fileName}
        position={lookupPosition}
        onClose={closeLookup}
      />
    </>
  );
}
