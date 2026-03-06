import { ENVIRONMENT_ID, MODEL } from '../constants/config';
import { apiCall } from './api';

/**
 * Launch an async agent execution.
 * @param {string} interactionName - agent interaction name
 * @param {object} data - input data for the agent
 * @param {string} [model] - model override (defaults to config MODEL)
 * @returns {Promise<object>} execution response with id/runId
 */
export async function runAgent(interactionName, data, model) {
  return apiCall('/execute/async', {
    method: 'POST',
    body: JSON.stringify({
      type: 'conversation',
      interaction: interactionName,
      data,
      config: {
        environment: ENVIRONMENT_ID,
        model: model || MODEL,
      },
      interactive: true,
      max_iterations: 100,
    }),
  });
}

/**
 * Check the status of an agent execution.
 * @param {string} runId - execution/run ID
 * @returns {Promise<object>} execution status object
 */
export async function getExecutionStatus(runId) {
  return apiCall('/execute/' + runId);
}

/**
 * Get the result document from a completed execution.
 * Looks for the result in the execution response.
 * @param {string} runId - execution/run ID
 * @returns {Promise<object>} result with status and optional document
 */
export async function getExecutionResult(runId) {
  const execution = await getExecutionStatus(runId);
  return {
    status: execution.status,
    result: execution.result || null,
    documentId: execution.result?.id || null,
  };
}
