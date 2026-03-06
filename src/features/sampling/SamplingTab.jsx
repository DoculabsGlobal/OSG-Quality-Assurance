import { useState, useCallback } from 'react';
import ClientDropdown from '../../components/shared/ClientDropdown';
import SourceToggle from '../../components/shared/SourceToggle';
import SamplingForm from './SamplingForm';
import SamplingResults from './SamplingResults';
import PastSamplingLoader from './PastSamplingLoader';
import { useSampling } from './useSampling';

const FolderIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const ChartIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
  </svg>
);

/**
 * Statistical Sampling tab — complete workflow.
 * States: input → processing → results | error
 */
export default function SamplingTab() {
  const [clientName, setClientName] = useState('');
  const [sourceMode, setSourceMode] = useState('new');
  const { state, processingText, rawContent, resultTitle, errorText, runCalculation, loadPastReport, reset } = useSampling();

  const handleClientChange = useCallback((name) => {
    setClientName(name);
    setSourceMode('new');
  }, []);

  const handleRun = useCallback((population) => {
    runCalculation(clientName, population);
  }, [clientName, runCalculation]);

  const handleLoadPast = useCallback((docName, source) => {
    loadPastReport(docName, source);
  }, [loadPastReport]);

  const handleSourceChange = useCallback((mode) => {
    setSourceMode(mode);
  }, []);

  return (
    <div className="workspace-card card-front">
      <div className="workspace-body">
        {/* INPUT STATE */}
        {state === 'input' && (
          <>
            <ClientDropdown value={clientName} onChange={handleClientChange} />

            {clientName && (
              <>
                <SourceToggle
                  name="samplingSource"
                  options={[
                    { value: 'past', label: 'Past Calculation', icon: FolderIcon },
                    { value: 'new', label: 'New Calculation', icon: ChartIcon },
                  ]}
                  value={sourceMode}
                  onChange={handleSourceChange}
                />

                {sourceMode === 'past' && (
                  <PastSamplingLoader clientName={clientName} onLoad={handleLoadPast} />
                )}

                {sourceMode === 'new' && (
                  <SamplingForm clientName={clientName} onRun={handleRun} />
                )}
              </>
            )}
          </>
        )}

        {/* PROCESSING STATE */}
        {state === 'processing' && (
          <>
            <div className="approved-badge" style={{ marginBottom: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {clientName}
            </div>
            <div className="processing-indicator">
              <div className="breath-dot" />
              <span>{processingText}</span>
            </div>
            <div className="empty-state" style={{ padding: 40 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
              <p>Calculating sample requirements</p>
              <small>Evaluating field complexity, risk profile, and population size</small>
            </div>
          </>
        )}

        {/* RESULTS STATE */}
        {state === 'results' && (
          <SamplingResults rawContent={rawContent} title={resultTitle} onReset={reset} />
        )}

        {/* ERROR STATE */}
        {state === 'error' && (
          <>
            <div className="error-indicator">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{errorText || 'An error occurred'}</span>
            </div>
            <button className="btn btn-secondary" onClick={reset}>Try Again</button>
          </>
        )}
      </div>
    </div>
  );
}
