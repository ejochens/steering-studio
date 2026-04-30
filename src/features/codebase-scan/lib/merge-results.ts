import type { ScanFact, ScanResult } from "./types";

/**
 * Merges deterministic and AI-derived facts into a single ScanResult.
 *
 * Merge rules:
 * - Group facts by (sectionKey, fieldKey)
 * - Deterministic facts always take precedence over AI facts for the same field
 * - When multiple deterministic parsers produce values for the same field, concatenate with ", "
 * - AI facts only fill fields not already covered by deterministic parsers
 */
export function mergeResults(
  deterministicFacts: ScanFact[],
  aiFacts: ScanFact[],
  filesScanned: string[],
  warnings: string[],
): ScanResult {
  const fieldKey = (f: ScanFact) => `${f.sectionKey}::${f.fieldKey}`;

  // Group deterministic facts by (sectionKey, fieldKey)
  const deterministicMap = new Map<string, ScanFact[]>();
  for (const fact of deterministicFacts) {
    const key = fieldKey(fact);
    const existing = deterministicMap.get(key);
    if (existing) {
      existing.push(fact);
    } else {
      deterministicMap.set(key, [fact]);
    }
  }

  // Build merged facts starting with deterministic
  const mergedFacts: ScanFact[] = [];
  const coveredKeys = new Set<string>();

  for (const [key, facts] of deterministicMap) {
    coveredKeys.add(key);
    // Concatenate values from multiple deterministic parsers
    const mergedValue = facts.map((f) => f.value).join(", ");
    const first = facts[0];
    mergedFacts.push({
      sectionKey: first.sectionKey,
      fieldKey: first.fieldKey,
      value: mergedValue,
      sourceFile: facts.map((f) => f.sourceFile).join(", "),
      source: "codebase-scan",
    });
  }

  // Add AI facts only for fields not already covered by deterministic parsers
  const aiMap = new Map<string, ScanFact[]>();
  for (const fact of aiFacts) {
    const key = fieldKey(fact);
    if (!coveredKeys.has(key)) {
      const existing = aiMap.get(key);
      if (existing) {
        existing.push(fact);
      } else {
        aiMap.set(key, [fact]);
      }
    }
  }

  for (const [key, facts] of aiMap) {
    coveredKeys.add(key);
    const mergedValue = facts.map((f) => f.value).join(", ");
    const first = facts[0];
    mergedFacts.push({
      sectionKey: first.sectionKey,
      fieldKey: first.fieldKey,
      value: mergedValue,
      sourceFile: facts.map((f) => f.sourceFile).join(", "),
      source: "ai-codebase-scan",
    });
  }

  // Count unique fields by source
  const deterministicFieldCount = deterministicMap.size;
  const aiFieldCount = aiMap.size;

  return {
    facts: mergedFacts,
    filesScanned,
    deterministicFieldCount,
    aiFieldCount,
    warnings,
  };
}
