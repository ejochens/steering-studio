import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScanResult } from "../lib/types";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    intakeSection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    answer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/features/intake/lib/calculate-coverage", () => ({
  calculateCoverage: vi.fn(),
}));

vi.mock("@/features/intake/config/sections", () => ({
  INTAKE_SECTIONS: [
    {
      sectionKey: "tech-stack-and-architecture",
      fields: [
        { fieldKey: "frameworks", status: "required" },
        { fieldKey: "programming-languages", status: "required" },
        { fieldKey: "database", status: "required" },
        { fieldKey: "hosting-deployment", status: "optional" },
      ],
    },
    {
      sectionKey: "testing-and-quality",
      fields: [{ fieldKey: "testing-framework", status: "required" }],
    },
    {
      sectionKey: "workflows-and-team-practices",
      fields: [
        { fieldKey: "source-control-platform", status: "required" },
        { fieldKey: "ci-cd-approach", status: "required" },
      ],
    },
  ],
}));

import { prisma } from "@/lib/db/prisma";
import { calculateCoverage } from "@/features/intake/lib/calculate-coverage";
import { persistScanResults } from "../lib/persist-scan";

// ── Helpers ──────────────────────────────────────────────────────────

const PROJECT_ID = "proj-unit-1";

const SECTIONS: Record<string, { id: string; sectionKey: string }> = {
  "tech-stack-and-architecture": {
    id: "sec-tech",
    sectionKey: "tech-stack-and-architecture",
  },
  "testing-and-quality": {
    id: "sec-testing",
    sectionKey: "testing-and-quality",
  },
  "workflows-and-team-practices": {
    id: "sec-workflows",
    sectionKey: "workflows-and-team-practices",
  },
};

function resetMocks() {
  vi.clearAllMocks();

  vi.mocked(prisma.intakeSection.findUnique).mockImplementation(
    (args: unknown) => {
      const where = (
        args as {
          where: {
            projectId_sectionKey?: { projectId: string; sectionKey: string };
            id?: string;
          };
        }
      ).where;

      if (where.projectId_sectionKey) {
        const section = SECTIONS[where.projectId_sectionKey.sectionKey];
        return Promise.resolve(section ?? null) as never;
      }
      // Lookup by id (used in recalculation loop)
      for (const sec of Object.values(SECTIONS)) {
        if (sec.id === where.id) {
          return Promise.resolve(sec) as never;
        }
      }
      return Promise.resolve(null) as never;
    },
  );

  // Default: no existing answers
  vi.mocked(prisma.answer.findUnique).mockResolvedValue(null as never);
  vi.mocked(prisma.answer.create).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.update).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);
}

