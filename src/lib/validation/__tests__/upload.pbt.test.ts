// Feature: project-type-and-import, Property 2: Upload validation schema accepts valid inputs and rejects invalid ones
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { uploadDocumentsSchema } from "../upload";

// **Validates: Requirements 2.5, 2.6, 3.3, 13.1**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a valid markdown filename ending in .md or .markdown (case-insensitive variants) */
const validExtensionArb = fc.constantFrom(".md", ".markdown", ".MD", ".Markdown", ".MARKDOWN", ".Md");

const validFilenameArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
    validExtensionArb,
  )
  .map(([name, ext]) => `${name}${ext}`);

/** Generate a non-empty content string */
const validContentArb = fc.string({ minLength: 1, maxLength: 200 });

/** Generate a single valid file object */
const validFileArb = fc.record({
  filename: validFilenameArb,
  content: validContentArb,
});

/** Generate a valid files array (1–20 files) */
const validFilesArb = fc.array(validFileArb, { minLength: 1, maxLength: 20 });

/** Generate a non-empty projectId */
const validProjectIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Generate a complete valid input */
const validInputArb = fc.record({
  projectId: validProjectIdArb,
  files: validFilesArb,
});

/** Generate an invalid file extension */
const invalidExtensionArb = fc.constantFrom(".txt", ".pdf", ".doc", ".html", ".js", ".ts", ".json", "");

const invalidFilenameArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
    invalidExtensionArb,
  )
  .map(([name, ext]) => `${name}${ext}`);

// ── Property Tests ──────────────────────────────────────────────────

describe("Property: Upload validation schema accepts valid inputs and rejects invalid ones", () => {
  it("accepts any valid input (non-empty projectId, 1-20 files with .md/.markdown extensions and non-empty content)", () => {
    fc.assert(
      fc.property(validInputArb, (input) => {
        const result = uploadDocumentsSchema.safeParse(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty projectId", () => {
    fc.assert(
      fc.property(validFilesArb, (files) => {
        const result = uploadDocumentsSchema.safeParse({
          projectId: "",
          files,
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects files with invalid extensions", () => {
    fc.assert(
      fc.property(validProjectIdArb, invalidFilenameArb, validContentArb, (projectId, filename, content) => {
        const result = uploadDocumentsSchema.safeParse({
          projectId,
          files: [{ filename, content }],
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects files with empty content", () => {
    fc.assert(
      fc.property(validProjectIdArb, validFilenameArb, (projectId, filename) => {
        const result = uploadDocumentsSchema.safeParse({
          projectId,
          files: [{ filename, content: "" }],
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects more than 20 files", () => {
    fc.assert(
      fc.property(
        validProjectIdArb,
        fc.array(validFileArb, { minLength: 21, maxLength: 30 }),
        (projectId, files) => {
          const result = uploadDocumentsSchema.safeParse({ projectId, files });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects zero files", () => {
    fc.assert(
      fc.property(validProjectIdArb, (projectId) => {
        const result = uploadDocumentsSchema.safeParse({
          projectId,
          files: [],
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
