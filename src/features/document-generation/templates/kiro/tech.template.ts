import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "programmingLanguages",
  "frameworks",
  "database",
  "architecturePattern",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "hostingDeployment", heading: "Hosting and Deployment" },
  { field: "codingStandards", heading: "Coding Standards" },
];

export function renderTechMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Technology Stack\n";

  if (model.programmingLanguages.trim()) {
    md += "\n## Programming Languages\n\n" + model.programmingLanguages + "\n";
  }

  if (model.frameworks.trim()) {
    md += "\n## Frameworks\n\n" + model.frameworks + "\n";
  }

  if (model.database.trim()) {
    md += "\n## Database\n\n" + model.database + "\n";
  }

  if (model.architecturePattern.trim()) {
    md += "\n## Architecture Pattern\n\n" + model.architecturePattern + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
