import { useState, useCallback } from 'react';
import { ACCT_PATTERNS } from '../constants/config';
import { apiCall } from '../services/api';
import { getCollectionGroups } from './useCollectionGroups';

/**
 * Hook for loading and querying client data spreadsheets.
 * Parses XLSX/CSV files from a client's "Client Data" collection
 * and provides lookup functions by account number or consumer name.
 *
 * @returns {{ loadData, lookupByKey, lookupByName, isLoaded, fileName }}
 */
export function useClientData() {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [keyCol, setKeyCol] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fileName, setFileName] = useState('');

  /**
   * Load client data from the appropriate collection.
   * @param {string} selectedClient - client name to look up
   * @param {object[]} allCollections - full collection list
   */
  const loadData = useCallback(async (selectedClient, allCollections) => {
    setRows([]);
    setHeaders([]);
    setKeyCol(null);
    setIsLoaded(false);
    setFileName('');

    if (!selectedClient) return;

    try {
      const groups = getCollectionGroups(allCollections);
      const normalizedKey = selectedClient.toUpperCase();
      const group = groups[normalizedKey];
      if (!group) return;

      const dataCol = group.collections.find(c => {
        const n = (c.typeName || c.name || '').toLowerCase();
        return n.includes('client data') || n.includes('client_data');
      });
      if (!dataCol) return;

      const members = await apiCall('/collections/' + dataCol.id + '/members?limit=100');
      const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);
      if (memberIds.length === 0) return;

      const dataDocs = [];
      await Promise.all(
        memberIds.map(async (id) => {
          try {
            const doc = await apiCall('/objects/' + id);
            if (doc && doc.name) dataDocs.push(doc);
          } catch (e) { /* skip */ }
        })
      );

      const spreadsheet = dataDocs.find(d => {
        const ext = (d.name || '').split('.').pop().toLowerCase();
        return ['xlsx', 'xls', 'csv'].includes(ext);
      });
      if (!spreadsheet) return;

      setFileName(spreadsheet.name || 'Client Data');

      const { url } = await apiCall('/objects/download-url', {
        method: 'POST',
        body: JSON.stringify({ file: spreadsheet.content?.source, format: 'original' }),
      });

      const ext = (spreadsheet.name || '').split('.').pop().toLowerCase();

      // Dynamic import of SheetJS
      const XLSX = await import('xlsx');

      let workbook;
      if (ext === 'csv') {
        const text = await (await fetch(url)).text();
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        const buf = await (await fetch(url)).arrayBuffer();
        workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!json.length) return;

      const parsedHeaders = Object.keys(json[0]);
      setHeaders(parsedHeaders);
      setRows(json);

      // Find the key column — account/loan number
      let foundKeyCol = null;
      for (const h of parsedHeaders) {
        const lower = h.toLowerCase().trim();
        if (ACCT_PATTERNS.some(p => lower.includes(p))) {
          foundKeyCol = h;
          break;
        }
      }

      // Fallback: first column with mostly numeric-looking values
      if (!foundKeyCol && parsedHeaders.length > 0) {
        for (const h of parsedHeaders) {
          const numCount = json.filter(r => /\d{3,}/.test(String(r[h]))).length;
          if (numCount > json.length * 0.5) {
            foundKeyCol = h;
            break;
          }
        }
      }

      setKeyCol(foundKeyCol);
      setIsLoaded(true);
      console.log('Client data loaded:', json.length, 'rows, key column:', foundKeyCol);
    } catch (e) {
      console.log('Client data load failed (non-fatal):', e.message);
    }
  }, []);

  /**
   * Look up a row by account/loan key.
   * @param {string} searchValue
   * @returns {object|null}
   */
  const lookupByKey = useCallback((searchValue) => {
    if (!isLoaded || !keyCol || !searchValue) return null;
    const needle = String(searchValue).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (needle.length < 2) return null;
    return rows.find(row => {
      const val = String(row[keyCol]).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return val === needle || val.includes(needle) || needle.includes(val);
    }) || null;
  }, [isLoaded, keyCol, rows]);

  /**
   * Look up a row by consumer/borrower name.
   * @param {string} searchName
   * @returns {object|null}
   */
  const lookupByName = useCallback((searchName) => {
    if (!isLoaded || !searchName) return null;
    const needle = searchName.trim().toLowerCase().replace(/[^a-z ]/g, '');
    if (needle.length < 3) return null;
    const parts = needle.split(/\s+/).filter(p => p.length > 1);

    const namePatterns = ['name', 'consumer', 'borrower', 'customer', 'recipient'];
    const nameCols = headers.filter(h => namePatterns.some(p => h.toLowerCase().includes(p)));
    const searchCols = nameCols.length > 0 ? nameCols : headers;

    return rows.find(row => {
      for (const col of searchCols) {
        const val = String(row[col]).toLowerCase();
        if (parts.every(p => val.includes(p))) return true;
      }
      return false;
    }) || null;
  }, [isLoaded, headers, rows]);

  return {
    loadData,
    lookupByKey,
    lookupByName,
    isLoaded,
    fileName,
    headers,
    rows,
  };
}
