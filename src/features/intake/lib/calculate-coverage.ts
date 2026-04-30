import type { CoverageStatus } from "@/lib/validation/intake";
import type { IntakeFieldDef } from "@/features/intake/config/sections";

/**
 * Calculates the coverage status for a section based on its field definitions
 * and the current answers.
 *
 * Rules:
 * - "unknown": no answers exist for any field in the section
 * - "partial": some required fields have answers but not all
 * - "complete": all required fields have non-empty answers
 */
export function calculateCoverage(
  fields: IntakeFieldDef[],
  answers: Map<string, string>,
): CoverageStatus {
  const requiredFields = fields.filter((f) => f.status === "required");

  // If there are no required fields, check if any answers exist at all
  if (requiredFields.length === 0) {
    return "complete";
  }

  const answeredRequired = requiredFields.filter((f) => {
    const value = answers.get(f.fieldKey);
    return value !== undefined && value !== "";
  });

  if (answeredRequired.length === 0) {
    // Check if any field (required or optional) has an answer
    const hasAnyAnswer = fields.some((f) => {
      const value = answers.get(f.fieldKey);
      return value !== undefined && value !== "";
    });
    return hasAnyAnswer ? "partial" : "unknown";
  }

  if (answeredRequired.length === requiredFields.length) {
    return "complete";
  }

  return "partial";
}
