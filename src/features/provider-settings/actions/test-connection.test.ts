import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the adapter module
vi.mock("@/lib/ai/adapters", () => ({
  getAdapter: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    providerConnection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock crypto — decrypt returns the value as-is in tests
vi.mock("@/lib/utils/crypto", () => ({
  decrypt: vi.fn((v: string) => v),
  encrypt: vi.fn((v: string) => v),
}));

import { testConnection } from "./test-connection";
import { getAdapter } from "@/lib/ai/adapters";
import { prisma } from "@/lib/db/prisma";
import type { ProviderAdapter } from "@/lib/ai/adapters/types";

const mockTestConnection = vi.fn();
const mockAdapter: ProviderAdapter = { testConnection: mockTestConnection };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdapter).mockReturnValue(mockAdapter);
});

describe("testConnection server action", () => {
  const validInput = {
    providerType: "openai" as const,
    endpoint: "https://api.openai.com",
    modelName: "gpt-4o",
    authMode: "api_key" as const,
    secret: "sk-test",
  };

  it("returns validation error for invalid input", async () => {
    const result = await testConnection({ providerType: "", modelName: "", authMode: "" });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid/i);
  });

  it("returns error when adapter is not found", async () => {
    vi.mocked(getAdapter).mockImplementation(() => {
      throw new Error("not yet implemented");
    });

    const result = await testConnection(validInput);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not supported/i);
  });

  it("calls adapter.testConnection with the provided config", async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      message: "Connection successful.",
      latencyMs: 120,
    });

    const result = await testConnection(validInput);

    expect(mockTestConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: "openai",
        endpoint: "https://api.openai.com",
        modelName: "gpt-4o",
        authMode: "api_key",
        secret: "sk-test",
      }),
    );
    expect(result).toEqual({
      success: true,
      message: "Connection successful.",
      latencyMs: 120,
    });
  });

  it("returns adapter failure result without exposing secrets", async () => {
    mockTestConnection.mockResolvedValue({
      success: false,
      message: "Authentication failed. Check your API key.",
      latencyMs: 80,
    });

    const result = await testConnection(validInput);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/authentication failed/i);
    expect(result).not.toHaveProperty("secret");
    expect(JSON.stringify(result)).not.toContain("sk-test");
  });

  it("uses stored secret when no secret is provided and existingId is given", async () => {
    vi.mocked(prisma.providerConnection.findUnique).mockResolvedValue({
      encryptedSecret: "stored-secret-value",
    } as never);
    mockTestConnection.mockResolvedValue({
      success: true,
      message: "Connection successful.",
      latencyMs: 100,
    });

    const inputWithoutSecret = { ...validInput, secret: "" };
    await testConnection(inputWithoutSecret, "existing-id-123");

    expect(prisma.providerConnection.findUnique).toHaveBeenCalledWith({
      where: { id: "existing-id-123" },
      select: { encryptedSecret: true },
    });
    expect(mockTestConnection).toHaveBeenCalledWith(
      expect.objectContaining({ secret: "stored-secret-value" }),
    );
  });

  it("updates lastTestStatus on success when existingId is provided", async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      message: "Connection successful.",
      latencyMs: 50,
    });

    await testConnection(validInput, "conn-id");

    expect(prisma.providerConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-id" },
      data: expect.objectContaining({
        lastTestStatus: "success",
        lastTestedAt: expect.any(Date),
      }),
    });
  });

  it("updates lastTestStatus on failure when existingId is provided", async () => {
    mockTestConnection.mockResolvedValue({
      success: false,
      message: "Auth failed.",
      latencyMs: 30,
    });

    await testConnection(validInput, "conn-id");

    expect(prisma.providerConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-id" },
      data: expect.objectContaining({
        lastTestStatus: "failure",
      }),
    });
  });

  it("does not update DB when no existingId is provided", async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      message: "Connection successful.",
      latencyMs: 50,
    });

    await testConnection(validInput);

    expect(prisma.providerConnection.update).not.toHaveBeenCalled();
  });

  it("still returns test result even if DB update fails", async () => {
    mockTestConnection.mockResolvedValue({
      success: true,
      message: "Connection successful.",
      latencyMs: 50,
    });
    vi.mocked(prisma.providerConnection.update).mockRejectedValue(new Error("DB error"));

    const result = await testConnection(validInput, "conn-id");
    expect(result.success).toBe(true);
    expect(result.message).toBe("Connection successful.");
  });
});
