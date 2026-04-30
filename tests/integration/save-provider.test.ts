import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    providerConnection: {
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/utils/crypto", () => ({
  encrypt: vi.fn((v: string) => `encrypted:${v}`),
}));

import { saveProvider } from "@/features/provider-settings/actions/save-provider";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/utils/crypto";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────

describe("saveProvider server action", () => {
  const validInput = {
    providerType: "openai" as const,
    endpoint: "https://api.openai.com",
    modelName: "gpt-4o",
    authMode: "api_key" as const,
    secret: "sk-test-key",
  };

  it("creates a new provider connection with valid input", async () => {
    vi.mocked(prisma.providerConnection.create).mockResolvedValue({} as never);

    const result = await saveProvider(validInput);

    expect(result).toEqual({ success: true });
    expect(prisma.providerConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerType: "openai",
        endpoint: "https://api.openai.com",
        modelName: "gpt-4o",
        authMode: "api_key",
        encryptedSecret: "encrypted:sk-test-key",
      }),
    });
  });

  it("updates an existing provider connection when existingId is provided", async () => {
    vi.mocked(prisma.providerConnection.update).mockResolvedValue({} as never);

    const result = await saveProvider(validInput, "conn-existing-1");

    expect(result).toEqual({ success: true });
    expect(prisma.providerConnection.update).toHaveBeenCalledWith({
      where: { id: "conn-existing-1" },
      data: expect.objectContaining({
        providerType: "openai",
        modelName: "gpt-4o",
        encryptedSecret: "encrypted:sk-test-key",
      }),
    });
    expect(prisma.providerConnection.create).not.toHaveBeenCalled();
  });

  it("preserves existing secret when empty secret is provided on update", async () => {
    vi.mocked(prisma.providerConnection.update).mockResolvedValue({} as never);

    const inputWithoutSecret = { ...validInput, secret: "" };
    await saveProvider(inputWithoutSecret, "conn-existing-2");

    const updateCall = vi.mocked(prisma.providerConnection.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("encryptedSecret");
    expect(encrypt).not.toHaveBeenCalled();
  });

  it("encrypts the secret before storage", async () => {
    vi.mocked(prisma.providerConnection.create).mockResolvedValue({} as never);

    await saveProvider(validInput);

    expect(encrypt).toHaveBeenCalledWith("sk-test-key");
    const createCall = vi.mocked(prisma.providerConnection.create).mock.calls[0][0];
    expect((createCall.data as Record<string, unknown>).encryptedSecret).toBe(
      "encrypted:sk-test-key",
    );
  });

  it("returns error without calling Prisma when input is invalid", async () => {
    const result = await saveProvider({
      providerType: "" as never,
      modelName: "",
      authMode: "" as never,
    });

    expect(result).toEqual({ success: false, error: expect.stringMatching(/invalid/i) });
    expect(prisma.providerConnection.create).not.toHaveBeenCalled();
    expect(prisma.providerConnection.update).not.toHaveBeenCalled();
  });

  it("returns error message when Prisma operation fails", async () => {
    vi.mocked(prisma.providerConnection.create).mockRejectedValue(new Error("DB error"));

    const result = await saveProvider(validInput);

    expect(result).toEqual({ success: false, error: expect.stringMatching(/failed/i) });
  });

  it("response never contains the raw secret", async () => {
    vi.mocked(prisma.providerConnection.create).mockResolvedValue({} as never);

    const result = await saveProvider(validInput);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sk-test-key");
    expect(result).not.toHaveProperty("secret");
  });

  it("calls revalidatePath after successful save", async () => {
    vi.mocked(prisma.providerConnection.create).mockResolvedValue({} as never);

    await saveProvider(validInput);

    expect(revalidatePath).toHaveBeenCalledWith("/settings/provider");
  });
});
