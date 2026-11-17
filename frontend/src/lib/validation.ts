/**
 * Zod validation schemas for frontend form inputs.
 * These mirror the backend Pydantic schemas but enforce
 * validation at the UI level before any API call.
 */
import { z } from 'zod';

// ─── Transaction / Case Creation ─────────────────────────────────────────────

export const CreateCaseSchema = z.object({
  customer_reference: z
    .string()
    .min(1, 'Customer reference is required')
    .max(50, 'Max 50 characters'),
  sender_iban: z
    .string()
    .min(5, 'Sender IBAN is required')
    .max(34, 'Invalid IBAN length'),
  beneficiary_name: z
    .string()
    .min(1, 'Beneficiary name is required')
    .max(100, 'Max 100 characters'),
  beneficiary_iban: z
    .string()
    .min(5, 'Beneficiary IBAN is required')
    .max(34, 'Invalid IBAN length'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(10_000_000, 'Amount exceeds maximum'),
  currency: z.string().default('DT'),
  merchant_category: z.string().default('Crypto Exchange'),
  transaction_type: z.string().default('STANDARD_TRANSFER'),
  hour_of_day: z.number().int().min(0).max(23).default(12),
  is_night_transaction: z.number().int().min(0).max(1).default(0),
  time_since_last_txn_hrs: z.number().nonnegative().default(24),
  is_international: z.number().int().min(0).max(1).default(0),
  failed_attempts: z.number().int().nonnegative().default(0),
  pin_changed_recently: z.number().int().min(0).max(1).default(0),
});

export type CreateCaseInput = z.infer<typeof CreateCaseSchema>;

// ─── Approval Justification ──────────────────────────────────────────────────

export const ApprovalSchema = z.object({
  justification: z
    .string()
    .min(5, 'Justification must be at least 5 characters')
    .max(1000, 'Max 1000 characters'),
});

export type ApprovalInput = z.infer<typeof ApprovalSchema>;

// ─── Tamper Simulation ───────────────────────────────────────────────────────

export const TamperSimulationSchema = z.object({
  altered_amount: z
    .number()
    .positive('Altered amount must be positive')
    .optional(),
  altered_beneficiary: z
    .string()
    .min(1, 'Beneficiary name cannot be empty')
    .max(100)
    .optional(),
}).refine(
  (data) => data.altered_amount !== undefined || data.altered_beneficiary !== undefined,
  { message: 'At least one field must be altered' }
);

export type TamperSimulationInput = z.infer<typeof TamperSimulationSchema>;

// ─── Wallet Address ──────────────────────────────────────────────────────────

export const EthAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
