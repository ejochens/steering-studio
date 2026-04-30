// Feature: codebase-scan-intake, Property 2: File discovery finds exactly the known files that exist
// Feature: codebase-scan-intake, Property 3: File read size limits are enforced
import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { discoverFiles } from "../lib/discover-files";

/**
 * Helper: create a temp directory for each test run.
 * Returns the absolute path and a cleanup function.
 */
async function makeTempDir(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "discover-files-test-"));
}

/** Helper: ensure parent dirs exist and write a file. */
async function writeTestFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const absPath = path.join(root, relativePath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, content, "utf-8");
}

// Track temp dirs for cleanup
const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
  tempDirs.length = 0;
});

// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

describe("Property 2: File discovery finds exactly the known files that exist", () => {
  /** All known root files the scanner checks for. */
  const KNOWN_ROOT_FILES = [
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
  ];

  const KNOWN_SUBDIR_FILES = [
    "prisma/schema.prisma",
    ".github/copilot-instructions.md",
  ];

  /** Arbitrary to pick a random subset of known root files to create. */
  const knownRootSubsetArb = fc
    .subarray(KNOWN_ROOT_FILES, { minLength: 0 })
    .map((files) => [...new Set(files)]);

  /** Arbitrary to pick a random subset of known subdir files to create. */
  const knownSubdirSubsetArb = fc
    .subarray(KNOWN_SUBDIR_FILES, { minLength: 0 })
    .map((files) => [...new Set(files)]);

  /** Arbitrary for steering file names. */
  const steeringFilesArb = fc
    .array(
      fc
        .string({ minLength: 1, maxLength: 10, unit: "grapheme" })
        .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
        .map((name) => `${name}.md`),
      { minLength: 0, maxLength: 3 },
    )
    .map((files) => [...new Set(files)]);

  /** Arbitrary for workflow file names. */
  const workflowFilesArb = fc
    .array(
      fc
        .string({ minLength: 1, maxLength: 10, unit: "grapheme" })
        .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
        .map((name) => `${name}.yml`),
      { minLength: 0, maxLength: 7 },
    )
    .map((files) => [...new Set(files)]);

  it("returns exactly the known root files that exist", () => {
    fc.assert(
      fc.asyncProperty(knownRootSubsetArb, async (filesToCreate) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        // Create the selected subset of known root files
        for (const file of filesToCreate) {
          await writeTestFile(tmpDir, file, `content of ${file}`);
        }

        const result = await discoverFiles(tmpDir);

        // Every created known root file should be in result.known
        for (const file of filesToCreate) {
          expect(result.known.has(file)).toBe(true);
        }

        // No known root file that wasn't created should be in result.known
        for (const file of KNOWN_ROOT_FILES) {
          if (!filesToCreate.includes(file)) {
            expect(result.known.has(file)).toBe(false);
          }
        }
      }),
      { numRuns: 30 },
    );
  });

  it("returns exactly the known subdir files that exist", () => {
    fc.assert(
      fc.asyncProperty(knownSubdirSubsetArb, async (filesToCreate) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const file of filesToCreate) {
          await writeTestFile(tmpDir, file, `content of ${file}`);
        }

        const result = await discoverFiles(tmpDir);

        for (const file of filesToCreate) {
          expect(result.known.has(file)).toBe(true);
        }

        for (const file of KNOWN_SUBDIR_FILES) {
          if (!filesToCreate.includes(file)) {
            expect(result.known.has(file)).toBe(false);
          }
        }
      }),
      { numRuns: 30 },
    );
  });

  it("discovers steering .md files under .kiro/steering/", () => {
    fc.assert(
      fc.asyncProperty(steeringFilesArb, async (steeringFiles) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const file of steeringFiles) {
          await writeTestFile(
            tmpDir,
            `.kiro/steering/${file}`,
            `steering: ${file}`,
          );
        }

        const result = await discoverFiles(tmpDir);

        for (const file of steeringFiles) {
          const relPath = `.kiro/steering/${file}`;
          expect(result.known.has(relPath)).toBe(true);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("discovers workflow .yml files under .github/workflows/ (max 5)", () => {
    fc.assert(
      fc.asyncProperty(workflowFilesArb, async (workflowFiles) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const file of workflowFiles) {
          await writeTestFile(
            tmpDir,
            `.github/workflows/${file}`,
            `name: ${file}`,
          );
        }

        const result = await discoverFiles(tmpDir);

        // Count workflow files in known
        const workflowKeys = [...result.known.keys()].filter((k) =>
          k.startsWith(".github/workflows/"),
        );

        // Should be at most 5
        expect(workflowKeys.length).toBeLessThanOrEqual(5);

        // All returned workflow files should be from the created set
        for (const key of workflowKeys) {
          const fileName = key.replace(".github/workflows/", "");
          expect(workflowFiles).toContain(fileName);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("collects top-level directory listing", () => {
    const dirsArb = fc
      .array(
        fc
          .string({ minLength: 1, maxLength: 10, unit: "grapheme" })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        { minLength: 1, maxLength: 5 },
      )
      .map((dirs) => [...new Set(dirs)]);

    fc.assert(
      fc.asyncProperty(dirsArb, async (dirs) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const dir of dirs) {
          await mkdir(path.join(tmpDir, dir), { recursive: true });
        }

        const result = await discoverFiles(tmpDir);

        for (const dir of dirs) {
          expect(result.directoryListing).toContain(dir);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("collects src/ subdirectories when src/ exists", () => {
    const srcSubdirsArb = fc
      .array(
        fc
          .string({ minLength: 1, maxLength: 10, unit: "grapheme" })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        { minLength: 1, maxLength: 5 },
      )
      .map((dirs) => [...new Set(dirs)]);

    fc.assert(
      fc.asyncProperty(srcSubdirsArb, async (subdirs) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const dir of subdirs) {
          await mkdir(path.join(tmpDir, "src", dir), { recursive: true });
        }

        const result = await discoverFiles(tmpDir);

        expect(result.directoryListing).toContain("src");
        for (const dir of subdirs) {
          expect(result.srcSubdirs).toContain(dir);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("missing known files do not cause errors", () => {
    fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const tmpDir = await makeTempDir();
          tempDirs.push(tmpDir);

          // Empty directory — no known files exist
          const result = await discoverFiles(tmpDir);

          expect(result.known.size).toBe(0);
          expect(result.unrecognized.size).toBe(0);
        },
      ),
      { numRuns: 5 },
    );
  });

  it("unrecognized config files at root are detected but known files are not", () => {
    const unrecognizedNames = [
      "Cargo.toml",
      "go.mod",
      "build.gradle",
      "pom.xml",
      "Makefile",
      "pyproject.toml",
      "Gemfile",
      "composer.json",
      "angular.json",
    ];

    const unrecognizedSubsetArb = fc
      .subarray(unrecognizedNames, { minLength: 1 })
      .map((files) => [...new Set(files)]);

    fc.assert(
      fc.asyncProperty(unrecognizedSubsetArb, async (filesToCreate) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        // Also create a known file to ensure it doesn't appear in unrecognized
        await writeTestFile(tmpDir, "package.json", '{"name":"test"}');

        for (const file of filesToCreate) {
          await writeTestFile(tmpDir, file, `content of ${file}`);
        }

        const result = await discoverFiles(tmpDir);

        // Known file should be in known, not unrecognized
        expect(result.known.has("package.json")).toBe(true);
        expect(result.unrecognized.has("package.json")).toBe(false);

        // Unrecognized files should be in unrecognized
        for (const file of filesToCreate) {
          expect(result.unrecognized.has(file)).toBe(true);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("sensitive files are excluded from unrecognized results", () => {
    fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        // Create sensitive files that also match unrecognized patterns
        // (they shouldn't — but let's also create actual sensitive files)
        await writeTestFile(tmpDir, ".env", "SECRET=value");
        await writeTestFile(tmpDir, ".env.local", "SECRET=value");
        await writeTestFile(tmpDir, "server.key", "private key");
        await writeTestFile(tmpDir, "cert.pem", "certificate");

        // Also create a valid unrecognized file
        await writeTestFile(tmpDir, "Cargo.toml", "[package]");

        const result = await discoverFiles(tmpDir);

        // Sensitive files should not appear anywhere
        expect(result.known.has(".env")).toBe(false);
        expect(result.unrecognized.has(".env")).toBe(false);
        expect(result.unrecognized.has(".env.local")).toBe(false);
        expect(result.unrecognized.has("server.key")).toBe(false);
        expect(result.unrecognized.has("cert.pem")).toBe(false);

        // Valid unrecognized file should be present
        expect(result.unrecognized.has("Cargo.toml")).toBe(true);
      }),
      { numRuns: 5 },
    );
  });
});


// **Validates: Requirements 3.5, 7.3, 9.2, 12.1**

describe("Property 3: File read size limits are enforced", () => {
  it("known file content is truncated to at most 100 KB", () => {
    // Generate content sizes that may exceed 100KB
    const contentSizeArb = fc.integer({ min: 1, max: 200 * 1024 });

    fc.assert(
      fc.asyncProperty(contentSizeArb, async (size) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        const content = "x".repeat(size);
        await writeTestFile(tmpDir, "package.json", content);

        const result = await discoverFiles(tmpDir);
        const readContent = result.known.get("package.json");

        expect(readContent).toBeDefined();
        expect(readContent!.length).toBeLessThanOrEqual(100 * 1024);

        if (size <= 100 * 1024) {
          expect(readContent!.length).toBe(size);
        } else {
          expect(readContent!.length).toBe(100 * 1024);
        }
      }),
      { numRuns: 20 },
    );
  });

  it("README.md content is truncated to at most 10 KB", () => {
    const contentSizeArb = fc.integer({ min: 1, max: 30 * 1024 });

    fc.assert(
      fc.asyncProperty(contentSizeArb, async (size) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        const content = "r".repeat(size);
        await writeTestFile(tmpDir, "README.md", content);

        const result = await discoverFiles(tmpDir);
        const readContent = result.known.get("README.md");

        expect(readContent).toBeDefined();
        expect(readContent!.length).toBeLessThanOrEqual(10 * 1024);

        if (size <= 10 * 1024) {
          expect(readContent!.length).toBe(size);
        } else {
          expect(readContent!.length).toBe(10 * 1024);
        }
      }),
      { numRuns: 20 },
    );
  });

  it("workflow files are limited to at most 5", () => {
    const workflowCountArb = fc.integer({ min: 1, max: 12 });

    fc.assert(
      fc.asyncProperty(workflowCountArb, async (count) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (let i = 0; i < count; i++) {
          await writeTestFile(
            tmpDir,
            `.github/workflows/wf-${i}.yml`,
            `name: workflow-${i}`,
          );
        }

        const result = await discoverFiles(tmpDir);
        const workflowKeys = [...result.known.keys()].filter((k) =>
          k.startsWith(".github/workflows/"),
        );

        expect(workflowKeys.length).toBeLessThanOrEqual(5);

        if (count <= 5) {
          expect(workflowKeys.length).toBe(count);
        } else {
          expect(workflowKeys.length).toBe(5);
        }
      }),
      { numRuns: 20 },
    );
  });

  it("unrecognized files are limited to at most 10", () => {
    const unrecognizedNames = [
      "Cargo.toml",
      "go.mod",
      "build.gradle",
      "pom.xml",
      "Makefile",
      "pyproject.toml",
      "Gemfile",
      "composer.json",
      "angular.json",
      "vue.config.js",
      "nuxt.config.ts",
      "svelte.config.js",
    ];

    const subsetArb = fc
      .subarray(unrecognizedNames, { minLength: 1 })
      .map((files) => [...new Set(files)]);

    fc.assert(
      fc.asyncProperty(subsetArb, async (filesToCreate) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        for (const file of filesToCreate) {
          await writeTestFile(tmpDir, file, `content of ${file}`);
        }

        const result = await discoverFiles(tmpDir);

        expect(result.unrecognized.size).toBeLessThanOrEqual(10);
      }),
      { numRuns: 20 },
    );
  });

  it("unrecognized file content is truncated to at most 5 KB", () => {
    const contentSizeArb = fc.integer({ min: 1, max: 15 * 1024 });

    fc.assert(
      fc.asyncProperty(contentSizeArb, async (size) => {
        const tmpDir = await makeTempDir();
        tempDirs.push(tmpDir);

        const content = "u".repeat(size);
        await writeTestFile(tmpDir, "Cargo.toml", content);

        const result = await discoverFiles(tmpDir);
        const readContent = result.unrecognized.get("Cargo.toml");

        expect(readContent).toBeDefined();
        expect(readContent!.length).toBeLessThanOrEqual(5 * 1024);

        if (size <= 5 * 1024) {
          expect(readContent!.length).toBe(size);
        } else {
          expect(readContent!.length).toBe(5 * 1024);
        }
      }),
      { numRuns: 20 },
    );
  });
});
