// Feature: zip-export, Property 4: ZIP archive round-trip preserves paths and content
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { unzipSync } from "fflate";
import { buildZipArchive } from "@/features/export/lib/zip-packager";

// **Validates: Requirements 5.1, 5.2, 5.6**

const decoder = new TextDecoder();

/**
 * Generator: path segments are simple alphanumeric+hyphen strings.
 * Paths are composed of 0–3 directory segments plus a filename ending in ".md".
 */
const segmentArb = fc.stringMatching(/^[a-z][a-z0-9\-]{0,10}$/);

const filePathArb = fc
  .tuple(
    fc.array(segmentArb, { minLength: 0, maxLength: 3 }),
    segmentArb,
  )
  .map(([dirs, name]) => [...dirs, name + ".md"].join("/"));

/**
 * Generator: a single file entry with a valid path and arbitrary content.
 */
const fileEntryArb = fc.record({
  path: filePathArb,
  content: fc.string(),
});

/**
 * Generator: a non-empty array of file entries with unique paths.
 */
const uniqueFileEntriesArb = fc
  .array(fileEntryArb, { minLength: 1, maxLength: 10 })
  .map((entries) => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.path)) return false;
      seen.add(e.path);
      return true;
    });
  })
  .filter((arr) => arr.length > 0);

describe("Property 4: ZIP archive round-trip preserves paths and content", () => {
  it("building a ZIP and decompressing it yields the same paths and content", () => {
    fc.assert(
      fc.property(uniqueFileEntriesArb, (files) => {
        const zip = buildZipArchive(files);
        const decompressed = unzipSync(zip);

        const decompressedPaths = Object.keys(decompressed).sort();
        const inputPaths = files.map((f) => f.path).sort();

        // The set of paths in the decompressed output matches the input paths
        expect(decompressedPaths).toEqual(inputPaths);

        // Each decoded content matches the original content string
        for (const file of files) {
          expect(decoder.decode(decompressed[file.path])).toBe(file.content);
        }
      }),
      { numRuns: 100 },
    );
  });
});
