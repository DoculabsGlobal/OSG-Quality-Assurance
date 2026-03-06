/**
 * Generate a blank audit template markdown document.
 * Pure function — no side effects.
 * @param {string} client
 * @param {string} project
 * @returns {string} markdown content
 */
export function buildAuditTemplate(client, project) {
  return `# ${client} - ${project}

| Total Passed | Total Failed |
|--------------|--------------|
| 0 | 0 |

---

## Errors

| Batch | Consumer | Account | Failure Reason | QA Validation |
|-------|----------|---------|----------------|---------------|
| — | — | — | No errors recorded | — |

---

## Passed Validation

**Total: 0**

| Batch | Consumer | Account | QA Validation |
|-------|----------|---------|---------------|
| — | — | — | — |

---

## Validation Areas

### Client Data File
No batches completed.

### Text Formatting
No batches completed.

### Barcodes
No batches completed.

---

## Sources

| Document | Type | ID |
|----------|------|----|
| — | — | — |
`;
}
