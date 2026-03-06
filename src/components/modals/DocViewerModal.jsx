import { useState, useEffect, useRef, useCallback } from 'react';
import { useDocViewer } from '../../context/DocViewerContext';
import { apiCall } from '../../services/api';
import { fetchDocumentContent, getDownloadUrl } from '../../services/documents';
import { renderMarkdown } from '../../utils/markdown';
import { escapeHtml } from '../../utils/escape';
import { exportAsPDF, exportAsWord, exportPrint } from '../../services/exports';
import DocViewerToolbar from './DocViewerToolbar';
import ComparePane from './ComparePane';

/**
 * Full-screen document viewer modal.
 * Handles: markdown, text, JSON, PDF (iframe), XLSX/CSV (SheetJS), DOCX (mammoth).
 * Post-processors (styleAuditSections, linkifyAuditReport) applied via useEffect on ref.
 */
export default function DocViewerModal() {
  const { isOpen, currentDoc, postProcessors, closeDoc } = useDocViewer();
  const [viewState, setViewState] = useState('loading'); // loading | content | error
  const [errorMsg, setErrorMsg] = useState('');
  const [displayType, setDisplayType] = useState('');
  const [contentSource, setContentSource] = useState(null);
  const [contentExt, setContentExt] = useState('');
  const [compareActive, setCompareActive] = useState(false);
  const renderedRef = useRef(null);

  // Load document when opened
  useEffect(() => {
    if (!isOpen || !currentDoc) return;
    let cancelled = false;

    (async () => {
      setViewState('loading');
      setErrorMsg('');
      setContentSource(null);
      setContentExt('');

      try {
        const { id: docId, name: docName, source } = currentDoc;

        // Fetch metadata
        const obj = await apiCall('/objects/' + docId);
        const src = source || obj.content?.source;
        const mimeType = (obj.content?.type || '').toLowerCase();
        const contentFileName = (obj.content?.name || '').toLowerCase();
        if (!src) throw new Error('No content available');

        // Determine file type
        let ext = (docName || '').split('.').pop().toLowerCase();
        const knownExts = ['pdf', 'md', 'txt', 'json', 'csv', 'markdown', 'text', 'doc', 'docx', 'xlsx', 'xls'];
        if (!knownExts.includes(ext)) {
          const contentExt = contentFileName.split('.').pop();
          if (knownExts.includes(contentExt)) ext = contentExt;
          else if (mimeType.includes('markdown') || mimeType.includes('text/md')) ext = 'md';
          else if (mimeType === 'text/plain') ext = 'txt';
          else if (mimeType === 'application/json') ext = 'json';
          else if (mimeType === 'application/pdf') ext = 'pdf';
          else if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') ext = 'docx';
        }

        if (cancelled) return;
        setContentSource(src);
        setContentExt(ext);
        setDisplayType(ext === 'md' || ext === 'markdown' ? 'Markdown' : ext.toUpperCase());

        const el = renderedRef.current;
        const textTypes = ['md', 'txt', 'json', 'markdown', 'text'];
        const spreadsheetTypes = ['xlsx', 'xls', 'csv'];

        if (ext === 'pdf') {
          const url = await getDownloadUrl(src);
          if (el) el.innerHTML = '<iframe src="' + url + '" style="width:100%;height:60vh;border:1px solid var(--border);border-radius:6px;"></iframe>';
        } else if (spreadsheetTypes.includes(ext)) {
          const url = await getDownloadUrl(src);
          const XLSX = await import('xlsx');

          let workbook;
          if (ext === 'csv') {
            const text = await (await fetch(url)).text();
            workbook = XLSX.read(text, { type: 'string' });
          } else {
            const buf = await (await fetch(url)).arrayBuffer();
            workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
          }

          let html = '';
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (workbook.SheetNames.length > 1) {
              html += '<h2 style="margin:18px 0 8px;font-size:16px;font-weight:600;">' + escapeHtml(sheetName) + '</h2>';
            }
            html += '<div class="spreadsheet-view">' + XLSX.utils.sheet_to_html(sheet, { editable: false }) + '</div>';
          }
          if (el) {
            el.innerHTML = html;
            // Style SheetJS tables
            el.querySelectorAll('table').forEach(t => { t.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;'; });
            el.querySelectorAll('td').forEach(c => { c.style.cssText = 'padding:6px 10px;border:1px solid var(--border);text-align:left;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;'; });
            el.querySelectorAll('tr:first-child td').forEach(c => { c.style.cssText += 'background:var(--bg);font-weight:600;font-size:12px;position:sticky;top:0;z-index:2;'; });
          }
        } else if (ext === 'docx' || ext === 'doc') {
          const url = await getDownloadUrl(src);
          const arrayBuffer = await (await fetch(url)).arrayBuffer();
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (el) {
            el.innerHTML = '<div class="docx-preview" style="padding:4px 16px;line-height:1.7;font-size:14px;">' + result.value + '</div>';
            el.querySelectorAll('.docx-preview table').forEach(t => { t.style.cssText = 'width:100%;border-collapse:collapse;margin:12px 0;'; });
            el.querySelectorAll('.docx-preview td, .docx-preview th').forEach(c => { c.style.cssText = 'padding:6px 10px;border:1px solid var(--border);text-align:left;'; });
          }
        } else if (textTypes.includes(ext)) {
          const content = await fetchDocumentContent(src);
          if (el) {
            el.innerHTML = renderMarkdown(content);
            // Apply post-processors
            for (const pp of postProcessors) {
              pp(el);
            }
          }
        } else {
          if (el) el.innerHTML = '<div class="empty-state" style="padding:40px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Preview not available for .' + ext + ' files</p><small>Export to download this file</small></div>';
        }

        if (!cancelled) setViewState('content');
      } catch (e) {
        if (!cancelled) {
          setErrorMsg('Could not load: ' + e.message);
          setViewState('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, currentDoc, postProcessors]);

  // Export handlers
  const handleExportPDF = useCallback(async () => {
    if (!contentSource) return;
    const textTypes = ['md', 'txt', 'json', 'markdown', 'text'];
    if (textTypes.includes(contentExt)) {
      const content = await fetchDocumentContent(contentSource);
      exportAsPDF(content, currentDoc?.name);
    } else if (renderedRef.current?.innerHTML) {
      // For spreadsheets/docx, use rendered HTML
      const html2pdf = (await import('html2pdf.js')).default;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'font-family:-apple-system,Segoe UI,sans-serif;padding:20px;color:#2d2b26;font-size:12px;';
      wrapper.innerHTML = '<h1 style="font-size:18px;margin-bottom:12px;">' + escapeHtml(currentDoc?.name || '') + '</h1>' + renderedRef.current.innerHTML;
      document.body.appendChild(wrapper);
      const safeName = (currentDoc?.name || 'document').replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, '_');
      html2pdf().set({ margin: [0.5, 0.5, 0.5, 0.5], filename: safeName + '.pdf', image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' } }).from(wrapper).save().then(() => document.body.removeChild(wrapper));
    } else {
      handleExportRaw();
    }
  }, [contentSource, contentExt, currentDoc]);

  const handleExportWord = useCallback(async () => {
    if (!contentSource) return;
    const textTypes = ['md', 'txt', 'json', 'markdown', 'text'];
    if (textTypes.includes(contentExt)) {
      const content = await fetchDocumentContent(contentSource);
      exportAsWord(content, currentDoc?.name);
    } else if (renderedRef.current?.innerHTML) {
      const wordDoc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>body{font-family:Calibri;font-size:10pt;}table{border-collapse:collapse;width:100%;}th,td{border:1pt solid #c0c0c0;padding:5pt 8pt;font-size:9pt;}th{background:#f5f1ea;font-weight:bold;}</style></head><body><h1>' + escapeHtml(currentDoc?.name || '') + '</h1>' + renderedRef.current.innerHTML + '</body></html>';
      const blob = new Blob(['\ufeff' + wordDoc], { type: 'application/msword' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (currentDoc?.name || 'document').replace(/[^a-zA-Z0-9 \-_.]/g, '').replace(/\s+/g, '_') + '.doc';
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      handleExportRaw();
    }
  }, [contentSource, contentExt, currentDoc]);

  const handleExportPrint = useCallback(async () => {
    if (!contentSource) return;
    const textTypes = ['md', 'txt', 'json', 'markdown', 'text'];
    if (textTypes.includes(contentExt)) {
      const content = await fetchDocumentContent(contentSource);
      exportPrint(content, currentDoc?.name);
    } else if (renderedRef.current?.innerHTML) {
      const win = window.open('', '_blank');
      win.document.write('<!DOCTYPE html><html><head><title>' + escapeHtml(currentDoc?.name || '') + '</title><style>body{font-family:-apple-system,sans-serif;margin:30px;font-size:12px;}h1{font-size:18px;margin-bottom:12px;}table{border-collapse:collapse;width:100%;margin:8px 0;}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;font-size:11px;}th{background:#f5f1ea;font-weight:600;}</style></head><body><h1>' + escapeHtml(currentDoc?.name || '') + '</h1>' + renderedRef.current.innerHTML + '</body></html>');
      win.document.close();
      win.print();
    }
  }, [contentSource, contentExt, currentDoc]);

  const handleExportRaw = useCallback(async () => {
    if (!contentSource) return;
    try {
      const url = await getDownloadUrl(contentSource);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement('a');
      const safeName = (currentDoc?.name || 'document').replace(/[^a-zA-Z0-9_\-. ]/g, '_');
      const ext = contentExt && !safeName.toLowerCase().endsWith('.' + contentExt) ? '.' + contentExt : '';
      a.href = URL.createObjectURL(blob);
      a.download = safeName + ext;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { console.error('Export failed:', e); }
  }, [contentSource, contentExt, currentDoc]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setCompareActive(false); closeDoc(); } }}>
      <div className={`modal ${compareActive ? 'doc-modal-compare compare-active' : 'doc-modal-single'}`} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentDoc?.name || ''}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>
            {displayType && `${displayType} · ${new Date().toLocaleDateString()}`}
          </span>
          <DocViewerToolbar
            onExportPDF={handleExportPDF}
            onExportWord={handleExportWord}
            onExportPrint={handleExportPrint}
            onExportRaw={handleExportRaw}
          />
          <button
            className={`btn-header ${compareActive ? 'active' : ''}`}
            onClick={() => setCompareActive(v => !v)}
            style={{ padding: '5px 8px' }}
            title="Compare with another document"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
          <button className="btn-header" onClick={() => { setCompareActive(false); closeDoc(); }} style={{ padding: '5px 8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content area + Compare pane side by side */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main document content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {/* Loading */}
            {viewState === 'loading' && (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="breath-dot" style={{ marginBottom: 12 }} />
                <p>Loading {currentDoc?.name || ''}...</p>
              </div>
            )}

            {/* Error */}
            {viewState === 'error' && (
              <div className="empty-state" style={{ padding: 40 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--fail)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Rendered content */}
            <div
              ref={renderedRef}
              className="doc-viewer-rendered"
              style={{ display: viewState === 'content' ? 'block' : 'none', padding: 20 }}
            />
          </div>

          {/* Compare pane */}
          <ComparePane isActive={compareActive} onClose={() => setCompareActive(false)} />
        </div>
      </div>
    </div>
  );
}
