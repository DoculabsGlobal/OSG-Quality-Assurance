import { createContext, useContext, useState, useCallback } from 'react';

const DocViewerContext = createContext(null);

/**
 * Provides global doc viewer state so any component can open a document.
 * The actual rendering is in DocViewerModal.jsx — this context just holds state.
 */
export function DocViewerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null); // { id, name, source, ext }
  const [postProcessors, setPostProcessors] = useState([]); // functions to run on rendered content

  const openDoc = useCallback((docId, docName, source, options = {}) => {
    setCurrentDoc({ id: docId, name: docName, source: source || null });
    setPostProcessors(options.postProcessors || []);
    setIsOpen(true);
  }, []);

  const closeDoc = useCallback(() => {
    setIsOpen(false);
    setCurrentDoc(null);
    setPostProcessors([]);
  }, []);

  return (
    <DocViewerContext.Provider value={{
      isOpen, currentDoc, postProcessors,
      openDoc, closeDoc,
    }}>
      {children}
    </DocViewerContext.Provider>
  );
}

export function useDocViewer() {
  const ctx = useContext(DocViewerContext);
  if (!ctx) throw new Error('useDocViewer must be used within DocViewerProvider');
  return ctx;
}
