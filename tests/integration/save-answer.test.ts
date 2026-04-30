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
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────

const validInput = {
  projectId: "proj-1",
  sectionKey: "product-and-users" as const,
  fieldKey: "product-name",
  value: "My Product",
};

function mockHappyPath(projectStatus: string = "intake") {
  vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
    id: "sec-1",
    projectId: "proj-1",
    sectionKey: "product-and-users",
    displayName: "Product and Users",
    sortOrder: 0,
    coverageStatus: "unknown",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  vi.mocked(prisma.answer.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.findMany).mockResolvedValue([
    { fieldKey: "product-name", value: "My Product" },
  ] as never);
  vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);
  vi.mocked(prisma.project.findUnique).mockResolvedValue({
    status: projectStatus,
  } as never);
  vi.mocked(prisma.project.update).mockResolvedValue({} as never);
}

// ── Tests ────────────────────────────────────────────────────────────

describe("saveAnswer server action", () => {
  it("returns success and upserts answer with valid input", async () => {
    mockHappyPath();

    const result = await saveAnswer(validInput);

    expect(result.success).toBe(true);
    expect(prisma.answer.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.answer.upsert).toHaveBeenCalledWith({
      where: {
        intakeSectionId_fieldKey: {
          intakeSectionId: "sec-1",
          fieldKey: "product-name",
        },
      },
      create: {
        intakeSectionId: "sec-1",
        fieldKey: "product-name",
        value: "My Product",
        source: "user-form",
      },
      update: {
        value: "My Product",
        source: "user-form",
      },
    });
  });

  it("returns error without DB calls when sectionKey is invalid", async () => {
    const result = await saveAnswer({
      projectId: "proj-1",
      sectionKey: "invalid-section" as never,
      fieldKey: "product-name",
      value: "test",
    });

    expect(result).toEqual({ success: false, error: expect.stringMatching(/invalid/i) });
    expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
    expect(prisma.answer.upsert).not.toHaveBeenCalled();
  });

  it("returns error without DB calls when projectId is empty", async () => {
    const result = await saveAnswer({
      projectId: "",
      sectionKey: "product-and-users",
      fieldKey: "product-name",
      value: "test",
    });

    expect(result).toEqual({ success: false, error: expect.stringMatching(/invalid/i) });
    expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
  });

  it("returns error without DB calls when fieldKey is empty", async () => {
    const result = await saveAnswer({
      projectId: "proj-1",
      sectionKey: "product-and-users",
      fieldKey: "",
      value: "test",
    });

    expect(result).toEqual({ success: false, error: expect.stringMatching(/invalid/i) });
    expect(prisma.intakeSection.findUnique).not.toHaveBeenCalled();
  });

  it("returns error when section not found", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue(null);

    const result = await saveAnswer(validInput);

    expect(result).toEqual({ success: false, error: "Section not found." });
    expect(prisma.answer.upsert).not.toHaveBeenCalled();
  });

  it("returns error when DB operation fails", async () => {
    vi.mocked(prisma.intakeSection.findUnique).mockResolvedValue({
      id: "sec-1",
    } as never);
    vi.mocked(prisma.answer.upsert).mockRejectedValue(new Error("DB connection lost"));

    const result = await saveAnswer(validInput);

    expect(result).toEqual({ success: false, error: expect.stringMatching(/failed/i) });
  });

  it("transitions project status from 'setup' to 'intake' on first answer", async () => {
    mockHappyPath("setup");

    await saveAnswer(validInput);

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      select: { status: true },
    });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { status: "intake" },
    });
  });

  it("does NOT transition project status when already 'intake'", async () => {
    mockHappyPath("intake");

    await saveAnswer(validInput);

    expect(prisma.project.findUnique).toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("does NOT transition project status when in a later status", async () => {
    mockHappyPath("generating");

    await saveAnswer(validInput);

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("calls revalidatePath after successful save", async () => {
    mockHappyPath();

    await saveAnswer(validInput);

    expect(revalidatePath).toHaveBeenCalledWith("/projects/proj-1/intake");
  });

  it("returns coverageStatus in the result", async () => {
    mockHappyPath();

    const result = await saveAnswer(validInput);

    expect(result.success).toBe(true);
    expect(result.coverageStatus).toBeDefined();
    expect(["unknown", "partial", "complete"]).toContain(result.coverageStatus);
  });
});
