// Feature: codebase-scan-intake, Property 1: Path validation rejects invalid paths
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fc from "fast-check";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { validateCodebasePath } from "../lib/validate-path";

// **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 2.4, 2.5**

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "pbt-validate-path-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Property 1: Path validation rejects invalid paths", () => {
  it("empty strings always produce valid: false with appropriate error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("", " ", "  ", "\t", "\n"),
        async (input) => {
          const result = await validateCodebasePath(input);
          expect(result.valid).toBe(false);
          expect(result.error).toBe(
            "Please enter an absolute filesystem path",
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it("relative paths always produce valid: false", async () => {
    // Generate relative paths: strings that don't start with / or drive letter
    const relativePathArb = fc
      .array(fc.constantFrom("a", "b", "src", ".", "dir", "_"), {
        minLength: 1,
        maxLength: 5,
      })
      .map((parts) => parts.join("/"))
      .filter((s) => !path.isAbsolute(s) && s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(relativePathArb, async (input) => {
        const result = await validateCodebasePath(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(
          "Please enter an absolute filesystem path",
        );
      }),
      { numRuns: 100 },
    );
  });

  it("non-existent absolute paths produce valid: false with 'Directory not found'", async () => {
    const suffixArb = fc.string({ minLength: 8, maxLength: 16, unit: "grapheme" }).filter(
      (s) => /^[a-zA-Z0-9]+$/.test(s) && s.length >= 8,
    );

    await fc.assert(
      fc.asyncProperty(suffixArb, async (suffix) => {
        const fakePath = path.join(tempDir, `nonexistent-${suffix}`);
        const result = await validateCodebasePath(fakePath);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Directory not found");
      }),
      { numRuns: 100 },
    );
  });

  it("paths pointing to files produce valid: false with 'Path is not a directory'", async () => {
    const filePath = path.join(tempDir, "pbt-testfile.txt");
    await writeFile(filePath, "content");

    const result = await validateCodebasePath(filePath);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Path is not a directory");
  });

  it("valid directories produce valid: true with a resolved path", async () => {
    const suffixArb = fc.string({ minLength: 4, maxLength: 12, unit: "grapheme" }).filter(
      (s) => /^[a-zA-Z0-9]+$/.test(s) && s.length >= 4,
    );

    await fc.assert(
      fc.asyncProperty(suffixArb, async (suffix) => {
        const dirPath = path.join(tempDir, `dir-${suffix}`);
        await mkdir(dirPath, { recursive: true });
        const result = await validateCodebasePath(dirPath);
        expect(result.valid).toBe(true);
        expect(result.resolvedPath).toBeTruthy();
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("system root paths produce valid: false with 'Cannot scan a system root directory'", async () => {
    const roots =
      process.platform === "win32" ? ["C:\\", "D:\\"] : ["/"];

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...roots), async (rootPath) => {
        const result = await validateCodebasePath(rootPath);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Cannot scan a system root directory");
      }),
      { numRuns: roots.length },
    );
  });
});
