// ===== API =====
export const API_BASE = 'https://api.vertesia.io/api/v1';
export const STS_BASE = 'https://api.vertesia.io';
export const ENVIRONMENT_ID = '681915c6a01fb262a410c16b';
export const CHUNKER_URL = 'https://osgpdfchunkerpoc-production.up.railway.app';

// ===== Auth =====
// Note: API_KEY is hardcoded for demo. In production, accept via login form or env var.
export const API_KEY = 'sk-ceaa223d563c5d6602346986cbea7c55';
export const VALID_CODES = ['OSGQA2026!', 'OSGQA2026@', 'OSGQA2026#', 'OSGQA2026$', 'OSGQA2026%'];

// ===== Agents =====
export const AGENTS = {
  CHECKLIST_GENERATION: '69aafdb72df65765a650136b',
  CHECKLIST_VALIDATION: '69aaf9222c47ba1c94d325d1',
  SAMPLING: '69aaf95555068a3dff54e0aa',
  AUDIT: 'AuditAgent',
};
export const MODEL = 'arn:aws:bedrock:us-east-1:716085231028:inference-profile/global.anthropic.claude-sonnet-4-6';

// ===== Collection Setup =====
export const REQUIRED_COLLECTIONS = [
  { key: 'audit', label: 'Audit' },
  { key: 'completed_qa', label: 'Completed QA Validations' },
  { key: 'after_samples', label: 'After Samples' },
  { key: 'checklists', label: 'Test Plans' },
  { key: 'required_sampling', label: 'Required Sampling' },
];
export const SUGGESTED_COLLECTIONS = ['Client Data'];
export const OUTPUT_TYPE_NAMES = [
  'audit', 'completed qa validations', 'after samples', 'test plans', 'checklists', 'required sampling',
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
