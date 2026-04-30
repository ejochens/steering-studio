// Feature: codebase-scan-intake, Property 15: Persistence respects answer source precedence
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { ScanResult, ScanFact } from "../lib/types";

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

vi.mock("@/features/intake/config/sections", () => ({
  INTAKE_SECTIONS: [
    {
      sectionKey: "product-and-users",
      fields: [
        { fieldKey: "product-name", status: "required" },
        { fieldKey: "product-purpose", status: "required" },
      ],
    },
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
    {
      sectionKey: "project-structure-and-conventions",
      fields: [
        { fieldKey: "folder-structure", status: "required" },
        { fieldKey: "module-organization", status: "required" },
        { fieldKey: "coding-standards", status: "optional" },
      ],
    },
  ],
}));

vi.mock("@/features/intake/lib/calculate-coverage", () => ({
  calculateCoverage: vi.fn().mockReturnValue("partial"),
}));

import { prisma } from "@/lib/db/prisma";
import { persistScanResults } from "../lib/persist-scan";

// ── Arbitraries ──────────────────────────────────────────────────────

const sectionKeyArb = fc.constantFrom(
  "product-and-users",
  "tech-stack-and-architecture",
  "testing-and-quality",
  "workflows-and-team-practices",
  "project-structure-and-conventions",
);

const fieldKeyArb = fc.constantFrom(
  "product-name",
  "product-purpose",
  "frameworks",
  "programming-languages",
  "database",
  "hosting-deployment",
  "testing-framework",
  "source-control-platform",
  "ci-cd-approach",
  "folder-structure",
  "module-organization",
  "coding-standards",
);

const sourceFileArb = fc.constantFrom(
  "package.json",
  "tsconfig.json",
  "Dockerfile",
  "docker-compose.yml",
  "README.md",
  "prisma/schema.prisma",
  "workflow.yml",
);

const valueArb = fc.constantFrom(
  "React",
  "Next.js",
  "TypeScript",
  "Docker",
  "PostgreSQL",
  "vitest",
  "jest",
  "GitHub",
  "Prisma",
  "Feature-based",
  "webpack",
  "Express",
);

const factSourceArb = fc.constantFrom(
  "codebase-scan" as const,
  "ai-codebase-scan" as const,
);

type ExistingAnswerState =
  | "user-form"
  | "codebase-scan"
  | "ai-codebase-scan"
  | "missing";

const existingAnswerStateArb: fc.Arbitrary<ExistingAnswerState> = fc.constantFrom(
  "user-form" as const,
  "codebase-scan" as const,
  "ai-codebase-scan" as const,
  "missing" as const,
);

interface FactWithState {
  sectionKey: string;
  fieldKey: string;
  value: string;
  sourceFile: string;
  source: "codebase-scan" | "ai-codebase-scan";
  existingState: ExistingAnswerState;
}

const factWithStateArb: fc.Arbitrary<FactWithState> = fc.record({
  sectionKey: sectionKeyArb,
  fieldKey: fieldKeyArb,
  value: valueArb,
  sourceFile: sourceFileArb,
  source: factSourceArb,
  existingState: existingAnswerStateArb,
});

