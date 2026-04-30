// Feature: guided-intake, Property 7: Unique constraint enforcement
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// **Validates: Requirements 9.3**

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => {
  // Track created records to simulate unique constraint enforcement
  const createdSections = new Set<string>();
  const createdAnswers = new Set<string>();

  return {
    prisma: {
      intakeSection: {
        create: vi.fn().mockImplementation(({ data }: { data: { projectId: string; sectionKey: string } }) => {
          const key = `${data.projectId}::${data.sectionKey}`;
          if (createdSections.has(key)) {
            const error = new Error(
              "Unique constraint failed on the fields: (`projectId`,`sectionKey`)",
            );
            (error as Record<string, unknown>).code = "P2002";
            return Promise.reject(error);
          }
          createdSections.add(key);
          return Promise.resolve({ id: `sec-${key}`, ...data });
        }),
      },
      answer: {
        create: vi.fn().mockImplementation(({ data }: { data: { intakeSectionId: string; fieldKey: string } }) => {
          const key = `${data.intakeSectionId}::${data.fieldKey}`;
          if (createdAnswers.has(key)) {
            const error = new Error(
              "Unique constraint failed on the fields: (`intakeSectionId`,`fieldKey`)",
            );
            (error as Record<string, unknown>).code = "P2002";
            return Promise.reject(error);
          }
          createdAnswers.add(key);
          return Promise.resolve({ id: `ans-${key}`, ...data });
        }),
      },
      _resetTracking: () => {
        createdSections.clear();
        createdAnswers.clear();
      },
    },
  };
});

import { prisma } from "@/lib/db/prisma";

const resetTracking = (prisma as unknown as { _resetTracking: () => void })._resetTracking;

beforeEach(() => {
  resetTracking();
  vi.clearAllMocks();
});

// ── Shared arbitraries ──────────────────────────────────────────────

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 30 }).filter(
  (s) => s.trim().length > 0,
);

// ── Tests ────────────────────────────────────────────────────────────

describe("Property: Unique constraint enforcement", () => {
  it("for any duplicate (projectId, sectionKey), the database rejects the second insert", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (projectId, sectionKey) => {
          resetTracking();

          // First insert should succeed
          await expect(
            prisma.intakeSection.create({
              data: {
                projectId,
                sectionKey,
                displayName: "Test",
                sortOrder: 0,
                coverageStatus: "unknown",
              },
            }),
          ).resolves.toBeDefined();

          // Second insert with same (projectId, sectionKey) should be rejected
          await expect(
            prisma.intakeSection.create({
              data: {
                projectId,
                sectionKey,
                displayName: "Duplicate",
                sortOrder: 1,
                coverageStatus: "unknown",
              },
            }),
          ).rejects.toThrow("Unique constraint failed");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("for any duplicate (intakeSectionId, fieldKey), the database rejects the second insert", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (intakeSectionId, fieldKey) => {
          resetTracking();

          // First insert should succeed
          await expect(
            prisma.answer.create({
              data: {
                intakeSectionId,
                fieldKey,
                value: "first value",
                source: "user-form",
              },
            }),
          ).resolves.toBeDefined();

          // Second insert with same (intakeSectionId, fieldKey) should be rejected
          await expect(
            prisma.answer.create({
              data: {
                intakeSectionId,
                fieldKey,
                value: "second value",
                source: "user-form",
              },
            }),
          ).rejects.toThrow("Unique constraint failed");
        },
      ),
      { numRuns: 100 },
    );
  });
});
