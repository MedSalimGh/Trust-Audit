/**
 * TrustAudit — TypeScript Type Definitions
 * Interfaces for all API responses, blockchain entities, and UI state.
 */

// ─── Blockchain / Contract Types ─────────────────────────────────────────────

export type CaseStatus =
  | 'NONE'
  | 'REGISTERED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ValueTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

export type ApprovalRoleName =
  | 'OPERATOR'
  | 'AI_ORACLE'
  | 'COMPLIANCE'
  | 'RISK_MANAGER'
  | 'DIRECTOR'
  | 'AUDITOR'
  | 'ADMIN';

// ─── API Response Types ──────────────────────────────────────────────────────

export interface TransactionResponse {
  id: string;
  case_id: string;
  customer_reference: string;
  sender_iban: string;
  beneficiary_name: string;
  beneficiary_iban: string;
  amount: number;
  currency: string;
  merchant_category: string;
  transaction_type: string;
  hour_of_day: number;
  is_night_transaction: number;
  time_since_last_txn_hrs: number;
  is_international: number;
  failed_attempts: number;
  pin_changed_recently: number;
  value_tier: number;
  required_approvals: number;
  created_at: string;
}

export interface AIAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  fraud_probability: number;
  top_positive_features: Array<{ feature: string; impact: number }>;
  top_negative_features: Array<{ feature: string; impact: number }>;
  explanation_hash: string;
  model_version: string;
  assessed_at: string;
}

export interface ApprovalRecord {
  approver_address: string;
  role: string;
  justification_hash: string;
  approved_at: string;
  tx_hash: string;
}

export interface CaseSummary {
  case_id: string;
  status: CaseStatus;
  risk_level: RiskLevel | null;
  risk_score: number | null;
  ai_risk_score?: number | null;
  beneficiary_name: string;
  amount: number;
  currency: string;
  transaction_type: string;
  value_tier: number;
  required_approvals: number;
  approval_count: number;
  created_at: string;
  certificate_id: number | null;
}

export interface CaseListResponse {
  items: CaseSummary[];
  total: number;
}

export interface CaseDetailResponse {
  case_id: string;
  status: CaseStatus;
  transaction: TransactionResponse;
  ai_assessment: AIAssessment | null;
  approvals: ApprovalRecord[];
  on_chain: OnChainCaseData | null;
  required_approvals: number;
  approval_count: number;
  certificate_id: number | null;
  created_at: string;
}

export interface OnChainCaseData {
  status: number;
  risk_level: number;
  input_hash: string;
  explanation_hash: string;
  approval_count: number;
  required_approvals: number;
  certificate_id: number;
  registered_at: number;
}

export interface TamperedField {
  field: string;
  expected?: unknown;
  actual?: unknown;
  original_value?: unknown;
  tampered_value?: unknown;
}

export interface VerifyIntegrityResponse {
  case_id?: string;
  is_valid: boolean;
  status: 'INTEGRITY_VERIFIED' | 'TAMPERING_DETECTED' | string;
  on_chain_hash: string;
  recomputed_hash?: string;
  computed_hash?: string;
  calculated_hash?: string;
  tampered_fields: TamperedField[];
  current_data?: Record<string, unknown>;
  secret_salt?: string;
}

export interface CommentHashResponse {
  justification_hash: string;
}

export interface ExecutionRecord {
  id: string;
  case_id: string;
  execution_reference: string;
  idempotency_key: string;
  status: string;
  executed_at: string;
}

export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  wallet_address: string;
  roles: string[];
}

// ─── Network / Blockchain Info ───────────────────────────────────────────────

export interface NetworkInfo {
  chain_id: number;
  rpc_url: string;
  registry_address: string;
  certificate_address: string;
  block_number: number;
}

// ─── UI State Types ──────────────────────────────────────────────────────────

export interface WalletState {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectChain: boolean;
  roles: ApprovalRoleName[];
  primaryRole: ApprovalRoleName | null;
}

export type TxStatus = 'idle' | 'submitting' | 'confirming' | 'confirmed' | 'error';

export interface TxState {
  status: TxStatus;
  hash: string | null;
  error: string | null;
}
