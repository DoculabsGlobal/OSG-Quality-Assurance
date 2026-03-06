import { useState } from 'react';

/**
 * Population input + Run button for new sampling calculations.
 */
export default function SamplingForm({ clientName, onRun }) {
  const [population, setPopulation] = useState('');

  const canRun = clientName && population && parseInt(population) >= 1;

  function handleRun() {
    if (!canRun) return;
    onRun(parseInt(population));
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 14 }}>
        <label className="input-label">Total Population Size</label>
        <input
          type="number"
          placeholder="e.g. 50000"
          min="1"
          value={population}
          onChange={(e) => setPopulation(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: 15, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'var(--text)',
          }}
        />
        <small style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
          Number of records in the full production run
        </small>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '12px 20px', fontSize: 16, justifyContent: 'center' }}
        onClick={handleRun}
        disabled={!canRun}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
        Calculate Required Sampling
      </button>
    </div>
  );
}
