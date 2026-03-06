/**
 * Pass/Fail/Processing status badge pill.
 * @param {'pass'|'fail'|'processing'} status
 * @param {string} [text] - override text
 */
export default function StatusBadge({ status, text }) {
  const config = {
    pass: { bg: 'var(--pass-soft)', color: 'var(--pass)', label: 'Pass' },
    fail: { bg: 'var(--fail-soft)', color: 'var(--fail)', label: 'Fail' },
    processing: { bg: 'var(--accent-soft)', color: 'var(--accent)', label: 'Processing' },
  };
  const c = config[status] || config.processing;

  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {text || c.label}
    </span>
  );
}
