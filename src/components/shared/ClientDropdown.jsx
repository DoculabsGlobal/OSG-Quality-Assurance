import { useMemo } from 'react';
import { useCollections } from '../../context/CollectionContext';
import { getCollectionGroups } from '../../hooks/useCollectionGroups';

/**
 * Reusable client context dropdown.
 * Populates from allCollections grouped by prefix.
 * Used identically by Sampling, Test Plan, and Validate tabs.
 */
export default function ClientDropdown({ value, onChange, label = 'Client Context' }) {
  const { allCollections } = useCollections();

  const clientNames = useMemo(() => {
    const groups = getCollectionGroups(allCollections);
    return Object.keys(groups)
      .filter(k => k !== '_UNGROUPED')
      .sort()
      .map(k => groups[k].displayName);
  }, [allCollections]);

  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label className="input-label">{label}</label>}
      <select
        className="context-dropdown"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px',
          border: '1.5px solid var(--border)', borderRadius: 8,
          fontSize: 15, fontFamily: 'inherit',
          background: 'var(--surface)', color: 'var(--text)',
        }}
      >
        <option value="">-- Select client --</option>
        {clientNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  );
}
