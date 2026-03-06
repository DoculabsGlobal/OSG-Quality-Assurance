import { useState, useCallback, useRef } from 'react';
import { AGENTS } from '../../constants/config';
import { apiCall } from '../../services/api';
import { runAgent } from '../../services/agents';
import { fetchDocumentContent, uploadFile } from '../../services/documents';
import { sleep } from '../../utils/sleep';

export function parseChecklist(content) {
  const items = [];
  const lines = (typeof content === 'string' ? content : JSON.stringify(content)).split('\n');
  let currentCategory = 'GENERAL', idCounter = 1;
  const skipWords = ['checklist', 'document info', 'summary', 'end of', 'total items', 'critical items', 'non-critical items'];
  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^#{1,4}\s+(.+?)(?:\s*#{1,4})?$/);
    if (headerMatch) { const heading = headerMatch[1].replace(/\*\*/g, '').trim().toUpperCase(); if (skipWords.some(w => heading.toLowerCase().includes(w))) continue; currentCategory = heading; continue; }
    if (trimmed === '---' || trimmed === '') continue;
    if (trimmed.startsWith('|') && (trimmed.includes('---') || trimmed.toLowerCase().includes('| id') || trimmed.toLowerCase().includes('assertion'))) continue;
    if (trimmed.match(/^\*?\*?(source|generated|total items|critical items|non-critical items)\*?\*?:/i)) continue;
    if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.replace(/\*\*/g, '').trim()).filter(c => c);
      if (cells.length >= 2) {
        if (cells.length === 2 && !cells[1].includes('?')) continue;
        items.push({ id: cells[0] || idCounter++, assertion: cells[1] || '', expected: cells[2] || '', appliesTo: cells[3] || 'ALL', severity: cells[4] || '', category: currentCategory, checked: true });
      }
    }
  }
  return items.length ? items : [{ id: '-', assertion: 'No items found - check format', expected: '', appliesTo: '', category: 'ERROR', checked: false }];
}

export function generateChecklistMarkdown(checklist, customItems) {
  const approved = checklist.filter(i => i.checked);
  let md = '# QA Test Plan\n\n', currentCat = null;
  for (const item of approved) {
    if (item.category !== currentCat) { currentCat = item.category; md += '\n## ' + currentCat + '\n\n| ID | Assertion | Expected | Applies To | Severity |\n|----|-----------|----------|------------|----------|\n'; }
    md += '| ' + item.id + ' | ' + item.assertion + ' | ' + (item.expected || '') + ' | ' + (item.appliesTo || 'ALL') + ' | ' + (item.severity || '') + ' |\n';
  }
  const validCustom = customItems.filter(ci => ci.assertion.trim());
  if (validCustom.length > 0) {
    md += '\n## ADDITIONAL CHECKS\n\n| ID | Assertion | Expected | Applies To | Severity |\n|----|-----------|----------|------------|----------|\n';
    for (const ci of validCustom) { md += '| ' + ci.id + ' | ' + ci.assertion + ' | ' + (ci.expected || 'Verify') + ' | ' + (ci.appliesTo || 'ALL') + ' | ' + (ci.severity || 'NON-CRITICAL') + ' |\n'; }
  }
  md += '\n---\n**Total Items:** ' + (approved.length + validCustom.length) + '\n';
  return md;
}

