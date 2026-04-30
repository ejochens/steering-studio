import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "authenticationMethod",
  "authorizationModel",
  "dataSensitivity",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "complianceRequirements", heading: "Compliance Requirements" },
];

export function renderSecurityMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Security and Compliance\n";

  if (model.authenticationMethod.trim()) {
    md += "\n## Authentication\n\n" + model.authenticationMethod + "\n";
  }

  if (model.authorizationModel.trim()) {
    md += "\n## Authorization\n\n" + model.authorizationModel + "\n";
  }

  if (model.dataSensitivity.trim()) {
    md += "\n## Data Sensitivity\n\n" + model.dataSensitivity + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
