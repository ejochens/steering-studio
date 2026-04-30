import type { CompletenessStatus } from "@/features/document-generation/lib/calculate-completeness";

export interface TemplateResult {
  markdown: string;
  completeness: CompletenessStatus;
  missingFields: string[];
}
