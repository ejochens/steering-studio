import { readdir, readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";
import type { DiscoveredFiles } from "./types";
import { isSensitiveFile, isWithinDirectory } from "./security";

/** Maximum content size for known files (100 KB). */
const KNOWN_FILE_MAX_BYTES = 100 * 1024;

/** Maximum content size for README.md (10 KB). */
const README_MAX_BYTES = 10 * 1024;

/** Maximum number of workflow files to read. */
const MAX_WORKFLOW_FILES = 5;

/** Maximum number of unrecognized files to collect. */
const MAX_UNRECOGNIZED_FILES = 10;

/** Maximum content size for unrecognized files (5 KB). */
const UNRECOGNIZED_FILE_MAX_BYTES = 5 * 1024;

/** Fixed known files to check at the root. */
const KNOWN_ROOT_FILES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "Dockerfile",
  "docker-compose.yml",
  "README.md",
];

/** Known files in subdirectories. */
const KNOWN_SUBDIR_FILES = [
  "prisma/schema.prisma",
  ".github/copilot-instructions.md",
];

/** Glob-like directories to scan for known patterns. */
const KNOWN_GLOB_DIRS: { dir: string; pattern: RegExp; max: number }[] = [
  { dir: ".kiro/steering", pattern: /\.md$/i, max: Infinity },
  { dir: ".github/workflows", pattern: /\.yml$/i, max: MAX_WORKFLOW_FILES },
];

/**
 * Patterns that indicate an unrecognized but interesting config/doc file.
 * These are files we want to send to the AI analyzer.
 */
const UNRECOGNIZED_PATTERNS = [
  /^Cargo\.toml$/i,
  /^go\.mod$/i,
  /^go\.sum$/i,
  /^build\.gradle$/i,
  /^build\.gradle\.kts$/i,
  /^settings\.gradle$/i,
  /^settings\.gradle\.kts$/i,
  /^pom\.xml$/i,
  /^Makefile$/i,
  /^CMakeLists\.txt$/i,
  /^pyproject\.toml$/i,
  /^setup\.py$/i,
  /^setup\.cfg$/i,
  /^Gemfile$/i,
  /^composer\.json$/i,
  /^angular\.json$/i,
  /^vue\.config\.(js|ts)$/i,
  /^nuxt\.config\.(js|ts)$/i,
  /^next\.config\.(js|ts|mjs)$/i,
  /^svelte\.config\.(js|ts)$/i,
  /^webpack\.config\.(js|ts)$/i,
  /^rollup\.config\.(js|ts)$/i,
  /^vite\.config\.(js|ts|mjs)$/i,
  /^babel\.config\.(js|json|cjs)$/i,
  /^\.babelrc$/i,
  /^Procfile$/i,
  /^Vagrantfile$/i,
  /^Rakefile$/i,
  /^Taskfile\.yml$/i,
  /^flake\.nix$/i,
  /^shell\.nix$/i,
  /^deno\.json$/i,
  /^bun\.lockb$/i,
  /^turbo\.json$/i,
  /^lerna\.json$/i,
  /^nx\.json$/i,
  /^rush\.json$/i,
];

/** Set of all known root-level filenames (lowercase) for quick lookup. */
const KNOWN_ROOT_SET = new Set(KNOWN_ROOT_FILES.map((f) => f.toLowerCase()));

/** Set of all known subdir file relative paths (lowercase, forward-slash normalized). */
const KNOWN_SUBDIR_SET = new Set(
  KNOWN_SUBDIR_FILES.map((f) => f.toLowerCase().replace(/\\/g, "/")),
);

/**
 * Safely read a file's content, returning null if the file doesn't exist,
 * isn't readable, or resolves outside the root directory.
 */
async function safeReadFile(
  absolutePath: string,
  rootPath: string,
  maxBytes: number,
): Promise<string | null> {
  try {
    // Resolve symlinks to get the real path
    const realFilePath = await realpath(absolutePath);

    // Security: ensure the resolved path is within the root
    if (!isWithinDirectory(realFilePath, rootPath)) {
      return null;
    }

    const fileStat = await stat(realFilePath);
    if (!fileStat.isFile()) return null;

    const buffer = Buffer.alloc(Math.min(maxBytes, fileStat.size));
    if (buffer.length === 0) return "";

    // Use readFile and truncate
    const content = await readFile(realFilePath, "utf-8");
    return content.slice(0, maxBytes);
  } catch {
    return null;
  }
}

/**
 * List entries in a directory, returning an empty array on failure.
 */
