import { describe, it, expect } from "vitest";
import { validateExportReadiness } from "@/features/export/lib/validate-export";

describe("validateExportReadiness", () => {
  // 1. All docs ready → allReady=true, canExport=true
  it("returns allReady and canExport when all docs are complete", () => {
    const docs = [
      { filePath: "a.md", content: "hello", completeness: "complete", missingFields: "[]" },
      { filePath: "b.md", content: "world", completeness: "complete", missingFields: "[]" },
    ];
    const templates = [
      { filePath: "a.md", required: true },
      { filePath: "b.md", required: true },
    ];

    const result = validateExportReadiness(docs, templates);

    expect(result.allReady).toBe(true);
    expect(result.canExport).toBe(true);
    expect(result.documents.every((d) => d.status === "ready")).toBe(true);
    expect(result.summary).toEqual({ ready: 2, warning: 0, missing: 0, empty: 0 });
  });

  // 2. Missing required doc → canExport=false
  it("sets canExport false when a required doc is missing", () => {
    const docs: Array<{ filePath: string; content: string; completeness: string; missingFields: string }> = [];
    const templates = [{ filePath: "a.md", required: true }];

    const result = validateExportReadiness(docs, templates);

    expect(result.canExport).toBe(false);
    expect(result.allReady).toBe(false);
    expect(result.documents[0].status).toBe("missing");
    expect(result.summary.missing).toBe(1);
  });

  // 3. Empty content on required doc → canExport=false
  it("sets canExport false when a required doc has empty content", () => {
    const docs = [
      { filePath: "a.md", content: "", completeness: "complete", missingFields: "[]" },
    ];
    const templates = [{ filePath: "a.md", required: true }];

    const result = validateExportReadiness(docs, templates);

    expect(result.canExport).toBe(false);
    expect(result.documents[0].status).toBe("empty");
    expect(result.summary.empty).toBe(1);
  });

  // 4. Partial completeness → status "warning", missingFields parsed from JSON
  it('assigns "warning" status and parses missingFields for partial docs', () => {
    const docs = [
      { filePath: "a.md", content: "some content", completeness: "partial", missingFields: '["field1","field2"]' },
    ];
    const templates = [{ filePath: "a.md", required: true }];

    const result = validateExportReadiness(docs, templates);

    expect(result.documents[0].status).toBe("warning");
    expect(result.documents[0].missingFields).toEqual(["field1", "field2"]);
    expect(result.canExport).toBe(true);
    expect(result.allReady).toBe(false);
    expect(result.summary.warning).toBe(1);
  });

  // 5. Invalid JSON in missingFields → empty array, still "warning"
  it("handles invalid JSON in missingFields gracefully", () => {
    const docs = [
      { filePath: "a.md", content: "content", completeness: "partial", missingFields: "not valid json" },
    ];
    const templates = [{ filePath: "a.md", required: true }];

    const result = validateExportReadiness(docs, templates);

    expect(result.documents[0].status).toBe("warning");
    expect(result.documents[0].missingFields).toEqual([]);
  });

  // 6. Unknown completeness value → treated as "ready"
  it('treats unknown completeness values as "ready"', () => {
    const docs = [
      { filePath: "a.md", content: "content", completeness: "unknown", missingFields: "[]" },
    ];
    const templates = [{ filePath: "a.md", required: true }];

    const result = validateExportReadiness(docs, templates);

    expect(result.documents[0].status).toBe("ready");
    expect(result.canExport).toBe(true);
    expect(result.allReady).toBe(true);
  });

  // 7. Missing optional doc → canExport=true
  it("allows export when only optional docs are missing", () => {
    const docs: Array<{ filePath: string; content: string; completeness: string; missingFields: string }> = [];
    const templates = [{ filePath: "a.md", required: false }];

    const result = validateExportReadiness(docs, templates);

    expect(result.canExport).toBe(true);
    expect(result.allReady).toBe(false);
    expect(result.documents[0].status).toBe("missing");
  });

  // 8. Empty content on optional doc → canExport=true
  it("allows export when an optional doc has empty content", () => {
    const docs = [
      { filePath: "a.md", content: "", completeness: "complete", missingFields: "[]" },
    ];
    const templates = [{ filePath: "a.md", required: false }];

    const result = validateExportReadiness(docs, templates);

    expect(result.canExport).toBe(true);
    expect(result.documents[0].status).toBe("empty");
  });

  // 9. Mix of statuses → summary counts correct
  it("computes correct summary counts for mixed statuses", () => {
    const docs = [
      { filePath: "a.md", content: "ok", completeness: "complete", missingFields: "[]" },
      { filePath: "c.md", content: "", completeness: "complete", missingFields: "[]" },
      { filePath: "d.md", content: "partial", completeness: "partial", missingFields: '["x"]' },
    ];
    const templates = [
      { filePath: "a.md", required: true },
      { filePath: "b.md", required: false },
      { filePath: "c.md", required: false },
      { filePath: "d.md", required: true },
    ];

    const result = validateExportReadiness(docs, templates);

    expect(result.summary).toEqual({ ready: 1, warning: 1, missing: 1, empty: 1 });
    expect(result.canExport).toBe(true);
    expect(result.allReady).toBe(false);
  });

  // 10. Empty templates array → allReady=true, canExport=true
  it("returns allReady and canExport for empty templates", () => {
    const result = validateExportReadiness([], []);

    expect(result.allReady).toBe(true);
    expect(result.canExport).toBe(true);
    expect(result.documents).toEqual([]);
    expect(result.summary).toEqual({ ready: 0, warning: 0, missing: 0, empty: 0 });
  });
});
