import { zipSync } from "fflate";

/**
 * Pure function. Takes an array of file entries and returns a ZIP buffer.
 * Uses fflate's zipSync for synchronous in-memory compression.
 */
export function buildZipArchive(
  files: Array<{ path: string; content: string }>,
): Uint8Array {
  const encoder = new TextEncoder();

  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.path] = encoder.encode(file.content);
  }

  return zipSync(entries);
}
