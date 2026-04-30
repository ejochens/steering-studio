import { z } from "zod/v4";

// ── Enum schemas (aligned with Prisma string columns) ────────────────

export const sectionKeySchema = z.enum([
  "product-and-users",
  "problem-and-outcomes",
  "scope-and-non-goals",
  "tech-stack-and-architecture",
  "project-structure-and-conventions",
  "testing-and-quality",
  "security-and-compliance",
  "ai-usage-boundaries",
  "workflows-and-team-practices",
]);

export const fieldSourceSchema = z.enum(["user-form", "ai-inferred", "ai-conversation", "ai-suggested"]);

export const coverageStatusSchema = z.enum(["unknown", "partial", "complete"]);

// ── Mutation schemas ─────────────────────────────────────────────────

export const saveAnswerSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  sectionKey: sectionKeySchema,
  fieldKey: z.string().min(1, "Field key is required"),
  value: z.string(),
});

// ── AI assist schemas ────────────────────────────────────────────────

export const generateAllAnswersSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

export const generateSectionAnswersSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  sectionKey: sectionKeySchema,
});

export const acceptSectionSuggestionsSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  sectionKey: sectionKeySchema,
  values: z.record(z.string().min(1), z.string()),
});

export const aiResponseSchema = z.record(
  sectionKeySchema,
  z.record(z.string(), z.string()),
);

export const aiSectionResponseSchema = z.record(z.string(), z.string());

// ── Inferred types ───────────────────────────────────────────────────

export type SectionKey = z.infer<typeof sectionKeySchema>;
export type FieldSource = z.infer<typeof fieldSourceSchema>;
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type GenerateAllAnswersInput = z.infer<typeof generateAllAnswersSchema>;
export type GenerateSectionAnswersInput = z.infer<typeof generateSectionAnswersSchema>;
export type AcceptSectionSuggestionsInput = z.infer<typeof acceptSectionSuggestionsSchema>;
export type AiResponse = z.infer<typeof aiResponseSchema>;
