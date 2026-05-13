"use server";

import { redirect } from "next/navigation";
import { createProjectSchema, type CreateProjectInput } from "@/lib/validation/project";
import { prisma } from "@/lib/db/prisma";

export async function createProject(data: CreateProjectInput) {
  const parsed = createProjectSchema.safeParse(data);

  if (!parsed.success) {
    return { error: "Invalid project data. Please check your inputs." };
  }

  let projectId: string;

  try {
    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        workingTitle: parsed.data.workingTitle,
        targetOutput: parsed.data.targetOutput,
        projectType: parsed.data.projectType,
        hasExistingDocs: parsed.data.hasExistingDocs,
        codebasePath: parsed.data.codebasePath || null,
        status: "setup",
      },
    });
    projectId = project.id;
  } catch {
    return { error: "Failed to create project. Please try again." };
  }

  redirect(`/projects/${projectId}`);
}
