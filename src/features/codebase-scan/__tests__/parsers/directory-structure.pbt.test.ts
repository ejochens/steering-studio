// Feature: codebase-scan-intake, Property 9: Directory structure analysis detects organization patterns
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseDirectoryStructure } from "../../lib/parsers/directory-structure";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

const dirNameArb = fc
  .stringMatching(/^[a-z][a-z0-9_-]{0,15}$/)
  .filter((s) => s.length > 0);

const srcSubdirArb = fc.constantFrom(
  "features",
  "components",
  "lib",
  "utils",
  "controllers",
  "services",
  "models",
  "hooks",
  "pages",
  "styles",
);

describe("Property 9: Directory structure analysis detects organization patterns", () => {
  it("folder-structure fact contains the directory names", () => {
    fc.assert(
      fc.property(
        fc.array(dirNameArb, { minLength: 1, maxLength: 10 }).map((arr) => [...new Set(arr)]),
        fc.array(srcSubdirArb, { minLength: 0, maxLength: 5 }),
        (dirs, srcSubdirs) => {
          const facts = parseDirectoryStructure(dirs, srcSubdirs, ".");
          const folderFact = findFact(facts, "project-structure-and-conventions", "folder-structure");
          expect(folderFact).toBeDefined();
          for (const dir of dirs) {
            expect(folderFact!.value).toContain(dir);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects feature-based organization when 'features' is in srcSubdirs", () => {
    fc.assert(
      fc.property(
        fc.array(dirNameArb, { minLength: 1, maxLength: 5 }).map((arr) => [...new Set(arr)]),
        fc.array(srcSubdirArb, { minLength: 0, maxLength: 4 }),
        (dirs, extraSubdirs) => {
          const srcSubdirs = [...new Set(["features", ...extraSubdirs])];
          const facts = parseDirectoryStructure(dirs, srcSubdirs, ".");
          const orgFact = findFact(facts, "project-structure-and-conventions", "module-organization");
          expect(orgFact).toBeDefined();
          expect(orgFact!.value).toBe("Feature-based (grouped by domain)");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects layer-based organization when layer dirs exist without 'features'", () => {
    const layerDirArb = fc.constantFrom("controllers", "services", "models");
    fc.assert(
      fc.property(
        fc.array(dirNameArb, { minLength: 1, maxLength: 5 }).map((arr) => [...new Set(arr)]),
        fc.array(layerDirArb, { minLength: 1, maxLength: 3 }).map((arr) => [...new Set(arr)]),
        (dirs, layerDirs) => {
          // Ensure "features" is NOT in the subdirs
          const srcSubdirs = layerDirs.filter((d) => d !== "features");
          if (srcSubdirs.length === 0) return; // skip if empty after filter
          const facts = parseDirectoryStructure(dirs, srcSubdirs, ".");
          const orgFact = findFact(facts, "project-structure-and-conventions", "module-organization");
          expect(orgFact).toBeDefined();
          expect(orgFact!.value).toBe("Layer-based (grouped by type)");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("feature-based takes precedence over layer-based", () => {
    const layerDirArb = fc.constantFrom("controllers", "services", "models");
    fc.assert(
      fc.property(
        fc.array(dirNameArb, { minLength: 1, maxLength: 5 }).map((arr) => [...new Set(arr)]),
        fc.array(layerDirArb, { minLength: 1, maxLength: 3 }),
        (dirs, layerDirs) => {
          // Include both "features" and layer-based dirs
          const srcSubdirs = [...new Set(["features", ...layerDirs])];
          const facts = parseDirectoryStructure(dirs, srcSubdirs, ".");
          const orgFact = findFact(facts, "project-structure-and-conventions", "module-organization");
          expect(orgFact).toBeDefined();
          expect(orgFact!.value).toBe("Feature-based (grouped by domain)");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all facts have correct source and sourceFile", () => {
    fc.assert(
      fc.property(
        fc.array(dirNameArb, { minLength: 1, maxLength: 5 }).map((arr) => [...new Set(arr)]),
        fc.array(srcSubdirArb, { minLength: 0, maxLength: 5 }),
        dirNameArb,
        (dirs, srcSubdirs, fileName) => {
          const facts = parseDirectoryStructure(dirs, srcSubdirs, fileName);
          for (const fact of facts) {
            expect(fact.source).toBe("codebase-scan");
            expect(fact.sourceFile).toBe(fileName);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
