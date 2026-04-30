import type { ScanFact } from "../types";

export function parseReadme(content: string, fileName: string): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  // Extract the first heading (# line)
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const heading = headingMatch?.[1]?.trim() ?? null;

  // Extract the first non-empty paragraph after the first heading
  let paragraph: string | null = null;
  if (headingMatch) {
    const afterHeading = content.slice(headingMatch.index! + headingMatch[0].length);
    // Find the first non-empty, non-heading line(s) forming a paragraph
    const paraMatch = afterHeading.match(/\n\s*\n\s*([^\n#][^\n]*(?:\n(?!\s*\n)[^\n#][^\n]*)*)/);
    if (paraMatch) {
      paragraph = paraMatch[1].trim();
    }
  }

  if (heading || paragraph) {
    const parts: string[] = [];
    if (heading) parts.push(heading);
    if (paragraph) parts.push(paragraph);

    facts.push({
      sectionKey: "product-and-users",
      fieldKey: "product-purpose",
      value: parts.join(" — "),
      ...base,
    });
  }

  return facts;
}
