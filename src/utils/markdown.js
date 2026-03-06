/**
 * Render markdown text to HTML string.
 * Supports: headers, bold, italic, code blocks, inline code, tables,
 * blockquotes, unordered lists, horizontal rules, paragraphs.
 *
 * @param {string} text - markdown content
 * @returns {string} HTML string
 */
export function renderMarkdown(text) {
  if (typeof text !== 'string') text = JSON.stringify(text, null, 2);

  // Escape HTML first
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });

  // Tables
  const lines = html.split('\n');
  let result = [];
  let inTable = false;
  let tableHtml = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Check if separator row
      if (cells.every(c => /^[-:]+$/.test(c))) continue;
      if (!inTable) {
        inTable = true;
        tableHtml = '<table><thead><tr>' + cells.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
        continue;
      }
      tableHtml += '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>';
    } else {
      if (inTable) {
        tableHtml += '</tbody></table>';
        result.push(tableHtml);
        inTable = false;
        tableHtml = '';
      }
      result.push(line);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>';
    result.push(tableHtml);
  }
  html = result.join('\n');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function (m) {
    return '<ul>' + m + '</ul>';
  });

  // Line breaks → paragraphs (skip if already has HTML tags)
  html = html.replace(/^(?!<[a-z])((?!<[a-z]).+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
