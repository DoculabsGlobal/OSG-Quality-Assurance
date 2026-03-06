import { STS_BASE, API_KEY, VALID_CODES, LS } from '../constants/config';

/**
 * Validate an access code against the allowed list.
 * @param {string} code
 * @returns {boolean}
 */
export function validateAccessCode(code) {
  return VALID_CODES.includes(code);
}

/**
 * Fetch a new JWT from the Vertesia STS endpoint.
 * @returns {Promise<string>} the JWT token
 */
export async function fetchNewJWT() {
  const response = await fetch(STS_BASE + '/auth/token', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + API_KEY },
  });
  if (!response.ok) throw new Error('Failed to authenticate');
  const data = await response.json();
  return data.token;
}

/**
 * Persist auth state to localStorage.
 */
export function persistAuth(jwt, accessCode) {
  localStorage.setItem(LS.AUTH, 'true');
  localStorage.setItem(LS.ACCESS_CODE, accessCode);
  localStorage.setItem(LS.JWT, jwt);
  localStorage.setItem(LS.JWT_TIME, Date.now().toString());
}

/**
 * Clear all auth state from localStorage.
 */
export function clearAuth() {
  localStorage.removeItem(LS.AUTH);
  localStorage.removeItem(LS.JWT);
  localStorage.removeItem(LS.JWT_TIME);
  localStorage.removeItem(LS.ACCESS_CODE);
}

/**
 * Check if a stored session is still valid.
 * Returns { jwt, accessCode } if valid, null otherwise.
 */
export function getStoredSession() {
  if (localStorage.getItem(LS.AUTH) !== 'true') return null;

  const accessCode = localStorage.getItem(LS.ACCESS_CODE);
  if (!accessCode || !VALID_CODES.includes(accessCode)) return null;

  const jwtTime = parseInt(localStorage.getItem(LS.JWT_TIME) || '0');
  const age = Date.now() - jwtTime;
  const jwt = localStorage.getItem(LS.JWT);

  // JWT still fresh (under 25 min)
  if (age < 25 * 60 * 1000 && jwt) {
    return { jwt, accessCode, needsRefresh: false };
  }

  // JWT expired or missing — needs refresh
  return { jwt: null, accessCode, needsRefresh: true };
}

/**
 * Get a fresh JWT for delete/create operations that need their own token.
 * Some Vertesia operations require a fresh token.
 * @returns {Promise<string>}
 */
export async function getFreshToken() {
  const response = await fetch(STS_BASE + '/auth/token', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + API_KEY },
  });
  if (!response.ok) throw new Error('Failed to get fresh token');
  const data = await response.json();
  return data.token;
}
