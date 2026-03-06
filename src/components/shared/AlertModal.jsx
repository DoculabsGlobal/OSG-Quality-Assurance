import { useState, useEffect, useRef } from 'react';
import { useDialog } from '../../context/DialogContext';

/**
 * AlertModal renders the universal dialog overlay.
 * Mounted once in App.jsx — controlled by DialogContext.
 * Replaces: #dialogModal, #dialogBox, #dialogTitle, #dialogMessage, #dialogInput, #dialogActions
 */
export default function AlertModal() {
  const { dialog, resolveDialog } = useDialog();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Reset input when dialog opens
  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setInputValue(dialog.options?.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [dialog]);

  // Keyboard handler
  useEffect(() => {
    if (!dialog) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        resolveDialog(dialog.type === 'alert' ? undefined : dialog.type === 'confirm' ? false : null);
      }
      if (e.key === 'Enter') {
        if (dialog.type === 'alert') resolveDialog(undefined);
        else if (dialog.type === 'confirm') resolveDialog(true);
        else if (dialog.type === 'prompt') resolveDialog(inputValue.trim() || null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialog, resolveDialog, inputValue]);

  if (!dialog) return null;

  const { title, message, type, options } = dialog;
  const isDanger = options?.danger;

  return (
    <div className="modal-overlay" onClick={() => resolveDialog(type === 'alert' ? undefined : type === 'confirm' ? false : null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h2>{title}</h2>
        <p style={{ margin: '12px 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)' }}>{message}</p>

        {type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={options?.placeholder || ''}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontFamily: 'inherit',
              fontSize: 14,
              background: 'var(--bg)',
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
        )}

        <div className="modal-actions">
          {type === 'alert' && (
            <button className="btn btn-primary" onClick={() => resolveDialog(undefined)}>
              OK
            </button>
          )}

          {type === 'confirm' && (
            <>
              <button className="btn btn-secondary" onClick={() => resolveDialog(false)}>
                Cancel
              </button>
              <button
                className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => resolveDialog(true)}
              >
                {options?.confirmLabel || 'OK'}
              </button>
            </>
          )}

          {type === 'prompt' && (
            <>
              <button className="btn btn-secondary" onClick={() => resolveDialog(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => resolveDialog(inputValue.trim() || null)}>
                OK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
