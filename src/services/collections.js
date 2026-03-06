import { API_BASE, REQUIRED_COLLECTIONS } from '../constants/config';
import { apiCall } from './api';
import { getFreshToken } from './auth';

/**
 * Fetch all collections, sorted alphabetically.
 * @returns {Promise<object[]>}
 */
export async function fetchCollections() {
  const res = await apiCall('/collections/search', {
    method: 'POST',
    body: JSON.stringify({ dynamic: false, status: 'active', limit: 200 }),
  });
  return (Array.isArray(res) ? res : []).sort(
    (a, b) => (a.name || '').localeCompare(b.name || '')
  );
}

/**
 * Fetch member counts for an array of collections.
 * Mutates each collection by adding _memberCount.
 * @param {object[]} collections
 * @returns {Promise<object[]>} same array with _memberCount added
 */
export async function fetchMemberCounts(collections) {
  await Promise.all(
    collections.map(async (col) => {
      try {
        const members = await apiCall('/collections/' + col.id + '/members?limit=1000');
        col._memberCount = (Array.isArray(members) ? members : []).length;
      } catch (e) {
        col._memberCount = null;
      }
    })
  );
  return collections;
}

/**
 * Fetch members of a single collection.
 * @param {string} collectionId
 * @returns {Promise<object[]>}
 */
export async function fetchCollectionMembers(collectionId) {
  const members = await apiCall('/collections/' + collectionId + '/members?limit=1000');
  const memberIds = (Array.isArray(members) ? members : []).map(m => m.id || m);

  // Fetch full document objects
  const docs = [];
  await Promise.all(
    memberIds.map(async (id) => {
      try {
        const doc = await apiCall('/objects/' + id);
        if (doc) docs.push(doc);
      } catch (e) { /* skip failed fetches */ }
    })
  );

  return docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Add a document to a collection.
 * @param {string} collectionId
 * @param {string} documentId
 */
export async function addToCollection(collectionId, documentId) {
  await apiCall('/collections/' + collectionId + '/members', {
    method: 'POST',
    body: JSON.stringify({ action: 'add', members: [documentId] }),
  });
}

/**
 * Remove a document from a collection.
 * @param {string} collectionId
 * @param {string} documentId
 */
export async function removeFromCollection(collectionId, documentId) {
  const token = await getFreshToken();
  await fetch(API_BASE + '/collections/' + collectionId + '/members', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', members: [documentId] }),
  });
}

/**
 * Delete a document object. Optionally removes from a collection first.
 * @param {string} docId
 * @param {string} [collectionId] - if provided, removes from collection first
 */
export async function deleteDocument(docId, collectionId) {
  const token = await getFreshToken();
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  if (collectionId) {
    await fetch(API_BASE + '/collections/' + collectionId + '/members', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', members: [docId] }),
    });
  }

  await fetch(API_BASE + '/objects/' + docId, {
    method: 'DELETE',
    headers,
  });
}

/**
 * Delete a collection.
 * @param {string} collectionId
 */
export async function deleteCollection(collectionId) {
  const token = await getFreshToken();
  await fetch(API_BASE + '/collections/' + collectionId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  });
}

/**
 * Delete all collections in a group.
 * @param {object[]} collections - array of collection objects to delete
 */
export async function deleteGroup(collections) {
  const token = await getFreshToken();
  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  for (const col of collections) {
    await fetch(API_BASE + '/collections/' + col.id, {
      method: 'DELETE',
      headers,
    });
  }
}

/**
 * Create a new collection.
 * @param {string} name
 * @param {string} [description]
 * @returns {Promise<object>} created collection
 */
export async function createCollection(name, description = '') {
  const token = await getFreshToken();
  const res = await fetch(API_BASE + '/collections', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, dynamic: false }),
  });
  return res.json();
}

/**
 * Create the full client folder structure.
 * @param {string} clientName
 * @param {string} projectName
 * @param {string[]} [additionalTypes] - extra collection type names
 * @returns {Promise<object>} { auditCollectionId }
 */
export async function createClientFolders(clientName, projectName, additionalTypes = []) {
  const prefix = clientName + ' - ' + projectName;
  let auditCollectionId = null;

  // Required collections
  for (const req of REQUIRED_COLLECTIONS) {
    const col = await createCollection(prefix + ': ' + req.label);
    if (req.key === 'audit') auditCollectionId = col.id;
  }

  // Additional custom collections
  for (const label of additionalTypes) {
    await createCollection(prefix + ': ' + label);
  }

  return { auditCollectionId };
}

/**
 * Add a new collection to an existing group.
 * @param {string} groupDisplayName - the group prefix (e.g. "ClientName - Project")
 * @param {string} typeName - the new collection type name
 * @returns {Promise<object>} created collection
 */
export async function addCollectionToGroup(groupDisplayName, typeName) {
  const fullName = groupDisplayName + ': ' + typeName;
  return createCollection(fullName);
}
