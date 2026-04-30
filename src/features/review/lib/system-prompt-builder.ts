import { INTAKE_SECTIONS } from "@/features/intake/config/sections";
import type { GapSummary } from "./gap-analyzer";

/**
 * Builds the system prompt for the review assistant.
 *
 * Pure function — accepts a GapSummary and project name,
 * returns a single string used as the system prompt.
 */
export function buildReviewSystemPrompt(
  gapSummary: GapSummary,
  projectName: string,
): string {
  const sections: string[] = [];

  // 1. Role definition
  sections.push(
    `You are a review assistant for the project "${projectName}".`,
    "Your role is to help the user complete their project intake by asking targeted follow-up questions about missing or incomplete information across all intake sections.",
    "",
    "IMPORTANT: The intake state below is the authoritative source of truth. Fields listed under \"Confirmed Answers\" already have good data and MUST NOT be described as missing, gaps, or incomplete. Only fields listed under \"Missing Required Fields\" or \"Missing Optional Fields\" are actually missing.",
  );

  // 2. Current intake state
  sections.push("");
  sections.push("## Current Intake State");

  // Confirmed answers
  const confirmedEntries = Object.entries(gapSummary.confirmedAnswers);
  if (confirmedEntries.length > 0) {
    sections.push("");
    sections.push("### Confirmed Answers (DO NOT treat these as missing or gaps)");
    sections.push("The following fields already have confirmed values. Do not ask about them again or claim they are incomplete:");
    for (const [sectionKey, fields] of confirmedEntries) {
      for (const [fieldKey, value] of Object.entries(fields)) {
        sections.push(`- ✅ [${sectionKey}] ${fieldKey}: ${value}`);
      }
    }
  } else {
    sections.push("");
    sections.push("No answers have been confirmed yet.");
  }

  // Missing required fields
  if (gapSummary.missingRequired.length > 0) {
    sections.push("");
    sections.push("### Missing Required Fields (these are the ONLY gaps to address)");
    for (const field of gapSummary.missingRequired) {
      sections.push(
        `- ❌ [${field.sectionKey}] ${field.fieldKey}: ${field.label} — ${field.helpText}`,
      );
    }
  } else {
    sections.push("");
    sections.push("### Missing Required Fields");
    sections.push("None — all required fields have confirmed answers.");
  }

  // Missing optional fields
  if (gapSummary.missingOptional.length > 0) {
    sections.push("");
    sections.push("### Missing Optional Fields");
    for (const field of gapSummary.missingOptional) {
      sections.push(
        `- [${field.sectionKey}] ${field.fieldKey}: ${field.label} — ${field.helpText}`,
      );
    }
  }

  // 3. Behavioral instructions
  sections.push("");
  sections.push("## Instructions");
  sections.push("");
  sections.push("Follow these rules when conversing with the user:");
  sections.push("1. Ask one clarifying question at a time. Do not overwhelm the user with multiple questions in a single message.");
  sections.push("2. Explain why a question matters when the relevance is not obvious, so the user understands how their answer improves the project context.");
  sections.push("3. NEVER claim that a confirmed field is missing, a gap, or incomplete. Only fields listed under \"Missing Required Fields\" or \"Missing Optional Fields\" are actually missing. If a field appears in \"Confirmed Answers\", it is settled — do not mention it as a gap.");
  sections.push("4. Summarize what you have learned after important milestones in the conversation, such as completing a section or gathering several related facts.");
  sections.push("5. Do not invent company-specific constraints, assume technical decisions, or claim information is final when required data is still missing.");
  sections.push("6. When summarizing the current state, only list fields from the \"Missing\" sections as gaps. Confirmed answers should be referenced as already captured.");

  // 4. Valid section keys and field keys reference
  sections.push("");
  sections.push("## Valid Section and Field Keys");
  sections.push("");
  sections.push("When mapping facts from the conversation, use only these section and field keys:");
  sections.push("");
  for (const sectionDef of INTAKE_SECTIONS) {
    sections.push(`### ${sectionDef.sectionKey}`);
    for (const field of sectionDef.fields) {
      sections.push(`- ${field.fieldKey} (${field.label})`);
    }
    sections.push("");
  }

  return sections.join("\n");
}
