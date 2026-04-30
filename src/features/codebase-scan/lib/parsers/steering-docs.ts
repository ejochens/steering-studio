import type { ScanFact } from "../types";

export function parseSteeringDocs(content: string, fileName: string): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  if (fileName.startsWith(".kiro/steering/") && fileName.endsWith(".md")) {
    facts.push({
      sectionKey: "scope-and-non-goals",
      fieldKey: "future-considerations",
      value: `Existing steering document found: ${fileName}`,
      ...base,
    });
  } else if (fileName === ".github/copilot-instructions.md") {
    facts.push({
      sectionKey: "scope-and-non-goals",
      fieldKey: "future-considerations",
      value: "Existing Copilot instructions found: .github/copilot-instructions.md",
      ...base,
    });
  }

  return facts;
}
