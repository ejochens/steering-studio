import { z } from "zod/v4";
import { sectionKeySchema } from "./intake";

// ── Mutation schemas ─────────────────────────────────────────────────

export const sendReviewMessageSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  content: z.string().min(1, "Message content is required").max(10000),
});

export const extractReviewFactsSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

export const acceptReviewFactSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  sectionKey: sectionKeySchema,
  fieldKey: z.string().min(1, "Field key is required"),
  value: z.string().min(1, "Value is required"),
});

// ── Inferred types ───────────────────────────────────────────────────

export type SendReviewMessageInput = z.infer<typeof sendReviewMessageSchema>;
export type ExtractReviewFactsInput = z.infer<typeof extractReviewFactsSchema>;
export type AcceptReviewFactInput = z.infer<typeof acceptReviewFactSchema>;
