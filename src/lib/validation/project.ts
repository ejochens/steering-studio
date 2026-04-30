import { z } from "zod/v4";

// ── Enum schemas (aligned with Prisma string columns) ────────────────

export const targetOutputSchema = z.enum(["Kiro", "Copilot", "Both"]);

export const projectTypeSchema = z.enum(["new", "extension"]);

export const projectStatusSchema = z.enum([
  "setup",
  "intake",
  "review",
  "generating",
  "complete",
]);

// ── Mutation schemas ─────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or fewer"),
  workingTitle: z
    .string()
    .min(1, "Working title is required")
    .max(200, "Working title must be 200 characters or fewer"),
  targetOutput: targetOutputSchema,
  projectType: projectTypeSchema,
  hasExistingDocs: z.boolean(),
});

export const updateProjectSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or fewer"),
  workingTitle: z
    .string()
    .min(1, "Working title is required")
    .max(200, "Working title must be 200 characters or fewer"),
  targetOutput: targetOutputSchema,
  projectType: projectTypeSchema,
  hasExistingDocs: z.boolean(),
  codebasePath: z.string().optional(),
});

// ── Inferred types ───────────────────────────────────────────────────

export type TargetOutput = z.infer<typeof targetOutputSchema>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectSettingsInput = z.infer<typeof updateProjectSettingsSchema>;
