import { describe, it, expect } from "vitest";
import { parseDocuments } from "../document-parser";

describe("parseDocuments", () => {
  it("returns empty text and zero count for empty array", () => {
    const result = parseDocuments([]);
    expect(result.text).toBe("");
    expect(result.truncated).toBe(false);
    expect(result.documentCount).toBe(0);
  });

  it("concatenates documents with boundary markers", () => {
    const result = parseDocuments([
      { filename: "a.md", content: "Hello" },
      { filename: "b.md", content: "World" },
    ]);
    expect(result.text).toContain("--- Document: a.md ---");
    expect(result.text).toContain("--- Document: b.md ---");
    expect(result.text).toContain("Hello");
    expect(result.text).toContain("World");
    expect(result.documentCount).toBe(2);
    expect(result.truncated).toBe(false);
  });

  it("strips YAML front matter from documents", () => {
    const content = "---\ntitle: Test\nauthor: Me\n---\n# Heading\nBody text";
    const result = parseDocuments([{ filename: "doc.md", content }]);
    expect(result.text).not.toContain("title: Test");
    expect(result.text).not.toContain("author: Me");
    expect(result.text).toContain("# Heading");
    expect(result.text).toContain("Body text");
  });

  it("preserves markdown headings, lists, and code blocks", () => {
    const content = [
      "# Heading 1",
      "## Heading 2",
      "- item 1",
      "- item 2",
      "```ts",
      "const x = 1;",
      "```",
    ].join("\n");
    const result = parseDocuments([{ filename: "doc.md", content }]);
    expect(result.text).toContain("# Heading 1");
    expect(result.text).toContain("## Heading 2");
    expect(result.text).toContain("- item 1");
    expect(result.text).toContain("```ts");
    expect(result.text).toContain("const x = 1;");
  });

  it("truncates payload exceeding 100,000 characters", () => {
    const bigContent = "x".repeat(110_000);
    const result = parseDocuments([{ filename: "big.md", content: bigContent }]);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(100_000);
    expect(result.text).toContain(
      "[Truncated: content exceeded 100,000 character limit]"
    );
  });

  it("does not truncate payload within the limit", () => {
    const content = "a".repeat(1000);
    const result = parseDocuments([{ filename: "small.md", content }]);
    expect(result.truncated).toBe(false);
    expect(result.text).not.toContain("[Truncated");
  });

  it("does not strip --- that is not front matter", () => {
    const content = "Some text\n---\nMore text\n---\nEnd";
    const result = parseDocuments([{ filename: "doc.md", content }]);
    expect(result.text).toContain("Some text");
    expect(result.text).toContain("More text");
    expect(result.text).toContain("End");
  });

  it("handles document with only front matter", () => {
    const content = "---\ntitle: Only FM\n---\n";
    const result = parseDocuments([{ filename: "fm.md", content }]);
    expect(result.text).toContain("--- Document: fm.md ---");
    expect(result.text).not.toContain("title: Only FM");
  });
});
