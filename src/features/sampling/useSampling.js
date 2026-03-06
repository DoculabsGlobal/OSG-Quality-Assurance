import { useState, useCallback } from 'react';
import { AGENTS, MODEL } from '../../constants/config';
import { apiCall } from '../../services/api';
import { runAgent } from '../../services/agents';
import { fetchDocumentContent } from '../../services/documents';
import { sleep } from '../../utils/sleep';

/**
 * Hook encapsulating sampling calculation state and API calls.
 * Manages: population input, agent execution, result polling, raw content.
 */
export function useSampling() {
  const [state, setState] = useState('input'); // input | processing | results | error
  const [processingText, setProcessingText] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [resultTitle, setResultTitle] = useState('');
  const [errorText, setErrorText] = useState('');

  /**
   * Run a new sampling calculation via the sampling agent.
   */
  const runCalculation = useCallback(async (clientName, population) => {
    if (!clientName || !population) return;

    setState('processing');
    setProcessingText('Submitting to sampling calculator...');

    try {
      await runAgent(AGENTS.SAMPLING, {
        sample_size: String(population),
        CLIENT_NAME: clientName,
      }, MODEL);

      // Poll for result document
      let resultDoc = null;
      let attempts = 0;

      while (!resultDoc) {
        await sleep(3000);
        attempts++;

        const msgs = [
          'Analyzing collection complexity...',
          'Evaluating field density and conditional logic...',
          'Calculating baseline sample size...',
          'Assessing risk profile...',
          'Generating IT instructions...',
        ];
        setProcessingText(msgs[Math.min(attempts - 1, msgs.length - 1)] + ' (' + (attempts * 3) + 's)');

        try {
          const docs = await apiCall('/objects?limit=50&offset=0');
          const docList = Array.isArray(docs) ? docs : docs?.objects || [];
          const tenMinAgo = Date.now() - 10 * 60 * 1000;

          resultDoc = docList.find(d => {
            const created = new Date(d.created_at).getTime();
            const name = (d.name || '').toLowerCase();
            return created > tenMinAgo && (
              name.includes('statistical significance') ||
              name.includes('sampling') ||
              name.includes('sample')
            );
          });
        } catch (e) {
          console.log('Poll error:', e);
        }

        if (attempts > 60) throw new Error('Timed out waiting for sampling report');
      }

      setProcessingText('Loading report...');
      const content = await fetchDocumentContent(resultDoc.content?.source);
      setResultTitle('Sampling report: ' + population.toLocaleString() + ' records  —  ' + clientName);
      setRawContent(content);
      setState('results');
    } catch (e) {
      setErrorText(e.message);
      setState('error');
    }
  }, []);

  /**
   * Load a past sampling report by its content source.
   */
  const loadPastReport = useCallback(async (docName, source) => {
    setState('processing');
    setProcessingText('Loading report...');

    try {
      const content = await fetchDocumentContent(source);
      setResultTitle('Loaded: ' + docName);
      setRawContent(content);
      setState('results');
    } catch (e) {
      setErrorText(e.message);
      setState('error');
    }
  }, []);

  /**
   * Reset to input state.
   */
  const reset = useCallback(() => {
    setRawContent('');
    setResultTitle('');
    setErrorText('');
    setState('input');
  }, []);

  return {
    state, processingText, rawContent, resultTitle, errorText,
    runCalculation, loadPastReport, reset,
  };
}
