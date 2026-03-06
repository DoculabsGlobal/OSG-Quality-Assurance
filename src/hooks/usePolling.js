import { useRef, useCallback, useEffect } from 'react';

/**
 * Generic polling hook with start/stop control and automatic cleanup.
 *
 * @param {function} callback - async function to call on each poll
 * @param {number} intervalMs - polling interval in milliseconds
 * @returns {{ start, stop, isActive }}
 */
export function usePolling(callback, intervalMs) {
  const intervalRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep callback ref current without triggering re-renders
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const isActive = useCallback(() => intervalRef.current !== null, []);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop(); // Clear any existing interval
    intervalRef.current = setInterval(() => {
      try {
        callbackRef.current();
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, intervalMs);
  }, [intervalMs, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, isActive: isActive() };
}
