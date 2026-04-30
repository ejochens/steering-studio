import { z } from "zod/v4";

// ── Enum schemas ─────────────────────────────────────────────────────

export const completenessStatusSchema = z.enum(["complete", "partial", "empty"]);

// ── Mutation schemas ─────────────────────────────────────────────────

export const saveDocumentEditSchema = z.object({
  documentId: z.string().min(1),
  content: z.string(),
});

export const generateDocumentsSchema = z.object({
  projectId: z.string().min(1),
});

export const generateSingleDocumentSchema = z.object({
  projectId: z.string().min(1),
  filePath: z.string().min(1),
});

// ── Inferred types ───────────────────────────────────────────────────

export type CompletenessStatus = z.infer<typeof completenessStatusSchema>;
export type SaveDocumentEditInput = z.infer<typeof saveDocumentEditSchema>;
export type GenerateDocumentsInput = z.infer<typeof generateDocumentsSchema>;
export type GenerateSingleDocumentInput = z.infer<typeof generateSingleDocumentSchema>;