function buildScanResult(
  facts: Array<{
    sectionKey: string;
    fieldKey: string;
    value: string;
  }>,
): ScanResult {
  return {
    facts: facts.map((f) => ({
      ...f,
      sourceFile: "package.json",
      source: "codebase-scan" as const,
    })),
    filesScanned: ["package.json"],
    deterministicFieldCount: facts.length,
    aiFieldCount: 0,
    warnings: [],
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Coverage recalculation after scan persistence", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("recalculates coverageStatus for each affected IntakeSection after persisting", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("partial");

    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
      { sectionKey: "testing-and-quality", fieldKey: "testing-framework", value: "vitest" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // Should update both affected sections
    expect(prisma.intakeSection.update).toHaveBeenCalledTimes(2);
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sec-tech" },
        data: { coverageStatus: "partial" },
      }),
    );
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sec-testing" },
        data: { coverageStatus: "partial" },
      }),
    );
  });

  it("sets coverageStatus to 'complete' when all required fields are answered", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("complete");

    // testing-and-quality has only one required field: testing-framework
    // Provide an answer for it, and also mock findMany to return it
    vi.mocked(prisma.answer.findMany).mockResolvedValue([
      { fieldKey: "testing-framework", value: "vitest" },
    ] as never);

    const scanResult = buildScanResult([
      { sectionKey: "testing-and-quality", fieldKey: "testing-framework", value: "vitest" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sec-testing" },
        data: { coverageStatus: "complete" },
      }),
    );
  });

  it("sets coverageStatus to 'partial' when some required fields are answered", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("partial");

    // tech-stack has 3 required fields; we only provide 1
    vi.mocked(prisma.answer.findMany).mockResolvedValue([
      { fieldKey: "frameworks", value: "React" },
    ] as never);

    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sec-tech" },
        data: { coverageStatus: "partial" },
      }),
    );
  });

  it("sets coverageStatus to 'unknown' when no fields are answered", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("unknown");

    vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);

    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sec-tech" },
        data: { coverageStatus: "unknown" },
      }),
    );
  });

  it("does not recalculate sections not affected by the scan", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("partial");

    // Only affect tech-stack section
    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // Only sec-tech should be updated, not sec-testing or sec-workflows
    expect(prisma.intakeSection.update).toHaveBeenCalledTimes(1);
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sec-tech" } }),
    );
  });

  it("recalculates a section only once even when multiple facts affect it", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("partial");

    // Three facts all targeting the same section
    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
      { sectionKey: "tech-stack-and-architecture", fieldKey: "programming-languages", value: "TypeScript" },
      { sectionKey: "tech-stack-and-architecture", fieldKey: "database", value: "PostgreSQL" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // intakeSection.update should be called exactly once for sec-tech
    expect(prisma.intakeSection.update).toHaveBeenCalledTimes(1);
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sec-tech" } }),
    );
  });

  it("passes the correct fields and answer map to calculateCoverage", async () => {
    vi.mocked(calculateCoverage).mockReturnValue("partial");

    const storedAnswers = [
      { fieldKey: "testing-framework", value: "vitest" },
    ];
    vi.mocked(prisma.answer.findMany).mockResolvedValue(storedAnswers as never);

    const scanResult = buildScanResult([
      { sectionKey: "testing-and-quality", fieldKey: "testing-framework", value: "vitest" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // calculateCoverage should have been called with the section's field defs and an answer map
    expect(calculateCoverage).toHaveBeenCalledTimes(1);
    const [fields, answerMap] = vi.mocked(calculateCoverage).mock.calls[0];
    expect(fields).toEqual([{ fieldKey: "testing-framework", status: "required" }]);
    expect(answerMap).toBeInstanceOf(Map);
    expect(answerMap.get("testing-framework")).toBe("vitest");
  });

  it("falls back to 'unknown' when section definition is not found in INTAKE_SECTIONS", async () => {
    // Add a section that exists in DB but not in INTAKE_SECTIONS config
    const unknownSectionId = "sec-unknown";
    vi.mocked(prisma.intakeSection.findUnique).mockImplementation(
      (args: unknown) => {
        const where = (
          args as {
            where: {
              projectId_sectionKey?: { projectId: string; sectionKey: string };
              id?: string;
            };
          }
        ).where;

        if (where.projectId_sectionKey) {
          if (where.projectId_sectionKey.sectionKey === "unknown-section") {
            return Promise.resolve({
              id: unknownSectionId,
              sectionKey: "unknown-section",
            }) as never;
          }
          const section = SECTIONS[where.projectId_sectionKey.sectionKey];
          return Promise.resolve(section ?? null) as never;
        }
        if (where.id === unknownSectionId) {
          return Promise.resolve({
            id: unknownSectionId,
            sectionKey: "unknown-section",
          }) as never;
        }
        for (const sec of Object.values(SECTIONS)) {
          if (sec.id === where.id) {
            return Promise.resolve(sec) as never;
          }
        }
        return Promise.resolve(null) as never;
      },
    );

    const scanResult = buildScanResult([
      { sectionKey: "unknown-section", fieldKey: "some-field", value: "some-value" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // calculateCoverage should NOT be called (no sectionDef found)
    expect(calculateCoverage).not.toHaveBeenCalled();

    // Should still update the section with "unknown" as fallback
    expect(prisma.intakeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: unknownSectionId },
        data: { coverageStatus: "unknown" },
      }),
    );
  });

  it("does not recalculate when all facts are skipped (user-form answers)", async () => {
    // All existing answers are user-form, so all facts get skipped
    vi.mocked(prisma.answer.findUnique).mockResolvedValue({
      id: "ans-1",
      intakeSectionId: "sec-tech",
      fieldKey: "frameworks",
      value: "Vue",
      source: "user-form",
    } as never);

    const scanResult = buildScanResult([
      { sectionKey: "tech-stack-and-architecture", fieldKey: "frameworks", value: "React" },
    ]);

    await persistScanResults(PROJECT_ID, scanResult);

    // No sections should be recalculated since nothing was actually persisted
    expect(prisma.intakeSection.update).not.toHaveBeenCalled();
    expect(calculateCoverage).not.toHaveBeenCalled();
  });
});
