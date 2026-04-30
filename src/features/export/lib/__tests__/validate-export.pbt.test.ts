// Feature: zip-export, Property 1: Validator assigns correct document status
// Feature: zip-export, Property 2: Validator summary counts are consistent
// Feature: zip-export, Property 3: canExport is true iff no required document is missing or empty
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateExportReadiness } from "../validate-export";

/**
 * Generator strategy:
 * 1. Generate a list of unique template file paths
 * 2. For each template, randomly decide if a matching doc exists
 * 3. If doc exists, randomly choose content (empty or non-empty) and
 *    completeness ("complete", "partial", or a random unknown string)
 */

const filePathArb = fc
  .stringMatching(/^[a-z][a-z0-9\-\/\.]{0,30}\.md$/)
  .filter((s) => s.length >= 4);

const templateArb = fc.record({
  filePath: filePathArb,
  required: fc.boolean(),
});

/** Generate a list of templates with unique file paths */
const uniqueTemplatesArb = fc
  .array(templateArb, { minLength: 1, maxLength: 10 })
  .map((templates) => {
    const seen = new Set<string>();
    return templates.filter((t) => {
      if (seen.has(t.filePath)) return false;
      seen.add(t.filePath);
      return true;
    });
  })
  .filter((arr) => arr.length > 0);

const completenessArb = fc.oneof(
  fc.constant("complete"),
  fc.constant("partial"),
  fc.stringMatching(/^[a-z]{1,10}$/), // unknown values
);

const missingFieldsJsonArb = fc.oneof(
  fc.constant("[]"),
  fc
    .array(fc.stringMatching(/^[a-zA-Z]{1,10}$/), { minLength: 1, maxLength: 5 })
    .map((arr) => JSON.stringify(arr)),
  fc.constant("not valid json"),
);

const nonEmptyContentArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * For a given set of templates, generate docs where each template
 * may or may not have a matching doc, with varying content/completeness.
 */
function docsForTemplatesArb(
  templates: Array<{ filePath: string; required: boolean }>,
) {
  const docArbs = templates.map((t) =>
    fc.record({
      present: fc.boolean(),
      content: fc.oneof(fc.constant(""), nonEmptyContentArb),
      completeness: completenessArb,
      missingFields: missingFieldsJsonArb,
    }).map((opts) =>
      opts.present
        ? {
            filePath: t.filePath,
            content: opts.content,
            completeness: opts.completeness,
            missingFields: opts.missingFields,
          }
        : null,
    ),
  );
  return fc.tuple(...(docArbs as [typeof docArbs[0], ...typeof docArbs])).map((results) =>
    results.filter(
      (d): d is { filePath: string; content: string; completeness: string; missingFields: string } =>
        d !== null,
    ),
  );
}


// **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
describe("Property 1: Validator assigns correct document status", () => {
  it("assigns the correct status to each expected template", () => {
    fc.assert(
      fc.property(
        uniqueTemplatesArb.chain((templates) =>
          docsForTemplatesArb(templates).map((docs) => ({ templates, docs })),
        ),
        ({ templates, docs }) => {
          const result = validateExportReadiness(docs, templates);

          expect(result.documents).toHaveLength(templates.length);

          for (const docResult of result.documents) {
            const matchingDoc = docs.find(
              (d) => d.filePath === docResult.filePath,
            );

            if (!matchingDoc) {
              // No generated doc matches → "missing"
              expect(docResult.status).toBe("missing");
              expect(docResult.missingFields).toEqual([]);
            } else if (matchingDoc.content === "") {
              // Matching doc has empty content → "empty"
              expect(docResult.status).toBe("empty");
              expect(docResult.missingFields).toEqual([]);
            } else if (matchingDoc.completeness === "partial") {
              // Matching doc is partial → "warning"
              expect(docResult.status).toBe("warning");
              // missingFields should be an array (parsed or empty on bad JSON)
              expect(Array.isArray(docResult.missingFields)).toBe(true);
            } else {
              // Non-empty content, non-partial completeness → "ready"
              expect(docResult.status).toBe("ready");
              expect(docResult.missingFields).toEqual([]);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 4.4**
describe("Property 2: Validator summary counts are consistent", () => {
  it("summary counts match document statuses and sum to total", () => {
    fc.assert(
      fc.property(
        uniqueTemplatesArb.chain((templates) =>
          docsForTemplatesArb(templates).map((docs) => ({ templates, docs })),
        ),
        ({ templates, docs }) => {
          const result = validateExportReadiness(docs, templates);
          const { summary, documents } = result;

          // Each count matches the number of documents with that status
          expect(summary.ready).toBe(
            documents.filter((d) => d.status === "ready").length,
          );
          expect(summary.warning).toBe(
            documents.filter((d) => d.status === "warning").length,
          );
          expect(summary.missing).toBe(
            documents.filter((d) => d.status === "missing").length,
          );
          expect(summary.empty).toBe(
            documents.filter((d) => d.status === "empty").length,
          );

          // Sum equals total document count
          const total =
            summary.ready + summary.warning + summary.missing + summary.empty;
          expect(total).toBe(documents.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 4.5, 9.1, 9.2**
describe("Property 3: canExport is true iff no required document is missing or empty", () => {
  it("canExport reflects required document readiness correctly", () => {
    fc.assert(
      fc.property(
        uniqueTemplatesArb.chain((templates) =>
          docsForTemplatesArb(templates).map((docs) => ({ templates, docs })),
        ),
        ({ templates, docs }) => {
          const result = validateExportReadiness(docs, templates);

          const hasBlockingRequired = result.documents.some(
            (d) =>
              d.required &&
              (d.status === "missing" || d.status === "empty"),
          );

          // canExport should be true iff no required doc is missing or empty
          expect(result.canExport).toBe(!hasBlockingRequired);

          // Warning status on required docs should NOT block export
          const hasRequiredWarning = result.documents.some(
            (d) => d.required && d.status === "warning",
          );
          if (hasRequiredWarning && !hasBlockingRequired) {
            expect(result.canExport).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
