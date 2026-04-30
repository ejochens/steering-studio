import type { ChatMessage } from "@/lib/ai/adapters/types";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import type { SectionKey } from "@/lib/validation/intake";

/**
 * A single validated fact extracted from a review conversation,
 * enriched with display names for UI presentation.
 */
export interface ExtractedFact {
  sectionKey: string;
  fieldKey: string;
  sectionName: string;
  fieldLabel: string;
  value: string;
}

/**
 * Builds a ChatMessage array that instructs the AI to extract structured
 * facts from a review conversation transcript.
 *
 * The system prompt lists every valid section/field key from INTAKE_SECTIONS
 * and requests a JSON-only response in the shape `{ sectionKey: { fieldKey: value } }`.
 */
export function buildFactExtractionPrompt(
  transcript: ChatMessage[],
): ChatMessage[] {
  const lines: string[] = [];

  lines.push(
    "You are a fact extraction assistant. Your job is to read the conversation transcript below and extract structured facts that map to the project intake model.",
  );
  lines.push("");
  lines.push("## Rules");
  lines.push("1. Only extract facts that are explicitly stated or strongly implied by the user.");
  lines.push("2. Do not invent or assume information that was not discussed.");
  lines.push("3. Respond with JSON only. No markdown fences, no explanation, no extra text.");
  lines.push("4. Use the exact section keys and field keys listed below.");
  lines.push("5. If no facts can be extracted, respond with an empty JSON object: {}");
  lines.push("");
  lines.push("## Response Format");
  lines.push("");
  lines.push("Respond with a JSON object in this shape:");
  lines.push("```");
  lines.push("{ \"sectionKey\": { \"fieldKey\": \"value\" } }");
  lines.push("```");
  lines.push("");
  lines.push("## Valid Section and Field Keys");
  lines.push("");

  for (const section of INTAKE_SECTIONS) {
    lines.push(`### ${section.sectionKey} (${section.displayName})`);
    for (const field of section.fields) {
      lines.push(`- ${field.fieldKey} (${field.label}): ${field.helpText}`);
    }
    lines.push("");
  }

  const systemMessage: ChatMessage = {
    role: "system",
    content: lines.join("\n"),
  };

  return [systemMessage, ...transcript];
}

/**
 * Parses the raw AI response string into validated ExtractedFact entries.
 *
 * - Strips markdown code fences if present
 * - Parses JSON
 * - Validates each sectionKey exists in INTAKE_SECTIONS
 * - Validates each fieldKey exists in that section's field definitions
 * - Enriches valid facts with sectionName and fieldLabel
 * - Returns only valid entries; returns empty array on parse failure
 */
export function parseFactExtractionResponse(
  rawContent: string,
): ExtractedFact[] {
  const stripped = stripCodeFences(rawContent).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [];
  }

  // Build lookup maps for validation and enrichment
  const sectionMap = new Map(
    INTAKE_SECTIONS.map((s) => [s.sectionKey, s]),
  );

  const facts: ExtractedFact[] = [];
  const record = parsed as Record<string, unknown>;

  for (const [sectionKey, fields] of Object.entries(record)) {
    const sectionDef = sectionMap.get(sectionKey as SectionKey);
    if (!sectionDef) continue;

    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      continue;
    }

    const fieldRecord = fields as Record<string, unknown>;
    for (const [fieldKey, value] of Object.entries(fieldRecord)) {
      if (typeof value !== "string" || value.trim() === "") continue;

      const fieldDef = sectionDef.fields.find((f) => f.fieldKey === fieldKey);
      if (!fieldDef) continue;

      facts.push({
        sectionKey,
        fieldKey,
        sectionName: sectionDef.displayName,
        fieldLabel: fieldDef.label,
        value: value.trim(),
      });
    }
  }

  return facts;
}

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```) from a string.
 */
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "");
}
