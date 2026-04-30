"use server";

import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/utils/crypto";
import { getAdapter } from "@/lib/ai/adapters";
import { extractReviewFactsSchema } from "@/lib/validation/review";
import {
  buildFactExtractionPrompt,
  parseFactExtractionResponse,
} from "@/features/review/lib/fact-extractor";
import type { ExtractedFact } from "@/features/review/lib/fact-extractor";

export interface ExtractReviewFactsResult {
  success: boolean;
  error?: string;
  facts?: ExtractedFact[];
}

export async function extractReviewFacts(
  input: unknown,
): Promise<ExtractReviewFactsResult> {
  // 1. Validate input
  const parsed = extractReviewFactsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId } = parsed.data;

  try {
    // 2. Load ProviderConnection
    const provider = await prisma.providerConnection.findFirst();
    if (!provider) {
      return {
        success: false,
        error: "No AI provider configured. Please set up a provider connection in Settings.",
      };
    }

    // 3. Decrypt the secret server-side
    const secret = provider.encryptedSecret ? decrypt(provider.encryptedSecret) : undefined;

    // 4. Load the ConversationSession for the project
    const session = await prisma.conversationSession.findUnique({
      where: { projectId },
    });
    if (!session) {
      return {
        success: false,
        error: "No conversation session found for this project. Start a conversation first.",
      };
    }

    // 5. Load all ConversationMessages for the session ordered by createdAt
    const allMessages = await prisma.conversationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    // 6. Build the extraction prompt using the fact extractor
    const transcript = allMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const chatMessages = buildFactExtractionPrompt(transcript);

    // 7. Call adapter.sendChat
    const adapter = getAdapter(provider.providerType);
    const chatResult = await adapter.sendChat(
      {
        providerType: provider.providerType as "openai" | "azure_openai" | "bedrock",
        endpoint: provider.endpoint ?? undefined,
        region: provider.region ?? undefined,
        modelName: provider.modelName,
        authMode: provider.authMode as "api_key" | "iam" | "session",
        secret,
        apiVersion: provider.apiVersion ?? undefined,
      },
      chatMessages,
    );

    // 8. Parse the response using the fact extractor
    const facts = parseFactExtractionResponse(chatResult.content);

    // 9. If parsing returns empty and the raw response is not empty JSON, return error
    if (facts.length === 0 && chatResult.content.trim() !== "{}") {
      return {
        success: false,
        error: "Could not extract facts from the conversation. The AI response was not in the expected format.",
      };
    }

    // 10. Return success with facts
    return { success: true, facts };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractReviewFacts] Error:", message);
    return { success: false, error: `Failed to extract facts: ${message}` };
  }
}