export function useTestPlan() {
  const [state, setState] = useState('upload');
  const [processingText, setProcessingText] = useState('');
  const [processingClient, setProcessingClient] = useState('');
  const [extractedFrom, setExtractedFrom] = useState('');
  const [errorText, setErrorText] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [editsApplied, setEditsApplied] = useState(false);
  const [checklistDocId, setChecklistDocId] = useState(null);
  const [checklistName, setChecklistName] = useState('');
  const customIdRef = useRef(1000);

  const uploadRequirements = useCallback(async (file, clientName) => {
    setState('processing'); setProcessingText('Uploading...'); setProcessingClient(clientName || '');
    try {
      const obj = await uploadFile(file);
      setProcessingText('Starting extraction...');
      await runAgent(AGENTS.CHECKLIST_GENERATION, { task: obj.id, collection: clientName + ': Test Plans', Client_name: clientName });
      const jobCodeMatch = file.name.match(/\(([^)]+)\)/); const jobNumMatch = file.name.match(/#?(\d{4})/);
      const jobCode = jobCodeMatch ? jobCodeMatch[1] : null; const jobNum = jobNumMatch ? jobNumMatch[1] : null;
      let checklistDoc = null, attempts = 0;
      while (!checklistDoc) {
        await sleep(3000); attempts++;
        setProcessingText('Waiting for test plan... (' + (attempts * 3) + 's)');
        try {
          const docs = await apiCall('/objects?limit=200&offset=0');
          const docList = Array.isArray(docs) ? docs : docs?.objects || [];
          const tenMinAgo = Date.now() - 10 * 60 * 1000;
          checklistDoc = docList.find(d => { const created = new Date(d.created_at).getTime(); const n = (d.name || '').toLowerCase(); const isChecklist = (n.includes('checklist') || n.includes('test plan')) && !n.includes('validation'); if (n.includes('master') || n.includes('template')) return false; const matchesJob = !jobCode && !jobNum ? true : (jobCode && d.name?.includes(jobCode)) || (jobNum && d.name?.includes(jobNum)); return created > tenMinAgo && isChecklist && matchesJob; });
        } catch (e) { console.log('Poll error:', e); }
      }
      setChecklistDocId(checklistDoc.id); setChecklistName(checklistDoc.name);
      const content = await fetchDocumentContent(checklistDoc.content?.source);
      setChecklist(parseChecklist(content)); setCustomItems([]); setEditsApplied(false);
      setExtractedFrom('Extracted from ' + file.name); setState('review');
    } catch (e) { setErrorText(e.message); setState('error'); }
  }, []);

  const loadPastPlan = useCallback(async (docId, docName, source) => {
    setState('processing'); setProcessingText('Loading test plan...'); setProcessingClient('');
    try {
      setChecklistDocId(docId); setChecklistName(docName);
      const content = await fetchDocumentContent(source);
      setChecklist(parseChecklist(content)); setCustomItems([]); setEditsApplied(false);
      setExtractedFrom('Loaded: ' + docName); setState('review');
    } catch (e) { setErrorText(e.message); setState('error'); }
  }, []);

  const toggleItem = useCallback((id) => { setChecklist(prev => prev.map(i => i.id == id ? { ...i, checked: !i.checked } : i)); setEditsApplied(false); }, []);
  const addCustomItem = useCallback(() => { customIdRef.current++; setCustomItems(prev => [...prev, { id: 'C' + customIdRef.current, assertion: '', expected: '', appliesTo: 'ALL', category: 'ADDITIONAL CHECKS', severity: 'NON-CRITICAL', custom: true }]); setEditsApplied(false); }, []);
  const removeCustomItem = useCallback((id) => { setCustomItems(prev => prev.filter(ci => ci.id !== id)); setEditsApplied(false); }, []);
  const updateCustomField = useCallback((id, field, value) => { setCustomItems(prev => prev.map(ci => ci.id === id ? { ...ci, [field]: value } : ci)); setEditsApplied(false); }, []);

  const hasChanges = useCallback(() => {
    const removed = checklist.filter(i => !i.checked).length;
    const validCustom = customItems.filter(ci => ci.assertion.trim()).length;
    return removed > 0 || validCustom > 0;
  }, [checklist, customItems]);

  const applyEdits = useCallback(async () => {
    const md = generateChecklistMarkdown(checklist, customItems);
    const blob = new Blob([md], { type: 'text/markdown' });
    const fileName = (checklistName || 'checklist').replace(/\.md$/i, '') + '.md';
    const uploadUrlRes = await apiCall('/objects/upload-url', { method: 'POST', body: JSON.stringify({ name: fileName, mime_type: 'text/markdown' }) });
    await fetch(uploadUrlRes.url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'text/markdown' } });
    const approved = checklist.filter(i => i.checked);
    const validCustom = customItems.filter(ci => ci.assertion.trim());
    const total = approved.length + validCustom.length;
    const cp = JSON.stringify({ content: { source: uploadUrlRes.id, type: 'text/markdown', name: fileName } });
    let updateRes;
    try { updateRes = await apiCall('/objects/' + checklistDocId, { method: 'PUT', headers: { 'x-create-revision': 'true', 'x-revision-label': 'Edited - ' + total + ' items' }, body: cp }); }
    catch (revErr) { if (revErr.message?.includes('not the head revision')) { updateRes = await apiCall('/objects/' + checklistDocId, { method: 'PUT', headers: { 'x-create-revision': 'fork', 'x-revision-label': 'Edited - ' + total + ' items' }, body: cp }); } else throw revErr; }
    if (updateRes?.id && updateRes.id !== checklistDocId) setChecklistDocId(updateRes.id);
    const bakedCustom = validCustom.map(ci => ({ ...ci, expected: ci.expected || 'Verify', checked: true }));
    setChecklist([...approved.map(i => ({ ...i, checked: true })), ...bakedCustom]);
    setCustomItems([]); setEditsApplied(true);
  }, [checklist, customItems, checklistDocId, checklistName]);

  const approve = useCallback(() => { setState('approved'); return checklistDocId; }, [checklistDocId]);
  const editAgain = useCallback(() => { setEditsApplied(false); setState('review'); }, []);
  const reset = useCallback(() => { setChecklist([]); setCustomItems([]); setEditsApplied(false); setChecklistDocId(null); setChecklistName(''); setExtractedFrom(''); setErrorText(''); setState('upload'); }, []);

  return { state, processingText, processingClient, extractedFrom, errorText, checklist, customItems, editsApplied, checklistDocId, uploadRequirements, loadPastPlan, toggleItem, addCustomItem, removeCustomItem, updateCustomField, hasChanges, applyEdits, approve, editAgain, reset };
}
