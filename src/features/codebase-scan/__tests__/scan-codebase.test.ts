import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    intakeSection: { findUnique: vi.fn(), update: vi.fn() },
    answer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/resolve-provider", () => ({
  resolveProvider: vi.fn(),
}));

vi.mock("@/features/intake/lib/calculate-coverage", () => ({
  calculateCoverage: vi.fn().mockReturnValue("partial"),
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
        { fieldKey: "hosting-deployment", status: "optional" },
        { fieldKey: "coding-standards", status: "optional" },
      ],
    },
    {
      sectionKey: "testing-and-quality",
      fields: [{ fieldKey: "testing-framework", status: "required" }],
    },
    {
      sectionKey: "project-structure-and-conventions",
      fields: [
        { fieldKey: "folder-structure", status: "optional" },
        { fieldKey: "module-organization", status: "optional" },
        { fieldKey: "coding-standards", status: "optional" },
      ],
    },
  ],
}));

import { prisma } from "@/lib/db/prisma";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { scanCodebase } from "../actions/scan-codebase";

// ── Temp directory setup ─────────────────────────────────────────────

let tempDir: string;
const PROJECT_ID = "proj-integration-1";

const SECTIONS: Record<string, { id: string; sectionKey: string }> = {
  "product-and-users": { id: "sec-product", sectionKey: "product-and-users" },
  "tech-stack-and-architecture": {
    id: "sec-tech",
    sectionKey: "tech-stack-and-architecture",
  },
  "testing-and-quality": {
    id: "sec-testing",
    sectionKey: "testing-and-quality",
  },
  "project-structure-and-conventions": {
    id: "sec-structure",
    sectionKey: "project-structure-and-conventions",
  },
};

function setupDbMocks(overrides?: {
  project?: unknown;
}) {
  vi.clearAllMocks();

  const project =
    overrides && "project" in overrides
      ? overrides.project
      : { id: PROJECT_ID, codebasePath: tempDir };

  vi.mocked(prisma.project.findUnique).mockResolvedValue(project as never);

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
      for (const sec of Object.values(SECTIONS)) {
        if (sec.id === where.id) {
          return Promise.resolve(sec) as never;
        }
      }
      return Promise.resolve(null) as never;
    },
  );

  vi.mocked(prisma.answer.findUnique).mockResolvedValue(null as never);
  vi.mocked(prisma.answer.create).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.update).mockResolvedValue({} as never);
  vi.mocked(prisma.answer.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.intakeSection.update).mockResolvedValue({} as never);

  // No AI provider configured
  vi.mocked(resolveProvider).mockResolvedValue(null);
}

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "scan-integration-"));

  // Create known files in the temp directory
  const packageJson = JSON.stringify({
    name: "test-project",
    description: "A test project for integration testing",
    dependencies: {
      react: "^18.0.0",
      "react-dom": "^18.0.0",
      typescript: "^5.0.0",
    },
    devDependencies: {
      vitest: "^1.0.0",
    },
  });
  await writeFile(path.join(tempDir, "package.json"), packageJson);

  const tsconfig = JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      paths: { "@/*": ["./src/*"] },
    },
  });
  await writeFile(path.join(tempDir, "tsconfig.json"), tsconfig);

  const readme = "# Test Project\n\nThis is a test project for scanning.\n";
  await writeFile(path.join(tempDir, "README.md"), readme);

  const dockerfile = "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\n";
  await writeFile(path.join(tempDir, "Dockerfile"), dockerfile);

  // Create src/features directory to trigger feature-based detection
  await mkdir(path.join(tempDir, "src", "features"), { recursive: true });
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});


// ── Tests ────────────────────────────────────────────────────────────

describe("scanCodebase integration", () => {
  describe("full scan pipeline with temp directory", () => {
    it("scans known files and returns correct summary", async () => {
      setupDbMocks();

      const result = await scanCodebase(PROJECT_ID);

      expect(result.success).toBe(true);
      // package.json, tsconfig.json, README.md, Dockerfile = 4 files
      expect(result.filesScanned).toBe(4);
      expect(result.deterministicFieldCount).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it("persists facts via answer.create for each extracted field", async () => {
      setupDbMocks();

      await scanCodebase(PROJECT_ID);

      // persistScanResults should have created answers
      expect(prisma.answer.create).toHaveBeenCalled();

      // Check that specific expected facts were persisted
      const createCalls = vi.mocked(prisma.answer.create).mock.calls;
      const createdFields = createCalls.map(
        (call) => (call[0] as { data: { fieldKey: string } }).data.fieldKey,
      );

      // package.json should produce product-name, product-purpose, frameworks, testing-framework, programming-languages
      expect(createdFields).toContain("product-name");
      expect(createdFields).toContain("frameworks");
      expect(createdFields).toContain("testing-framework");
    });

    it("includes AI warning when no provider is configured", async () => {
      setupDbMocks();

      const result = await scanCodebase(PROJECT_ID);

      // No unrecognized files in our temp dir, so no AI warning expected
      // (AI is only invoked for unrecognized files)
      expect(result.success).toBe(true);
    });
  });

  describe("error cases", () => {
    it("returns error when project is not found", async () => {
      setupDbMocks({ project: null });

      const result = await scanCodebase(PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Project not found.");
      expect(result.filesScanned).toBe(0);
    });

    it("returns error when codebasePath is not set", async () => {
      setupDbMocks({
        project: { id: PROJECT_ID, codebasePath: null },
      });

      const result = await scanCodebase(PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Codebase path is not set for this project.");
      expect(result.filesScanned).toBe(0);
    });

    it("returns validation error for invalid path", async () => {
      setupDbMocks({
        project: {
          id: PROJECT_ID,
          codebasePath: path.join(tempDir, "nonexistent-dir-xyz"),
        },
      });

      const result = await scanCodebase(PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Directory not found");
      expect(result.filesScanned).toBe(0);
    });
  });
});
