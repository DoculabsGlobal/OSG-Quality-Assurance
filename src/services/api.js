import { API_BASE } from '../constants/config';

// Module-level auth state — set by AuthContext
let _jwt = null;
let _onTokenExpired = null; // callback: () => Promise<string> (refresh and return new jwt)
let _onAuthFailed = null;   // callback: () => void (force logout)

/**
 * Configure the API client with auth callbacks.
 * Called once by AuthContext on mount.
 */
export function configureApi({ onTokenExpired, onAuthFailed }) {
  _onTokenExpired = onTokenExpired;
  _onAuthFailed = onAuthFailed;
}

/**
 * Set the current JWT token.
 * Called by AuthContext after login or refresh.
 */
export function setAuthToken(jwt) {
  _jwt = jwt;
}

/**
 * Core API call with automatic 401 retry.
 *
 * @param {string} endpoint - API path (e.g. '/collections/search')
 * @param {object} options - fetch options (method, body, headers)
 * @param {boolean} _retried - internal flag to prevent infinite retry
 * @returns {Promise<any>} parsed JSON response
 */
export async function apiCall(endpoint, options = {}, _retried = false) {
  const response = await fetch(API_BASE + endpoint, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + _jwt,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();

    // Token expired — try silent refresh before giving up
    if (
      (response.status === 401 || (text.includes('exp') && text.includes('timestamp'))) &&
      !_retried
    ) {
      try {
        if (_onTokenExpired) {
          const newJwt = await _onTokenExpired();
          _jwt = newJwt;
          console.log('JWT auto-refreshed after 401');
          return apiCall(endpoint, options, true);
        }
      } catch (refreshErr) {
        if (_onAuthFailed) _onAuthFailed();
        throw new Error('Session expired — please log in again');
      }
    }

    throw new Error(text || 'API error: ' + response.status);
  }

  return response.json();
}
