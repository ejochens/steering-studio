import { getAdapter } from "@/lib/ai/adapters";
import type { ProviderConfig, ChatMessage } from "@/lib/ai/adapters/types";

export interface RefineResult {
  refined: string;
  wasRefined: boolean;
  error?: string;
}

const REFINE_SYSTEM_PROMPT = [
  "You are a senior technical writing editor working on project steering documents for software teams.",
  "Your task is to deeply analyze and improve the following markdown document.",
  "Think carefully about the structure, clarity, and completeness of the content.",
  "Remove repetition and strengthen phrasing.",
  "Ensure the document reads like it was written by an experienced architect or engineering lead.",
  "Preserve all factual content exactly — do not add, remove, or alter confirmed facts.",
  "Return only the improved markdown with no additional commentary.",
].join(" ");

export async function refineDocument(
  draft: string,
  providerConfig: ProviderConfig
): Promise<RefineResult> {
  try {
    const adapter = getAdapter(providerConfig.providerType);

    const messages: ChatMessage[] = [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
      { role: "user", content: draft },
    ];

    const result = await adapter.sendChat(providerConfig, messages, {
      reasoning: true,
      reasoningBudget: 16_000,
    });

    return { refined: result.content, wasRefined: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[refineDocument] AI refinement failed: ${message}`);
    return { refined: draft, wasRefined: false, error: message };
  }
}
