import { useState, useCallback } from 'react';
import Header from './Header';
import TabBar from './TabBar';
import LibraryPanel from '../../features/library/LibraryPanel';
import SamplingTab from '../../features/sampling/SamplingTab';
import TestPlanTab from '../../features/test-plan/TestPlanTab';
import ValidateAuditTab from '../../features/validate-audit/ValidateAuditTab';
import SetupModal from '../modals/SetupModal';

/**
 * Main layout shell — header, library sidebar, tab workspace.
 */
export default function WorkspaceShell() {
  const [activeTab, setActiveTab] = useState('sampling');
  const [validationUnlocked, setValidationUnlocked] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);

  const handleReset = useCallback(() => {
    setResetCounter(c => c + 1);
    setValidationUnlocked(false);
    setActiveTab('sampling');
  }, []);

  const handleApprove = useCallback(() => {
    setValidationUnlocked(true);
    setActiveTab('validation');
  }, []);

  return (
    <>
      <Header onReset={handleReset} />

      <div className="app-layout">
        {/* LEFT: LIBRARY SIDEBAR */}
        <LibraryPanel onOpenSetup={() => setSetupOpen(true)} />

        {/* RIGHT: WORKSPACE */}
        <div className="workspace-panel">
          <div className="workspace-bar">
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              validationUnlocked={validationUnlocked}
            />
          </div>

          <div className="workspace-cards">
            {activeTab === 'sampling' && <SamplingTab />}
            {activeTab === 'checklist' && <TestPlanTab onApprove={handleApprove} />}
            {activeTab === 'validation' && <ValidateAuditTab />}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <SetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}
