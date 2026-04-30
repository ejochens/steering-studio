import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    intakeSection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveAnswer } from "@/features/intake/actions/save-answer";
import { initIntakeSections } from "@/features/intake/actions/init-intake-sections";
import { prisma } from "@/lib/db/prisma";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Shared arbitraries ──────────────────────────────────────────────

const validSectionKeys = INTAKE_SECTIONS.map((s) => s.sectionKey);

const sectionKeyArb = fc.constantFrom(...validSectionKeys);

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 40 }).filter(
  (s) => s.trim().length > 0,
);

// ── Property 4: Answer persistence round trip ───────────────────────
// Feature: guided-intake, Property 4: Answer persistence round trip

// **Validates: Requirements 7.1, 7.2, 8.1, 8.4**

describe("Property: Answer persistence round trip", () => {
  it("for any valid answer input, saving calls upsert with source 'user-form' and the correct value", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        sectionKeyArb,
        nonEmptyStringArb,
        fc.string({ minLength: 0, maxLength: 100 }),
        async (projectId, sectionKey, fieldKey, value) => {
          vi.clearAllMocks();

          const sectionId = `sec-${projectId}-${sectionKey}`;

          vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
            id: sectionId,
            projectId,
            sectionKey,
            displayName: "Test Section",
            sortOrder: 0,
            coverageStatus: "unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);

          vi.mocked(prisma.answer.findMany).mockResolvedValue([
            { fieldKey, value },
          ] as never);

          vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

          vi.mocked(prisma.project.findUnique).mockResolvedValue({
            status: "intake",
          } as never);

          const result = await saveAnswer({ projectId, sectionKey, fieldKey, value });

          expect(result.success).toBe(true);
          expect(prisma.answer.upsert).toHaveBeenCalledTimes(1);

          const upsertCall = vi.mocked(prisma.answer.upsert).mock.calls[0][0];
          expect(upsertCall).toMatchObject({
            where: {
              intakeSectionId_fieldKey: {
                intakeSectionId: sectionId,
                fieldKey,
              },
            },
            create: {
              intakeSectionId: sectionId,
              fieldKey,
              value,
              source: "user-form",
            },
            update: {
              value,
              source: "user-form",
            },
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: Validation rejects invalid inputs ───────────────────
// Feature: guided-intake, Property 5: Validation rejects invalid inputs

// **Validates: Requirements 7.3, 7.4, 10.3**

describe("Property: Validation rejects invalid inputs", () => {
  const invalidInputArb = fc.oneof(
    // Empty projectId
    fc.record({
      projectId: fc.constant(""),
      sectionKey: fc.constantFrom(...validSectionKeys),
      fieldKey: nonEmptyStringArb,
      value: fc.string({ minLength: 0, maxLength: 50 }),
    }),
    // Invalid sectionKey (not in enum)
    fc.record({
      projectId: nonEmptyStringArb,
      sectionKey: fc
        .string({ minLength: 1, maxLength: 30 })
        .filter((s) => !validSectionKeys.includes(s as never)),
      fieldKey: nonEmptyStringArb,
      value: fc.string({ minLength: 0, maxLength: 50 }),
    }),
    // Empty fieldKey
    fc.record({
      projectId: nonEmptyStringArb,
      sectionKey: fc.constantFrom(...validSectionKeys),
      fieldKey: fc.constant(""),
      value: fc.string({ minLength: 0, maxLength: 50 }),
    }),
  );

  it("for any invalid saveAnswer input, the action returns an error and no DB write occurs", async () => {
    await fc.assert(
      fc.asyncProperty(invalidInputArb, async (input) => {
        vi.clearAllMocks();

        const result = await saveAnswer(input as never);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
        expect(prisma.answer.upsert).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 6: User-form overrides AI-inferred ─────────────────────
// Feature: guided-intake, Property 6: User-form overrides AI-inferred

// **Validates: Requirements 5.4, 8.3**

describe("Property: User-form overrides AI-inferred", () => {
  it("for any field with an AI-inferred answer, saving a user-form value sets source to 'user-form'", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        sectionKeyArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        async (projectId, sectionKey, fieldKey, newValue) => {
          vi.clearAllMocks();

          const sectionId = `sec-${projectId}`;

          vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
            id: sectionId,
            projectId,
            sectionKey,
            displayName: "Test Section",
            sortOrder: 0,
            coverageStatus: "partial",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);

          // Simulate existing AI-inferred answer being replaced
          vi.mocked(prisma.answer.findMany).mockResolvedValue([
            { fieldKey, value: newValue },
          ] as never);

          vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

          vi.mocked(prisma.project.findUnique).mockResolvedValue({
            status: "intake",
          } as never);

          const result = await saveAnswer({
            projectId,
            sectionKey,
            fieldKey,
            value: newValue,
          });

          expect(result.success).toBe(true);

          const upsertCall = vi.mocked(prisma.answer.upsert).mock.calls[0][0];
          // The update clause always sets source to "user-form", overriding any previous source
          expect(upsertCall.update).toMatchObject({
            value: newValue,
            source: "user-form",
          });
          expect(upsertCall.create).toMatchObject({
            source: "user-form",
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 8: Intake initialization creates eight sections ────────
// Feature: guided-intake, Property 8: Intake initialization creates eight sections

// **Validates: Requirements 9.4**

describe("Property: Intake initialization creates eight sections", () => {
  it("for any project, initIntakeSections creates exactly the configured number of sections with correct keys, order, and 'unknown' coverage", async () => {
    await fc.assert(
      fc.asyncProperty(nonEmptyStringArb, async (projectId) => {
        vi.clearAllMocks();

        vi.mocked(prisma.intakeSection.findMany).mockResolvedValue([]);
        vi.mocked(prisma.intakeSection.createMany).mockResolvedValue({ count: INTAKE_SECTIONS.length });

        await initIntakeSections(projectId);

        expect(prisma.intakeSection.createMany).toHaveBeenCalledTimes(1);

        const createCall = vi.mocked(prisma.intakeSection.createMany).mock.calls[0][0];
        const data = (createCall as { data: Record<string, unknown>[] }).data;

        // Exactly the configured number of sections
        expect(data).toHaveLength(INTAKE_SECTIONS.length);

        // Each section has correct sectionKey, sortOrder, coverageStatus, and projectId
        for (let i = 0; i < INTAKE_SECTIONS.length; i++) {
          const expected = INTAKE_SECTIONS[i];
          expect(data[i]).toMatchObject({
            projectId,
            sectionKey: expected.sectionKey,
            displayName: expected.displayName,
            sortOrder: expected.sortOrder,
            coverageStatus: "unknown",
          });
        }

        // All sectionKeys are unique
        const keys = data.map((d) => d.sectionKey);
        expect(new Set(keys).size).toBe(INTAKE_SECTIONS.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 9: Project status transition on first answer ───────────
// Feature: guided-intake, Property 9: Project status transition on first answer

// **Validates: Requirements 11.1**

describe("Property: Project status transition on first answer", () => {
  it("for any project in 'setup' status, saving the first answer transitions status to 'intake'", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        sectionKeyArb,
        nonEmptyStringArb,
        fc.string({ minLength: 0, maxLength: 50 }),
        async (projectId, sectionKey, fieldKey, value) => {
          vi.clearAllMocks();

          const sectionId = `sec-${projectId}`;

          vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
            id: sectionId,
            projectId,
            sectionKey,
            displayName: "Test",
            sortOrder: 0,
            coverageStatus: "unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);
          vi.mocked(prisma.answer.findMany).mockResolvedValue([
            { fieldKey, value },
          ] as never);
          vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);
          vi.mocked(prisma.project.findUnique).mockResolvedValue({
            status: "setup",
          } as never);
          vi.mocked(prisma.project.update).mockResolvedValue({} as never);

          await saveAnswer({ projectId, sectionKey, fieldKey, value });

          expect(prisma.project.update).toHaveBeenCalledWith({
            where: { id: projectId },
            data: { status: "intake" },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("for any project NOT in 'setup' status, saving an answer does not change the project status", async () => {
    const nonSetupStatusArb = fc.constantFrom("intake", "generating", "reviewing", "exported");

    await fc.assert(
      fc.asyncProperty(
        nonEmptyStringArb,
        sectionKeyArb,
        nonEmptyStringArb,
        fc.string({ minLength: 0, maxLength: 50 }),
        nonSetupStatusArb,
        async (projectId, sectionKey, fieldKey, value, status) => {
          vi.clearAllMocks();

          const sectionId = `sec-${projectId}`;

          vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
            id: sectionId,
            projectId,
            sectionKey,
            displayName: "Test",
            sortOrder: 0,
            coverageStatus: "unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);
          vi.mocked(prisma.answer.findMany).mockResolvedValue([
            { fieldKey, value },
          ] as never);
          vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);
          vi.mocked(prisma.project.findUnique).mockResolvedValue({
            status,
          } as never);

          await saveAnswer({ projectId, sectionKey, fieldKey, value });

          expect(prisma.project.update).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
