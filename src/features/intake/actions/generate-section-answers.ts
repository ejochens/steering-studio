"use server";

import { prisma } from "@/lib/db/prisma";
import { generateSectionAnswersSchema, aiSectionResponseSchema } from "@/lib/validation/intake";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { getAdapter } from "@/lib/ai/adapters";
import { buildSectionAnswerPrompt } from "@/lib/ai/prompts/intake-answers";
import { adaptSectionPromptForExtension } from "@/lib/ai/prompts/extension-prompt-adapter";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { revalidatePath } from "next/cache";

function buildUploadedDocSummary(docs: { filename: string; content: string }[]): string | undefined {
  if (docs.length === 0) return undefined;
  const parts = docs.map((d) => `--- ${d.filename} ---\n${d.content.slice(0, 2000)}`);
  return parts.join("\n\n");
}

export interface GenerateSectionAnswersInput {
  projectId: string;
  sectionKey: string;
}

export interface GenerateSectionAnswersResult {
  success: boolean;
  error?: string;
  suggestionCount?: number;
  /**
   * Suggestions for fields that already have accepted values.
   * These are NOT persisted — the UI shows them for per-field review.
   */
  pendingSuggestions?: Record<string, string>;
}

export async function generateSectionAnswers(
  input: GenerateSectionAnswersInput,
): Promise<GenerateSectionAnswersResult> {
  const parsed = generateSectionAnswersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }

  const { projectId, sectionKey } = parsed.data;

  try {
    // 1. Load provider
    const providerConfig = await resolveProvider("intake");
    if (!providerConfig) {
      return { success: false, error: "No AI provider configured. Set one up in Settings." };
    }

    // 2. Load the target section and its answers
    const section = await prisma.intakeSection.findUnique({
      where: { projectId_sectionKey: { projectId, sectionKey } },
      include: { answers: true },
    });

    if (!section) {
      return { success: false, error: "Section not found." };
    }

    const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
    if (!sectionDef) {
      return { success: false, error: "Unknown section." };
    }

    // 3. Load the project to check projectType
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectType: true },
    });

    // 3a. If extension project, load uploaded documents for context
    let uploadedDocSummary: string | undefined;
    if (project?.projectType === "extension") {
      const uploadedDocs = await prisma.uploadedDocument.findMany({
        where: { projectId },
        select: { filename: true, content: true },
      });
      uploadedDocSummary = buildUploadedDocSummary(uploadedDocs);
    }

    // 3b. Build existing answers map (all sections for context)
    const allSections = await prisma.intakeSection.findMany({
      where: { projectId },
      include: { answers: true },
    });

    const existingAnswers: Record<string, Record<string, string>> = {};
    for (const s of allSections) {
      const fields: Record<string, string> = {};
      for (const a of s.answers) {
        if (a.value && a.source !== "ai-suggested") {
          fields[a.fieldKey] = a.value;
        }
      }
      if (Object.keys(fields).length > 0) {
        existingAnswers[s.sectionKey] = fields;
      }
    }

    // 4. Identify which fields have accepted (non-suggested) values
    const acceptedAnswers = new Map(
      section.answers
        .filter((a) => a.source !== "ai-suggested" && a.value)
        .map((a) => [a.fieldKey, a.value]),
    );

    const targetFields = sectionDef.fields.map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      type: f.type,
      helpText: f.helpText,
      ...(f.options ? { options: f.options } : {}),
      currentValue: acceptedAnswers.get(f.fieldKey) || undefined,
    }));

    // 5. Build prompt and call AI
    let messages = buildSectionAnswerPrompt(sectionKey, existingAnswers, targetFields);

    // 5a. Wrap prompt for extension projects
    if (project?.projectType === "extension") {
      messages = adaptSectionPromptForExtension(messages, uploadedDocSummary);
    }

    const adapter = getAdapter(providerConfig.providerType);
    const chatResult = await adapter.sendChat(providerConfig, messages, { temperature: 0.7 });

    // 6. Parse response
    let rawContent = chatResult.content.trim();
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return { success: false, error: "AI returned an invalid response. Please try again." };
    }

    const validated = aiSectionResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { success: false, error: "AI returned an invalid response format. Please try again." };
    }

    // 7. Filter to valid field keys and split into blank vs filled
    const validFieldKeys = new Set(sectionDef.fields.map((f) => f.fieldKey));
    const blankFieldSuggestions: Record<string, string> = {};
    const filledFieldSuggestions: Record<string, string> = {};

    for (const [fieldKey, value] of Object.entries(validated.data)) {
      if (!validFieldKeys.has(fieldKey) || !value) continue;

      if (acceptedAnswers.has(fieldKey)) {
        // Field already has user content — don't persist, return for UI review
        filledFieldSuggestions[fieldKey] = value;
      } else {
        // Blank field — safe to persist as ai-suggested
        blankFieldSuggestions[fieldKey] = value;
      }
    }

    const totalSuggestions = Object.keys(blankFieldSuggestions).length + Object.keys(filledFieldSuggestions).length;
    if (totalSuggestions === 0) {
      return { success: true, suggestionCount: 0 };
    }

    // 8. Persist only blank field suggestions as "ai-suggested"
    for (const [fieldKey, value] of Object.entries(blankFieldSuggestions)) {
      await prisma.answer.upsert({
        where: {
          intakeSectionId_fieldKey: {
            intakeSectionId: section.id,
            fieldKey,
          },
        },
        create: {
          intakeSectionId: section.id,
          fieldKey,
          value,
          source: "ai-suggested",
        },
        update: {
          value,
          source: "ai-suggested",
        },
      });
    }

    if (Object.keys(blankFieldSuggestions).length > 0) {
      revalidatePath(`/projects/${projectId}/intake`);
    }

    return {
      success: true,
      suggestionCount: totalSuggestions,
      pendingSuggestions: Object.keys(filledFieldSuggestions).length > 0
        ? filledFieldSuggestions
        : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generateSectionAnswers] Error:", message);
    return { success: false, error: `Failed to generate answers: ${message}` };
  }
}
