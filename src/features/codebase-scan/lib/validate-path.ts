import { stat, access, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { PathValidationResult } from "./types";

function isSystemRoot(p: string): boolean {
  const normalized = path.resolve(p);
  // Unix root
  if (normalized === "/") return true;
  // Windows drive root like C:\ or D:\ (case-insensitive)
  if (/^[A-Za-z]:\\$/.test(normalized)) return true;
  return false;
}

export async function validateCodebasePath(
  rawPath: string,
): Promise<PathValidationResult> {
  // 1. Non-empty and absolute
  if (!rawPath || rawPath.trim() === "" || !path.isAbsolute(rawPath)) {
    return {
      valid: false,
      resolvedPath: "",
      error: "Please enter an absolute filesystem path",
    };
  }

  // 2. Early system root check on raw input (before filesystem access)
  if (isSystemRoot(rawPath)) {
    return {
      valid: false,
      resolvedPath: path.resolve(rawPath),
      error: "Cannot scan a system root directory",
    };
  }

  // 3. Resolve symlinks and normalize
  let resolvedPath: string;
  try {
    resolvedPath = await realpath(rawPath);
  } catch {
    return {
      valid: false,
      resolvedPath: "",
      error: `Directory not found: ${rawPath}`,
    };
  }

  // 4. Check resolved path is not a system root (symlink could point to root)
  if (isSystemRoot(resolvedPath)) {
    return {
      valid: false,
      resolvedPath: resolvedPath,
      error: "Cannot scan a system root directory",
    };
  }

  // 5. Exists on filesystem and get stats
  let stats;
  try {
    stats = await stat(resolvedPath);
  } catch {
    return {
      valid: false,
      resolvedPath: "",
      error: `Directory not found: ${rawPath}`,
    };
  }

  // 6. Is a directory (not a file)
  if (!stats.isDirectory()) {
    return {
      valid: false,
      resolvedPath: resolvedPath,
      error: `Path is not a directory: ${rawPath}`,
    };
  }

  // 7. Is readable by the process
  try {
    await access(resolvedPath, constants.R_OK);
  } catch {
    return {
      valid: false,
      resolvedPath: resolvedPath,
      error: `Cannot read directory: ${rawPath}`,
    };
  }

  return {
    valid: true,
    resolvedPath: resolvedPath,
  };
}
