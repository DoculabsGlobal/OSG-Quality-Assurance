import { useState, useCallback } from 'react';
import { apiCall } from '../../services/api';
import { fetchCollectionMembers, deleteDocument as svcDeleteDoc, deleteCollection as svcDeleteCol, deleteGroup as svcDeleteGroup, addCollectionToGroup as svcAddCol } from '../../services/collections';
import { uploadFile } from '../../services/documents';

/**
 * Hook managing library navigation state and document operations.
 * Owns: currentView, currentCollectionId, collectionDocuments, upload queue
 */
export function useLibrary() {
  const [currentView, setCurrentView] = useState('collections'); // 'collections' | 'documents'
  const [currentCollectionId, setCurrentCollectionId] = useState(null);
  const [currentCollectionName, setCurrentCollectionName] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docError, setDocError] = useState(null);

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState([]); // [{ id, name, status, state }]
  const [showUploadQueue, setShowUploadQueue] = useState(false);

  const openCollection = useCallback(async (colId, colName) => {
    setCurrentView('documents');
    setCurrentCollectionId(colId);
    setCurrentCollectionName(colName);
    setIsLoadingDocs(true);
    setDocError(null);

    try {
      const docs = await fetchCollectionMembers(colId);
      setDocuments(docs);
    } catch (e) {
      setDocError(e.message);
      setDocuments([]);
    }
    setIsLoadingDocs(false);
  }, []);

  const backToCollections = useCallback(() => {
    setCurrentView('collections');
    setCurrentCollectionId(null);
    setCurrentCollectionName('');
    setDocuments([]);
  }, []);

  const deleteDocument = useCallback(async (docId) => {
    await svcDeleteDoc(docId, currentCollectionId);
    // Refresh document list
    if (currentCollectionId) {
      const docs = await fetchCollectionMembers(currentCollectionId);
      setDocuments(docs);
    }
  }, [currentCollectionId]);

  const deleteCollection = useCallback(async (colId) => {
    await svcDeleteCol(colId);
  }, []);

  const deleteGroup = useCallback(async (collections) => {
    await svcDeleteGroup(collections);
  }, []);

  const addCollectionToGroup = useCallback(async (groupDisplayName, typeName) => {
    await svcAddCol(groupDisplayName, typeName);
  }, []);

  // File upload with queue tracking
  const handleUpload = useCallback(async (files, collectionId, onComplete) => {
    if (!files.length || !collectionId) return;
    setShowUploadQueue(true);

    const newItems = Array.from(files).map((f, i) => ({
      id: Date.now() + '-' + i,
      name: f.name,
      status: 'Preparing...',
      state: 'processing',
      file: f,
    }));

    setUploadQueue(prev => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        // Upload file
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'Uploading...', state: 'processing' } : q
        ));
        const objRes = await uploadFile(item.file);

        // Add to collection
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'Adding to collection...' } : q
        ));
        await apiCall('/collections/' + collectionId + '/members', {
          method: 'POST',
          body: JSON.stringify({ action: 'add', members: [objRes.id] }),
        });

        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'Complete', state: 'complete' } : q
        ));
      } catch (e) {
        setUploadQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: e.message, state: 'error' } : q
        ));
      }
    }

    // Refresh after all uploads
    if (onComplete) onComplete();
  }, []);

  const clearUploadQueue = useCallback(() => {
    setUploadQueue([]);
    setShowUploadQueue(false);
  }, []);

  return {
    currentView, currentCollectionId, currentCollectionName,
    documents, isLoadingDocs, docError,
    openCollection, backToCollections,
    deleteDocument, deleteCollection, deleteGroup, addCollectionToGroup,
    uploadQueue, showUploadQueue, handleUpload, clearUploadQueue,
  };
}
