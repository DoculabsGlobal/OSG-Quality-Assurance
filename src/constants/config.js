// ===== API =====
export const API_BASE = 'https://api.vertesia.io/api/v1';
export const STS_BASE = 'https://api.vertesia.io';
export const ENVIRONMENT_ID = import.meta.env.VITE_ENVIRONMENT_ID || '';
export const CHUNKER_URL = import.meta.env.VITE_CHUNKER_URL || 'https://osgpdfchunkerpoc-production.up.railway.app';

// ===== Auth =====
export const API_KEY = import.meta.env.VITE_API_KEY || '';
export const VALID_CODES = (import.meta.env.VITE_VALID_CODES || '').split(',').filter(Boolean);

export const AGENTS = {
  CHECKLIST_GENERATION: 'Agent1QATestPlanCreation',
  CHECKLIST_VALIDATION: 'Agent3QAChecklistValidation',
  SAMPLING: 'OSGStatisticalSignificanceCalculator',
  AUDIT: 'AuditAgent',
};
export const MODEL = 'arn:aws:bedrock:us-east-1:716085231028:inference-profile/global.anthropic.claude-sonnet-4-6';

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
