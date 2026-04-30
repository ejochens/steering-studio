import type { ChatMessage } from "@/lib/ai/adapters/types";
import type { IntakeSectionDef } from "@/features/intake/config/sections";

/**
 * Builds a prompt for the AI to extract structured facts from uploaded
 * documents and map them to intake section/field keys.
 */
export function buildImportExtractionPrompt(
  documentPayload: string,
  fieldDefinitions: IntakeSectionDef[],
): ChatMessage[] {
  const systemContent = buildSystemMessage(fieldDefinitions);

  return [
    { role: "system", content: systemContent },
    {
      role: "user",
      content:
        `Extract structured facts from the following uploaded documents. Return only the JSON object, no additional text.\n\n${documentPayload}`,
    },
  ];
}

function buildSystemMessage(fieldDefinitions: IntakeSectionDef[]): string {
  const parts: string[] = [];

  parts.push(
    `You are an assistant that extracts structured facts from uploaded project documents. ` +
      `Your task is to read the provided documents and map relevant information to the intake fields listed below.\n\n` +
      `Return your response as a single JSON object with the following structure:\n\n` +
      `{ "[sectionKey]": { "[fieldKey]": "value" } }\n\n` +
      `Rules:\n` +
      `- Only extract facts that are explicitly stated or strongly implied in the documents. Do not invent details not present in the source material.\n` +
      `- Use the exact section keys and field keys listed below.\n` +
      `- Return empty strings for fields where no relevant information is found in the documents.\n` +
      `- For "single-select" fields, choose exactly one value from the provided options.\n` +
      `- For "multi-select" fields, return a comma-separated list of selected options.\n` +
      `- For "tag-list" fields, return a comma-separated list of relevant tags.\n` +
      `- For "short-text" fields, keep answers concise (one or two sentences).\n` +
      `- For "long-text" fields, provide detailed but focused answers.\n` +
      `- Return only valid JSON. No markdown fences, no commentary.`,
  );

  parts.push("\n--- Intake Field Definitions ---");
  for (const section of fieldDefinitions) {
    parts.push(`\nSection: ${section.sectionKey}`);
    parts.push(`  Display Name: ${section.displayName}`);
    parts.push(`  Description: ${section.description}`);
    for (const field of section.fields) {
      parts.push(`  Field: ${field.fieldKey}`);
      parts.push(`    Label: ${field.label}`);
      parts.push(`    Type: ${field.type}`);
      parts.push(`    Help: ${field.helpText}`);
      if (field.options && field.options.length > 0) {
        parts.push(`    Options: ${field.options.join(", ")}`);
      }
    }
  }

  return parts.join("\n");
}
