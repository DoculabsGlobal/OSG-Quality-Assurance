import { useMemo } from 'react';
import { useCollectionGroups } from '../../hooks/useCollectionGroups';
import { OUTPUT_TYPE_NAMES } from '../../constants/config';
import { escapeHtml } from '../../utils/escape';

/**
 * Renders the grouped collection tree in the library sidebar.
 * Collections are split into Reference and Output within each group.
 */
export default function CollectionList({
  collections, searchQuery,
  onOpenCollection, onDeleteCollection, onDeleteGroup, onAddToGroup,
}) {
  const { groups, toggleGroup, isCollapsed } = useCollectionGroups(collections);
  const keys = useMemo(() => Object.keys(groups).sort(), [groups]);

  // Filter collections by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    const result = {};
    for (const key of keys) {
      const group = groups[key];
      const filtered = group.collections.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.typeName || '').toLowerCase().includes(q) ||
        group.displayName.toLowerCase().includes(q)
      );
      if (filtered.length > 0) {
        result[key] = { ...group, collections: filtered };
      }
    }
    return result;
  }, [groups, keys, searchQuery]);

  const filteredKeys = Object.keys(filteredGroups).sort();

  if (filteredKeys.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 24px' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <p>{searchQuery ? 'No results' : 'No collections'}</p>
        {!searchQuery && <small>Click "New Client" to begin</small>}
      </div>
    );
  }

  return (
    <>
      {filteredKeys.map(key => {
        const group = filteredGroups[key];
        const collapsed = isCollapsed(key);
        const groupLabel = key === '_UNGROUPED' ? 'Other' : group.displayName;

        // Count total docs across collections
        let totalDocs = 0;
        let countsLoaded = true;
        for (const c of group.collections) {
          if (c._memberCount != null) totalDocs += c._memberCount;
          else countsLoaded = false;
        }
        const countDisplay = countsLoaded ? totalDocs : group.collections.length + ' collections';

        // Split reference vs output
        const refCols = group.collections.filter(c => !OUTPUT_TYPE_NAMES.includes((c.typeName || '').toLowerCase()));
        const outCols = group.collections.filter(c => OUTPUT_TYPE_NAMES.includes((c.typeName || '').toLowerCase()));

        return (
          <div key={key}>
            {/* Group header */}
            <div
              className={`lib-group-header ${collapsed ? 'collapsed' : ''}`}
              onClick={() => toggleGroup(key)}
            >
              <svg className="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span className="group-name">{groupLabel}</span>
              <span className="group-count">{countDisplay}</span>
              <div className="lib-group-actions">
                <button
                  className="lib-group-action"
                  onClick={(e) => { e.stopPropagation(); onAddToGroup(group.displayName); }}
                  title="Add collection"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  className="lib-group-action danger"
                  onClick={(e) => { e.stopPropagation(); onDeleteGroup(key, group.displayName, group.collections); }}
                  title="Delete all collections in group"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Group children */}
            <div className={`lib-group-children ${collapsed ? 'collapsed' : ''}`} style={{ maxHeight: 2000 }}>
              {/* Reference collections */}
              {refCols.length > 0 && outCols.length > 0 && (
                <div className="lib-sub-label">Reference</div>
              )}
              {refCols.map(col => (
                <CollectionItem
                  key={col.id}
                  col={col}
                  onOpen={() => onOpenCollection(col.id, col.name)}
                  onDelete={() => onDeleteCollection(col.id, col.name)}
                />
              ))}

              {/* Output collections */}
              {outCols.length > 0 && refCols.length > 0 && (
                <div className="lib-sub-label" style={{ marginTop: 2 }}>Output</div>
              )}
              {outCols.map(col => (
                <div
                  key={col.id}
                  className="lib-item output-col"
                  onClick={() => onOpenCollection(col.id, col.name)}
                >
                  <div className="lib-item-icon collection output">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="lib-item-info">
                    <div className="lib-item-name">{col.typeName || col.name}</div>
                  </div>
                  {col._memberCount != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{col._memberCount}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function CollectionItem({ col, onOpen, onDelete }) {
  const createdDate = col.created_at ? new Date(col.created_at).toLocaleDateString() : '';
  const docCount = col._memberCount;
  const countStr = docCount != null ? docCount + ' doc' + (docCount !== 1 ? 's' : '') : '';
  const metaParts = [countStr, createdDate].filter(Boolean).join(' · ');

  return (
    <div className="lib-item" onClick={onOpen}>
      <div className="lib-item-icon collection">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="lib-item-info">
        <div className="lib-item-name">{col.typeName || col.name}</div>
        {metaParts && <div className="lib-item-meta">{metaParts}</div>}
      </div>
      <div className="lib-item-actions">
        <button
          className="lib-action-btn"
          style={{ color: 'var(--fail)' }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete collection"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
