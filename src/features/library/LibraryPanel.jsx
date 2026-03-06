import { useState, useRef, useCallback } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { useDialog } from '../../context/DialogContext';
import { useLibrary } from './useLibrary';
import { buildAuditTemplate } from '../../utils/auditTemplate';
import { apiCall } from '../../services/api';
import { uploadFile } from '../../services/documents';
import CollectionList from './CollectionList';
import DocumentList from './DocumentList';
import UploadQueue from './UploadQueue';

/**
 * Library sidebar — shows collection tree or document list.
 * Manages search, breadcrumb navigation, and upload flow.
 */
export default function LibraryPanel({ onOpenSetup }) {
  const { allCollections, loadCollections } = useCollections();
  const { alert, confirm, prompt } = useDialog();
  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    currentView, currentCollectionId, currentCollectionName,
    documents, isLoadingDocs, docError,
    openCollection, backToCollections,
    deleteDocument, deleteCollection, deleteGroup, addCollectionToGroup,
    uploadQueue, showUploadQueue, handleUpload, clearUploadQueue,
  } = useLibrary();

  // Collection CRUD handlers (with confirmation dialogs)
  const handleDeleteDoc = useCallback(async (docId, docName) => {
    if (!(await confirm('Delete "' + docName + '"?', { title: 'Delete Document', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await deleteDocument(docId);
      await loadCollections();
    } catch (e) { await alert(e.message, 'Delete Failed'); }
  }, [deleteDocument, loadCollections, confirm, alert]);

  const handleDeleteCollection = useCallback(async (colId, colName) => {
    if (!(await confirm('Delete collection "' + colName + '"? This removes the collection but does not delete the documents inside it.', { title: 'Delete Collection', danger: true, confirmLabel: 'Delete' }))) return;
    try {
      await deleteCollection(colId);
      await loadCollections();
    } catch (e) { await alert(e.message, 'Delete Failed'); }
  }, [deleteCollection, loadCollections, confirm, alert]);

  const handleDeleteGroup = useCallback(async (groupKey, groupDisplayName, collections) => {
    const count = collections.length;
    if (!(await confirm('Delete all ' + count + ' collections in "' + groupDisplayName + '"?', { title: 'Delete Group', danger: true, confirmLabel: 'Delete All' }))) return;
    try {
      await deleteGroup(collections);
      await loadCollections();
    } catch (e) { await alert(e.message, 'Delete Failed'); }
  }, [deleteGroup, loadCollections, confirm, alert]);

  const handleAddToGroup = useCallback(async (groupDisplayName) => {
    const typeName = await prompt('Will be created as: ' + groupDisplayName + ': (your input)', { title: 'New Collection', placeholder: 'Collection type name' });
    if (!typeName || !typeName.trim()) return;
    try {
      await addCollectionToGroup(groupDisplayName, typeName.trim());
      await loadCollections();
    } catch (e) { await alert(e.message, 'Create Failed'); }
  }, [addCollectionToGroup, loadCollections, prompt, alert]);

  // File upload
  const handleUploadClick = useCallback(() => {
    if (currentView !== 'documents' || !currentCollectionId) {
      alert('Navigate into a collection first, then upload.');
      return;
    }
    fileInputRef.current?.click();
  }, [currentView, currentCollectionId, alert]);

  const handleFileChange = useCallback(async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    await handleUpload(Array.from(files), currentCollectionId, async () => {
      await openCollection(currentCollectionId, currentCollectionName);
      await loadCollections();
    });
    e.target.value = '';
  }, [handleUpload, currentCollectionId, currentCollectionName, openCollection, loadCollections]);

  // Create blank audit
  const handleCreateBlankAudit = useCallback(async () => {
    const colName = currentCollectionName || '';
    const prefixPart = colName.split(':')[0].trim();
    const dashIdx = prefixPart.indexOf(' - ');
    const client = dashIdx > -1 ? prefixPart.substring(0, dashIdx).trim() : prefixPart;
    const project = dashIdx > -1 ? prefixPart.substring(dashIdx + 3).trim() : '';

    const fileName = client.replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, '_')
      + (project ? '_' + project.replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, '_') : '')
      + '_Master_Audit.md';

    try {
      const md = buildAuditTemplate(client, project || 'General');
      const blob = new Blob([md], { type: 'text/markdown' });
      const file = new File([blob], fileName, { type: 'text/markdown' });
      const objRes = await uploadFile(file);
      await apiCall('/collections/' + currentCollectionId + '/members', {
        method: 'POST',
        body: JSON.stringify({ action: 'add', members: [objRes.id] }),
      });
      await openCollection(currentCollectionId, currentCollectionName);
      await loadCollections();
    } catch (e) {
      await alert('Failed to create audit: ' + e.message);
    }
  }, [currentCollectionId, currentCollectionName, openCollection, loadCollections, alert]);

  return (
    <div className="library-panel">
      {/* Toolbar */}
      <div className="library-toolbar">
        <span className="library-toolbar-title">Library</span>
        <button className="tb-btn primary" onClick={onOpenSetup} title="New client setup">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Client
        </button>
        <button className="tb-btn" onClick={loadCollections} title="Refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {/* Search */}
      <div className="library-search">
        <div className="search-wrapper">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={currentView === 'collections' ? 'Search collections...' : 'Search documents...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="library-breadcrumb">
        {currentView === 'collections' ? (
          <span className="breadcrumb-current">All Collections</span>
        ) : (
          <>
            <button className="breadcrumb-link" onClick={backToCollections} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Collections
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentCollectionName}</span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="library-list">
        {currentView === 'collections' ? (
          <CollectionList
            collections={allCollections}
            searchQuery={searchQuery}
            onOpenCollection={openCollection}
            onDeleteCollection={handleDeleteCollection}
            onDeleteGroup={handleDeleteGroup}
            onAddToGroup={handleAddToGroup}
          />
        ) : (
          <DocumentList
            documents={documents}
            collectionName={currentCollectionName}
            searchQuery={searchQuery}
            isLoading={isLoadingDocs}
            error={docError}
            onDelete={handleDeleteDoc}
            onUploadClick={handleUploadClick}
            onCreateBlankAudit={handleCreateBlankAudit}
          />
        )}
      </div>

      {/* Upload queue */}
      <UploadQueue
        items={uploadQueue}
        visible={showUploadQueue}
        onClear={clearUploadQueue}
      />
    </div>
  );
}
