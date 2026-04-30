import { describe, it, expect, vi } from "vitest";
import { refineDocument } from "../ai-refiner";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

vi.mock("@/lib/ai/adapters", () => ({
  getAdapter: vi.fn(),
}));

import { getAdapter } from "@/lib/ai/adapters";

const mockGetAdapter = vi.mocked(getAdapter);

const providerConfig: ProviderConfig = {
  providerType: "openai",
  modelName: "gpt-4",
  authMode: "api_key",
  secret: "test-key",
};

describe("refineDocument", () => {
  it("returns refined content on success", async () => {
    const mockAdapter = {
      testConnection: vi.fn(),
      sendChat: vi.fn().mockResolvedValue({ content: "Improved markdown" }),
    };
    mockGetAdapter.mockReturnValue(mockAdapter);

    const result = await refineDocument("# Draft\nSome content", providerConfig);

    expect(result).toEqual({ refined: "Improved markdown", wasRefined: true });
    expect(mockAdapter.sendChat).toHaveBeenCalledWith(
      providerConfig,
      [
        { role: "system", content: expect.stringContaining("improve") },
        { role: "user", content: "# Draft\nSome content" },
      ],
      { reasoning: true, reasoningBudget: 16_000 }
    );
  });

  it("falls back to draft on sendChat error", async () => {
    const mockAdapter = {
      testConnection: vi.fn(),
      sendChat: vi.fn().mockRejectedValue(new Error("Provider unavailable")),
    };
    mockGetAdapter.mockReturnValue(mockAdapter);

    const draft = "# Original Draft";
    const result = await refineDocument(draft, providerConfig);

    expect(result).toEqual({
      refined: draft,
      wasRefined: false,
      error: "Provider unavailable",
    });
  });

  it("falls back to draft on getAdapter error", async () => {
    mockGetAdapter.mockImplementation(() => {
      throw new Error("Unknown provider type: invalid");
    });

    const draft = "# My Draft";
    const result = await refineDocument(draft, {
      ...providerConfig,
      providerType: "bedrock",
    });

    expect(result).toEqual({
      refined: draft,
      wasRefined: false,
      error: expect.stringContaining("Unknown provider type"),
    });
  });

  it("handles non-Error thrown values", async () => {
    const mockAdapter = {
      testConnection: vi.fn(),
      sendChat: vi.fn().mockRejectedValue("string error"),
    };
    mockGetAdapter.mockReturnValue(mockAdapter);

    const draft = "# Draft";
    const result = await refineDocument(draft, providerConfig);

    expect(result).toEqual({
      refined: draft,
      wasRefined: false,
      error: "string error",
    });
  });

  it("passes the draft as the user message", async () => {
    const mockAdapter = {
      testConnection: vi.fn(),
      sendChat: vi.fn().mockResolvedValue({ content: "refined" }),
    };
    mockGetAdapter.mockReturnValue(mockAdapter);

    const draft = "# Heading\n\nParagraph with **bold** text.";
    await refineDocument(draft, providerConfig);

    const messages = mockAdapter.sendChat.mock.calls[0][1];
    expect(messages[1]).toEqual({ role: "user", content: draft });
  });

  it("system prompt instructs fact preservation", async () => {
    const mockAdapter = {
      testConnection: vi.fn(),
      sendChat: vi.fn().mockResolvedValue({ content: "refined" }),
    };
    mockGetAdapter.mockReturnValue(mockAdapter);

    await refineDocument("draft", providerConfig);

    const messages = mockAdapter.sendChat.mock.calls[0][1];
    const systemMsg = messages[0].content;
    expect(systemMsg).toContain("do not add, remove, or alter confirmed facts");
  });
});
