/**
 * Import extractor module — sends parsed document content to the AI provider
 * for structured fact extraction and validates the response against known
 * intake section/field keys.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { buildImportExtractionPrompt } from "@/lib/ai/prompts/import-extraction";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { getAdapter } from "@/lib/ai/adapters";
import { aiResponseSchema } from "@/lib/validation/intake";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

export interface ExtractionResult {
  success: boolean;
  facts: Record<string, Record<string, string>>;
  error?: string;
}

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```) from a string.
 */
function stripCodeFences(raw: string): string {
  let text = raw.trim();
  // Remove opening fence: ```json or ```
  text = text.replace(/^```(?:json)?\s*\n?/, "");
  // Remove closing fence
  text = text.replace(/\n?```\s*$/, "");
  return text.trim();
}

/**
 * Filters an AI response object to only include section keys that exist in
 * INTAKE_SECTIONS and field keys that exist within each section's field
 * definitions. Exported separately for independent testing.
 */
export function filterValidKeys(
  data: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [sectionKey, fields] of Object.entries(data)) {
    const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
    if (!sectionDef) continue;

    const validFields: Record<string, string> = {};
    for (const [fieldKey, value] of Object.entries(fields)) {
      const fieldDef = sectionDef.fields.find((f) => f.fieldKey === fieldKey);
      if (fieldDef) {
        validFields[fieldKey] = value;
      }
    }

    if (Object.keys(validFields).length > 0) {
      result[sectionKey] = validFields;
    }
  }

  return result;
}


export interface ExistingAnswer {
  fieldKey: string;
  source: string;
}

/**
 * Filters extracted facts to exclude fields that already have user-confirmed answers.
 * Returns only the facts that should be persisted as ai-suggested.
 */
export function filterFactsForPersistence(
  facts: Record<string, Record<string, string>>,
  existingAnswersBySectionKey: Record<string, ExistingAnswer[]>,
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [sectionKey, fields] of Object.entries(facts)) {
    const existingAnswers = existingAnswersBySectionKey[sectionKey] ?? [];
    const confirmedFieldKeys = new Set(
      existingAnswers
        .filter((a) => a.source === "user-form" || a.source === "ai-conversation")
        .map((a) => a.fieldKey),
    );

    const filtered: Record<string, string> = {};
    for (const [fieldKey, value] of Object.entries(fields)) {
      if (!confirmedFieldKeys.has(fieldKey) && value.trim() !== "") {
        filtered[fieldKey] = value;
      }
    }

    if (Object.keys(filtered).length > 0) {
      result[sectionKey] = filtered;
    }
  }

  return result;
}

/**
 * Extracts structured facts from a parsed document payload by sending it
 * to the configured AI provider and validating the response.
 *
 * @param parsedPayload - The normalized document text from DocumentParser
 * @param providerConfig - Provider connection configuration
 * @param secret - Optional decrypted API key / secret
 * @returns ExtractionResult with success status, filtered facts, and optional error
 */
export async function extractFacts(
  parsedPayload: string,
  providerConfig: ProviderConfig,
  secret?: string,
): Promise<ExtractionResult> {
  try {
    // Build the extraction prompt
    const messages = buildImportExtractionPrompt(parsedPayload, INTAKE_SECTIONS);

    // Get the appropriate adapter
    const adapter = getAdapter(providerConfig.providerType);

    // Merge secret into config if provided
    const config: ProviderConfig = secret
      ? { ...providerConfig, secret }
      : providerConfig;

    // Call the AI provider
    const chatResult = await adapter.sendChat(config, messages);

    // Strip markdown code fences from the response
    const cleaned = stripCodeFences(chatResult.content);

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return {
        success: false,
        facts: {},
        error: "AI returned an invalid response. Please try again.",
      };
    }

    // Validate against the AI response schema
    const validation = aiResponseSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        success: false,
        facts: {},
        error: "AI returned an invalid response format. Please try again.",
      };
    }

    // Filter to only valid section/field keys
    const filteredFacts = filterValidKeys(validation.data);

    return {
      success: true,
      facts: filteredFacts,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    return {
      success: false,
      facts: {},
      error: message,
    };
  }
}
