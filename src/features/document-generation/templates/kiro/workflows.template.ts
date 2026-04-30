import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "branchingStrategy",
  "sourceControlPlatform",
  "ciCdApproach",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "codeReviewProcess", heading: "Code Review Process" },
  { field: "deploymentWorkflow", heading: "Deployment Workflow" },
];

export function renderWorkflowsMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Workflows and Team Practices\n";

  if (model.branchingStrategy.trim()) {
    md += "\n## Branching Strategy\n\n" + model.branchingStrategy + "\n";
  }

  if (model.sourceControlPlatform.trim()) {
    md += "\n## Source Control\n\n" + model.sourceControlPlatform + "\n";
  }

  if (model.ciCdApproach.trim()) {
    md += "\n## CI/CD Approach\n\n" + model.ciCdApproach + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
