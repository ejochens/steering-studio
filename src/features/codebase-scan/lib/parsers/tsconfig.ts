import type { ScanFact } from "../types";

export function parseTsConfig(content: string, fileName: string): ScanFact[] {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return [];
  }

  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };
  const baseName = fileName.split("/").pop() ?? fileName;

  // tsconfig.json → TypeScript language fact; jsconfig.json → no TypeScript fact
  if (baseName === "tsconfig.json") {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "programming-languages",
      value: "TypeScript",
      ...base,
    });
  }

  // Extract path aliases from compilerOptions.paths
  const compilerOptions =
    typeof config.compilerOptions === "object" && config.compilerOptions !== null
      ? (config.compilerOptions as Record<string, unknown>)
      : null;

  if (compilerOptions && typeof compilerOptions.paths === "object" && compilerOptions.paths !== null) {
    const paths = compilerOptions.paths as Record<string, unknown>;
    const aliases = Object.keys(paths);
    if (aliases.length > 0) {
      facts.push({
        sectionKey: "project-structure-and-conventions",
        fieldKey: "coding-standards",
        value: `Path aliases: ${aliases.join(", ")}`,
        ...base,
      });
    }
  }

  return facts;
}
