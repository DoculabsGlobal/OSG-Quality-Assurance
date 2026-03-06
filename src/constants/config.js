// ===== API =====
export const API_BASE = 'https://api.vertesia.io/api/v1';
export const STS_BASE = 'https://api.vertesia.io';
export const ENVIRONMENT_ID = '681915c6a01fb262a410c161';
export const CHUNKER_URL = 'https://osgpdfchunkerpoc-production.up.railway.app';

// ===== Auth =====
// Note: API_KEY is hardcoded for demo. In production, accept via login form or env var.
export const API_KEY = 'sk-25bf067b64952c430f0b786b52bf89f8';
export const VALID_CODES = ['DemoUser1234', 'DemoUser5678', 'DemoUser9012', 'DemoUser3456'];

// ===== Agents =====
export const AGENTS = {
  CHECKLIST_GENERATION: 'Agent1QATestPlanCreationFork',
  CHECKLIST_VALIDATION: 'QAChecklistValidation',
  SAMPLING: 'OSGStatisticalSignificanceCalculator',
  AUDIT: 'AuditAgent',
};
export const MODEL = 'publishers/anthropic/models/claude-opus-4-5';

// ===== Collection Setup =====
export const REQUIRED_COLLECTIONS = [
  { key: 'audit', label: 'Audit' },
  { key: 'completed_qa', label: 'Completed QA Validations' },
  { key: 'checklists', label: 'Test Plans' },
  { key: 'required_sampling', label: 'Required Sampling' },
];
export const SUGGESTED_COLLECTIONS = ['Client Data'];
export const OUTPUT_TYPE_NAMES = [
  'audit', 'completed qa validations', 'test plans', 'checklists', 'required sampling',
];

// ===== Client Data Lookup =====
export const ACCT_PATTERNS = [
  'account', 'acct', 'loan', 'loan #', 'loan number',
  'account number', 'acct #', 'acct no', 'loan no', 'id',
];

// ===== Audit Live =====
export const AUDIT_TOTAL_STEPS = 8;

// ===== localStorage Keys =====
export const LS = {
  AUTH: 'osg_auth',
  ACCESS_CODE: 'osg_access_code',
  JWT: 'osg_qa_jwt',
  JWT_TIME: 'osg_jwt_time',
  COLLAPSED: 'osg_collapsed',
  MODE: 'osg_mode',
};
