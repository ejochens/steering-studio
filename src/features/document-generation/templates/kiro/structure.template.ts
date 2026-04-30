import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = [
  "folderStructure",
  "namingConventions",
  "moduleOrganization",
] as const;

const OPTIONAL_SECTIONS: ReadonlyArray<{
  field: keyof KnowledgeModel;
  heading: string;
}> = [
  { field: "codingStandards", heading: "Coding Standards" },
];

export function renderStructureMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  let md = "# Project Structure\n";

  if (model.folderStructure.trim()) {
    md += "\n## Folder Structure\n\n" + model.folderStructure + "\n";
  }

  if (model.namingConventions.trim()) {
    md += "\n## Naming Conventions\n\n" + model.namingConventions + "\n";
  }

  if (model.moduleOrganization.trim()) {
    md += "\n## Module Organization\n\n" + model.moduleOrganization + "\n";
  }

  for (const { field, heading } of OPTIONAL_SECTIONS) {
    const value = model[field];
    if (typeof value === "string" && value.trim()) {
      md += "\n## " + heading + "\n\n" + value + "\n";
    }
  }

  return { markdown: md, completeness: status, missingFields };
}
