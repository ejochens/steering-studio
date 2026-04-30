import { z } from "zod/v4";

export const scanCodebaseSchema = z.object({
  projectId: z.string().min(1),
});

export const scanFactSchema = z.object({
  sectionKey: z.string().min(1),
  fieldKey: z.string().min(1),
  value: z.string().min(1),
  sourceFile: z.string().min(1),
  source: z.enum(["codebase-scan", "ai-codebase-scan"]),
});

export type ScanCodebaseInput = z.infer<typeof scanCodebaseSchema>;
export type ScanFactInput = z.infer<typeof scanFactSchema>;
