import type { ScanFact } from "../types";

const LAYER_BASED_DIRS = new Set(["controllers", "services", "models"]);

export function parseDirectoryStructure(
  directoryListing: string[],
  srcSubdirs: string[],
  fileName: string,
): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  // Map top-level directory names to folder-structure
  if (directoryListing.length > 0) {
    facts.push({
      sectionKey: "project-structure-and-conventions",
      fieldKey: "folder-structure",
      value: directoryListing.join(", "),
      ...base,
    });
  }

  // Detect module organization pattern from src subdirectories
  const hasFeatureBased = srcSubdirs.some((d) => d === "features");
  const hasLayerBased = srcSubdirs.some((d) => LAYER_BASED_DIRS.has(d));

  // Feature-based takes precedence if both patterns exist
  if (hasFeatureBased) {
    facts.push({
      sectionKey: "project-structure-and-conventions",
      fieldKey: "module-organization",
      value: "Feature-based (grouped by domain)",
      ...base,
    });
  } else if (hasLayerBased) {
    facts.push({
      sectionKey: "project-structure-and-conventions",
      fieldKey: "module-organization",
      value: "Layer-based (grouped by type)",
      ...base,
    });
  }

  return facts;
}
