import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    intakeSection: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { initIntakeSections } from "@/features/intake/actions/init-intake-sections";
import { prisma } from "@/lib/db/prisma";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────

describe("initIntakeSections server action", () => {
  it("creates sections for all configured intake sections", async () => {
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.intakeSection.createMany).mockResolvedValue({ count: INTAKE_SECTIONS.length });

    await initIntakeSections("proj-new");

    expect(prisma.intakeSection.createMany).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(prisma.intakeSection.createMany).mock.calls[0][0];
    expect((createCall as { data: unknown[] }).data).toHaveLength(INTAKE_SECTIONS.length);
  });

  it("does not create sections when they already exist", async () => {
    // Return all section keys so the diff finds nothing missing
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue(
      INTAKE_SECTIONS.map((s) => ({ sectionKey: s.sectionKey })) as never,
    );

    await initIntakeSections("proj-existing");

    expect(prisma.intakeSection.createMany).not.toHaveBeenCalled();
  });

  it("creates sections with correct sectionKeys, displayNames, sortOrders, and coverageStatus unknown", async () => {
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.intakeSection.createMany).mockResolvedValue({ count: INTAKE_SECTIONS.length });

    await initIntakeSections("proj-check");

    const createCall = vi.mocked(prisma.intakeSection.createMany).mock.calls[0][0];
    const data = (createCall as { data: Record<string, unknown>[] }).data;

    for (let i = 0; i < INTAKE_SECTIONS.length; i++) {
      const section = INTAKE_SECTIONS[i];
      expect(data[i]).toMatchObject({
        projectId: "proj-check",
        sectionKey: section.sectionKey,
        displayName: section.displayName,
        sortOrder: section.sortOrder,
        coverageStatus: "unknown",
      });
    }
  });

  it("passes the correct projectId to findMany and createMany", async () => {
    vi.mocked(prisma.intakeSection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.intakeSection.createMany).mockResolvedValue({ count: INTAKE_SECTIONS.length });

    await initIntakeSections("proj-abc-123");

    expect(prisma.intakeSection.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj-abc-123" },
      select: { sectionKey: true },
    });

    const createCall = vi.mocked(prisma.intakeSection.createMany).mock.calls[0][0];
    const data = (createCall as { data: Record<string, unknown>[] }).data;
    expect(data.every((row) => row.projectId === "proj-abc-123")).toBe(true);
  });
});
