"use server";

import { prisma } from "@/lib/db/prisma";
import { generateAllAnswersSchema, aiResponseSchema } from "@/lib/validation/intake";
import { getAdapter } from "@/lib/ai/adapters";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { buildIntakeAnswerPrompt } from "@/lib/ai/prompts/intake-answers";
import { adaptIntakePromptForExtension } from "@/lib/ai/prompts/extension-prompt-adapter";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { revalidatePath } from "next/cache";

function buildUploadedDocSummary(docs: { filename: string; content: string }[]): string | undefined {
  if (docs.length === 0) return undefined;
  const parts = docs.map((d) => `--- ${d.filename} ---\n${d.content.slice(0, 2000)}`);
  return parts.join("\n\n");
}

export interface GenerateAllAnswersInput {
  projectId: string;
}

export interface GenerateAllAnswersResult {
  success: boolean;
  error?: string;
  /** Suggestions for non-blank sections, keyed by sectionKey → fieldKey → value */
  suggestions?: Record<string, Record<string, string>>;
  /** Section keys that were blank and auto-filled */
  autoFilledSections?: string[];
  /** Section keys that have suggestions pending review */
  reviewSections?: string[];
}

export async function generateAllAnswers(
  input: GenerateAllAnswersInput,
): Promise<GenerateAllAnswersResult> {
  const parsed = generateAllAnswersSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId } = parsed.data;

  try {
    // 1. Resolve provider for intake function
    const providerConfig = await resolveProvider("intake");
    if (!providerConfig) {
      return { success: false, error: "No AI provider configured. Please set up a provider connection in Settings." };
    }

    // 3. Load all IntakeSection rows with Answer rows for the project
    const sections = await prisma.intakeSection.findMany({
      where: { projectId },
      include: { answers: true },
    });

    // 3a. Load the project to check projectType
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectType: true },
    });

    // 3b. If extension project, load uploaded documents for context
    let uploadedDocSummary: string | undefined;
    if (project?.projectType === "extension") {
      const uploadedDocs = await prisma.uploadedDocument.findMany({
        where: { projectId },
        select: { filename: true, content: true },
      });
      uploadedDocSummary = buildUploadedDocSummary(uploadedDocs);
    }

    // Build a lookup: sectionKey → Map<fieldKey, value>
    const sectionAnswerMap = new Map<string, Map<string, string>>();
    for (const section of sections) {
      const answerMap = new Map<string, string>();
      for (const answer of section.answers) {
        if (answer.value !== "") {
          answerMap.set(answer.fieldKey, answer.value);
        }
      }
      sectionAnswerMap.set(section.sectionKey, answerMap);
    }

    // 4. Identify blank fields and classify sections as blank vs non-blank
    const existingAnswers: Record<string, Record<string, string>> = {};
    const blankFields: Record<
      string,
      { fieldKey: string; label: string; type: string; helpText: string; options?: string[] }[]
    > = {};
    const blankSectionKeys = new Set<string>();
    const nonBlankSectionKeys = new Set<string>();

    for (const sectionDef of INTAKE_SECTIONS) {
      const answers = sectionAnswerMap.get(sectionDef.sectionKey) ?? new Map<string, string>();

      // Collect existing answers for context
      const existingForSection: Record<string, string> = {};
      for (const [fieldKey, value] of answers) {
        existingForSection[fieldKey] = value;
      }
      if (Object.keys(existingForSection).length > 0) {
        existingAnswers[sectionDef.sectionKey] = existingForSection;
      }

      // Determine if section is blank (no fields have non-empty answers)
      const hasAnyAnswer = sectionDef.fields.some((f) => {
        const val = answers.get(f.fieldKey);
        return val !== undefined && val !== "";
      });

      // Find blank fields in this section
      const blanks = sectionDef.fields.filter((f) => {
        const val = answers.get(f.fieldKey);
        return val === undefined || val === "";
      });

      if (blanks.length > 0) {
        blankFields[sectionDef.sectionKey] = blanks.map((f) => ({
          fieldKey: f.fieldKey,
          label: f.label,
          type: f.type,
          helpText: f.helpText,
          ...(f.options ? { options: f.options } : {}),
        }));
      }

      if (!hasAnyAnswer) {
        blankSectionKeys.add(sectionDef.sectionKey);
      } else {
        nonBlankSectionKeys.add(sectionDef.sectionKey);
      }
    }

    // 5. If no blank fields, return early
    if (Object.keys(blankFields).length === 0) {
      return {
        success: true,
        suggestions: {},
        autoFilledSections: [],
        reviewSections: [],
      };
    }

    // 6. Build prompt
    let messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);

    // 6a. Wrap prompt for extension projects
    if (project?.projectType === "extension") {
      messages = adaptIntakePromptForExtension(messages, uploadedDocSummary);
    }

    // 7. Call AI via adapter
    const adapter = getAdapter(providerConfig.providerType);
    const chatResult = await adapter.sendChat(providerConfig, messages, { temperature: 0.7 });

    // 8. Parse and validate JSON response
    let rawContent = chatResult.content.trim();

    // Strip markdown code fences if present
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return { success: false, error: "AI returned an invalid response. Please try again." };
    }

    const validated = aiResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return { success: false, error: "AI returned an invalid response format. Please try again." };
    }

    const aiResponse = validated.data;

    // 9. Filter to only valid field keys per section
    const filteredResponse: Record<string, Record<string, string>> = {};
    for (const [sectionKey, fieldValues] of Object.entries(aiResponse)) {
      const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
      if (!sectionDef) continue;

      const validFieldKeys = new Set(sectionDef.fields.map((f) => f.fieldKey));
      const filtered: Record<string, string> = {};
      for (const [fieldKey, value] of Object.entries(fieldValues)) {
        if (validFieldKeys.has(fieldKey)) {
          filtered[fieldKey] = value;
        }
      }
      if (Object.keys(filtered).length > 0) {
        filteredResponse[sectionKey] = filtered;
      }
    }

    // 10. Process blank sections: persist answers with source "ai-inferred"
    const autoFilledSections: string[] = [];
    for (const sectionKey of blankSectionKeys) {
      const values = filteredResponse[sectionKey];
      if (!values || Object.keys(values).length === 0) continue;

      const section = sections.find((s) => s.sectionKey === sectionKey);
      if (!section) continue;

      // Upsert each answer
      for (const [fieldKey, value] of Object.entries(values)) {
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
            source: "ai-inferred",
          },
          update: {
            value,
            source: "ai-inferred",
          },
        });
      }

      // Recalculate coverage
      const sectionDef = INTAKE_SECTIONS.find((s) => s.sectionKey === sectionKey);
      if (sectionDef) {
        const allAnswers = await prisma.answer.findMany({
          where: { intakeSectionId: section.id },
          select: { fieldKey: true, value: true },
        });
        const answerMap = new Map(allAnswers.map((a) => [a.fieldKey, a.value]));
        const coverageStatus = calculateCoverage(sectionDef.fields, answerMap);

        await prisma.intakeSection.update({
          where: { id: section.id },
          data: { coverageStatus },
        });
      }

      autoFilledSections.push(sectionKey);
    }

    // 11. Collect suggestions for non-blank sections (don't persist)
    const suggestions: Record<string, Record<string, string>> = {};
    const reviewSections: string[] = [];
    for (const sectionKey of nonBlankSectionKeys) {
      const values = filteredResponse[sectionKey];
      if (!values || Object.keys(values).length === 0) continue;

      suggestions[sectionKey] = values;
      reviewSections.push(sectionKey);
    }

    // 12. Revalidate path
    if (autoFilledSections.length > 0) {
      revalidatePath(`/projects/${projectId}/intake`);
    }

    return {
      success: true,
      suggestions,
      autoFilledSections,
      reviewSections,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[generateAllAnswers] Error:", message);
    return { success: false, error: `Failed to generate AI answers: ${message}` };
  }
}
