// Types re-exported from Zod schemas (source of truth for validation).
// This file provides a convenient import path for components that only
// need the types without pulling in the Zod runtime.

export type {
  TargetOutput,
  ProjectStatus,
  CreateProjectInput,
} from "@/lib/validation/project";

export interface Project {
  id: string;
  name: string;
  workingTitle: string;
  targetOutput: import("@/lib/validation/project").TargetOutput;
  status: import("@/lib/validation/project").ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}
