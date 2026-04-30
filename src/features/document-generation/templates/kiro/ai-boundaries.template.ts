import type { KnowledgeModel } from "@/features/document-generation/lib/assemble-knowledge-model";
import {
  resolveBoundaries,
  renderBoundariesMarkdown,
} from "@/features/document-generation/lib/ai-boundaries-defaults";
import { calculateDocumentCompleteness } from "@/features/document-generation/lib/calculate-completeness";
import type { TemplateResult } from "@/features/document-generation/templates/types";

const REQUIRED_FIELDS = ["developmentOs"] as const;

export function renderAiBoundariesMd(model: KnowledgeModel): TemplateResult {
  const { status, missingFields } = calculateDocumentCompleteness(
    REQUIRED_FIELDS as unknown as string[],
    model,
  );

  const resolved = resolveBoundaries(model);
  const markdown = renderBoundariesMarkdown(resolved);

  return { markdown, completeness: status, missingFields };
}
