import { z } from "zod/v4";
import { aiResponseSchema } from "./intake";

// ── Upload mutation schemas ──────────────────────────────────────────

export const uploadDocumentsSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  files: z
    .array(
      z.object({
        filename: z
          .string()
          .regex(/\.(md|markdown)$/i, "File must be .md or .markdown"),
        content: z.string().min(1, "File content must not be empty"),
      })
    )
    .min(1, "At least one file is required")
    .max(20, "Maximum 20 files allowed"),
});

// ── Extraction response schema (reuses aiResponseSchema from intake) ─

export const extractionResponseSchema = aiResponseSchema;

// ── Inferred types ───────────────────────────────────────────────────

export type UploadDocumentsInput = z.infer<typeof uploadDocumentsSchema>;
