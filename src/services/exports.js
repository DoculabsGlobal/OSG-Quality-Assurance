import { renderMarkdown } from '../utils/markdown';

/**
 * Build a standalone styled HTML document from markdown content.
 * Used as the base for PDF, Word, and print exports.
 * @param {string} markdownContent
 * @param {string} [title]
 * @returns {string} complete HTML document string
 */
export function buildStyledHTML(markdownContent, title) {
  const rendered = renderMarkdown(markdownContent);
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (title || 'Document') + '</title>'
    + '<style>'
    + 'body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 28px;color:#2d2b26;line-height:1.65;font-size:14px;}'
    + 'h1{font-size:22px;font-weight:700;border-bottom:2px solid #3d3830;padding-bottom:8px;margin:28px 0 14px;}'
    + 'h2{font-size:17px;font-weight:600;margin:24px 0 10px;color:#3d3830;}'
    + 'h3{font-size:14px;font-weight:600;margin:18px 0 8px;}'
    + 'p{margin:8px 0;}'
    + 'strong{font-weight:600;}'
    + 'table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13px;}'
    + 'th{background:#f5f1ea;padding:8px 12px;text-align:left;font-weight:600;border:1px solid #e5ddd0;font-size:12px;}'
    + 'td{padding:7px 12px;border:1px solid #e5ddd0;}'
    + 'tr:nth-child(even) td{background:#fdfaf4;}'
    + 'hr{border:none;border-top:1px solid #e5ddd0;margin:20px 0;}'
    + 'ul,ol{padding-left:24px;margin:8px 0;}'
    + 'li{margin:4px 0;}'
    + 'code{font-family:SFMono-Regular,Consolas,monospace;background:#f5f1ea;padding:2px 6px;border-radius:3px;font-size:12px;}'
    + 'pre{background:#f5f1ea;border:1px solid #e5ddd0;border-radius:6px;padding:14px;overflow-x:auto;margin:12px 0;}'
    + 'pre code{background:none;padding:0;}'
    + 'blockquote{border-left:3px solid #5a7a8a;padding-left:14px;color:#6a6259;margin:10px 0;}'
    + '@media print{body{margin:20px;font-size:12px;}h1{font-size:18px;}h2{font-size:15px;}table{font-size:11px;}}'
    + '</style></head><body>' + rendered + '</body></html>';
}

/**
 * Export markdown content as a PDF file (triggers browser download).
 * Requires html2pdf.js to be available.
 * @param {string} markdownContent
 * @param {string} [title]
 */
export function exportAsPDF(markdownContent, title) {
  // Dynamic import: html2pdf is loaded as npm dep
  import('html2pdf.js').then(({ default: html2pdf }) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:760px;margin:0 auto;padding:20px;color:#2d2b26;line-height:1.65;font-size:13px;';
    wrapper.innerHTML = renderMarkdown(markdownContent);

    // Inline styles for PDF capture
    wrapper.querySelectorAll('table').forEach(t => { t.style.cssText = 'border-collapse:collapse;width:100%;margin:14px 0;font-size:12px;'; });
    wrapper.querySelectorAll('th').forEach(t => { t.style.cssText = 'background:#f5f1ea;padding:7px 10px;text-align:left;font-weight:600;border:1px solid #e5ddd0;font-size:11px;'; });
    wrapper.querySelectorAll('td').forEach(t => { t.style.cssText = 'padding:6px 10px;border:1px solid #e5ddd0;'; });
    wrapper.querySelectorAll('h1').forEach(t => { t.style.cssText = 'font-size:20px;font-weight:700;border-bottom:2px solid #3d3830;padding-bottom:8px;margin:24px 0 12px;'; });
    wrapper.querySelectorAll('h2').forEach(t => { t.style.cssText = 'font-size:16px;font-weight:600;margin:20px 0 8px;color:#3d3830;'; });
    wrapper.querySelectorAll('h3').forEach(t => { t.style.cssText = 'font-size:13px;font-weight:600;margin:16px 0 6px;'; });
    wrapper.querySelectorAll('hr').forEach(t => { t.style.cssText = 'border:none;border-top:1px solid #e5ddd0;margin:18px 0;'; });
    wrapper.querySelectorAll('code').forEach(t => {
      if (t.parentElement.tagName !== 'PRE') t.style.cssText = 'font-family:SFMono-Regular,Consolas,monospace;background:#f5f1ea;padding:2px 5px;border-radius:3px;font-size:11px;';
    });
    wrapper.querySelectorAll('pre').forEach(t => { t.style.cssText = 'background:#f5f1ea;border:1px solid #e5ddd0;border-radius:6px;padding:12px;overflow-x:auto;margin:12px 0;font-size:11px;'; });

    document.body.appendChild(wrapper);
    const safeName = (title || 'document').replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, '_');

    html2pdf().set({
      margin: [0.6, 0.7, 0.6, 0.7],
      filename: safeName + '.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(wrapper).save().then(() => {
      document.body.removeChild(wrapper);
    });
  });
}

/**
 * Export markdown content as a Word document (triggers browser download).
 * Uses Word-compatible HTML with MSO XML headers.
 * @param {string} markdownContent
 * @param {string} [title]
 */
export function exportAsWord(markdownContent, title) {
  const wordDoc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    + '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->'
    + '<style>'
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#2d2b26;line-height:1.5;}'
    + 'h1{font-size:18pt;font-weight:bold;border-bottom:2pt solid #3d3830;padding-bottom:6pt;margin:18pt 0 10pt;}'
    + 'h2{font-size:14pt;font-weight:bold;margin:16pt 0 8pt;color:#3d3830;}'
    + 'h3{font-size:12pt;font-weight:bold;margin:12pt 0 6pt;}'
    + 'p{margin:6pt 0;}'
    + 'table{border-collapse:collapse;width:100%;margin:10pt 0;}'
    + 'th{background:#f5f1ea;padding:6pt 8pt;text-align:left;font-weight:bold;border:1pt solid #c0c0c0;font-size:10pt;}'
    + 'td{padding:5pt 8pt;border:1pt solid #c0c0c0;font-size:10pt;}'
    + 'code{font-family:Consolas,monospace;background:#f5f1ea;padding:1pt 4pt;font-size:10pt;}'
    + 'pre{background:#f5f1ea;border:1pt solid #c0c0c0;padding:10pt;font-family:Consolas,monospace;font-size:9pt;}'
    + 'blockquote{border-left:3pt solid #5a7a8a;padding-left:10pt;color:#6a6259;margin:8pt 0;}'
    + 'hr{border:none;border-top:1pt solid #c0c0c0;margin:14pt 0;}'
    + 'ul,ol{margin:6pt 0;padding-left:20pt;}'
    + 'li{margin:3pt 0;}'
    + '</style></head><body>' + renderMarkdown(markdownContent) + '</body></html>';

  const blob = new Blob(['\ufeff' + wordDoc], { type: 'application/msword' });
  const a = document.createElement('a');
  const safeName = (title || 'document').replace(/[^a-zA-Z0-9 \-]/g, '').replace(/\s+/g, '_');
  a.href = URL.createObjectURL(blob);
  a.download = safeName + '.doc';
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Open a print window with styled markdown content.
 * @param {string} markdownContent
 * @param {string} [title]
 */
export function exportPrint(markdownContent, title) {
  const html = buildStyledHTML(markdownContent, title);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}
