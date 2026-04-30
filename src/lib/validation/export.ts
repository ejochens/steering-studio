import { z } from "zod/v4";

export const exportScopeSchema = z.enum(["all", "kiro", "copilot"]);

export const exportRequestSchema = z.object({
  projectId: z.string().min(1),
  scope: exportScopeSchema,
});

export type ExportScope = z.infer<typeof exportScopeSchema>;
export type ExportRequestInput = z.infer<typeof exportRequestSchema>;
