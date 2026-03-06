import { useRef, useEffect } from 'react';

/**
 * Three-card summary bar: Total / Passed / Failed with scale animation on change.
 */
export default function AuditStatsBar({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
      <StatCard value={stats.total} label="Statements" color="var(--text)" bg="var(--surface)" border="var(--border)" />
      <StatCard value={stats.passed} label="Passed" color="var(--pass)" bg="var(--pass-soft)" border="var(--pass)" />
      <StatCard value={stats.failed} label="Failed" color="var(--fail)" bg="var(--fail-soft)" border="var(--fail)" />
    </div>
  );
}

function StatCard({ value, label, color, bg, border }) {
  const ref = useRef(null);
  const prevVal = useRef(value);

  useEffect(() => {
    if (prevVal.current !== value && ref.current) {
      ref.current.style.transform = 'scale(1.3)';
      ref.current.style.transition = 'transform 0.3s ease';
      setTimeout(() => { if (ref.current) ref.current.style.transform = 'scale(1)'; }, 300);
    }
    prevVal.current = value;
  }, [value]);

  return (
    <div style={{ background: bg, border: '1px solid ' + border, borderRadius: 8, padding: 10, textAlign: 'center' }}>
      <div ref={ref} style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
