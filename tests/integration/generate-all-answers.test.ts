import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    providerConnection: {
      findFirst: vi.fn(),
    },
    modelAssignment: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    intakeSection: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    uploadedDocument: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/adapters", () => ({
  getAdapter: vi.fn(),
}));

vi.mock("@/lib/utils/crypto", () => ({
  decrypt: vi.fn(() => "decrypted-api-key"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { generateAllAnswers } from "@/features/intake/actions/generate-all-answers";
import { prisma } from "@/lib/db/prisma";
import { getAdapter } from "@/lib/ai/adapters";
import { revalidatePath } from "next/cache";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────

const mockProvider = {
  id: "prov-1",
  providerType: "openai",
  endpoint: "https://api.openai.com",
  region: null,
  modelName: "gpt-4",
  authMode: "api_key",
  encryptedSecret: "encrypted-secret",
  lastTestStatus: "success",
  lastTestedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSendChat = vi.fn();
const mockAdapter = { testConnection: vi.fn(), sendChat: mockSendChat };

/** Build intake section DB rows — all blank (no answers). */
function buildBlankSections(projectId: string) {
  return INTAKE_SECTIONS.map((s, i) => ({
    id: `sec-${i}`,
    projectId,
    sectionKey: s.sectionKey,
    displayName: s.displayName,
    sortOrder: s.sortOrder,
    coverageStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
    answers: [], // no answers → blank
  }));
}

/** Build a valid AI JSON response covering the first section only. */
function buildAiResponseForFirstSection(): string {
  const section = INTAKE_SECTIONS[0];
  const values: Record<string, string> = {};
  for (const f of section.fields) {
    values[f.fieldKey] = `AI value for ${f.label}`;
  }
  return JSON.stringify({ [section.sectionKey]: values });
}

/** Build a valid AI JSON response covering ALL sections. */
function buildAiResponseForAllSections(): string {
  const result: Record<string, Record<string, string>> = {};
  for (const section of INTAKE_SECTIONS) {
    const values: Record<string, string> = {};
    for (const f of section.fields) {
      values[f.fieldKey] = `AI value for ${f.label}`;
    }
    result[section.sectionKey] = values;
  }
  return JSON.stringify(result);
}

function setupProvider() {
  // resolveProvider checks modelAssignment first, then falls back to providerConnection
  vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.providerConnection.findFirst).mockResolvedValue(mockProvider);
  vi.mocked(getAdapter).mockReturnValue(mockAdapter as never);
  // Default to "new" project type so extension path is not triggered
  vi.mocked(prisma.project.findUnique).mockResolvedValue({ projectType: "new" } as never);
  vi.mocked(prisma.uploadedDocument.findMany).mockResolvedValue([]);
}

// ── Tests ────────────────────────────────────────────────────────────

describe("generateAllAnswers server action", () => {
  // ── Requirement 13.2: Validation ────────────────────────────────
  it("returns validation error when projectId is empty", async () => {
    const result = await generateAllAnswers({ projectId: "" });

    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/invalid/i),
    });
    expect(prisma.providerConnection.findFirst).not.toHaveBeenCalled();
  });

  // ── Requirement 13.1, 13.5: No provider ────────────────────────
  it("returns error when no ProviderConnection exists", async () => {
    vi.mocked(prisma.modelAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.providerConnection.findFirst).mockResolvedValue(null);

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/provider/i);
  });

  // ── Requirement 13.5: Early return when no blank fields ────────
  it("returns early with empty results when no blank fields exist", async () => {
    setupProvider();

    // Every section has all fields answered
    const sections = INTAKE_SECTIONS.map((s, i) => ({
      id: `sec-${i}`,
      projectId: "proj-1",
      sectionKey: s.sectionKey,
      displayName: s.displayName,
      sortOrder: s.sortOrder,
      coverageStatus: "complete",
      createdAt: new Date(),
      updatedAt: new Date(),
      answers: s.fields.map((f) => ({
        id: `ans-${i}-${f.fieldKey}`,
        intakeSectionId: `sec-${i}`,
        fieldKey: f.fieldKey,
        value: "existing value",
        source: "user-form",
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    }));

    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(sections as never);

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(true);
    expect(result.suggestions).toEqual({});
    expect(result.autoFilledSections).toEqual([]);
    expect(result.reviewSections).toEqual([]);
    // AI should NOT have been called
    expect(mockSendChat).not.toHaveBeenCalled();
  });

  // ── Requirement 13.6, 13.7, 11.2: Blank-section auto-fill ─────
  it("persists answers with source 'ai-inferred' for blank sections and updates coverage", async () => {
    setupProvider();

    const sections = buildBlankSections("proj-1");
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(sections as never);

    const aiJson = buildAiResponseForAllSections();
    mockSendChat.mockResolvedValue({ content: aiJson });

    // After upsert, findMany returns the newly created answers for coverage calc
    vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.answer.findMany).mockImplementation(async (args: unknown) => {
      const { where } = args as { where: { intakeSectionId: string } };
      const sectionIndex = sections.findIndex((s) => s.id === where.intakeSectionId);
      if (sectionIndex === -1) return [];
      const sectionDef = INTAKE_SECTIONS[sectionIndex];
      return sectionDef.fields.map((f) => ({
        fieldKey: f.fieldKey,
        value: `AI value for ${f.label}`,
      }));
    });
    vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(true);
    // All sections were blank → all should be auto-filled
    expect(result.autoFilledSections).toHaveLength(INTAKE_SECTIONS.length);
    expect(result.suggestions).toEqual({});
    expect(result.reviewSections).toEqual([]);

    // Verify answers were persisted with source "ai-inferred"
    expect(prisma.answer.upsert).toHaveBeenCalled();
    const firstUpsertCall = vi.mocked(prisma.answer.upsert).mock.calls[0][0];
    expect(firstUpsertCall.create.source).toBe("ai-inferred");
    expect(firstUpsertCall.update.source).toBe("ai-inferred");

    // Coverage was recalculated for each section
    expect(prisma.intakeSection.update).toHaveBeenCalled();

    // revalidatePath was called
    expect(revalidatePath).toHaveBeenCalledWith("/projects/proj-1/intake");
  });

  // ── Requirement 13.7: Non-blank sections return suggestions ────
  it("returns suggestions without persisting for non-blank sections", async () => {
    setupProvider();

    // First section has one answer (non-blank), rest are blank
    const sections = buildBlankSections("proj-1");
    const firstSectionDef = INTAKE_SECTIONS[0];
    sections[0].answers = [
      {
        id: "ans-existing",
        intakeSectionId: "sec-0",
        fieldKey: firstSectionDef.fields[0].fieldKey,
        value: "User provided value",
        source: "user-form",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;

    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(sections as never);

    const aiJson = buildAiResponseForAllSections();
    mockSendChat.mockResolvedValue({ content: aiJson });

    vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.answer.findMany).mockImplementation(async (args: unknown) => {
      const { where } = args as { where: { intakeSectionId: string } };
      const sectionIndex = sections.findIndex((s) => s.id === where.intakeSectionId);
      if (sectionIndex === -1) return [];
      const sectionDef = INTAKE_SECTIONS[sectionIndex];
      return sectionDef.fields.map((f) => ({
        fieldKey: f.fieldKey,
        value: `AI value for ${f.label}`,
      }));
    });
    vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(true);

    // First section is non-blank → suggestions returned, NOT auto-filled
    expect(result.reviewSections).toContain(firstSectionDef.sectionKey);
    expect(result.suggestions).toHaveProperty(firstSectionDef.sectionKey);
    expect(result.autoFilledSections).not.toContain(firstSectionDef.sectionKey);

    // Remaining sections were blank → auto-filled
    expect(result.autoFilledSections).toHaveLength(INTAKE_SECTIONS.length - 1);
  });

  // ── Requirement 11.2: Invalid AI response ───────────────────────
  it("returns error when AI returns non-JSON response", async () => {
    setupProvider();

    const sections = buildBlankSections("proj-1");
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(sections as never);

    mockSendChat.mockResolvedValue({ content: "This is not JSON at all" });

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
    // No answers should have been persisted
    expect(prisma.answer.upsert).not.toHaveBeenCalled();
  });

  it("returns error when AI returns JSON with invalid structure", async () => {
    setupProvider();

    const sections = buildBlankSections("proj-1");
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(sections as never);

    // Valid JSON but wrong structure (values are numbers, not strings)
    mockSendChat.mockResolvedValue({
      content: JSON.stringify({ "invalid-key": { field: 123 } }),
    });

    const result = await generateAllAnswers({ projectId: "proj-1" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid/i);
    expect(prisma.answer.upsert).not.toHaveBeenCalled();
  });
});
