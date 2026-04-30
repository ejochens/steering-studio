import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    intakeSection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { acceptSectionSuggestions } from "@/features/intake/actions/accept-section-suggestions";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────

const projectId = "proj-1";
const sectionDef = INTAKE_SECTIONS[0]; // product-and-users
const sectionKey = sectionDef.sectionKey;

const mockSection = {
  id: "sec-1",
  projectId,
  sectionKey,
  displayName: sectionDef.displayName,
  sortOrder: sectionDef.sortOrder,
  coverageStatus: "unknown",
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Build a values map covering all fields in the first section. */
function buildValuesForSection(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const f of sectionDef.fields) {
    values[f.fieldKey] = `AI value for ${f.label}`;
  }
  return values;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("acceptSectionSuggestions server action", () => {
  // ── Requirement 14.1, 14.3, 14.5: Successful accept ──────────────
  it("persists all values with source 'ai-inferred' and calls revalidatePath", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue(mockSection as never);
    vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);

    // After upsert, findMany returns all answers for coverage calc
    vi.mocked(prisma.answer.findMany).mockResolvedValue(
      sectionDef.fields.map((f) => ({
        fieldKey: f.fieldKey,
        value: `AI value for ${f.label}`,
      })) as never,
    );
    vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

    const values = buildValuesForSection();
    const result = await acceptSectionSuggestions({ projectId, sectionKey, values });

    expect(result.success).toBe(true);

    // Verify each field was upserted with source "ai-inferred"
    expect(prisma.answer.upsert).toHaveBeenCalledTimes(sectionDef.fields.length);
    for (const f of sectionDef.fields) {
      expect(prisma.answer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            intakeSectionId_fieldKey: {
              intakeSectionId: mockSection.id,
              fieldKey: f.fieldKey,
            },
          },
          create: expect.objectContaining({
            intakeSectionId: mockSection.id,
            fieldKey: f.fieldKey,
            value: `AI value for ${f.label}`,
            source: "ai-inferred",
          }),
          update: expect.objectContaining({
            value: `AI value for ${f.label}`,
            source: "ai-inferred",
          }),
        }),
      );
    }

    // revalidatePath was called
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${projectId}/intake`);
  });

  // ── Requirement 14.4: Coverage recalculation after accept ─────────
  it("recalculates coverage status after accepting suggestions", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue(mockSection as never);
    vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);

    // Return all required fields answered → coverage should be "complete"
    vi.mocked(prisma.answer.findMany).mockResolvedValue(
      sectionDef.fields.map((f) => ({
        fieldKey: f.fieldKey,
        value: `AI value for ${f.label}`,
      })) as never,
    );
    vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

    const values = buildValuesForSection();
    const result = await acceptSectionSuggestions({ projectId, sectionKey, values });

    expect(result.success).toBe(true);
    expect(result.coverageStatus).toBe("complete");

    // intakeSection.update was called with the recalculated coverage
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockSection.id },
        data: { coverageStatus: "complete" },
      }),
    );
  });

  // ── Requirement 14.4: Partial coverage ────────────────────────────
  it("returns partial coverage when only some required fields are answered", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue(mockSection as never);
    vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);

    // Return only the first required field answered
    const requiredFields = sectionDef.fields.filter((f) => f.status === "required");
    vi.mocked(prisma.answer.findMany).mockResolvedValue([
      { fieldKey: requiredFields[0].fieldKey, value: "Some value" },
    ] as never);
    vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

    const values = { [requiredFields[0].fieldKey]: "Some value" };
    const result = await acceptSectionSuggestions({ projectId, sectionKey, values });

    expect(result.success).toBe(true);
    expect(result.coverageStatus).toBe("partial");
  });

  // ── Requirement 14.2: Validation error for invalid sectionKey ─────
  it("returns validation error for invalid sectionKey", async () => {
    const result = await acceptSectionSuggestions({
      projectId,
      sectionKey: "not-a-valid-section-key",
      values: { "some-field": "some value" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
    // No DB calls should have been made
    expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
  });

  // ── Requirement 14.2: Validation error for empty projectId ────────
  it("returns validation error when projectId is empty", async () => {
    const result = await acceptSectionSuggestions({
      projectId: "",
      sectionKey,
      values: { "some-field": "some value" },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
    expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
  });

  // ── Section not found ─────────────────────────────────────────────
  it("returns error when section not found", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue(null);

    const result = await acceptSectionSuggestions({
      projectId,
      sectionKey,
      values: buildValuesForSection(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    // No upserts should have been attempted
    expect(prisma.answer.upsert).not.toHaveBeenCalled();
  });
});
