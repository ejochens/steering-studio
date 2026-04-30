// Feature: project-type-and-import, Property 3: Document parser preserves all document content with boundary markers
// Feature: project-type-and-import, Property 4: Document parser strips YAML front matter
// Feature: project-type-and-import, Property 5: Document parser truncation
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseDocuments } from "../document-parser";

// **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a valid markdown filename */
const filenameArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
    fc.constantFrom(".md", ".markdown"),
  )
  .map(([name, ext]) => `${name}${ext}`);

/** Generate markdown content without YAML front matter (no leading ---) */
const markdownContentArb = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => !s.startsWith("---"));

/** Generate a single document without front matter */
const documentArb = fc.record({
  filename: filenameArb,
  content: markdownContentArb,
});

/** Generate a list of 1-10 documents */
const documentsArb = fc.array(documentArb, { minLength: 1, maxLength: 10 });

/** Generate a YAML front matter block */
const yamlKeyArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s));

const yamlValueArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => !s.includes("\n") && !s.includes("---"));

const frontMatterArb = fc
  .array(fc.tuple(yamlKeyArb, yamlValueArb), { minLength: 1, maxLength: 5 })
  .map((pairs) => {
    const lines = pairs.map(([k, v]) => `${k}: ${v}`);
    return `---\n${lines.join("\n")}\n---\n`;
  });

/** Generate content that comes after front matter (the body) */
const bodyContentArb = fc
  .string({ minLength: 1, maxLength: 300 })
  .filter((s) => !s.includes("---\n") && s.trim().length > 0);

// ── Property 3: Document parser preserves all document content with boundary markers ──

describe("Feature: project-type-and-import, Property 3: Document parser preserves all document content with boundary markers", () => {
  it("every filename appears in a boundary marker in the output", () => {
    fc.assert(
      fc.property(documentsArb, (docs) => {
        const result = parseDocuments(docs);
        for (const doc of docs) {
          expect(result.text).toContain(`--- Document: ${doc.filename} ---`);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every non-front-matter content segment appears in the output", () => {
    fc.assert(
      fc.property(documentsArb, (docs) => {
        const result = parseDocuments(docs);
        // Since these docs have no front matter, all content should appear
        for (const doc of docs) {
          expect(result.text).toContain(doc.content);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("documentCount equals the number of input documents", () => {
    fc.assert(
      fc.property(documentsArb, (docs) => {
        const result = parseDocuments(docs);
        expect(result.documentCount).toBe(docs.length);
      }),
      { numRuns: 100 },
    );
  });
});


// ── Property 4: Document parser strips YAML front matter ──

describe("Feature: project-type-and-import, Property 4: Document parser strips YAML front matter", () => {
  it("front matter content does NOT appear in the output, but body content DOES appear", () => {
    fc.assert(
      fc.property(filenameArb, frontMatterArb, bodyContentArb, (filename, frontMatter, body) => {
        const content = frontMatter + body;
        const result = parseDocuments([{ filename, content }]);

        // The front matter key-value lines should not appear in the output
        const fmLines = frontMatter.split("\n").filter(
          (line) => line.trim() !== "" && line.trim() !== "---",
        );
        for (const line of fmLines) {
          expect(result.text).not.toContain(line);
        }

        // The body content after front matter should appear
        expect(result.text).toContain(body);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 5: Document parser truncation ──

describe("Feature: project-type-and-import, Property 5: Document parser truncation", () => {
  it("output does not exceed 100,000 characters and truncated is true when combined content exceeds the limit", () => {
    // Generate a small number of documents with large content that will exceed 100k
    const largeDocArb = fc.record({
      filename: filenameArb,
      content: fc.string({ minLength: 20_000, maxLength: 60_000 }).filter((s) => !s.startsWith("---")),
    });
    const largeDocsArb = fc.array(largeDocArb, { minLength: 3, maxLength: 6 });

    fc.assert(
      fc.property(largeDocsArb, (docs) => {
        const result = parseDocuments(docs);
        // Only assert on cases where combined content actually exceeds the limit
        const combinedLength = docs.reduce((sum, d) => sum + d.content.length + d.filename.length + 20, 0);
        if (combinedLength > 100_000) {
          expect(result.text.length).toBeLessThanOrEqual(100_000);
          expect(result.truncated).toBe(true);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("truncated is false and all content is present when combined content is within the limit", () => {
    // Generate small documents that stay well within the limit
    const smallDocArb = fc.record({
      filename: filenameArb,
      content: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => !s.startsWith("---")),
    });
    const smallDocsArb = fc.array(smallDocArb, { minLength: 1, maxLength: 5 });

    fc.assert(
      fc.property(smallDocsArb, (docs) => {
        const result = parseDocuments(docs);
        expect(result.truncated).toBe(false);
        // All content should be present
        for (const doc of docs) {
          expect(result.text).toContain(doc.content);
        }
      }),
      { numRuns: 100 },
    );
  });
});
