"use server";

import { prisma } from "@/lib/db/prisma";
import { resolveProvider } from "@/lib/ai/resolve-provider";
import { validateCodebasePath } from "../lib/validate-path";
import { discoverFiles } from "../lib/discover-files";
import { analyzeUnrecognizedFiles } from "../lib/ai-analyzer";
import { mergeResults } from "../lib/merge-results";
import { persistScanResults } from "../lib/persist-scan";
import { parsePackageJson } from "../lib/parsers/package-json";
import { parseTsConfig } from "../lib/parsers/tsconfig";
import { parsePrismaSchema } from "../lib/parsers/prisma-schema";
import { parseDockerfile } from "../lib/parsers/dockerfile";
import { parseCiCd } from "../lib/parsers/ci-cd";
import { parseReadme } from "../lib/parsers/readme";
import { parseDirectoryStructure } from "../lib/parsers/directory-structure";
import { parseSteeringDocs } from "../lib/parsers/steering-docs";
import type { ScanFact, ScanSummary } from "../lib/types";

/**
 * Registry mapping known file patterns to their deterministic parsers.
 * Each entry specifies a match function and the parser to run.
 */
const PARSER_REGISTRY: Array<{
  match: (fileName: string) => boolean;
  parse: (content: string, fileName: string) => ScanFact[];
}> = [
  { match: (f) => f === "package.json", parse: parsePackageJson },
  {
    match: (f) => f === "tsconfig.json" || f === "jsconfig.json",
    parse: parseTsConfig,
  },
  { match: (f) => f === "prisma/schema.prisma", parse: parsePrismaSchema },
  {
    match: (f) => f === "Dockerfile" || f === "docker-compose.yml",
    parse: parseDockerfile,
  },
  {
    match: (f) => f.startsWith(".github/workflows/") && f.endsWith(".yml"),
    parse: parseCiCd,
  },
  { match: (f) => f === "README.md", parse: parseReadme },
  {
    match: (f) =>
      f.startsWith(".kiro/steering/") ||
      f === ".github/copilot-instructions.md",
    parse: parseSteeringDocs,
  },
];

/**
 * Orchestrates the full codebase scan pipeline.
 *
 * Flow:
 * 1. Load project from DB, read codebasePath
 * 2. Validate path
 * 3. Discover files
 * 4. Run deterministic parsers on known files
 * 5. Run AI analyzer on unrecognized files (if provider available)
 * 6. Merge results
 * 7. Persist answers
 * 8. Return summary
 */
export async function scanCodebase(
  projectId: string,
): Promise<ScanSummary> {
  const warnings: string[] = [];

  // 1. Load project from DB
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, codebasePath: true },
  });

  if (!project) {
    return {
      success: false,
      filesScanned: 0,
      deterministicFieldCount: 0,
      aiFieldCount: 0,
      warnings: [],
      error: "Project not found.",
    };
  }

  if (!project.codebasePath) {
    return {
      success: false,
      filesScanned: 0,
      deterministicFieldCount: 0,
      aiFieldCount: 0,
      warnings: [],
      error: "Codebase path is not set for this project.",
    };
  }

  // 2. Validate path
  const validation = await validateCodebasePath(project.codebasePath);
  if (!validation.valid) {
    return {
      success: false,
      filesScanned: 0,
      deterministicFieldCount: 0,
      aiFieldCount: 0,
      warnings: [],
      error: validation.error ?? "Path validation failed.",
    };
  }

  try {
    // 3. Discover files
    const discovered = await discoverFiles(validation.resolvedPath);

    // 4. Run deterministic parsers on known files
    const deterministicFacts: ScanFact[] = [];
    const filesScanned: string[] = [];

    for (const [fileName, content] of discovered.known) {
      filesScanned.push(fileName);
      const entry = PARSER_REGISTRY.find((r) => r.match(fileName));
      if (entry) {
        const facts = entry.parse(content, fileName);
        deterministicFacts.push(...facts);
      }
    }

    // Run directory structure parser (uses listing data, not file content)
    if (
      discovered.directoryListing.length > 0 ||
      discovered.srcSubdirs.length > 0
    ) {
      const dirFacts = parseDirectoryStructure(
        discovered.directoryListing,
        discovered.srcSubdirs,
        "<directory-listing>",
      );
      deterministicFacts.push(...dirFacts);
    }

    // 5. Run AI analyzer on unrecognized files (if provider available)
    let aiFacts: ScanFact[] = [];

    if (discovered.unrecognized.size > 0) {
      const providerConfig = await resolveProvider("intake");

      if (!providerConfig) {
        warnings.push(
          "No AI provider configured. Skipping AI analysis of unrecognized files.",
        );
      } else {
        const aiResult = await analyzeUnrecognizedFiles(
          discovered.unrecognized,
          providerConfig,
        );
        aiFacts = aiResult.facts;

        if (aiResult.error) {
          warnings.push(
            `AI analysis encountered an error: ${aiResult.error}. Continuing with deterministic results.`,
          );
        }

        // Add unrecognized files to the scanned list
        for (const fileName of discovered.unrecognized.keys()) {
          filesScanned.push(fileName);
        }
      }
    }

    // 6. Merge results
    const scanResult = mergeResults(
      deterministicFacts,
      aiFacts,
      filesScanned,
      warnings,
    );

    // 7. Persist answers
    await persistScanResults(projectId, scanResult);

    // 8. Return summary
    return {
      success: true,
      filesScanned: scanResult.filesScanned.length,
      deterministicFieldCount: scanResult.deterministicFieldCount,
      aiFieldCount: scanResult.aiFieldCount,
      warnings: scanResult.warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scanCodebase] Error: ${message}`);
    return {
      success: false,
      filesScanned: 0,
      deterministicFieldCount: 0,
      aiFieldCount: 0,
      warnings,
      error: `Scan failed: ${message}`,
    };
  }
}
