import type { ChatMessage } from "@/lib/ai/adapters/types";

const EXTENSION_CONTEXT =
  "The user is extending an existing project. Frame suggestions around changes, additions, and overrides rather than greenfield definitions.";

/**
 * Wraps the output of `buildIntakeAnswerPrompt` for extension projects.
 * Prepends extension framing to the system message and optionally appends
 * uploaded document context.
 */
export function adaptIntakePromptForExtension(
  messages: ChatMessage[],
  uploadedDocumentSummary?: string,
): ChatMessage[] {
  return adaptMessages(messages, uploadedDocumentSummary);
}

/**
 * Wraps the output of `buildSectionAnswerPrompt` for extension projects.
 * Prepends extension framing to the system message and optionally appends
 * uploaded document context.
 */
export function adaptSectionPromptForExtension(
  messages: ChatMessage[],
  uploadedDocumentSummary?: string,
): ChatMessage[] {
  return adaptMessages(messages, uploadedDocumentSummary);
}

/**
 * Shared adapter logic: finds the system message, prepends extension context,
 * and optionally appends uploaded document summary. All other messages are
 * returned unchanged.
 */
function adaptMessages(
  messages: ChatMessage[],
  uploadedDocumentSummary?: string,
): ChatMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "system") return msg;

    let content = `${EXTENSION_CONTEXT}\n\n${msg.content}`;

    if (uploadedDocumentSummary) {
      content += `\n\n--- Uploaded Document Context ---\n${uploadedDocumentSummary}`;
    }

    return { ...msg, content };
  });
}
