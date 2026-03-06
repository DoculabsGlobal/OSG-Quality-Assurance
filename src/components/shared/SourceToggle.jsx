/**
 * Reusable "Past / New" radio toggle.
 * Used identically by Sampling, Test Plan, and Validate tabs.
 *
 * @param {string} name - radio group name
 * @param {{ value: string, label: string, icon: JSX }[]} options - toggle options
 * @param {string} value - currently selected value
 * @param {function} onChange - callback with selected value
 */
export default function SourceToggle({ name, options, value, onChange }) {
  return (
    <div className="source-selector">
      {options.map(opt => (
        <label key={opt.value} className="source-option">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span className="source-label">
            {opt.icon}
            {' '}{opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}
