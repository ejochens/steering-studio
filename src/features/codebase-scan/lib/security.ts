import path from "node:path";

const SENSITIVE_EXACT = [".env"];
const SENSITIVE_PREFIX = [".env."];
const SENSITIVE_EXTENSIONS = [".pem", ".key"];
const SENSITIVE_SUBSTRINGS = ["secret", "credential"];

/**
 * Returns true if the filename matches any sensitive pattern:
 * - `.env` (exact match)
 * - `.env.*` (e.g. `.env.local`, `.env.production`)
 * - `*.pem`
 * - `*.key`
 * - `*secret*` (case-insensitive, anywhere in filename)
 * - `*credential*` (case-insensitive, anywhere in filename)
 */
export function isSensitiveFile(filename: string): boolean {
  const lower = filename.toLowerCase();

  if (SENSITIVE_EXACT.includes(lower)) return true;

  for (const prefix of SENSITIVE_PREFIX) {
    if (lower.startsWith(prefix)) return true;
  }

  for (const ext of SENSITIVE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }

  for (const sub of SENSITIVE_SUBSTRINGS) {
    if (lower.includes(sub)) return true;
  }

  return false;
}

/**
 * Returns true if the resolved absolute `filePath` is a descendant of `rootPath`.
 * Uses path.resolve for normalization. Handles:
 * - Path traversal attempts (e.g. `../../etc/passwd`)
 * - Normalized paths
 * - Both forward and back slashes on Windows
 */
export function isWithinDirectory(filePath: string, rootPath: string): boolean {
  const resolvedFile = path.resolve(filePath);
  const resolvedRoot = path.resolve(rootPath);

  // Ensure the root ends with a separator so "/root" doesn't match "/rootExtra"
  const rootWithSep = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;

  return resolvedFile.startsWith(rootWithSep) || resolvedFile === resolvedRoot;
}
