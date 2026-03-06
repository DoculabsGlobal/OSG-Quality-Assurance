/**
 * Parse validation statistics from a QA validation document's content.
 * Uses a JSON-first approach: looks for structured metadata block from the agent,
 * then falls back to regex patterns for legacy documents.
 *
 * @param {string} content - document text content
 * @returns {object|null} parsed stats object:
 *   { fail, verdict, consumer, account, batch, counts, failures, sources, _fromJson }
 */
export function parseValidationStats(content) {
  if (!content) return null;

  // Primary: structured JSON metadata block from agent
  const jsonMatch =
    content.match(/```json\s*\n?([\s\S]*?)```/) ||
    content.match(/(\{[\s\S]*?"verdict"\s*:\s*"(?:PASS|FAIL)"[\s\S]*?\})/);

  if (jsonMatch) {
    try {
      const meta = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return {
        fail: meta.verdict === 'FAIL' ? 1 : 0,
        verdict: meta.verdict,
        consumer: meta.consumer || '',
        account: meta.account || '',
        batch: meta.batch || '',
        counts: meta.counts || null,
        failures: meta.failures || [],
        sources: meta.sources || [],
        _fromJson: true,
      };
    } catch (e) {
      /* fall through to regex fallbacks */
    }
  }

  // Fallback: header verdict line for legacy docs
  const verdictMatch = content.match(/:\s*(PASS|FAIL)\s*$/m);
  if (verdictMatch) {
    return { fail: verdictMatch[1] === 'FAIL' ? 1 : 0, verdict: verdictMatch[1] };
  }

  // Fallback: explicit FAIL count
  const failCountMatch = content.match(/\*?\*?FAIL\*?\*?[:\s*]*(\d+)/i);
  if (failCountMatch) {
    return { fail: parseInt(failCountMatch[1]) };
  }

  // Last resort: assume pass
  return { fail: 0 };
}
