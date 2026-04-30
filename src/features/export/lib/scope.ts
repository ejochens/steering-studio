import type { TargetOutput } from "@/lib/validation";
import type { TemplateDefinition } from "@/features/document-generation/lib/template-registry";
import type { ExportScope } from "@/lib/validation";

import { getTemplatesForTarget } from "@/features/document-generation/lib/template-registry";

/**
 * Returns the allowed scopes for a given project target output.
 * - "Kiro" → ["kiro"]
 * - "Copilot" → ["copilot"]
 * - "Both" → ["all", "kiro", "copilot"]
 */
export function getAllowedScopes(targetOutput: TargetOutput): ExportScope[] {
  switch (targetOutput) {
    case "Kiro":
      return ["kiro"];
    case "Copilot":
      return ["copilot"];
    case "Both":
      return ["all", "kiro", "copilot"];
  }
}

/**
 * Returns the default scope for a given project target output.
 * - "Kiro" → "kiro"
 * - "Copilot" → "copilot"
 * - "Both" → "all"
 */
export function getDefaultScope(targetOutput: TargetOutput): ExportScope {
  switch (targetOutput) {
    case "Kiro":
      return "kiro";
    case "Copilot":
      return "copilot";
    case "Both":
      return "all";
  }
}

/**
 * Filters template definitions to only those matching the export scope.
 * - "all" → all templates for the target
 * - "kiro" → only templates where target === "kiro"
 * - "copilot" → only templates where target === "copilot"
 */
export function getTemplatesForScope(
  scope: ExportScope,
  targetOutput: TargetOutput,
): TemplateDefinition[] {
  const templates = getTemplatesForTarget(targetOutput);

  if (scope === "all") {
    return templates;
  }

  return templates.filter((t) => t.target === scope);
}
