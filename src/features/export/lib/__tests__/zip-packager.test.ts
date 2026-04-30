import { describe, it, expect } from "vitest";
import { unzipSync } from "fflate";
import { buildZipArchive } from "@/features/export/lib/zip-packager";

const decoder = new TextDecoder();

describe("buildZipArchive", () => {
  it("round-trips a single file preserving path and content", () => {
    const files = [{ path: "AGENTS.md", content: "# Agents" }];

    const zip = buildZipArchive(files);
    const result = unzipSync(zip);

    expect(Object.keys(result)).toEqual(["AGENTS.md"]);
    expect(decoder.decode(result["AGENTS.md"])).toBe("# Agents");
  });

  it("round-trips multiple files with nested paths", () => {
    const files = [
      { path: ".kiro/steering/product.md", content: "# Product" },
      { path: ".kiro/steering/tech.md", content: "# Tech Stack" },
      { path: ".github/copilot-instructions.md", content: "# Copilot" },
      { path: "AGENTS.md", content: "# Agents" },
    ];

    const zip = buildZipArchive(files);
    const result = unzipSync(zip);

    const paths = Object.keys(result).sort();
    const expectedPaths = files.map((f) => f.path).sort();
    expect(paths).toEqual(expectedPaths);

    for (const file of files) {
      expect(decoder.decode(result[file.path])).toBe(file.content);
    }
  });

  it("preserves content exactly without modification", () => {
    const content = "Line 1\nLine 2\n\n## Section\n\n- bullet\n- bullet 2\n";
    const files = [{ path: "doc.md", content }];

    const zip = buildZipArchive(files);
    const result = unzipSync(zip);

    expect(decoder.decode(result["doc.md"])).toBe(content);
  });

  it("returns a Uint8Array", () => {
    const zip = buildZipArchive([{ path: "a.txt", content: "hello" }]);
    expect(zip).toBeInstanceOf(Uint8Array);
  });
});