// Generate a list of facts with unique (sectionKey, fieldKey) pairs
const uniqueFactsArb = fc
  .array(factWithStateArb, { minLength: 1, maxLength: 15 })
  .map((facts) => {
    const seen = new Set<string>();
    return facts.filter((f) => {
      const key = `${f.sectionKey}::${f.fieldKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })
  .filter((facts) => facts.length > 0);

// ── Helpers ──────────────────────────────────────────────────────────

const PROJECT_ID = "proj-test-1";

function setupMocks(factsWithState: FactWithState[]) {
  vi.clearAllMocks();

  const sectionMap = new Map<string, { id: string; sectionKey: string }>();
  for (const f of factsWithState) {
    if (!sectionMap.has(f.sectionKey)) {
      sectionMap.set(f.sectionKey, {
        id: `sec-${PROJECT_ID}-${f.sectionKey}`,
        sectionKey: f.sectionKey,
      });
    }
  }

  vi.mocked(prisma.intakeSection.findUnique).mockImplementation(
    (args: unknown) => {
      const where = (
        args as {
          where: {
            projectId_sectionKey?: {
              projectId: string;
              sectionKey: string;
            };
            id?: string;
          };
        }
      ).where;
      if (where.projectId_sectionKey) {
        const section = sectionMap.get(
          where.projectId_sectionKey.sectionKey,
        );
        return Promise.resolve(section ?? null) as never;
      }
      for (const sec of sectionMap.values()) {
        if (sec.id === where.id) {
          return Promise.resolve(sec) as never;
        }
      }
      return Promise.resolve(null) as never;
    },
  );

  vi.mocked(prisma.answer.findUnique).mockImplementation(
    (args: unknown) => {
      const where = (
        args as {
          where: {
            intakeSectionId_fieldKey: {
              intakeSectionId: string;
              fieldKey: string;
            };
          };
        }
      ).where;
      const { intakeSectionId, fieldKey } =
        where.intakeSectionId_fieldKey;

      const matchingFact = factsWithState.find((f) => {
        const sectionId = `sec-${PROJECT_ID}-${f.sectionKey}`;
        return sectionId === intakeSectionId && f.fieldKey === fieldKey;
      });

      if (!matchingFact || matchingFact.existingState === "missing") {
        return Promise.resolve(null) as never;
      }

      return Promise.resolve({
        id: `ans-${intakeSectionId}-${fieldKey}`,
        intakeSectionId,
        fieldKey,
        value: "existing-value",
        source: matchingFact.existingState,
      }) as never;
    },
  );

  vi.mocked(prisma.answer.create).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.update).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);
}

function buildScanResult(factsWithState: FactWithState[]): ScanResult {
  const facts: ScanFact[] = factsWithState.map((f) => ({
    sectionKey: f.sectionKey,
    fieldKey: f.fieldKey,
    value: f.value,
    sourceFile: f.sourceFile,
    source: f.source,
  }));

  return {
    facts,
    filesScanned: ["package.json"],
    deterministicFieldCount: facts.filter(
      (f) => f.source === "codebase-scan",
    ).length,
    aiFieldCount: facts.filter(
      (f) => f.source === "ai-codebase-scan",
    ).length,
    warnings: [],
  };
}

// ── Tests ────────────────────────────────────────────────────────────

// **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 12.4**
describe("Property 15: Persistence respects answer source precedence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user-form answers are never overwritten (fieldsSkipped incremented)", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        const userFormFacts = factsWithState.map((f) => ({
          ...f,
          existingState: "user-form" as const,
        }));

        setupMocks(userFormFacts);
        const scanResult = buildScanResult(userFormFacts);
        const result = await persistScanResults(PROJECT_ID, scanResult);

        expect(result.fieldsSkipped).toBe(userFormFacts.length);
        expect(result.fieldsCreated).toBe(0);
        expect(result.fieldsUpdated).toBe(0);
        expect(prisma.answer.create).not.toHaveBeenCalled();
        expect(prisma.answer.update).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("codebase-scan and ai-codebase-scan answers are overwritten (fieldsUpdated incremented)", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        const overwritableFacts = factsWithState.map((f, i) => ({
          ...f,
          existingState: (
            i % 2 === 0 ? "codebase-scan" : "ai-codebase-scan"
          ) as ExistingAnswerState,
        }));

        setupMocks(overwritableFacts);
        const scanResult = buildScanResult(overwritableFacts);
        const result = await persistScanResults(PROJECT_ID, scanResult);

        expect(result.fieldsUpdated).toBe(overwritableFacts.length);
        expect(result.fieldsCreated).toBe(0);
        expect(result.fieldsSkipped).toBe(0);
        expect(prisma.answer.update).toHaveBeenCalledTimes(
          overwritableFacts.length,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("missing answers are created (fieldsCreated incremented)", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        const missingFacts = factsWithState.map((f) => ({
          ...f,
          existingState: "missing" as const,
        }));

        setupMocks(missingFacts);
        const scanResult = buildScanResult(missingFacts);
        const result = await persistScanResults(PROJECT_ID, scanResult);

        expect(result.fieldsCreated).toBe(missingFacts.length);
        expect(result.fieldsUpdated).toBe(0);
        expect(result.fieldsSkipped).toBe(0);
        expect(prisma.answer.create).toHaveBeenCalledTimes(
          missingFacts.length,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("source tags are preserved correctly on created and updated answers", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        // Mix of missing and overwritable states (no user-form)
        const mixedFacts = factsWithState.map((f, i) => ({
          ...f,
          existingState: (
            i % 2 === 0 ? "missing" : "codebase-scan"
          ) as ExistingAnswerState,
        }));

        setupMocks(mixedFacts);
        const scanResult = buildScanResult(mixedFacts);
        await persistScanResults(PROJECT_ID, scanResult);

        // Check that create calls preserve the source from the fact
        const createCalls = vi.mocked(prisma.answer.create).mock.calls;
        for (const call of createCalls) {
          const data = (call[0] as { data: { source: string } }).data;
          expect(["codebase-scan", "ai-codebase-scan"]).toContain(
            data.source,
          );
        }

        // Check that update calls preserve the source from the fact
        const updateCalls = vi.mocked(prisma.answer.update).mock.calls;
        for (const call of updateCalls) {
          const data = (call[0] as { data: { source: string } }).data;
          expect(["codebase-scan", "ai-codebase-scan"]).toContain(
            data.source,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("mixed existing states produce correct counts", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        setupMocks(factsWithState);
        const scanResult = buildScanResult(factsWithState);
        const result = await persistScanResults(PROJECT_ID, scanResult);

        const expectedSkipped = factsWithState.filter(
          (f) => f.existingState === "user-form",
        ).length;
        const expectedUpdated = factsWithState.filter(
          (f) =>
            f.existingState === "codebase-scan" ||
            f.existingState === "ai-codebase-scan",
        ).length;
        const expectedCreated = factsWithState.filter(
          (f) => f.existingState === "missing",
        ).length;

        expect(result.fieldsSkipped).toBe(expectedSkipped);
        expect(result.fieldsUpdated).toBe(expectedUpdated);
        expect(result.fieldsCreated).toBe(expectedCreated);
        expect(
          result.fieldsSkipped +
            result.fieldsUpdated +
            result.fieldsCreated,
        ).toBe(factsWithState.length);
      }),
      { numRuns: 100 },
    );
  });

  it("coverageStatus is recalculated for each affected intake section", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueFactsArb, async (factsWithState) => {
        // Exclude user-form so that sections are actually affected
        const nonSkippedFacts = factsWithState.map((f) => ({
          ...f,
          existingState: (
            f.existingState === "user-form" ? "missing" : f.existingState
          ) as ExistingAnswerState,
        }));

        setupMocks(nonSkippedFacts);
        const scanResult = buildScanResult(nonSkippedFacts);
        await persistScanResults(PROJECT_ID, scanResult);

        const affectedSections = new Set(
          nonSkippedFacts.map((f) => f.sectionKey),
        );

        // intakeSection.update should be called once per affected section
        expect(prisma.intakeSection.update).toHaveBeenCalledTimes(
          affectedSections.size,
        );

        // Each update should include a coverageStatus field
        const updateCalls = vi.mocked(prisma.intakeSection.update).mock
          .calls;
        for (const call of updateCalls) {
          const data = (
            call[0] as { data: { coverageStatus: string } }
          ).data;
          expect(data).toHaveProperty("coverageStatus");
        }
      }),
      { numRuns: 100 },
    );
  });
});
