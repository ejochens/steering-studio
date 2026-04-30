import { z } from "zod/v4";

// ── Enum schemas (aligned with Prisma string columns) ────────────────

export const providerTypeSchema = z.enum(["openai", "azure_openai", "bedrock"]);

export const authModeSchema = z.enum(["api_key", "iam", "session"]);

export const testStatusSchema = z.enum(["success", "failure", "untested"]);

// ── Mutation schemas ─────────────────────────────────────────────────

export const saveProviderSchema = z.object({
  providerType: providerTypeSchema,
  endpoint: z.url("Endpoint must be a valid URL").optional(),
  region: z.string().optional(),
  modelName: z.string().min(1, "Model name is required"),
  authMode: authModeSchema,
  /** Raw secret for input only — never persisted or returned as-is. */
  secret: z.string().optional(),
  /** Azure OpenAI API version, e.g. "2025-01-01-preview" */
  apiVersion: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type AuthMode = z.infer<typeof authModeSchema>;
export type TestStatus = z.infer<typeof testStatusSchema>;
export type SaveProviderInput = z.infer<typeof saveProviderSchema>;

// ── AI function & assignment schemas ─────────────────────────────────

export const aiFunctionSchema = z.enum(["intake", "generation"]);

export const saveAssignmentSchema = z.object({
  aiFunction: aiFunctionSchema,
  providerConnectionId: z.string().cuid().optional(),
});

export const deleteProviderSchema = z.object({
  id: z.string().cuid(),
});

// ── Inferred types (assignment) ──────────────────────────────────────

export type AiFunction = z.infer<typeof aiFunctionSchema>;
export type SaveAssignmentInput = z.infer<typeof saveAssignmentSchema>;
export type DeleteProviderInput = z.infer<typeof deleteProviderSchema>;
