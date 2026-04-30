import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import {
  resolveBoundaries,
  renderBoundariesMarkdown,
} from "@/features/document-generation/lib/ai-boundaries-defaults";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "productName",
  "productPurpose",
  "programmingLanguages",
  "frameworks",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "architecturePattern", heading: "Architecture" },
  { field: "database", heading: "Database" },
  { field: "codingStandards", heading: "Coding Standards" },
  { field: "nonGoals", heading: "Non-Goals" },
];

export function renderCopilotInstructionsMd(
  model: KnowledgeModel,
): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Copilot Instructions\n";

  if (model.productName.trim() || model.productPurpose.trim()) {
    md += "\n## Project\n\n";
    const parts: string[] = [];
    if (model.productName.trim()) parts.push(model.productName);
    if (model.productPurpose.trim()) parts.push(model.productPurpose);
    md += parts.join(" — ") + "\n";
  }

  if (model.programmingLanguages.trim() || model.frameworks.trim()) {
    md += "\n## Tech Stack\n\n";
    if (model.programmingLanguages.trim()) {
      md += "- Languages: " + model.programmingLanguages + "\n";
    }
    if (model.frameworks.trim()) {
      md += "- Frameworks: " + model.frameworks + "\n";
    }
  }

  // Testing section: combine testingFramework and testTypes
  if (model.testingFramework.trim() || model.testTypes.trim()) {
    md += "\n## Testing\n\n";
    const testParts: string[] = [];
    if (model.testingFramework.trim()) testParts.push(model.testingFramework);
    if (model.testTypes.trim()) testParts.push(model.testTypes);
    md += testParts.join(" / ") + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  // Workflow section: combine branchingStrategy and ciCdApproach
  if (model.branchingStrategy.trim() || model.ciCdApproach.trim()) {
    md += "\n## Workflow\n\n";
    const workflowParts: string[] = [];
    if (model.branchingStrategy.trim())
      workflowParts.push(model.branchingStrategy);
    if (model.ciCdApproach.trim()) workflowParts.push(model.ciCdApproach);
    md += workflowParts.join(" / ") + "\n";
  }

  // Append AI boundaries section
  const resolved = resolveBoundaries(model);
  const boundariesMd = renderBoundariesMarkdown(resolved);
  md += "\n" + boundariesMd;

  return { markdown: md, completeness: status, missingFields };
}
