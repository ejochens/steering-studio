import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "testingFramework",
  "testTypes",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "coverageExpectations", heading: "Coverage Expectations" },
  { field: "qualityGates", heading: "Quality Gates" },
];

export function renderTestingMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Testing and Quality\n";

  if (model.testingFramework.trim()) {
    md += "\n## Testing Framework\n\n" + model.testingFramework + "\n";
  }

  if (model.testTypes.trim()) {
    md += "\n## Test Types\n\n" + model.testTypes + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