async function safeReaddir(
  dirPath: string,
  rootPath: string,
): Promise<string[]> {
  try {
    const realDir = await realpath(dirPath);
    if (!isWithinDirectory(realDir, rootPath)) return [];
    const entries = await readdir(realDir);
    return entries;
  } catch {
    return [];
  }
}

/**
 * Check if a filename matches any unrecognized config/doc pattern.
 */
function isUnrecognizedConfigFile(filename: string): boolean {
  return UNRECOGNIZED_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * Discovers known and unrecognized files within a validated codebase path.
 *
 * - Reads known files from a checklist, capping content at 100KB (10KB for README).
 * - Scans glob-like directories (.kiro/steering, .github/workflows) for matching files.
 * - Detects unrecognized config/doc files at the root.
 * - Collects top-level directory listing and src/ subdirectories.
 * - Skips sensitive files and files outside the root directory.
 */
export async function discoverFiles(
  resolvedPath: string,
): Promise<DiscoveredFiles> {
  const known = new Map<string, string>();
  const unrecognized = new Map<string, string>();
  const directoryListing: string[] = [];
  const srcSubdirs: string[] = [];

  // 1. Read known root files
  for (const fileName of KNOWN_ROOT_FILES) {
    const absPath = path.join(resolvedPath, fileName);
    const maxBytes =
      fileName.toLowerCase() === "readme.md"
        ? README_MAX_BYTES
        : KNOWN_FILE_MAX_BYTES;
    const content = await safeReadFile(absPath, resolvedPath, maxBytes);
    if (content !== null) {
      known.set(fileName, content);
    }
  }

  // 2. Read known subdirectory files
  for (const relPath of KNOWN_SUBDIR_FILES) {
    const absPath = path.join(resolvedPath, relPath);
    const content = await safeReadFile(absPath, resolvedPath, KNOWN_FILE_MAX_BYTES);
    if (content !== null) {
      known.set(relPath, content);
    }
  }

  // 3. Scan glob-like directories for known patterns
  for (const { dir, pattern, max } of KNOWN_GLOB_DIRS) {
    const absDirPath = path.join(resolvedPath, dir);
    const entries = await safeReaddir(absDirPath, resolvedPath);
    let count = 0;
    for (const entry of entries) {
      if (count >= max) break;
      if (!pattern.test(entry)) continue;
      if (isSensitiveFile(entry)) continue;

      const relPath = `${dir}/${entry}`;
      const absPath = path.join(resolvedPath, relPath);
      const content = await safeReadFile(
        absPath,
        resolvedPath,
        KNOWN_FILE_MAX_BYTES,
      );
      if (content !== null) {
        known.set(relPath, content);
        count++;
      }
    }
  }

  // 4. Read top-level directory listing
  const topLevelEntries = await safeReaddir(resolvedPath, resolvedPath);
  for (const entry of topLevelEntries) {
    try {
      const absPath = path.join(resolvedPath, entry);
      const entryStat = await stat(absPath);
      if (entryStat.isDirectory()) {
        directoryListing.push(entry);
      }
    } catch {
      // Skip entries we can't stat
    }
  }

  // 5. Read src/ subdirectories (one level deep)
  const srcPath = path.join(resolvedPath, "src");
  const srcEntries = await safeReaddir(srcPath, resolvedPath);
  for (const entry of srcEntries) {
    try {
      const absPath = path.join(srcPath, entry);
      const entryStat = await stat(absPath);
      if (entryStat.isDirectory()) {
        srcSubdirs.push(entry);
      }
    } catch {
      // Skip entries we can't stat
    }
  }

  // 6. Scan root for unrecognized config/doc files
  for (const entry of topLevelEntries) {
    if (unrecognized.size >= MAX_UNRECOGNIZED_FILES) break;

    // Skip directories
    try {
      const absPath = path.join(resolvedPath, entry);
      const entryStat = await stat(absPath);
      if (!entryStat.isFile()) continue;
    } catch {
      continue;
    }

    // Skip known files
    if (KNOWN_ROOT_SET.has(entry.toLowerCase())) continue;

    // Skip sensitive files
    if (isSensitiveFile(entry)) continue;

    // Check if it matches an unrecognized config pattern
    if (!isUnrecognizedConfigFile(entry)) continue;

    const absPath = path.join(resolvedPath, entry);
    const content = await safeReadFile(
      absPath,
      resolvedPath,
      UNRECOGNIZED_FILE_MAX_BYTES,
    );
    if (content !== null) {
      unrecognized.set(entry, content);
    }
  }

  return { known, unrecognized, directoryListing, srcSubdirs };
}
