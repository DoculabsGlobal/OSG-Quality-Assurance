import { useState, useCallback } from 'react';
import { apiCall } from '../../services/api';
import { escapeHtml } from '../../utils/escape';
import { useDialog } from '../../context/DialogContext';

/**
 * "Save Audit to Collection" button. Generates master_audit_date.md and uploads to Audit collection.
 */
export default function AuditExportButton({ reports, clientName, allCollections }) {
  const [saving, setSaving] = useState(false);
  const [savedTo, setSavedTo] = useState(null);
  const { alert } = useDialog();

  const handleExport = useCallback(async () => {
    if (!clientName || reports.length === 0) { await alert('No audit data to export'); return; }

    setSaving(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString();
      const failed = reports.filter(p => p.stats && p.stats.fail > 0);
      const passed = reports.filter(p => !p.stats || p.stats.fail === 0);

      let md = '# QA Audit Report\n\n';
      md += '**Client:** ' + clientName + '\n\n';
      md += '**Date:** ' + dateStr + ' ' + timeStr + '\n\n';
      md += '**Statements:** ' + reports.length + ' total \u2014 **' + passed.length + ' passed** \u2014 **' + failed.length + ' failed**\n\n';
      md += '---\n\n';

      if (failed.length > 0) {
        md += '## \u274C Failed Validations (' + failed.length + ')\n\n';
        md += '| Consumer | Account | Failure Reason | Report |\n|---|---|---|---|\n';
        failed.forEach(p => {
          const s = p.stats || {};
          const docName = p.doc.name || 'Unknown';
          const storeId = p.doc.content?.source || '';
          const consumer = s.consumer || docName.replace(/.*QA Validation\s*-\s*/, '').replace(/\s*-\s*\d+$/, '') || 'Unknown';
          const account = s.account || '';
          let failureReason = '';
          if (s.failures?.length > 0) {
            failureReason = s.failures.map(f => typeof f === 'string' ? f : (f.finding || f.reason || f.description || JSON.stringify(f))).join('; ');
          } else if (p.content) {
            const failLines = [];
            p.content.split('\n').forEach(line => {
              if (/\|\s*\d+\s*\|\s*FAIL\s*\|/i.test(line)) {
                const parts = line.split('|').map(x => x.trim()).filter(Boolean);
                if (parts.length >= 3) failLines.push(parts[2]);
              }
            });
            if (failLines.length > 0) failureReason = failLines.join('; ');
          }
          if (!failureReason) failureReason = 'See report for details';
          md += '| ' + consumer + ' | ' + account + ' | ' + failureReason + ' | [' + docName + '] (store:' + storeId + ') |\n';
        });
        md += '\n---\n\n';
      }

      if (passed.length > 0) {
        md += '## \u2705 Passed Validations (' + passed.length + ')\n\n';
        md += '| Consumer | Account | Report |\n|---|---|---|\n';
        passed.forEach(p => {
          const s = p.stats || {};
          const docName = p.doc.name || 'Unknown';
          const storeId = p.doc.content?.source || '';
          const consumer = s.consumer || docName.replace(/.*QA Validation\s*-\s*/, '').replace(/\s*-\s*\d+$/, '') || 'Unknown';
          const account = s.account || '';
          md += '| ' + consumer + ' | ' + account + ' | [' + docName + '] (store:' + storeId + ') |\n';
        });
        md += '\n';
      }

      const clientKey = clientName.toLowerCase().split(' - ')[0].split(':')[0].trim();
      const auditCol = allCollections.find(c => {
        const n = (c.name || '').toLowerCase();
        return n.includes(clientKey) && n.includes('audit') && !n.includes('completed qa');
      });

      if (!auditCol) {
        await alert('No Audit collection found for ' + clientName);
        setSaving(false); return;
      }

      const fileName = 'master_audit_' + dateStr + '.md';
      const uploadUrlRes = await apiCall('/objects/upload-url', { method: 'POST', body: JSON.stringify({ name: fileName, mime_type: 'text/markdown' }) });
      await fetch(uploadUrlRes.url, { method: 'PUT', body: md, headers: { 'Content-Type': 'text/markdown' } });
      const objRes = await apiCall('/objects', { method: 'POST', body: JSON.stringify({ name: fileName, content: { source: uploadUrlRes.id, type: 'text/markdown', name: fileName } }) });
      await apiCall('/collections/' + auditCol.id + '/members', { method: 'POST', body: JSON.stringify({ action: 'add', members: [objRes.id] }) });

      setSavedTo(auditCol.name);
      setTimeout(() => { setSaving(false); setSavedTo(null); }, 3000);
    } catch (e) {
      await alert('Failed to save audit: ' + e.message);
      setSaving(false);
    }
  }, [reports, clientName, allCollections, alert]);

  return (
    <button
      className="btn btn-primary"
      style={{ width: '100%', padding: '10px 18px', fontSize: 14, justifyContent: 'center' }}
      onClick={handleExport}
      disabled={saving || reports.length === 0}
    >
      {savedTo ? (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Saved to {savedTo}</>
      ) : saving ? (
        <><div className="breath-dot" style={{ width: 8, height: 8, marginRight: 6 }} /> Saving to Audit collection...</>
      ) : (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save Audit to Collection</>
      )}
    </button>
  );
}
