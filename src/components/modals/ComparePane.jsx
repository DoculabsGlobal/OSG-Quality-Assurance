import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { getCollectionGroups } from '../../hooks/useCollectionGroups';
import { apiCall } from '../../services/api';
import { fetchDocumentContent, getDownloadUrl } from '../../services/documents';
import { renderMarkdown } from '../../utils/markdown';
import { escapeHtml } from '../../utils/escape';
import { extractExt } from '../../utils/extractExt';

/**
 * Side-by-side document comparison pane.
 * Shows a collection tree browser on the left, renders selected doc on the right.
 * Attaches to DocViewerModal when compare mode is active.
 */
export default function ComparePane({ isActive, onClose }) {
  const { allCollections } = useCollections();
  const [tree, setTree] = useState(null); // { groups: [{ key, displayName, collections: [{ id, name, typeName, docs: [] }] }] }
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCol, setExpandedCol] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null); // { id, name, ext }
  const renderRef = useRef(null);

  // Build tree when activated
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setViewingDoc(null);
      setSearchQuery('');
      setExpandedCol(null);

      try {
        const groups = getCollectionGroups(allCollections);
        const treeGroups = [];

        for (const key of Object.keys(groups).sort()) {
          const group = groups[key];
          const colsWithDocs = [];

          for (const col of group.collections) {
            let docs = [];
            try {
              const members = await apiCall('/collections/' + col.id + '/members?limit=100');
              const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);
              await Promise.all(memberIds.map(async (id) => {
                try {
                  const doc = await apiCall('/objects/' + id);
                  if (doc && doc.name) docs.push(doc);
                } catch (e) { /* skip */ }
              }));
            } catch (e) { /* skip */ }

            colsWithDocs.push({
              id: col.id,
              name: col.name,
              typeName: col.typeName,
              docs,
            });
          }

          treeGroups.push({ key, displayName: group.displayName, collections: colsWithDocs });
        }

        if (!cancelled) setTree({ groups: treeGroups });
      } catch (e) {
        console.error('Compare tree error:', e);
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isActive, allCollections]);

  const toggleGroup = useCallback((key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleCol = useCallback((colId) => {
    setExpandedCol(prev => prev === colId ? null : colId);
  }, []);

  const openDoc = useCallback(async (doc) => {
    setViewingDoc({ id: doc.id, name: doc.name, ext: extractExt(doc.name) });
    const el = renderRef.current;
    if (!el) return;

    el.innerHTML = '<div class="processing-indicator" style="padding:30px;"><div class="breath-dot"></div><span>Loading...</span></div>';

    try {
      let ext = extractExt(doc.name);
      let source = doc.content?.source;
      if (!source) {
        const obj = await apiCall('/objects/' + doc.id);
        source = obj?.content?.source;
        if (!ext) ext = extractExt(obj?.name || doc.name);
      }

      const textTypes = ['md', 'txt', 'json', 'markdown', 'text'];
      const spreadsheetTypes = ['xlsx', 'xls', 'csv'];

      if (ext === 'pdf') {
        const url = await getDownloadUrl(source);
        el.innerHTML = '<iframe src="' + url + '" style="width:100%;height:100%;border:none;border-radius:4px;min-height:400px;"></iframe>';
      } else if (spreadsheetTypes.includes(ext)) {
        const url = await getDownloadUrl(source);
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
          if (workbook.SheetNames.length > 1) html += '<h2 style="margin:14px 0 6px;font-size:15px;font-weight:600;">' + escapeHtml(sheetName) + '</h2>';
          html += '<div class="spreadsheet-view">' + XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], { editable: false }) + '</div>';
        }
        el.innerHTML = '<div class="doc-viewer-rendered">' + html + '</div>';
        el.querySelectorAll('table').forEach(t => { t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;'; });
        el.querySelectorAll('td').forEach(c => { c.style.cssText = 'padding:5px 8px;border:1px solid var(--border);text-align:left;white-space:nowrap;max-width:250px;overflow:hidden;text-overflow:ellipsis;'; });
        el.querySelectorAll('tr:first-child td').forEach(c => { c.style.cssText += 'background:var(--bg);font-weight:600;font-size:11px;position:sticky;top:0;z-index:2;'; });
      } else if (ext === 'docx' || ext === 'doc') {
        const url = await getDownloadUrl(source);
        const arrayBuffer = await (await fetch(url)).arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        el.innerHTML = '<div class="doc-viewer-rendered docx-preview" style="padding:4px 12px;line-height:1.7;font-size:13px;">' + result.value + '</div>';
      } else if (textTypes.includes(ext)) {
        const content = await fetchDocumentContent(source);
        el.innerHTML = '<div class="doc-viewer-rendered">' + renderMarkdown(content) + '</div>';
      } else {
        try {
          const content = await fetchDocumentContent(source);
          if (content && content.trim().length > 10) {
            el.innerHTML = '<div class="doc-viewer-rendered">' + renderMarkdown(content) + '</div>';
          } else throw new Error('empty');
        } catch (fallbackErr) {
          el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--text-3);font-size:13px;gap:8px;"><span>Preview not available</span></div>';
        }
      }
    } catch (e) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--fail);font-size:13px;">Error: ' + escapeHtml(e.message) + '</div>';
    }
  }, []);

  const backToBrowse = useCallback(() => {
    setViewingDoc(null);
    if (renderRef.current) renderRef.current.innerHTML = '';
  }, []);

  if (!isActive) return null;

  // Filter tree by search
  const filteredTree = tree && searchQuery
    ? {
        groups: tree.groups.map(g => ({
          ...g,
          collections: g.collections.map(c => ({
            ...c,
            docs: c.docs.filter(d => (d.name || '').toLowerCase().includes(searchQuery.toLowerCase())),
          })).filter(c => c.docs.length > 0),
        })).filter(g => g.collections.length > 0),
      }
    : tree;

  return (
    <div className="compare-pane" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', width: '50%', minWidth: 300 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Compare</span>
        <button className="btn-header" onClick={onClose} style={{ padding: '3px 6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Browse mode */}
      {!viewingDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text" placeholder="Search documents..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </div>

          {/* Tree */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {isLoading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading library...</div>
            )}
            {filteredTree && filteredTree.groups.map(g => (
              <div key={g.key} className="compare-tree-group">
                <div
                  className={`compare-tree-group-header ${collapsedGroups.has(g.key) ? 'collapsed' : ''}`}
                  onClick={() => toggleGroup(g.key)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  {g.displayName}
                </div>
                {!collapsedGroups.has(g.key) && g.collections.map(col => (
                  <div key={col.id}>
                    <div
                      className={`compare-tree-col ${expandedCol === col.id ? 'expanded' : ''}`}
                      onClick={() => toggleCol(col.id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {col.typeName || col.name}
                      <span className="col-count">{col.docs.length}</span>
                    </div>
                    {expandedCol === col.id && (
                      <div className="compare-tree-docs">
                        {col.docs.length === 0 && (
                          <div style={{ padding: '4px 14px 4px 40px', fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Empty</div>
                        )}
                        {col.docs.map(doc => (
                          <div
                            key={doc.id}
                            className="compare-tree-doc"
                            onClick={() => openDoc(doc)}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="doc-name">{doc.name}</span>
                            {extractExt(doc.name) && <span className="doc-ext">{extractExt(doc.name)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Doc view mode */}
      {viewingDoc && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="compare-doc-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button onClick={backToBrowse} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Browse
            </button>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewingDoc.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{viewingDoc.ext ? viewingDoc.ext.toUpperCase() : ''}</span>
          </div>
          <div ref={renderRef} className="compare-render" style={{ flex: 1, overflowY: 'auto', padding: 20 }} />
        </div>
      )}
    </div>
  );
}
