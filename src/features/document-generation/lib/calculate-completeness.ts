import type { KnowledgeModel } from "./assemble-knowledge-model";

export type CompletenessStatus = "complete" | "partial" | "empty";

export interface CompletenessResult {
  status: CompletenessStatus;
  missingFields: string[];
}

/**
 * Determines how complete a document's required fields are within the knowledge model.
 *
 * - "complete": all required fields are non-empty (after trimming)
 * - "empty": all required fields are empty
 * - "partial": some fields present, some missing
 */
export function calculateDocumentCompleteness(
  requiredFields: string[],
  model: KnowledgeModel,
): CompletenessResult {
  if (requiredFields.length === 0) {
    return { status: "complete", missingFields: [] };
  }

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = model[field as keyof KnowledgeModel];
    if (typeof value !== "string" || value.trim() === "") {
      missingFields.push(field);
    }
  }

  if (missingFields.length === 0) {
    return { status: "complete", missingFields: [] };
  }

  if (missingFields.length === requiredFields.length) {
    return { status: "empty", missingFields };
  }

  return { status: "partial", missingFields };
}
