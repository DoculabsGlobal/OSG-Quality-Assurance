import { useState, useCallback } from 'react';
import { LS } from '../constants/config';

/**
 * Group collections by their prefix (before the colon) and manage collapsed state.
 * Collections are named like "ClientName - Project: CollectionType".
 * Groups them by the prefix for display in the library sidebar.
 *
 * @param {object[]} collections - array of collection objects with .name
 * @returns {{ groups, toggleGroup, isCollapsed }}
 */
export function useCollectionGroups(collections) {
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(LS.COLLAPSED) || '[]'));
    } catch {
      return new Set();
    }
  });

  /**
   * Build collection groups from the flat collection list.
   * @returns {object} map of normalizedKey → { displayName, collections }
   */
  const buildGroups = useCallback(() => {
    const groups = {};
    for (const col of collections) {
      const name = col.name || '';
      const colonIdx = name.indexOf(':');
      let groupKey, typeName;

      if (colonIdx > 0) {
        groupKey = name.substring(0, colonIdx).trim();
        typeName = name.substring(colonIdx + 1).trim();
      } else {
        groupKey = '_ungrouped';
        typeName = name;
      }

      const normalizedKey = groupKey.toUpperCase();
      if (!groups[normalizedKey]) {
        groups[normalizedKey] = { displayName: groupKey, collections: [] };
      }
      groups[normalizedKey].collections.push({ ...col, typeName });
    }
    return groups;
  }, [collections]);

  const groups = buildGroups();

  const toggleGroup = useCallback((key) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(LS.COLLAPSED, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isCollapsed = useCallback((key) => collapsedGroups.has(key), [collapsedGroups]);

  return { groups, toggleGroup, isCollapsed };
}

/**
 * Standalone pure function version of group building.
 * Used by services and hooks that need grouping without React state.
 * @param {object[]} collections
 * @returns {object}
 */
export function getCollectionGroups(collections) {
  const groups = {};
  for (const col of collections) {
    const name = col.name || '';
    const colonIdx = name.indexOf(':');
    let groupKey, typeName;

    if (colonIdx > 0) {
      groupKey = name.substring(0, colonIdx).trim();
      typeName = name.substring(colonIdx + 1).trim();
    } else {
      groupKey = '_ungrouped';
      typeName = name;
    }

    const normalizedKey = groupKey.toUpperCase();
    if (!groups[normalizedKey]) {
      groups[normalizedKey] = { displayName: groupKey, collections: [] };
    }
    groups[normalizedKey].collections.push({ ...col, typeName });
  }
  return groups;
}
