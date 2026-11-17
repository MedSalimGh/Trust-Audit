/**
 * TrustAudit — Typed API Client with JWT Interceptor
 *
 * All API calls go through this client. It:
 * 1. Reads JWT from localStorage
 * 2. Attaches Authorization: Bearer header
 * 3. Parses JSON responses
 * 4. Throws typed ApiError on failure
 */
import { env } from '../config/env';

const API_BASE = `${env.VITE_API_URL}/api/v1`;
const TOKEN_KEY = 'trustaudit_jwt';

// ─── Token storage ───────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip Authorization header (for auth endpoints) */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const errBody = await res.json();
      detail = errBody.detail ?? errBody.message;
    } catch {
      // Response body not JSON
    }
    throw new ApiError(
      detail || `Request failed: ${res.status}`,
      res.status,
      detail,
    );
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Auth endpoints (no JWT required) ────────────────────────────────────────

import type {
  NonceResponse,
  AuthTokenResponse,
} from '../types';

export async function requestNonce(walletAddress: string, chainId: number): Promise<NonceResponse> {
  return request<NonceResponse>('/auth/nonce', {
    method: 'POST',
    body: { wallet_address: walletAddress, chain_id: chainId },
    skipAuth: true,
  });
}

export async function verifySignature(message: string, signature: string): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('/auth/verify', {
    method: 'POST',
    body: { message, signature },
    skipAuth: true,
  });
}

// ─── Protected endpoints ─────────────────────────────────────────────────────

export async function listCases(statusFilter?: string) {
  const params = statusFilter ? `?status_filter=${statusFilter}` : '';
  return request<{ total: number; items: unknown[] }>(`/cases${params}`);
}

export async function getCaseDetail(caseId: string) {
  return request<unknown>(`/cases/${caseId}`);
}

export async function assessCaseAI(caseId: string) {
  return request<unknown>(`/ai/assess/${caseId}`, { method: 'POST' });
}

export async function computeCommentHash(caseId: string, justification: string) {
  return request<{ comment_hash: string }>(`/cases/${caseId}/comment-hash`, {
    method: 'POST',
    body: { justification },
  });
}

export async function verifyCaseIntegrity(caseId: string) {
  return request<unknown>(`/audit/${caseId}/verify`, { method: 'POST' });
}

export async function simulateTampering(
  caseId: string,
  alteredAmount?: number,
  alteredBeneficiary?: string,
) {
  return request<unknown>(`/audit/${caseId}/simulate-tamper`, {
    method: 'POST',
    body: { altered_amount: alteredAmount, altered_beneficiary: alteredBeneficiary },
  });
}

export async function restoreOriginalData(caseId: string) {
  return request<unknown>(`/audit/${caseId}/restore`, { method: 'POST' });
}

export async function deleteCase(caseId: string) {
  return request<{ deleted: boolean; case_id: string }>(`/cases/${caseId}`, {
    method: 'DELETE',
  });
}

export async function cleanupNonExistentCases() {
  return request<{ cleaned_count: number; removed_case_ids: string[] }>(`/cases/cleanup-non-existent`, {
    method: 'POST',
  });
}

export async function syncCaseStatus(caseId: string, payload?: unknown) {
  return request<unknown>(`/cases/${caseId}/sync-status`, {
    method: 'POST',
    body: payload,
  });
}

export async function createTransaction(payload: unknown) {
  return request<unknown>('/transactions', { method: 'POST', body: payload });
}

export async function listExecutions() {
  return request<unknown[]>('/executions');
}

export async function triggerExecution(caseId: string) {
  return request<unknown>(`/executions/trigger/${caseId}`, { method: 'POST' });
}

export async function getNetworkInfo() {
  return request<unknown>('/blockchain/network');
}
