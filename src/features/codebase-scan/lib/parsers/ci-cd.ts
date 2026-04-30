import type { ScanFact } from "../types";

export function parseCiCd(content: string, fileName: string): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  // GitHub Actions workflow → platform is GitHub
  facts.push({
    sectionKey: "workflows-and-team-practices",
    fieldKey: "source-control-platform",
    value: "GitHub",
    ...base,
  });

  // Extract workflow name
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const workflowName = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;

  // Extract trigger events from `on:` field
  const triggers: string[] = [];
  // Use [^\S\n]* instead of \s* to avoid matching across newlines
  const onLineMatch = content.match(/^on:[^\S\n]+(.+)$/m);
  if (onLineMatch) {
    // Inline form: on: [push, pull_request] or on: push
    const inline = onLineMatch[1].trim();
    if (inline.startsWith("[")) {
      const items = inline.replace(/[[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
      triggers.push(...items);
    } else if (inline.length > 0) {
      triggers.push(inline);
    }
  } else {
    // Block form: on:\n  push:\n  pull_request:
    const onBlockMatch = content.match(/^on:\s*\n((?:[ \t]+\S.*\n?)*)/m);
    if (onBlockMatch) {
      const block = onBlockMatch[1];
      const eventMatches = block.matchAll(/^[ \t]+([a-z_]+)\s*:/gm);
      for (const m of eventMatches) {
        triggers.push(m[1]);
      }
    }
  }

  // Build summary
  const parts: string[] = [];
  if (workflowName) {
    parts.push(workflowName);
  }
  if (triggers.length > 0) {
    parts.push(`triggers: ${triggers.join(", ")}`);
  }

  if (parts.length > 0) {
    facts.push({
      sectionKey: "workflows-and-team-practices",
      fieldKey: "ci-cd-approach",
      value: parts.join(" — "),
      ...base,
    });
  }

  return facts;
}
