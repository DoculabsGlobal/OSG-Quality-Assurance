/**
 * Three-tab navigation bar for the workspace area.
 * Replaces: .tab-bar-top + switchTab function (navigation only)
 *
 * Note: switchTab in the monolith also called stopAuditPolling and
 * buildAuditClientDropdown. In React, those are handled by
 * useEffect cleanup in the respective tabs.
 */
export default function TabBar({ activeTab, onTabChange, validationUnlocked }) {
  const tabs = [
    {
      key: 'sampling',
      label: 'Statistical Sampling',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
      ),
    },
    {
      key: 'checklist',
      label: 'Test Plan Creation',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      badge: validationUnlocked ? 'Approved' : null,
    },
    {
      key: 'validation',
      label: 'Validate & Audit',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
  ];

  return (
    <div className="tab-bar-top">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`tab-bar-btn ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => !tab.disabled && onTabChange(tab.key)}
          disabled={tab.disabled}
          style={tab.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
        >
          {tab.icon}
          {tab.label}
          {tab.badge && (
            <span className="tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
