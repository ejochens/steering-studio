import type { ExportScope } from "@/lib/validation";

const SCOPE_SEGMENT_MAP: Record<ExportScope, string> = {
  all: "both",
  kiro: "kiro",
  copilot: "copilot",
};

/**
 * Pure function. Converts a project name to a URL/filename-safe slug.
 * - lowercases
 * - replaces spaces and special characters with hyphens
 * - collapses consecutive hyphens
 * - trims leading/trailing hyphens
 * - fallback to "project" for empty result
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
}

/**
 * Builds the full ZIP filename with a timestamp for uniqueness.
 * Pattern: steering-studio-{slug}-{scopeSegment}-{YYYYMMDD-HHmmss}.zip
 * Scope mapping: "all" → "both", "kiro" → "kiro", "copilot" → "copilot"
 */
export function buildExportFilename(
  projectName: string,
  scope: ExportScope,
): string {
  const slug = slugify(projectName);
  const scopeSegment = SCOPE_SEGMENT_MAP[scope];
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return `steering-studio-${slug}-${scopeSegment}-${ts}.zip`;
}
