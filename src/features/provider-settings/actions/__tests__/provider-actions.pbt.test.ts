// Feature: multi-model-provider, Property 5: Additive connection save
// Feature: multi-model-provider, Property 6: Auto-default on first connection
// Feature: multi-model-provider, Property 8: Delete connection cascades correctly
// Feature: multi-model-provider, Property 9: Assignment uniqueness per function
// Feature: multi-model-provider, Property 10: Clearing assignment reverts to default
// Feature: multi-model-provider, Property 11: Assignment validation rejects invalid connection IDs
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ── Mocks (vi.mock is hoisted — no external refs allowed) ────────────

vi.mock("@/lib/db/prisma", () => {
  const mockPrisma = {
    providerConnection: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    modelAssignment: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma };
});

vi.mock("@/lib/utils/crypto", () => ({
  encrypt: vi.fn((s: string) => `encrypted:${s}`),
  decrypt: vi.fn((s: string) =>
    s.startsWith("encrypted:") ? s.slice("encrypted:".length) : `decrypted:${s}`,
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────

import { prisma } from "@/lib/db/prisma";
import { saveProvider } from "@/features/provider-settings/actions/save-provider";
import { deleteProvider } from "@/features/provider-settings/actions/delete-provider";
import { saveAssignment } from "@/features/provider-settings/actions/save-assignment";
import { resolveProvider } from "@/lib/ai/resolve-provider";


// ── Types ────────────────────────────────────────────────────────────

interface StoredConnection {
  id: string;
  providerType: string;
  endpoint: string | null;
  region: string | null;
  modelName: string;
  authMode: string;
  encryptedSecret: string | null;
  apiVersion: string | null;
  isDefault: boolean;
  lastTestStatus: string | null;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredAssignment {
  id: string;
  aiFunction: string;
  providerConnectionId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── In-memory store ──────────────────────────────────────────────────

let connections: StoredConnection[] = [];
let assignments: StoredAssignment[] = [];
let idCounter = 0;

function resetStore() {
  connections = [];
  assignments = [];
  idCounter = 0;
}

function nextCuid(): string {
  idCounter++;
  return `c${idCounter.toString().padStart(24, "0")}`;
}

function seedConnection(overrides: Partial<StoredConnection> = {}): StoredConnection {
  const conn: StoredConnection = {
    id: nextCuid(),
    providerType: "openai",
    endpoint: null,
    region: null,
    modelName: "gpt-4o",
    authMode: "api_key",
    encryptedSecret: "encrypted:test-secret",
    apiVersion: null,
    isDefault: false,
    lastTestStatus: null,
    lastTestedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  connections.push(conn);
  return conn;
}


// ── Wire mock implementations to in-memory store ─────────────────────

function wireMocks() {
  vi.mocked(prisma.providerConnection.count).mockImplementation(
    async () => connections.length,
  );

  vi.mocked(prisma.providerConnection.create).mockImplementation(
    async ({ data }: never) => {
      const d = data as Record<string, unknown>;
      const conn: StoredConnection = {
        id: nextCuid(),
        providerType: d.providerType as string,
        endpoint: (d.endpoint as string | null) ?? null,
        region: (d.region as string | null) ?? null,
        modelName: d.modelName as string,
        authMode: d.authMode as string,
        encryptedSecret: (d.encryptedSecret as string | null) ?? null,
        apiVersion: (d.apiVersion as string | null) ?? null,
        isDefault: (d.isDefault as boolean) ?? false,
        lastTestStatus: null,
        lastTestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      connections.push(conn);
      return conn;
    },
  );

  vi.mocked(prisma.providerConnection.update).mockImplementation(
    async ({ where, data }: never) => {
      const w = where as { id: string };
      const d = data as Record<string, unknown>;
      const conn = connections.find((c) => c.id === w.id);
      if (!conn) throw new Error("Record not found");
      Object.assign(conn, d, { updatedAt: new Date() });
      return conn;
    },
  );

  vi.mocked(prisma.providerConnection.findUnique).mockImplementation(
    async ({ where }: never) => {
      const w = where as { id: string };
      return connections.find((c) => c.id === w.id) ?? null;
    },
  );

  vi.mocked(prisma.providerConnection.findFirst).mockImplementation(
    async (args?: never) => {
      const a = args as
        | { where?: { isDefault?: boolean }; orderBy?: { updatedAt: string }; select?: unknown }
        | undefined;
      if (a?.where?.isDefault === true) {
        return connections.find((c) => c.isDefault) ?? null;
      }
      if (a?.orderBy?.updatedAt === "desc") {
        const sorted = [...connections].sort(
          (b, c) => c.updatedAt.getTime() - b.updatedAt.getTime(),
        );
        return sorted[0] ?? null;
      }
      return connections[0] ?? null;
    },
  );

  vi.mocked(prisma.providerConnection.delete).mockImplementation(
    async ({ where }: never) => {
      const w = where as { id: string };
      const idx = connections.findIndex((c) => c.id === w.id);
      if (idx === -1) throw new Error("Record not found");
      const deleted = connections.splice(idx, 1)[0];
      // Cascade: remove assignments referencing this connection
      assignments = assignments.filter((a) => a.providerConnectionId !== deleted.id);
      return deleted;
    },
  );

  vi.mocked(prisma.providerConnection.updateMany).mockImplementation(
    async ({ data }: never) => {
      const d = data as Record<string, unknown>;
      for (const conn of connections) {
        Object.assign(conn, d, { updatedAt: new Date() });
      }
      return { count: connections.length };
    },
  );

  vi.mocked(prisma.modelAssignment.upsert).mockImplementation(
    async ({ where, create, update }: never) => {
      const w = where as { aiFunction: string };
      const cr = create as { aiFunction: string; providerConnectionId: string };
      const up = update as { providerConnectionId: string };
      const existing = assignments.find((a) => a.aiFunction === w.aiFunction);
      if (existing) {
        existing.providerConnectionId = up.providerConnectionId;
        existing.updatedAt = new Date();
        return existing;
      }
      const newA: StoredAssignment = {
        id: nextCuid(),
        aiFunction: cr.aiFunction,
        providerConnectionId: cr.providerConnectionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      assignments.push(newA);
      return newA;
    },
  );

  vi.mocked(prisma.modelAssignment.deleteMany).mockImplementation(
    async ({ where }: never) => {
      const w = where as { aiFunction: string };
      const before = assignments.length;
      assignments = assignments.filter((a) => a.aiFunction !== w.aiFunction);
      return { count: before - assignments.length };
    },
  );

  vi.mocked(prisma.modelAssignment.findUnique).mockImplementation(
    async ({ where, include }: never) => {
      const w = where as { aiFunction: string };
      const inc = include as { providerConnection?: boolean } | undefined;
      const assignment = assignments.find((a) => a.aiFunction === w.aiFunction);
      if (!assignment) return null;
      if (inc?.providerConnection) {
        const conn = connections.find((c) => c.id === assignment.providerConnectionId);
        return { ...assignment, providerConnection: conn ?? null };
      }
      return assignment;
    },
  );

  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      // The transaction client exposes the same methods as prisma
      return fn(prisma);
    },
  );
}


// ── Arbitraries ──────────────────────────────────────────────────────

const providerTypeArb = fc.constantFrom("openai", "azure_openai", "bedrock") as fc.Arbitrary<
  "openai" | "azure_openai" | "bedrock"
>;

const authModeArb = fc.constantFrom("api_key", "iam", "session") as fc.Arbitrary<
  "api_key" | "iam" | "session"
>;

const aiFunctionArb = fc.constantFrom("intake", "generation") as fc.Arbitrary<
  "intake" | "generation"
>;

const nonEmptyTrimmed = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

/** Generates valid SaveProviderInput data */
const saveProviderInputArb = fc.record({
  providerType: providerTypeArb,
  modelName: nonEmptyTrimmed,
  authMode: authModeArb,
  secret: fc.option(nonEmptyTrimmed, { nil: undefined }),
});

// ── Setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
  wireMocks();
});


// ── Property Tests ───────────────────────────────────────────────────

describe("Provider actions property tests", () => {
  // Feature: multi-model-provider, Property 5: Additive connection save
  // **Validates: Requirements 5.1, 5.5**
  describe("Property 5: Additive connection save", () => {
    it("saving a new connection increases count by one and preserves existing connections", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          saveProviderInputArb,
          async (existingCount, newInput) => {
            resetStore();
            vi.clearAllMocks();
            wireMocks();

            // Seed existing connections (first one is default)
            const existingIds: string[] = [];
            for (let i = 0; i < existingCount; i++) {
              const conn = seedConnection({
                isDefault: i === 0,
                modelName: `existing-model-${i}`,
              });
              existingIds.push(conn.id);
            }

            const countBefore = connections.length;

            // Act: save a new connection
            const result = await saveProvider(newInput);

            // Assert
            expect(result.success).toBe(true);
            expect(connections.length).toBe(countBefore + 1);

            // All previous connections still exist
            for (const id of existingIds) {
              expect(connections.some((c) => c.id === id)).toBe(true);
            }

            // New connection has the correct fields
            const newConn = connections[connections.length - 1];
            expect(newConn.providerType).toBe(newInput.providerType);
            expect(newConn.modelName).toBe(newInput.modelName);
            expect(newConn.authMode).toBe(newInput.authMode);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 6: Auto-default on first connection
  // **Validates: Requirements 1.3**
  describe("Property 6: Auto-default on first connection", () => {
    it("first connection saved gets isDefault: true", async () => {
      await fc.assert(
        fc.asyncProperty(saveProviderInputArb, async (input) => {
          resetStore();
          vi.clearAllMocks();
          wireMocks();

          // Store is empty
          expect(connections.length).toBe(0);

          // Act: save the first connection
          const result = await saveProvider(input);

          // Assert
          expect(result.success).toBe(true);
          expect(connections.length).toBe(1);
          expect(connections[0].isDefault).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 8: Delete connection cascades correctly
  // **Validates: Requirements 1.5, 5.4**
  describe("Property 8: Delete connection cascades correctly", () => {
    it("deleting a connection removes its assignments and promotes a new default", async () => {
      await fc.assert(
        fc.asyncProperty(
          aiFunctionArb,
          fc.boolean(),
          async (aiFunction, deleteDefault) => {
            resetStore();
            vi.clearAllMocks();
            wireMocks();

            // Seed two connections
            const conn1 = seedConnection({ isDefault: true, modelName: "model-1" });
            const conn2 = seedConnection({ isDefault: false, modelName: "model-2" });

            const targetConn = deleteDefault ? conn1 : conn2;

            // Create an assignment pointing to the target connection
            assignments.push({
              id: nextCuid(),
              aiFunction,
              providerConnectionId: targetConn.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Act: delete the target connection
            const result = await deleteProvider({ id: targetConn.id });

            // Assert
            expect(result.success).toBe(true);

            // Connection is removed
            expect(connections.find((c) => c.id === targetConn.id)).toBeUndefined();

            // Assignment referencing deleted connection is removed (cascade)
            expect(
              assignments.find((a) => a.providerConnectionId === targetConn.id),
            ).toBeUndefined();

            // If deleted was default, remaining connection should be promoted
            if (deleteDefault && connections.length > 0) {
              expect(connections.some((c) => c.isDefault)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 9: Assignment uniqueness per function
  // **Validates: Requirements 8.2**
  describe("Property 9: Assignment uniqueness per function", () => {
    it("saving assignment twice for same function results in one row", async () => {
      await fc.assert(
        fc.asyncProperty(aiFunctionArb, async (aiFunction) => {
          resetStore();
          vi.clearAllMocks();
          wireMocks();

          // Seed two connections
          const conn1 = seedConnection({ isDefault: true, modelName: "model-a" });
          const conn2 = seedConnection({ isDefault: false, modelName: "model-b" });

          // Act: assign to conn1, then reassign to conn2
          const result1 = await saveAssignment({
            aiFunction,
            providerConnectionId: conn1.id,
          });
          const result2 = await saveAssignment({
            aiFunction,
            providerConnectionId: conn2.id,
          });

          // Assert: both succeed
          expect(result1.success).toBe(true);
          expect(result2.success).toBe(true);

          // Only one assignment row for this function
          const matching = assignments.filter((a) => a.aiFunction === aiFunction);
          expect(matching.length).toBe(1);

          // Points to the most recently saved connection
          expect(matching[0].providerConnectionId).toBe(conn2.id);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 10: Clearing assignment reverts to default
  // **Validates: Requirements 2.4**
  describe("Property 10: Clearing assignment reverts to default", () => {
    it("clearing an assignment makes resolveProvider return the default", async () => {
      await fc.assert(
        fc.asyncProperty(aiFunctionArb, async (aiFunction) => {
          resetStore();
          vi.clearAllMocks();
          wireMocks();

          // Seed a default connection and a non-default connection
          const defaultConn = seedConnection({
            isDefault: true,
            modelName: "default-model",
            encryptedSecret: "encrypted:default-secret",
          });
          const otherConn = seedConnection({
            isDefault: false,
            modelName: "other-model",
            encryptedSecret: "encrypted:other-secret",
          });

          // Assign the function to the non-default connection
          await saveAssignment({ aiFunction, providerConnectionId: otherConn.id });

          // Verify assignment is active
          const beforeClear = await resolveProvider(aiFunction);
          expect(beforeClear).not.toBeNull();
          expect(beforeClear!.modelName).toBe("other-model");

          // Act: clear the assignment (no providerConnectionId)
          const clearResult = await saveAssignment({ aiFunction });
          expect(clearResult.success).toBe(true);

          // Assert: resolveProvider now returns the default connection
          const afterClear = await resolveProvider(aiFunction);
          expect(afterClear).not.toBeNull();
          expect(afterClear!.modelName).toBe("default-model");
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: multi-model-provider, Property 11: Assignment validation rejects invalid connection IDs
  // **Validates: Requirements 2.6**
  describe("Property 11: Assignment validation rejects invalid connection IDs", () => {
    it("non-existent IDs fail validation", async () => {
      await fc.assert(
        fc.asyncProperty(aiFunctionArb, async (aiFunction) => {
          resetStore();
          vi.clearAllMocks();
          wireMocks();

          // Seed one connection so the store isn't empty
          seedConnection({ isDefault: true });

          // Use a valid CUID format that doesn't match any existing connection
          const fakeId = "clxxxxxxxxxxxxxxxxxxxxxxxxx";

          // Act: try to assign with a non-existent connection ID
          const result = await saveAssignment({
            aiFunction,
            providerConnectionId: fakeId,
          });

          // Assert: should fail
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // No assignment should have been created
          const matching = assignments.filter((a) => a.aiFunction === aiFunction);
          expect(matching.length).toBe(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
