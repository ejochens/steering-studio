import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exportScopeSchema } from "@/lib/validation";
import type { TargetOutput } from "@/lib/validation";
import { getAllowedScopes, getTemplatesForScope } from "@/features/export/lib/scope";
import { buildZipArchive } from "@/features/export/lib/zip-packager";
import { buildExportFilename } from "@/features/export/lib/slugify";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  try {
    // 1. Parse and validate projectId from route params
    const { projectId } = await params;

    // 2. Parse and validate scope from query string
    const url = new URL(request.url);
    const rawScope = url.searchParams.get("scope");
    const scopeResult = exportScopeSchema.safeParse(rawScope);
    if (!scopeResult.success) {
      return NextResponse.json(
        { error: "Invalid export scope" },
        { status: 400 },
      );
    }
    const scope = scopeResult.data;

    // 3. Load project from Prisma
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, targetOutput: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    // 4. Validate scope is allowed for project targetOutput
    const allowedScopes = getAllowedScopes(project.targetOutput as TargetOutput);
    if (!allowedScopes.includes(scope)) {
      return NextResponse.json(
        { error: "Scope not allowed for this project" },
        { status: 400 },
      );
    }

    // 5. Resolve expected templates for scope
    const templates = getTemplatesForScope(scope, project.targetOutput as TargetOutput);
    const templateFilePaths = new Set(templates.map((t) => t.filePath));

    // 6. Load generated documents from Prisma
    const documents = await prisma.generatedDocument.findMany({
      where: { projectId },
      select: { filePath: true, content: true },
    });

    // 7. Filter documents to those matching the scope's template file paths
    const matchingDocs = documents.filter((d) => templateFilePaths.has(d.filePath));
    if (matchingDocs.length === 0) {
      return NextResponse.json(
        { error: "No documents available for export" },
        { status: 404 },
      );
    }

    // 8. Build ZIP archive
    const zipBuffer = buildZipArchive(
      matchingDocs.map((d) => ({ path: d.filePath, content: d.content })),
    );

    // 9. Build filename
    const filename = buildExportFilename(project.name, scope);

    // 10. Return ZIP response
    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate ZIP archive" },
      { status: 500 },
    );
  }
}
