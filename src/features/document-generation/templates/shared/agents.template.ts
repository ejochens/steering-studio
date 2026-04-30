import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = ["productName", "productPurpose"] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "architecturePattern", heading: "Architecture" },
  { field: "testingFramework", heading: "Testing" },
  { field: "codingStandards", heading: "Coding Standards" },
  { field: "nonGoals", heading: "Non-Goals" },
];

export function renderAgentsMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# AGENTS.md\n";

  if (model.productName.trim() || model.productPurpose.trim()) {
    md += "\n## Project\n\n";
    const parts: string[] = [];
    if (model.productName.trim()) parts.push(model.productName);
    if (model.productPurpose.trim()) parts.push(model.productPurpose);
    md += parts.join(" — ") + "\n";
  }

  if (model.programmingLanguages.trim() || model.frameworks.trim()) {
    md += "\n## Tech Stack\n\n";
    const techParts: string[] = [];
    if (model.programmingLanguages.trim())
      techParts.push(model.programmingLanguages);
    if (model.frameworks.trim()) techParts.push(model.frameworks);
    md += techParts.join(", ") + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
