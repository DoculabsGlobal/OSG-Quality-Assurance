import { escapeHtml } from '../../utils/escape';
import { exportAsWord } from '../../services/exports';
import { fetchDocumentContent } from '../../services/documents';
import { useDocViewer } from '../../context/DocViewerContext';
import { useCallback } from 'react';

/**
 * Audit results table with separate Failed/Passed sections.
 * Rows are clickable to open in DocViewer, with download buttons.
 */
export default function AuditResultsTable({ reports, onOpenReport }) {
  const failed = reports.filter(p => p.stats && p.stats.fail > 0);
  const passed = reports.filter(p => !p.stats || p.stats.fail === 0);

  if (reports.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>No validation reports found</div>;
  }

  const handleDownload = useCallback(async (p) => {
    let content = p.content;
    if (!content && p.doc.content?.source) {
      try { content = await fetchDocumentContent(p.doc.content.source); } catch (e) { return; }
    }
    if (content) {
      const title = (p.doc.name || 'Validation_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
      exportAsWord(content, title);
    }
  }, []);

  return (
    <>
      {failed.length > 0 && (
        <Section
          title="Failed" items={failed} allReports={reports} color="var(--fail)"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          onOpen={onOpenReport} onDownload={handleDownload}
        />
      )}
      {passed.length > 0 && (
        <Section
          title="Passed" items={passed} allReports={reports} color="var(--pass)"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
          onOpen={onOpenReport} onDownload={handleDownload}
        />
      )}
    </>
  );
}

function Section({ title, items, allReports, color, icon, onOpen, onDownload }) {
  return (
    <>
      <div style={{ padding: '8px 12px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {title} ({items.length})
      </div>
      {items.map(p => {
        const idx = allReports.indexOf(p);
        const s = p.stats || {};
        const displayName = s.consumer || p.doc.name || 'Untitled';
        const subtitle = s._fromJson ? [s.account, s.batch].filter(Boolean).join(' | ') : '';
        const date = p.doc.updated_at || p.doc.created_at || '';
        const dateStr = date ? new Date(date).toLocaleDateString() : '';
        const hasFail = s.fail > 0;

        const statusBadge = hasFail
          ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--fail-soft)', color: 'var(--fail)' }}>
              {s.failures?.length ? s.failures.length + ' defect' + (s.failures.length > 1 ? 's' : '') : (s.fail || 1) + ' fail'}
            </span>
          : <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--pass-soft)', color: 'var(--pass)' }}>Pass</span>;

        return (
          <div key={p.doc.id} onClick={() => onOpen(idx)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-soft)', gap: 10 }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = ''}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                {subtitle || dateStr}{subtitle && dateStr ? ' · ' + dateStr : ''}
              </div>
            </div>
            {statusBadge}
            <button onClick={(e) => { e.stopPropagation(); onDownload(p); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }} title="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          </div>
        );
      })}
    </>
  );
}
