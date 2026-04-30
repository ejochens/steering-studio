import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GeneratedDocument } from "@/generated/prisma/client";

// Mock prisma before importing the module under test
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    generatedDocument: {
      findMany: vi.fn(),
    },
  },
}));

import { getEditedDocumentsInScope } from "../check-overwrite";
import { prisma } from "@/lib/db/prisma";

const mockFindMany = vi.mocked(prisma.generatedDocument.findMany);

function makeDoc(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "doc-1",
    projectId: "proj-1",
    filePath: ".kiro/steering/product.md",
    content: "# Product",
    draftContent: "# Product",
    completeness: "complete",
    missingFields: "[]",
    templateVersion: "1.0",
    manuallyEdited: true,
    generatedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("getEditedDocumentsInScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries all manually edited documents for a project when no filePaths provided", async () => {
    const docs = [makeDoc()];
    mockFindMany.mockResolvedValue(docs);

    const result = await getEditedDocumentsInScope("proj-1");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        manuallyEdited: true,
      },
    });
    expect(result).toEqual(docs);
  });

  it("filters by filePaths when provided", async () => {
    const docs = [makeDoc({ filePath: ".kiro/steering/tech.md" })];
    mockFindMany.mockResolvedValue(docs);

    const result = await getEditedDocumentsInScope("proj-1", [
      ".kiro/steering/tech.md",
    ]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        manuallyEdited: true,
        filePath: { in: [".kiro/steering/tech.md"] },
      },
    });
    expect(result).toEqual(docs);
  });

  it("returns empty array when no edited documents exist", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getEditedDocumentsInScope("proj-1");

    expect(result).toEqual([]);
  });

  it("handles multiple filePaths for single-document scope", async () => {
    mockFindMany.mockResolvedValue([]);

    await getEditedDocumentsInScope("proj-1", [
      ".kiro/steering/product.md",
      ".kiro/steering/tech.md",
    ]);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        projectId: "proj-1",
        manuallyEdited: true,
        filePath: {
          in: [".kiro/steering/product.md", ".kiro/steering/tech.md"],
        },
      },
    });
  });
});
