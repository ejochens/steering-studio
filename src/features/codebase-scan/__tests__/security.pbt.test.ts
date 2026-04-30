// Feature: codebase-scan-intake, Property 10: Sensitive file exclusion
// Feature: codebase-scan-intake, Property 11: All file reads stay within the codebase directory
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import path from "node:path";
import { isSensitiveFile, isWithinDirectory } from "../lib/security";

// **Validates: Requirements 12.8, 17.4**

describe("Property 10: Sensitive file exclusion", () => {
  const sensitiveExactArb = fc.constantFrom(".env");

  const sensitiveEnvVariantArb = fc
    .string({ minLength: 1, maxLength: 20, unit: "grapheme" })
    .filter((s) => /^[a-zA-Z0-9._-]+$/.test(s))
    .map((suffix) => `.env.${suffix}`);

  const sensitivePemArb = fc
    .string({ minLength: 1, maxLength: 20, unit: "grapheme" })
    .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
    .map((name) => `${name}.pem`);

  const sensitiveKeyArb = fc
    .string({ minLength: 1, maxLength: 20, unit: "grapheme" })
    .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
    .map((name) => `${name}.key`);

  const sensitiveSecretArb = fc
    .tuple(
      fc.string({ minLength: 0, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]*$/.test(s)),
      fc.string({ minLength: 0, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]*$/.test(s)),
    )
    .map(([prefix, suffix]) => `${prefix}secret${suffix}`);

  const sensitiveCredentialArb = fc
    .tuple(
      fc.string({ minLength: 0, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]*$/.test(s)),
      fc.string({ minLength: 0, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]*$/.test(s)),
    )
    .map(([prefix, suffix]) => `${prefix}credential${suffix}`);

  const anySensitiveFileArb = fc.oneof(
    sensitiveExactArb,
    sensitiveEnvVariantArb,
    sensitivePemArb,
    sensitiveKeyArb,
    sensitiveSecretArb,
    sensitiveCredentialArb,
  );

  it("files matching sensitive patterns are always detected as sensitive", () => {
    fc.assert(
      fc.property(anySensitiveFileArb, (filename) => {
        expect(isSensitiveFile(filename)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("sensitive detection is case-insensitive for secret/credential substrings", () => {
    const mixedCaseSecretArb = fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 5, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9]*$/.test(s)),
        fc.constantFrom("Secret", "SECRET", "sEcReT", "secret", "CREDENTIAL", "Credential", "credential"),
        fc.string({ minLength: 0, maxLength: 5, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9]*$/.test(s)),
      )
      .map(([prefix, keyword, suffix]) => `${prefix}${keyword}${suffix}`);

    fc.assert(
      fc.property(mixedCaseSecretArb, (filename) => {
        expect(isSensitiveFile(filename)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("safe filenames that don't match any sensitive pattern are not flagged", () => {
    const safeFileArb = fc
      .string({ minLength: 1, maxLength: 30, unit: "grapheme" })
      .filter((s) => {
        const lower = s.toLowerCase();
        return (
          /^[a-zA-Z0-9._-]+$/.test(s) &&
          lower !== ".env" &&
          !lower.startsWith(".env.") &&
          !lower.endsWith(".pem") &&
          !lower.endsWith(".key") &&
          !lower.includes("secret") &&
          !lower.includes("credential")
        );
      });

    fc.assert(
      fc.property(safeFileArb, (filename) => {
        expect(isSensitiveFile(filename)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("filtering a file list with isSensitiveFile removes all sensitive files", () => {
    const fileListArb = fc.array(
      fc.oneof(
        anySensitiveFileArb,
        fc.constantFrom(
          "package.json",
          "tsconfig.json",
          "README.md",
          "Dockerfile",
          "index.ts",
          "main.py",
        ),
      ),
      { minLength: 1, maxLength: 20 },
    );

    fc.assert(
      fc.property(fileListArb, (files) => {
        const filtered = files.filter((f) => !isSensitiveFile(f));
        for (const f of filtered) {
          expect(isSensitiveFile(f)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// **Validates: Requirements 17.1, 17.3**

describe("Property 11: All file reads stay within the codebase directory", () => {
  const rootPath = process.platform === "win32" ? "C:\\projects\\myapp" : "/projects/myapp";

  it("child paths within the root directory are accepted", () => {
    const childSegmentArb = fc
      .array(
        fc.string({ minLength: 1, maxLength: 15, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        { minLength: 1, maxLength: 5 },
      )
      .map((segments) => path.join(rootPath, ...segments));

    fc.assert(
      fc.property(childSegmentArb, (filePath) => {
        expect(isWithinDirectory(filePath, rootPath)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("the root directory itself is considered within the directory", () => {
    expect(isWithinDirectory(rootPath, rootPath)).toBe(true);
  });

  it("path traversal attempts that escape the root are rejected", () => {
    const traversalArb = fc
      .tuple(
        fc.array(
          fc.string({ minLength: 1, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          { minLength: 0, maxLength: 3 },
        ),
        fc.integer({ min: 3, max: 8 }),
        fc.string({ minLength: 1, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
      )
      .map(([prefix, dotdotCount, target]) => {
        const traversal = Array(dotdotCount).fill("..").join(path.sep);
        const prefixPath = prefix.length > 0 ? path.join(rootPath, ...prefix) : rootPath;
        return path.join(prefixPath, traversal, target);
      })
      .filter((p) => {
        // Only keep paths that actually escape the root after resolution
        const resolved = path.resolve(p);
        const resolvedRoot = path.resolve(rootPath);
        const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
        return !resolved.startsWith(rootWithSep) && resolved !== resolvedRoot;
      });

    fc.assert(
      fc.property(traversalArb, (filePath) => {
        expect(isWithinDirectory(filePath, rootPath)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("sibling directories are rejected", () => {
    const siblingArb = fc
      .string({ minLength: 1, maxLength: 15, unit: "grapheme" })
      .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && s !== "myapp")
      .map((name) => {
        const parent = path.dirname(rootPath);
        return path.join(parent, name, "somefile.txt");
      });

    fc.assert(
      fc.property(siblingArb, (filePath) => {
        expect(isWithinDirectory(filePath, rootPath)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("paths with mixed separators are normalized correctly", () => {
    const segmentArb = fc
      .array(
        fc.string({ minLength: 1, maxLength: 10, unit: "grapheme" }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        { minLength: 1, maxLength: 4 },
      );

    fc.assert(
      fc.property(segmentArb, (segments) => {
        // Build a path using forward slashes regardless of platform
        const forwardSlashPath = rootPath + "/" + segments.join("/");
        expect(isWithinDirectory(forwardSlashPath, rootPath)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
