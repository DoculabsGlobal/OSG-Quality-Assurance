import { ACCT_PATTERNS } from '../constants/config';
import { escapeHtml, escapeAttr } from './escape';

/**
 * Colorize tables in rendered audit content based on section headers.
 * Finds ❌/fail and ✅/pass H2 headers and applies gentle background colors
 * to the following tables.
 * @param {HTMLElement} container
 */
export function styleAuditSections(container) {
  const elements = container.children;
  let currentSection = null;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tag = el.tagName;
    const text = el.textContent || '';

    if (tag === 'H2') {
      if (text.includes('\u274C') || text.toLowerCase().includes('fail')) currentSection = 'fail';
      else if (text.includes('\u2705') || text.toLowerCase().includes('pass')) currentSection = 'pass';
      else currentSection = null;
    }

    if (tag === 'TABLE' && currentSection) {
      if (currentSection === 'fail') {
        el.style.borderLeft = '3px solid var(--fail)';
        el.style.background = 'var(--fail-soft)';
        const thead = el.querySelector('thead tr, tr:first-child');
        if (thead) thead.style.background = 'var(--fail-soft)';
      } else if (currentSection === 'pass') {
        el.style.borderLeft = '3px solid var(--pass)';
        el.style.background = 'var(--pass-soft)';
        const thead = el.querySelector('thead tr, tr:first-child');
        if (thead) thead.style.background = 'var(--pass-soft)';
      }
    }
  }
}

/**
 * Create a linkifyAuditReport function bound to client data lookup functions.
 * Returns a post-processor that turns account/name cells into clickable lookup links.
 *
 * @param {{ lookupByKey, lookupByName, isLoaded, headers, keyCol, fileName }} clientData
 * @param {function} onShowLookup - callback(event, anchor, rowData) to display the popover
 * @returns {function} post-processor function(container)
 */
export function createLinkifyAuditReport(clientData, onShowLookup) {
  return function linkifyAuditReport(container) {
    if (!clientData.isLoaded) return;

    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
      const headerCells = table.querySelectorAll('tr:first-child th, thead th, tr:first-child td');
      const colMap = {};

      headerCells.forEach((cell, idx) => {
        const text = (cell.textContent || '').toLowerCase().trim();
        if (ACCT_PATTERNS.some(p => text.includes(p))) colMap[idx] = 'account';
        else if (['consumer', 'name', 'borrower', 'customer', 'recipient'].some(p => text.includes(p))) colMap[idx] = 'name';
      });

      if (Object.keys(colMap).length === 0) return;

      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIdx) => {
        if (rowIdx === 0) return;
        const cells = row.querySelectorAll('td');

        cells.forEach((cell, colIdx) => {
          const type = colMap[colIdx];
          if (!type) return;
          const text = (cell.textContent || '').trim();
          if (!text || text === '—' || text === '-' || text.toLowerCase() === 'n/a') return;

          const match = type === 'account'
            ? clientData.lookupByKey(text)
            : clientData.lookupByName(text);

          if (match) {
            const link = document.createElement('span');
            link.className = 'lookup-link';
            link.textContent = text;
            link.title = 'Click to view client data';
            link.setAttribute('data-lookup-type', type);
            link.setAttribute('data-lookup-value', text);
            link.onclick = function (e) {
              onShowLookup(e, this, match);
            };
            cell.textContent = '';
            cell.appendChild(link);
          }
        });
      });
    });
  };
}
