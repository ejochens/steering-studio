import type { ChatMessage } from "@/lib/ai/adapters/types";

/**
 * Builds a prompt for the AI to generate contextually relevant answers
 * for blank intake fields, using existing project answers as context.
 */
export function buildIntakeAnswerPrompt(
  existingAnswers: Record<string, Record<string, string>>,
  blankFields: Record<
    string,
    {
      fieldKey: string;
      label: string;
      type: string;
      helpText: string;
      options?: string[];
    }[]
  >,
): ChatMessage[] {
  const systemContent = buildSystemMessage(existingAnswers, blankFields);

  return [
    { role: "system", content: systemContent },
    {
      role: "user",
      content:
        "Generate contextually relevant values for all the blank fields listed above. Return only the JSON object, no additional text.",
    },
  ];
}

function buildSystemMessage(
  existingAnswers: Record<string, Record<string, string>>,
  blankFields: Record<
    string,
    {
      fieldKey: string;
      label: string;
      type: string;
      helpText: string;
      options?: string[];
    }[]
  >,
): string {
  const parts: string[] = [];

  parts.push(
    `You are an assistant that generates answers for a project intake form. ` +
      `Your task is to fill in blank fields based on the context provided by existing project answers. ` +
      `Return your response as a single JSON object with the following structure:\n\n` +
      `{ "[sectionKey]": { "[fieldKey]": "value" } }\n\n` +
      `Rules:\n` +
      `- Only include the section keys and field keys listed in the blank fields below.\n` +
      `- For "single-select" fields, choose exactly one value from the provided options.\n` +
      `- For "multi-select" fields, return a comma-separated list of selected options.\n` +
      `- For "tag-list" fields, return a comma-separated list of relevant tags.\n` +
      `- For "short-text" fields, keep answers concise (one or two sentences).\n` +
      `- For "long-text" fields, provide detailed but focused answers.\n` +
      `- Base your answers on the existing project context. Do not invent unrelated details.\n` +
      `- Return only valid JSON. No markdown fences, no commentary.`,
  );

  // Existing answers as context
  const existingSections = Object.entries(existingAnswers);
  if (existingSections.length > 0) {
    parts.push("\n--- Existing Project Answers (context) ---");
    for (const [sectionKey, fields] of existingSections) {
      const fieldEntries = Object.entries(fields);
      if (fieldEntries.length === 0) continue;
      parts.push(`\nSection: ${sectionKey}`);
      for (const [fieldKey, value] of fieldEntries) {
        parts.push(`  ${fieldKey}: ${value}`);
      }
    }
  }

  // Blank fields to fill
  const blankSections = Object.entries(blankFields);
  if (blankSections.length > 0) {
    parts.push("\n--- Blank Fields to Fill ---");
    for (const [sectionKey, fields] of blankSections) {
      parts.push(`\nSection: ${sectionKey}`);
      for (const field of fields) {
        parts.push(`  Field: ${field.fieldKey}`);
        parts.push(`    Label: ${field.label}`);
        parts.push(`    Type: ${field.type}`);
        parts.push(`    Help: ${field.helpText}`);
        if (field.options && field.options.length > 0) {
          parts.push(`    Options: ${field.options.join(", ")}`);
        }
      }
    }
  }

  return parts.join("\n");
}


/**
 * Builds a prompt for the AI to generate or improve answers for fields
 * in a single intake section, using all existing project answers as context.
 * Fields may already have values — the AI should improve or replace them.
 */
export function buildSectionAnswerPrompt(
  sectionKey: string,
  existingAnswers: Record<string, Record<string, string>>,
  targetFields: {
    fieldKey: string;
    label: string;
    type: string;
    helpText: string;
    options?: string[];
    currentValue?: string;
  }[],
): ChatMessage[] {
  const parts: string[] = [];

  const hasFilledFields = targetFields.some((f) => f.currentValue);

  parts.push(
    `You are an assistant that generates answers for a project intake form. ` +
      `Your task is to provide values for the "${sectionKey}" section based on the context provided by existing project answers. ` +
      `Return your response as a single JSON object with the following structure:\n\n` +
      `{ "[fieldKey]": "value" }\n\n` +
      `Rules:\n` +
      `- Include ALL field keys listed below.\n` +
      `- For "single-select" fields, choose exactly one value from the provided options.\n` +
      `- For "multi-select" fields, return a comma-separated list of selected options.\n` +
      `- For "tag-list" fields, return a comma-separated list of relevant tags.\n` +
      `- For "short-text" fields, keep answers concise (one or two sentences).\n` +
      `- For "long-text" fields, provide detailed but focused answers.\n` +
      `- Base your answers on the existing project context. Do not invent unrelated details.\n` +
      (hasFilledFields
        ? `- Some fields already have values. Improve them if you can add meaningful detail, or keep them if they are already good.\n`
        : "") +
      `- Return only valid JSON. No markdown fences, no commentary.`,
  );

  // Existing answers as context (from other sections)
  const existingSections = Object.entries(existingAnswers);
  if (existingSections.length > 0) {
    parts.push("\n--- Existing Project Answers (context) ---");
    for (const [key, fields] of existingSections) {
      if (key === sectionKey) continue; // skip the target section from context
      const fieldEntries = Object.entries(fields);
      if (fieldEntries.length === 0) continue;
      parts.push(`\nSection: ${key}`);
      for (const [fieldKey, value] of fieldEntries) {
        parts.push(`  ${fieldKey}: ${value}`);
      }
    }
  }

  // Target fields for this section
  parts.push(`\n--- Fields to Generate (section: ${sectionKey}) ---`);
  for (const field of targetFields) {
    parts.push(`  Field: ${field.fieldKey}`);
    parts.push(`    Label: ${field.label}`);
    parts.push(`    Type: ${field.type}`);
    parts.push(`    Help: ${field.helpText}`);
    if (field.options && field.options.length > 0) {
      parts.push(`    Options: ${field.options.join(", ")}`);
    }
    if (field.currentValue) {
      parts.push(`    Current value: ${field.currentValue}`);
    }
  }

  return [
    { role: "system", content: parts.join("\n") },
    {
      role: "user",
      content:
        "Generate contextually relevant values for all the fields listed above. Return only the JSON object, no additional text.",
    },
  ];
}
