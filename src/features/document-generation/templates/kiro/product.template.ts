import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "productName",
  "productPurpose",
  "targetUsers",
  "primaryUseCases",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "problemStatement", heading: "Problem Statement" },
  { field: "desiredOutcomes", heading: "Desired Outcomes" },
  { field: "successMetrics", heading: "Success Metrics" },
  { field: "keyValueProposition", heading: "Key Value Proposition" },
  { field: "inScopeFeatures", heading: "Scope" },
  { field: "nonGoals", heading: "Non-Goals" },
  { field: "mvpBoundaries", heading: "MVP Boundaries" },
  { field: "futureConsiderations", heading: "Future Considerations" },
];

export function renderProductMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Product Overview\n";

  if (model.productName.trim()) {
    md += "\n## Product Name\n\n" + model.productName + "\n";
  }

  if (model.productPurpose.trim()) {
    md += "\n## Purpose\n\n" + model.productPurpose + "\n";
  }

  if (model.targetUsers.trim()) {
    md += "\n## Target Users\n\n" + model.targetUsers + "\n";
  }

  if (model.primaryUseCases.trim()) {
    md += "\n## Primary Use Cases\n\n" + model.primaryUseCases + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
