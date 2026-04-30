// Feature: multi-model-provider, Property 1: Assignment-based resolution
// Feature: multi-model-provider, Property 2: Default fallback resolution
// Feature: multi-model-provider, Property 3: Single-connection backward compatibility
// Feature: multi-model-provider, Property 7: Default change applies to unassigned functions
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ── Mocks ───────────────────────────────────────────────────────────

// Mock Prisma — we'll wire up per-test behavior via mockImplementation
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    modelAssignment: { findUnique: vi.fn() },
    providerConnection: { findFirst: vi.fn() },
  },
}));

// Mock decrypt to return a predictable value
vi.mock("@/lib/utils/crypto", () => ({
  decrypt: vi.fn((cipher: string) => `decrypted:${cipher}`),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

// ── Arbitraries ─────────────────────────────────────────────────────

const providerTypeArb = fc.constantFrom("openai", "azure_openai", "bedrock") as fc.Arbitrary<
  "openai" | "azure_openai" | "bedrock"
>;

const authModeArb = fc.constantFrom("api_key", "iam", "session") as fc.Arbitrary<
  "api_key" | "iam" | "session"
>;

const aiFunctionArb = fc.constantFrom("intake", "generation") as fc.Arbitrary<"intake" | "generation">;

const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generate a random ProviderConnection-like record */
const providerConnectionArb = fc.record({
  id: fc.uuid(),
  providerType: providerTypeArb,
  endpoint: fc.option(nonEmptyString, { nil: null }),
  region: fc.option(nonEmptyString, { nil: null }),
  modelName: nonEmptyString,
  authMode: authModeArb,
  encryptedSecret: fc.option(nonEmptyString, { nil: null }),
  apiVersion: fc.option(nonEmptyString, { nil: null }),
  isDefault: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ── Helpers ─────────────────────────────────────────────────────────

function expectedConfig(conn: {
  providerType: string;
  endpoint: string | null;
  region: string | null;
  modelName: string;
  authMode: string;
  encryptedSecret: string | null;
  apiVersion: string | null;
}): ProviderConfig {
  return {
    providerType: conn.providerType as ProviderConfig["providerType"],
    endpoint: conn.endpoint ?? undefined,
    region: conn.region ?? undefined,
    modelName: conn.modelName,
    authMode: conn.authMode as ProviderConfig["authMode"],
    secret: conn.encryptedSecret ? `decrypted:${conn.encryptedSecret}` : undefined,
    apiVersion: conn.apiVersion ?? undefined,
  };
}

// ── Setup ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Property Tests ──────────────────────────────────────────────────

describe("resolveProvider property tests", () => {

  // Feature: multi-model-provider, Property 1: Assignment-based resolution
  // **Validates: Requirements 3.1**
  describe("Property 1: Assignment-based resolution", () => {
    it("returns the assigned connection's config when a ModelAssignment exists", async () => {
      await fc.assert(
        fc.asyncProperty(aiFunctionArb, providerConnectionArb, async (aiFunction, connection) => {
          // Arrange: assignment exists pointing to this connection
          vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue({
            id: "assign-1",
            aiFunction,
            providerConnectionId: connection.id,
            providerConnection: connection,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as never);

          // Act
          const result = await resolveProvider(aiFunction);

          // Assert
          expect(result).toEqual(expectedConfig(connection));
          expect(prisma.modelAssignment.findUnique).toHaveBeenCalledWith({
            where: { aiFunction },
            include: { providerConnection: true },
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 2: Default fallback resolution
  // **Validates: Requirements 3.2**
  describe("Property 2: Default fallback resolution", () => {
    it("returns the default connection's config when no assignment exists", async () => {
      await fc.assert(
        fc.asyncProperty(aiFunctionArb, providerConnectionArb, async (aiFunction, connection) => {
          // Arrange: no assignment, but a default connection exists
          vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
          vi.mocked(prisma.providerConnection.findFirst).mockResolvedValue({
            ...connection,
            isDefault: true,
          } as never);

          // Act
          const result = await resolveProvider(aiFunction);

          // Assert
          expect(result).toEqual(expectedConfig({ ...connection, isDefault: true }));
          expect(prisma.providerConnection.findFirst).toHaveBeenCalledWith({
            where: { isDefault: true },
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 3: Single-connection backward compatibility
  // **Validates: Requirements 1.2, 6.1, 6.2**
  describe("Property 3: Single-connection backward compatibility", () => {
    it("returns the single connection for any AI function regardless of isDefault", async () => {
      await fc.assert(
        fc.asyncProperty(
          aiFunctionArb,
          providerConnectionArb,
          async (aiFunction, connection) => {
            // Arrange: no assignment, no default found, but one connection exists as latest
            vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
            // First call (isDefault: true) returns null — simulates no explicit default
            // Second call (orderBy updatedAt) returns the single connection
            vi.mocked(prisma.providerConnection.findFirst)
              .mockResolvedValueOnce(null as never)
              .mockResolvedValueOnce(connection as never);

            // Act
            const result = await resolveProvider(aiFunction);

            // Assert
            expect(result).toEqual(expectedConfig(connection));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 7: Default change applies to unassigned functions
  // **Validates: Requirements 1.4**
  describe("Property 7: Default change applies to unassigned functions", () => {
    it("returns the new default connection after changing the default", async () => {
      await fc.assert(
        fc.asyncProperty(
          aiFunctionArb,
          providerConnectionArb,
          providerConnectionArb.filter((c2) => c2.id !== ""),
          async (aiFunction, originalDefault, newDefault) => {
            // ── First call: original default is active ──
            vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.providerConnection.findFirst).mockResolvedValue({
              ...originalDefault,
              isDefault: true,
            } as never);

            const firstResult = await resolveProvider(aiFunction);
            expect(firstResult).toEqual(expectedConfig({ ...originalDefault, isDefault: true }));

            // ── Change default: clear mocks and set new default ──
            vi.clearAllMocks();

            vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.providerConnection.findFirst).mockResolvedValue({
              ...newDefault,
              isDefault: true,
            } as never);

            const secondResult = await resolveProvider(aiFunction);
            expect(secondResult).toEqual(expectedConfig({ ...newDefault, isDefault: true }));
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
