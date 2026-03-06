import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchCollections, fetchMemberCounts } from '../services/collections';
import { useAuth } from './AuthContext';

const CollectionContext = createContext(null);

export function CollectionProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [allCollections, setAllCollections] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [validationUnlocked, setValidationUnlocked] = useState(false);
  const [approvedChecklistId, setApprovedChecklistId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const cols = await fetchCollections();
      setAllCollections(cols);
      // Fetch member counts in background (mutates col objects)
      fetchMemberCounts(cols).then(() => {
        setAllCollections([...cols]); // trigger re-render with counts
      });
    } catch (e) {
      console.error('Library load error:', e);
    }
    setIsLoading(false);
  }, []);

  // Auto-load when authenticated
  useEffect(() => {
    if (isAuthenticated) loadCollections();
  }, [isAuthenticated, loadCollections]);

  const unlockValidation = useCallback(() => setValidationUnlocked(true), []);
  const lockValidation = useCallback(() => {
    setValidationUnlocked(false);
    setApprovedChecklistId(null);
  }, []);

  const selectClient = useCallback((clientName) => {
    setSelectedClient(clientName);
    const dashIdx = clientName.indexOf(' - ');
    setSelectedProject(dashIdx > -1 ? clientName.substring(dashIdx + 3).trim() : '');
  }, []);

  return (
    <CollectionContext.Provider value={{
      allCollections, isLoading,
      selectedClient, selectedProject, selectClient,
      validationUnlocked, unlockValidation, lockValidation,
      approvedChecklistId, setApprovedChecklistId,
      loadCollections,
    }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollections() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollections must be used within CollectionProvider');
  return ctx;
}
