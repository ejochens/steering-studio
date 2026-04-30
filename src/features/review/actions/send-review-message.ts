"use server";

import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/utils/crypto";
import { getAdapter } from "@/lib/ai/adapters";
import type { ChatMessage } from "@/lib/ai/adapters";
import { sendReviewMessageSchema } from "@/lib/validation/review";
import { analyzeGaps } from "@/features/review/lib/gap-analyzer";
import { buildReviewSystemPrompt } from "@/features/review/lib/system-prompt-builder";
import { revalidatePath } from "next/cache";

export interface SendReviewMessageResult {
  success: boolean;
  error?: string;
  assistantMessage?: string;
  sessionId?: string;
}

export async function sendReviewMessage(
  input: unknown,
): Promise<SendReviewMessageResult> {
  // 1. Validate input
  const parsed = sendReviewMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input. Please check your values." };
  }

  const { projectId, content } = parsed.data;

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

    // 4. Upsert ConversationSession for the project
    const session = await prisma.conversationSession.upsert({
      where: { projectId },
      create: { projectId },
      update: {},
    });

    // 5. Create user ConversationMessage
    await prisma.conversationMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content,
      },
    });

    // 6. Load all messages for the session ordered by createdAt
    const allMessages = await prisma.conversationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });

    // 7. Load project name and all IntakeSections with answers for gap analysis
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    const intakeSections = await prisma.intakeSection.findMany({
      where: { projectId },
      include: { answers: true },
    });

    // 8. Run analyzeGaps on the intake sections
    const gapSummary = analyzeGaps(intakeSections);

    // 9. Build system prompt with buildReviewSystemPrompt
    const systemPrompt = buildReviewSystemPrompt(gapSummary, project?.name ?? "Untitled Project");

    // 10. Build ChatMessage array: system prompt + all conversation messages
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...allMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 11. Call adapter.sendChat with the provider config and messages
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

    // 12. Create assistant ConversationMessage with the response
    await prisma.conversationMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: chatResult.content,
      },
    });

    // 13. Revalidate the review page
    revalidatePath(`/projects/${projectId}/review`);

    // 14. Return success
    return {
      success: true,
      assistantMessage: chatResult.content,
      sessionId: session.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sendReviewMessage] Error:", message);
    return { success: false, error: `Failed to send message: ${message}` };
  }
}
