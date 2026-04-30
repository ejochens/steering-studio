import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProviderConfig, ProviderAdapter, ChatResult } from "@/lib/ai/adapters/types";
import type { ScanFact } from "../lib/types";

// Mock the adapters module
const mockSendChat = vi.fn<() => Promise<ChatResult>>();
vi.mock("@/lib/ai/adapters", () => ({
  getAdapter: vi.fn(() => ({
    sendChat: mockSendChat,
    testConnection: vi.fn(),
  })),
}));

// Import after mock setup
import { analyzeUnrecognizedFiles } from "../lib/ai-analyzer";
import { getAdapter } from "@/lib/ai/adapters";

const baseConfig: ProviderConfig = {
  providerType: "openai",
  modelName: "gpt-4",
  authMode: "api_key",
  secret: "test-key",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyzeUnrecognizedFiles", () => {
  // ── Prompt construction ──────────────────────────────────────────────

  describe("prompt construction", () => {
    it("includes file names and content in the prompt", async () => {
      mockSendChat.mockResolvedValue({ content: "{}" });

      const files = new Map([
        ["Cargo.toml", '[package]\nname = "my-app"'],
        ["go.mod", "module example.com/app"],
      ]);

      await analyzeUnrecognizedFiles(files, baseConfig);

      expect(mockSendChat).toHaveBeenCalledTimes(1);
      const messages = mockSendChat.mock.calls[0][1];
      const userMessage = messages.find((m: { role: string }) => m.role === "user")!;
      expect(userMessage.content).toContain("Cargo.toml");
      expect(userMessage.content).toContain('[package]\nname = "my-app"');
      expect(userMessage.content).toContain("go.mod");
      expect(userMessage.content).toContain("module example.com/app");
    });

    it("filters out sensitive files before sending to AI", async () => {
      mockSendChat.mockResolvedValue({ content: "{}" });

      const files = new Map([
        [".env", "SECRET=abc"],
        [".env.local", "DB_PASS=xyz"],
        ["server.key", "-----BEGIN RSA PRIVATE KEY-----"],
        ["credentials.json", '{"token":"secret"}'],
        ["Cargo.toml", '[package]\nname = "app"'],
      ]);

      await analyzeUnrecognizedFiles(files, baseConfig);

      expect(mockSendChat).toHaveBeenCalledTimes(1);
      const messages = mockSendChat.mock.calls[0][1];
      const userMessage = messages.find((m: { role: string }) => m.role === "user")!;
      expect(userMessage.content).toContain("Cargo.toml");
      expect(userMessage.content).not.toContain(".env");
      expect(userMessage.content).not.toContain("SECRET=abc");
      expect(userMessage.content).not.toContain("server.key");
      expect(userMessage.content).not.toContain("credentials.json");
    });
  });

  // ── Response parsing ───────────────────────────────────────────────

  describe("response parsing", () => {
    it("parses valid JSON with correct sectionKey/fieldKey pairs into ScanFact[]", async () => {
      const aiResponse = JSON.stringify({
        "tech-stack-and-architecture": {
          "programming-languages": "Rust",
          frameworks: "Actix-web",
        },
        "testing-and-quality": {
          "testing-framework": "cargo test",
        },
      });
      mockSendChat.mockResolvedValue({ content: aiResponse });

      const files = new Map([["Cargo.toml", '[package]\nname = "app"']]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toHaveLength(3);
      expect(result.facts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sectionKey: "tech-stack-and-architecture",
            fieldKey: "programming-languages",
            value: "Rust",
            source: "ai-codebase-scan",
          }),
          expect.objectContaining({
            sectionKey: "tech-stack-and-architecture",
            fieldKey: "frameworks",
            value: "Actix-web",
            source: "ai-codebase-scan",
          }),
          expect.objectContaining({
            sectionKey: "testing-and-quality",
            fieldKey: "testing-framework",
            value: "cargo test",
            source: "ai-codebase-scan",
          }),
        ]),
      );
      expect(result.error).toBeUndefined();
    });

    it("parses JSON wrapped in markdown code fences", async () => {
      const aiResponse = '```json\n{"tech-stack-and-architecture":{"programming-languages":"Go"}}\n```';
      mockSendChat.mockResolvedValue({ content: aiResponse });

      const files = new Map([["go.mod", "module example.com"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]).toMatchObject({
        sectionKey: "tech-stack-and-architecture",
        fieldKey: "programming-languages",
        value: "Go",
      });
    });

    it("returns empty facts for invalid JSON response (no crash)", async () => {
      mockSendChat.mockResolvedValue({ content: "This is not JSON at all!" });

      const files = new Map([["Cargo.toml", "content"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it("discards entries with unknown sectionKey/fieldKey pairs", async () => {
      const aiResponse = JSON.stringify({
        "tech-stack-and-architecture": {
          "programming-languages": "Python",
          "unknown-field": "should be discarded",
        },
        "unknown-section": {
          "some-field": "also discarded",
        },
      });
      mockSendChat.mockResolvedValue({ content: aiResponse });

      const files = new Map([["pyproject.toml", "content"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]).toMatchObject({
        sectionKey: "tech-stack-and-architecture",
        fieldKey: "programming-languages",
        value: "Python",
      });
    });

    it("discards entries with empty values", async () => {
      const aiResponse = JSON.stringify({
        "tech-stack-and-architecture": {
          "programming-languages": "Java",
          frameworks: "",
          database: "   ",
        },
      });
      mockSendChat.mockResolvedValue({ content: aiResponse });

      const files = new Map([["build.gradle", "content"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0]).toMatchObject({
        fieldKey: "programming-languages",
        value: "Java",
      });
    });
  });

  // ── Error handling ─────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns empty facts with error when provider throws", async () => {
      mockSendChat.mockRejectedValue(new Error("API rate limit exceeded"));

      const files = new Map([["Cargo.toml", "content"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toEqual([]);
      expect(result.error).toBe("API rate limit exceeded");
    });

    it("returns empty facts with error on timeout", async () => {
      mockSendChat.mockRejectedValue(new Error("Request timed out"));

      const files = new Map([["go.mod", "content"]]);
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toEqual([]);
      expect(result.error).toBe("Request timed out");
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns empty facts for empty files map", async () => {
      const files = new Map<string, string>();
      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toEqual([]);
      expect(result.error).toBeUndefined();
      expect(mockSendChat).not.toHaveBeenCalled();
    });

    it("returns empty facts when all files are sensitive (no AI call)", async () => {
      const files = new Map([
        [".env", "SECRET=abc"],
        [".env.production", "DB_URL=xyz"],
        ["private.pem", "cert-data"],
        ["my-secret-config.json", "data"],
      ]);

      const result = await analyzeUnrecognizedFiles(files, baseConfig);

      expect(result.facts).toEqual([]);
      expect(result.error).toBeUndefined();
      expect(mockSendChat).not.toHaveBeenCalled();
    });
  });
});
