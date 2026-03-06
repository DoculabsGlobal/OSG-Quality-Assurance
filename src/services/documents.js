import { apiCall } from './api';

/**
 * Fetch the text content of a document by its content source ID.
 * @param {string} source - content source ID
 * @returns {Promise<string>} document text content
 */
export async function fetchDocumentContent(source) {
  if (!source) throw new Error('No source');
  const { url } = await apiCall('/objects/download-url', {
    method: 'POST',
    body: JSON.stringify({ file: source, format: 'original' }),
  });
  return await (await fetch(url)).text();
}

/**
 * Upload a file to Vertesia and create a document object.
 * @param {File} file - the file to upload
 * @returns {Promise<object>} the created document object
 */
export async function uploadFile(file) {
  const mimeType = file.type || ({
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
  }[file.name.split('.').pop().toLowerCase()] || 'application/octet-stream');

  // Get presigned upload URL
  const uploadUrlRes = await apiCall('/objects/upload-url', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, mime_type: mimeType }),
  });

  // Upload file to presigned URL
  await fetch(uploadUrlRes.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': mimeType },
  });

  // Create document object
  const objectRes = await apiCall('/objects', {
    method: 'POST',
    body: JSON.stringify({
      name: file.name,
      content: { source: uploadUrlRes.id, type: mimeType, name: file.name },
    }),
  });

  return objectRes;
}

/**
 * Create a document with text content (e.g. markdown).
 * @param {string} name - document name
 * @param {string} content - text content
 * @param {string} mimeType - MIME type (default: text/markdown)
 * @returns {Promise<object>} the created document object
 */
export async function createDocument(name, content, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], name, { type: mimeType });
  return uploadFile(file);
}

/**
 * Get a download URL for a document.
 * @param {string} source - content source ID
 * @returns {Promise<string>} download URL
 */
export async function getDownloadUrl(source) {
  const { url } = await apiCall('/objects/download-url', {
    method: 'POST',
    body: JSON.stringify({ file: source, format: 'original' }),
  });
  return url;
}

/**
 * Fetch document metadata by ID.
 * @param {string} docId
 * @returns {Promise<object>}
 */
export async function getDocument(docId) {
  return apiCall('/objects/' + docId);
}
