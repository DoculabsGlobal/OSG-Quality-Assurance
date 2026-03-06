import { createContext, useContext, useState, useCallback, useRef } from 'react';

const DialogContext = createContext(null);

/**
 * Dialog types: 'alert', 'confirm', 'prompt'
 * Replaces the monolith's _showDialog / _resolveDialog / osgAlert / osgConfirm / osgPrompt
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const showDialog = useCallback((title, message, type, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, type, options });
    });
  }, []);

  const resolveDialog = useCallback((value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setDialog(null);
  }, []);

  // Public API matching the monolith signatures
  const alert = useCallback((message, title) => {
    return showDialog(title || 'Notice', message, 'alert');
  }, [showDialog]);

  const confirm = useCallback((message, options = {}) => {
    return showDialog(
      options.title || 'Confirm',
      message,
      'confirm',
      {
        danger: options.danger || false,
        confirmLabel: options.confirmLabel || 'OK',
      }
    );
  }, [showDialog]);

  const prompt = useCallback((message, options = {}) => {
    return showDialog(
      options.title || 'Input',
      message,
      'prompt',
      {
        placeholder: options.placeholder || '',
        defaultValue: options.defaultValue || '',
      }
    );
  }, [showDialog]);

  return (
    <DialogContext.Provider value={{ dialog, resolveDialog, alert, confirm, prompt }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
