import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    generatedDocument: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────

function buildRequest(projectId: string, scope?: string): Request {
  const url = new URL(`http://localhost/api/export/${projectId}`);
  if (scope !== undefined) {
    url.searchParams.set("scope", scope);
  }
  return new Request(url.toString());
}

function buildParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/export/[projectId]", () => {
  describe("success path", () => {
    it("returns 200 with ZIP binary and correct headers for a valid project and scope", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        name: "My Project",
        targetOutput: "Kiro",
      } as never);

      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([
        { filePath: ".kiro/steering/product.md", content: "# Product" },
        { filePath: ".kiro/steering/tech.md", content: "# Tech" },
        { filePath: ".kiro/steering/structure.md", content: "# Structure" },
      ] as never);

      const request = buildRequest("proj-1", "kiro");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");

      const disposition = response.headers.get("Content-Disposition");
      expect(disposition).toContain("attachment");
      expect(disposition).toContain("steering-studio-my-project-kiro-");
      expect(disposition).toMatch(/\.zip"?$/);

      const body = new Uint8Array(await response.arrayBuffer());
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("404 - project not found", () => {
    it("returns 404 when the project ID does not exist", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      const request = buildRequest("nonexistent", "kiro");
      const response = await GET(request, buildParams("nonexistent"));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "Project not found" });
    });
  });

  describe("400 - invalid scope", () => {
    it("returns 400 when scope is not a valid enum value", async () => {
      const request = buildRequest("proj-1", "invalid");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Invalid export scope" });
    });

    it("returns 400 when scope query param is missing", async () => {
      const request = buildRequest("proj-1");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Invalid export scope" });
    });
  });

  describe("400 - scope not allowed for target", () => {
    it("returns 400 when requesting copilot scope for a Kiro-only project", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        name: "Kiro Only",
        targetOutput: "Kiro",
      } as never);

      const request = buildRequest("proj-1", "copilot");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Scope not allowed for this project" });
    });

    it("returns 400 when requesting kiro scope for a Copilot-only project", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        name: "Copilot Only",
        targetOutput: "Copilot",
      } as never);

      const request = buildRequest("proj-1", "kiro");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Scope not allowed for this project" });
    });
  });

  describe("404 - no documents for scope", () => {
    it("returns 404 when no generated documents match the scope templates", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        name: "My Project",
        targetOutput: "Kiro",
      } as never);

      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([] as never);

      const request = buildRequest("proj-1", "kiro");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "No documents available for export" });
    });

    it("returns 404 when documents exist but none match scope file paths", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        name: "My Project",
        targetOutput: "Kiro",
      } as never);

      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValue([
        { filePath: "some/unrelated/file.md", content: "# Unrelated" },
      ] as never);

      const request = buildRequest("proj-1", "kiro");
      const response = await GET(request, buildParams("proj-1"));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "No documents available for export" });
    });
  });
});
