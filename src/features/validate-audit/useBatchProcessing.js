import { useState, useCallback, useRef } from 'react';
import { AGENTS, CHUNKER_URL, AUDIT_TOTAL_STEPS } from '../../constants/config';
import { apiCall } from '../../services/api';
import { runAgent } from '../../services/agents';
import { sleep } from '../../utils/sleep';
import { getCollectionGroups } from '../../hooks/useCollectionGroups';

const CYCLING_TEXTS = [
  'Reading after sample documents...', 'Cross-referencing client data spreadsheet...',
  'Checking consumer names and loan numbers...', 'Verifying state-specific lockbox addresses...',
  'Scanning barcode specifications...', 'Comparing against fee schedule for this state...',
  'Reviewing letter template compliance...', 'Checking state disclosure requirements...',
  'Evaluating each test plan assertion...', 'Confirming visual layout elements...',
  'Validating bankruptcy code categorization...', 'Assessing document structure and page count...',
  'Agents are collaborating on findings...', 'Reviewing edge cases and gaps...',
  'Finalizing individual validation reports...', 'Writing results to audit collection...',
];

/**
 * Hook managing the full batch processing lifecycle:
 * file upload → chunking → agent launch → execution tracking → completion.
 */
export function useBatchProcessing({ jwt, allCollections, onComplete, onError }) {
  const [state, setState] = useState('idle'); // idle | chunking | launching | tracking | error
  const [batchFile, setBatchFile] = useState(null);
  const [batchFileName, setBatchFileName] = useState('');
  const [chunkingPercent, setChunkingPercent] = useState(0);
  const [chunkingStatus, setChunkingStatus] = useState('');
  const [chunkingContext, setChunkingContext] = useState('');
  const [batches, setBatches] = useState([]); // from manifest
  const [batchStatuses, setBatchStatuses] = useState([]); // [{ status, text }]
  const [liveText, setLiveText] = useState('');
  const [subtext, setSubtext] = useState('');
  const [timerText, setTimerText] = useState('0:00');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  const batchJobId = useRef(null);
  const batchManifest = useRef(null);
  const batchExecutions = useRef([]);
  const executionPollRef = useRef(null);
  const chunkPollRef = useRef(null);
  const timerRef = useRef(null);
  const startTime = useRef(null);
  const cycleIdx = useRef(0);

  // File handling
  const selectFile = useCallback((file) => {
    setBatchFile(file);
    setBatchFileName(file.name);
  }, []);

  const clearFile = useCallback(() => {
    setBatchFile(null);
    setBatchFileName('');
  }, []);

  // Timer
  const startTimer = useCallback(() => {
    startTime.current = Date.now();
    setCurrentStep(0);
    cycleIdx.current = 0;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      setTimerText(mins + ':' + String(secs).padStart(2, '0'));
      setProgressPercent(Math.min(90, (elapsed / (12 * 60 * 1000)) * 100));

      if (Math.floor(elapsed / 6000) > cycleIdx.current) {
        cycleIdx.current = Math.floor(elapsed / 6000);
        setLiveText(CYCLING_TEXTS[cycleIdx.current % CYCLING_TEXTS.length]);
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopAll = useCallback(() => {
    stopTimer();
    if (executionPollRef.current) { clearInterval(executionPollRef.current); executionPollRef.current = null; }
    if (chunkPollRef.current) { clearInterval(chunkPollRef.current); chunkPollRef.current = null; }
  }, [stopTimer]);

  // Update step progression
  const updateStep = useCallback((step) => {
    setCurrentStep(step);
  }, []);

  // Update batch status
  const updateBatchSt = useCallback((index, status, text) => {
    setBatchStatuses(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { status, text };
      return next;
    });
  }, []);

  /**
   * Start the full batch processing pipeline.
   */
  const startBatch = useCallback(async (clientName, projectName, checklistDocId) => {
    if (!batchFile) return;
    setState('chunking');
    setChunkingPercent(0);
    setChunkingStatus('Uploading file...');
    setChunkingContext(clientName);
    setShowRetry(false);

    try {
      const formData = new FormData();
      formData.append('file', batchFile);
      formData.append('vertesia_jwt', jwt);
      formData.append('batch_size', 7);
      const clientBase = clientName.indexOf(' - ') > -1 ? clientName.substring(0, clientName.indexOf(' - ')).trim() : clientName;
      if (clientBase) formData.append('client_name', clientBase);
      if (projectName) formData.append('project', projectName);

      const response = await fetch(CHUNKER_URL + '/split-and-upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      batchJobId.current = data.jobId;
      setChunkingStatus('Detecting customer boundaries...');

      // Start chunking poll
      chunkPollRef.current = setInterval(async () => {
        try {
          const resp = await fetch(CHUNKER_URL + '/status/' + batchJobId.current);
          const d = await resp.json();
          if (d.error && d.status === 'error') throw new Error(d.error);

          setChunkingPercent(d.progress || 0);
          const phase = d.phase || 'processing';
          const phaseTexts = {
            text_scan: 'Scanning for customer boundaries (text mode)...',
            text_extract: 'Extracting customer info... ' + (d.customersFound || 0) + ' found',
            ocr_fallback: 'No text layer — falling back to OCR...',
            rendering: 'Rendering pages for OCR... ' + (d.pagesComplete || 0) + '/' + (d.totalPages || '?'),
            ocr: 'OCR processing... ' + (d.pagesComplete || 0) + '/' + (d.totalPages || '?') + ' — ' + (d.customersFound || 0) + ' customers',
            batching: 'Building ' + (d.customersFound || 0) + ' customer batches...',
            uploading: 'Uploading batches to Vertesia...',
          };
          setChunkingStatus(phaseTexts[phase] || 'Processing...');
          setChunkingContext(clientName + '  ·  ' + (d.customersFound || 0) + ' customers detected');

          if (d.status === 'done') {
            clearInterval(chunkPollRef.current);
            chunkPollRef.current = null;
            batchManifest.current = d.manifest;
            if (d.manifest.documentIds?.length > 0) {
              // Add batch documents to After Samples collection for browse/compare
              try {
                const clientKey = clientName.toLowerCase().split(' - ')[0].split(':')[0].trim();
                const groups = getCollectionGroups(allCollections || []);
                const normalizedKey = clientName.toUpperCase();
                const group = groups[normalizedKey];
                if (group) {
                  const afterSamplesCol = group.collections.find(c =>
                    (c.typeName || c.name || '').toLowerCase().includes('after sample')
                  );
                  if (afterSamplesCol) {
                    const docIds = d.manifest.documentIds.map(b => b.documentId);
                    await apiCall('/collections/' + afterSamplesCol.id + '/members', {
                      method: 'POST',
                      body: JSON.stringify({ action: 'add', members: docIds }),
                    });
                    console.log('Added ' + docIds.length + ' batch docs to After Samples collection');
                  }
                }
              } catch (colErr) {
                console.log('Could not add to After Samples collection (non-fatal):', colErr.message);
              }
              launchAgents(clientName, checklistDocId);
            } else {
              throw new Error('No document IDs returned from chunker');
            }
          } else if (d.status === 'error') {
            clearInterval(chunkPollRef.current);
            throw new Error(d.error || 'Chunking failed');
          }
        } catch (e) {
          clearInterval(chunkPollRef.current);
          chunkPollRef.current = null;
          setState('error');
          if (onError) onError(e.message);
        }
      }, 1500);

    } catch (e) {
      setState('error');
      if (onError) onError(e.message);
    }
  }, [batchFile, jwt, allCollections, onError]);

  /**
   * Launch validation agents for each batch.
   */
  const launchAgents = useCallback(async (clientName, checklistDocId) => {
    const docs = batchManifest.current.documentIds;
    batchExecutions.current = [];
    setState('launching');
    setShowRetry(false);

    const initialStatuses = docs.map((b, i) => ({ status: 'pending', text: 'pending' }));
    setBatches(docs);
    setBatchStatuses(initialStatuses);

    // Fire batch 0 first
    updateBatchSt(0, 'running', 'Starting agent...');
    try {
      const res = await runAgent(AGENTS.CHECKLIST_VALIDATION, {
        after_sample: docs[0].documentId,
        checklist_id: checklistDocId,
        CLIENT_NAME: clientName,
      });
      const runId = res.id || res.runId || res.run_id || res.executionId || res.execution_id || null;
      batchExecutions.current.push({ runId, batchIndex: 0, batchDocId: docs[0].documentId, status: runId ? 'running' : 'unknown', retried: false, pollFailures: 0 });
      updateBatchSt(0, 'running', runId ? 'Launched (' + runId.substring(0, 8) + ')' : 'Launched (no run ID)');
    } catch (e) {
      batchExecutions.current.push({ runId: null, batchIndex: 0, batchDocId: docs[0].documentId, status: 'failed', retried: false });
      updateBatchSt(0, 'error', e.message);
    }

    // Wait for collection init, then fire remaining
    if (docs.length > 1) {
      for (let s = 10; s > 0; s--) {
        updateBatchSt(0, 'running', 'Collection init... ' + s + 's');
        await sleep(1000);
      }
      for (let i = 1; i < docs.length; i++) {
        updateBatchSt(i, 'running', 'Starting agent...');
        try {
          const res = await runAgent(AGENTS.CHECKLIST_VALIDATION, {
            after_sample: docs[i].documentId,
            checklist_id: checklistDocId,
            CLIENT_NAME: clientName,
          });
          const runId = res.id || res.runId || res.run_id || res.executionId || res.execution_id || null;
          batchExecutions.current.push({ runId, batchIndex: i, batchDocId: docs[i].documentId, status: runId ? 'running' : 'unknown', retried: false, pollFailures: 0 });
          updateBatchSt(i, 'running', runId ? 'Launched (' + runId.substring(0, 8) + ')' : 'Launched (no run ID)');
        } catch (e) {
          batchExecutions.current.push({ runId: null, batchIndex: i, batchDocId: docs[i].documentId, status: 'failed', retried: false });
          updateBatchSt(i, 'error', e.message);
        }
      }
    }

    // Switch to live tracking
    setState('tracking');
    startTimer();
    setLiveText('Initializing validation agents...');
    setSubtext('Tracking ' + batchExecutions.current.length + ' agent executions...');

    // Start execution polling
    const pollFn = () => pollExecutions(clientName, checklistDocId);
    pollFn();
    executionPollRef.current = setInterval(pollFn, 15000);
  }, [startTimer, updateBatchSt]);

  /**
   * Poll execution statuses.
   */
  const pollExecutions = useCallback(async (clientName, checklistDocId) => {
    try {
      let completedCount = 0, failedCount = 0, totalResolved = 0;
      const total = batchExecutions.current.length;

      for (const exec of batchExecutions.current) {
        if (exec.status === 'completed' || exec.status === 'failed_final') {
          totalResolved++;
          if (exec.status === 'completed') completedCount++;
          if (exec.status === 'failed_final') failedCount++;
          continue;
        }
        if (!exec.runId) { exec.status = 'failed_final'; totalResolved++; failedCount++; updateBatchSt(exec.batchIndex, 'error', 'No execution ID'); continue; }

        try {
          const run = await apiCall('/runs/' + exec.runId);
          const runStatus = (run.status || '').toLowerCase();
          exec.pollFailures = 0;

          if (runStatus === 'completed') {
            exec.status = 'completed'; totalResolved++; completedCount++;
            updateBatchSt(exec.batchIndex, 'done', 'Complete');
          } else if (runStatus === 'failed' || runStatus === 'error') {
            if (!exec.retried) {
              exec.retried = true; exec.status = 'retrying';
              updateBatchSt(exec.batchIndex, 'running', 'Retrying...');
              try {
                const retryRes = await runAgent(AGENTS.CHECKLIST_VALIDATION, {
                  after_sample: exec.batchDocId, checklist_id: checklistDocId, CLIENT_NAME: clientName,
                });
                exec.runId = retryRes.id || retryRes.runId || retryRes.run_id || null;
                exec.status = exec.runId ? 'running' : 'failed_final';
                exec.pollFailures = 0;
                if (!exec.runId) { totalResolved++; failedCount++; updateBatchSt(exec.batchIndex, 'error', 'Retry failed (no ID)'); }
                else updateBatchSt(exec.batchIndex, 'running', 'Retry launched');
              } catch (retryErr) {
                exec.status = 'failed_final'; totalResolved++; failedCount++;
                updateBatchSt(exec.batchIndex, 'error', 'Retry failed');
              }
            } else {
              exec.status = 'failed_final'; totalResolved++; failedCount++;
              updateBatchSt(exec.batchIndex, 'error', 'Failed after retry');
            }
          } else {
            updateBatchSt(exec.batchIndex, 'running', runStatus || 'Running');
          }
        } catch (pollErr) {
          exec.pollFailures = (exec.pollFailures || 0) + 1;
          if (exec.pollFailures >= 5) { exec.status = 'untracked'; updateBatchSt(exec.batchIndex, 'running', 'Untracked — waiting...'); }
        }
      }

      // Update UI
      const untrackedCount = batchExecutions.current.filter(e => e.status === 'untracked').length;
      const doneText = completedCount + ' of ' + total + ' batches complete';
      setSubtext(doneText + (failedCount > 0 ? ' (' + failedCount + ' failed)' : '') + (untrackedCount > 0 ? ' (' + untrackedCount + ' untracked)' : ''));

      // All untracked fallback
      if (untrackedCount > 0 && untrackedCount + completedCount + failedCount >= total) {
        clearInterval(executionPollRef.current); executionPollRef.current = null;
        setLiveText('Agents working — waiting for results...');
        setSubtext('Run tracking unavailable — polling for results in ~10 minutes');
        for (let m = 10; m > 0; m--) {
          setSubtext('Agents working — checking for results in ~' + m + ' min');
          setProgressPercent(Math.round(((10 - m) / 10) * 85));
          updateStep(Math.min(Math.floor(((10 - m) / 10) * 6), 5));
          await sleep(60000);
        }
        setProgressPercent(100); stopTimer();
        if (onComplete) onComplete();
        return;
      }

      // Step progression
      const ratio = totalResolved / total;
      if (ratio >= 1) updateStep(6);
      else if (ratio >= 0.7) updateStep(5);
      else if (ratio >= 0.5) updateStep(4);
      else if (ratio >= 0.3) updateStep(3);
      else if (ratio > 0) updateStep(2);
      else updateStep(1);

      // All resolved
      if (totalResolved >= total) {
        clearInterval(executionPollRef.current); executionPollRef.current = null;

        if (completedCount === 0) {
          stopTimer();
          setLiveText('All validation agents failed');
          setSubtext('No reports to consolidate');
          setShowRetry(true);
          return;
        }

        setLiveText('All agents finished — loading results...');
        setProgressPercent(100);
        await sleep(5000);
        stopTimer();
        if (onComplete) onComplete();
      }
    } catch (e) {
      console.log('Execution tracking error:', e);
    }
  }, [stopTimer, updateBatchSt, updateStep, onComplete]);

  const cancelChunking = useCallback(() => {
    if (chunkPollRef.current) { clearInterval(chunkPollRef.current); chunkPollRef.current = null; }
    batchJobId.current = null;
    batchManifest.current = null;
    setState('idle');
  }, []);

  const retry = useCallback((clientName, checklistDocId) => {
    setShowRetry(false);
    setProgressPercent(0);
    setCurrentStep(0);
    launchAgents(clientName, checklistDocId);
  }, [launchAgents]);

  const reset = useCallback(() => {
    stopAll();
    setBatchFile(null);
    setBatchFileName('');
    setBatches([]);
    setBatchStatuses([]);
    batchJobId.current = null;
    batchManifest.current = null;
    batchExecutions.current = [];
    setState('idle');
    setShowRetry(false);
  }, [stopAll]);

  return {
    state, batchFile, batchFileName,
    chunkingPercent, chunkingStatus, chunkingContext,
    batches, batchStatuses,
    liveText, subtext, timerText, progressPercent, currentStep, showRetry,
    selectFile, clearFile, startBatch, cancelChunking, retry, reset, stopAll,
    expectedCustomers: batchManifest.current?.totalCustomers || 0,
  };
}
