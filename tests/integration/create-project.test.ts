import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

// Next.js redirect throws a special NEXT_REDIRECT error
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
    },
  },
}));

import { createProject } from "@/features/projects/actions/create-project";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────

describe("createProject server action", () => {
  const validInput = {
    name: "My Project",
    workingTitle: "A working title",
    targetOutput: "Kiro" as const,
    projectType: "new" as const,
    hasExistingDocs: false,
  };

  it("creates a project and redirects to /projects/[id]", async () => {
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "proj-123",
      name: "My Project",
      workingTitle: "A working title",
      targetOutput: "Kiro",
      projectType: "new",
      hasExistingDocs: false,
      status: "setup",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(createProject(validInput)).rejects.toThrow("NEXT_REDIRECT");

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Project",
        workingTitle: "A working title",
        targetOutput: "Kiro",
        projectType: "new",
        hasExistingDocs: false,
        status: "setup",
      },
    });
    expect(redirect).toHaveBeenCalledWith("/projects/proj-123");
  });

  it("creates project with status 'setup'", async () => {
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: "proj-456",
      name: "Another Project",
      workingTitle: "Title",
      targetOutput: "Both",
      projectType: "new",
      hasExistingDocs: false,
      status: "setup",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      createProject({ name: "Another Project", workingTitle: "Title", targetOutput: "Both", projectType: "new", hasExistingDocs: false }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(prisma.project.create).mock.calls[0][0].data).toMatchObject({
      status: "setup",
    });
  });

  it("returns error without calling Prisma when input is invalid", async () => {
    const result = await createProject({
      name: "",
      workingTitle: "",
      targetOutput: "InvalidTarget" as never,
    });

    expect(result).toEqual({ error: expect.stringMatching(/invalid/i) });
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it("returns error message when Prisma create fails", async () => {
    vi.mocked(prisma.project.create).mockRejectedValue(new Error("DB connection lost"));

    const result = await createProject(validInput);

    expect(result).toEqual({ error: expect.stringMatching(/failed/i) });
  });
});
