import { useState, useCallback, useEffect } from 'react';
import ClientDropdown from '../../components/shared/ClientDropdown';
import SourceToggle from '../../components/shared/SourceToggle';
import AuditDashboard from './AuditDashboard';
import NewValidationForm from './NewValidationForm';
import BatchProcessingView from './BatchProcessingView';
import AuditLiveView from './AuditLiveView';
import { useAuditDashboard } from './useAuditDashboard';
import { useBatchProcessing } from './useBatchProcessing';
import { useCollections } from '../../context/CollectionContext';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { useClientData } from '../../hooks/useClientData';

const ClipboardIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);
const PlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

/**
 * Validate & Audit tab — complete workflow.
 * States: audit (dashboard) | processing (chunking) | audit-live (tracking) | error
 */
export default function ValidateAuditTab() {
  const [viewState, setViewState] = useState('audit'); // audit | processing | audit-live
  const [clientName, setClientName] = useState('');
  const [sourceMode, setSourceMode] = useState('previous');
  const { allCollections, selectedClient, approvedChecklistId } = useCollections();
  const { jwt } = useAuth();
  const { alert } = useDialog();
  const clientData = useClientData();

  // Audit dashboard hook
  const dashboard = useAuditDashboard();

  // Batch processing hook with completion callback
  const batch = useBatchProcessing({
    jwt,
    onComplete: async () => {
      setViewState('audit');
      setSourceMode('previous');
      await dashboard.loadDashboard(clientName, allCollections);
    },
    onError: (msg) => {
      alert(msg, 'Batch Error');
      setViewState('audit');
    },
  });

  // Auto-select client from test plan approval
  useEffect(() => {
    if (selectedClient && !clientName) {
      setClientName(selectedClient);
      dashboard.loadDashboard(selectedClient, allCollections);
    }
  }, [selectedClient]);

  const handleClientChange = useCallback((name) => {
    setClientName(name);
    setSourceMode('previous');
    if (name) {
      dashboard.loadDashboard(name, allCollections);
      clientData.loadData(name, allCollections); // load client data for lookup links
    } else {
      dashboard.reset();
    }
  }, [allCollections, dashboard, clientData]);

  const handleSourceChange = useCallback((mode) => {
    setSourceMode(mode);
    if (mode === 'previous' && dashboard.qaColId) {
      dashboard.startPolling();
    } else {
      dashboard.stopPolling();
    }
  }, [dashboard]);

  const handleStartBatch = useCallback(() => {
    if (!approvedChecklistId) { alert('Approve a test plan first'); return; }
    // Load client data in background
    clientData.loadData(clientName, allCollections);
    setViewState('processing');
    const dashIdx = clientName.indexOf(' - ');
    const projectName = dashIdx > -1 ? clientName.substring(dashIdx + 3).trim() : '';
    batch.startBatch(clientName, projectName, approvedChecklistId);
  }, [clientName, approvedChecklistId, allCollections, batch, clientData, alert]);

  const handleCancelChunking = useCallback(() => {
    batch.cancelChunking();
    setViewState('audit');
  }, [batch]);

  const handleRetry = useCallback(() => {
    batch.retry(clientName, approvedChecklistId);
  }, [batch, clientName, approvedChecklistId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dashboard.stopPolling();
      batch.stopAll();
    };
  }, []);

  return (
    <div className="workspace-card card-back">
      <div className="workspace-body">

        {/* AUDIT DASHBOARD STATE */}
        {viewState === 'audit' && (
          <>
            <ClientDropdown value={clientName} onChange={handleClientChange} />

            {!clientName && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10 }}>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" />
                </svg>
                <p style={{ fontSize: 14 }}>Select a client to view validation results</p>
              </div>
            )}

            {clientName && (
              <>
                <SourceToggle
                  name="validationSource"
                  options={[
                    { value: 'previous', label: 'Previous Validations', icon: ClipboardIcon },
                    { value: 'new', label: 'New Validation', icon: PlayIcon },
                  ]}
                  value={sourceMode}
                  onChange={handleSourceChange}
                />

                {sourceMode === 'previous' && (
                  <div style={{ marginTop: 12 }}>
                    <AuditDashboard
                      reports={dashboard.reports}
                      stats={dashboard.stats}
                      isLoading={dashboard.isLoading}
                      isPolling={dashboard.isPolling}
                      allCollections={allCollections}
                      clientName={clientName}
                      clientData={clientData}
                    />
                  </div>
                )}

                {sourceMode === 'new' && (
                  <div style={{ marginTop: 12 }}>
                    <NewValidationForm
                      clientName={clientName}
                      onSelectFile={batch.selectFile}
                      onClearFile={batch.clearFile}
                      onStart={handleStartBatch}
                      batchFile={batch.batchFile}
                      batchFileName={batch.batchFileName}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* PROCESSING STATE (chunking + agent launch) */}
        {viewState === 'processing' && (
          <BatchProcessingView
            chunkingPercent={batch.chunkingPercent}
            chunkingStatus={batch.chunkingStatus}
            chunkingContext={batch.chunkingContext}
            batches={batch.batches}
            batchStatuses={batch.batchStatuses}
            showBatchList={batch.state === 'launching' || batch.state === 'tracking'}
            onCancel={handleCancelChunking}
          />
        )}

        {/* AUDIT LIVE STATE (execution tracking) */}
        {(viewState === 'processing' && batch.state === 'tracking') || viewState === 'audit-live' ? (
          <AuditLiveView
            liveText={batch.liveText}
            subtext={batch.subtext}
            timerText={batch.timerText}
            progressPercent={batch.progressPercent}
            currentStep={batch.currentStep}
            showRetry={batch.showRetry}
            onRetry={handleRetry}
          />
        ) : null}

      </div>
    </div>
  );
}
