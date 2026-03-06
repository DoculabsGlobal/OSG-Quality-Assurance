import { useReducer, useCallback } from 'react';

/**
 * Reducer-based state machine hook.
 * Replaces the showState1/showState2 pattern from the monolith.
 *
 * Usage:
 *   const { state, dispatch, is } = useStateMachine({
 *     initial: 'upload',
 *     states: {
 *       upload:     { on: { SUBMIT: 'processing' } },
 *       processing: { on: { COMPLETE: 'review', ERROR: 'error' } },
 *       review:     { on: { APPROVE: 'approved', EDIT: 'review' } },
 *       approved:   { on: { RESET: 'upload' } },
 *       error:      { on: { RETRY: 'upload' } },
 *     }
 *   });
 *
 *   dispatch('SUBMIT');
 *   is('processing'); // true
 *
 * @param {object} config - { initial, states }
 * @returns {{ state, dispatch, is, data }}
 */
export function useStateMachine(config) {
  const { initial, states } = config;

  function reducer(current, action) {
    // Action can be a string (event name) or { type, ...payload }
    const eventName = typeof action === 'string' ? action : action.type;
    const payload = typeof action === 'string' ? {} : action;

    const stateConfig = states[current.state];
    if (!stateConfig || !stateConfig.on) return current;

    const nextState = stateConfig.on[eventName];
    if (!nextState) {
      console.warn(`State machine: no transition for "${eventName}" in state "${current.state}"`);
      return current;
    }

    return {
      state: nextState,
      data: { ...current.data, ...payload },
      prev: current.state,
    };
  }

  const [current, rawDispatch] = useReducer(reducer, {
    state: initial,
    data: {},
    prev: null,
  });

  const dispatch = useCallback((action) => rawDispatch(action), []);
  const is = useCallback((stateName) => current.state === stateName, [current.state]);

  return {
    state: current.state,
    data: current.data,
    prev: current.prev,
    dispatch,
    is,
  };
}
