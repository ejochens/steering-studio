// Feature: codebase-scan-intake, Property 5: TypeScript config parser extracts language and path aliases
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseTsConfig } from "../../lib/parsers/tsconfig";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 5.1, 5.2, 5.3**

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

// Arbitrary for path alias keys like "@/*", "~/*", "@components/*"
const pathAliasKeyArb = fc
  .stringMatching(/^@?[a-z][a-z0-9-]*\/?\*?$/)
  .filter((s) => s.length >= 1 && s.length <= 30);

// Arbitrary for path alias values
const pathAliasValueArb = fc.array(
  fc.stringMatching(/^\.\/[a-z][a-z0-9-/]*\*?$/).filter((s) => s.length >= 3 && s.length <= 40),
  { minLength: 1, maxLength: 3 },
);

// Build a paths object from alias keys
function buildPaths(keys: string[]): Record<string, string[]> {
  const paths: Record<string, string[]> = {};
  for (const key of keys) {
    paths[key] = ["./src/*"];
  }
  return paths;
}

describe("Property 5: TypeScript config parser extracts language and path aliases", () => {
  it("tsconfig.json always produces TypeScript language fact", () => {
    fc.assert(
      fc.property(
        fc.record({
          compilerOptions: fc.option(
            fc.record({
              target: fc.option(fc.constantFrom("es5", "es6", "esnext"), { nil: undefined }),
              strict: fc.option(fc.boolean(), { nil: undefined }),
            }),
            { nil: undefined },
          ),
        }),
        (config) => {
          const content = JSON.stringify(config);
          const facts = parseTsConfig(content, "tsconfig.json");
          const langFact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
          expect(langFact).toBeDefined();
          expect(langFact!.value).toBe("TypeScript");
          expect(langFact!.source).toBe("codebase-scan");
          expect(langFact!.sourceFile).toBe("tsconfig.json");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("jsconfig.json does NOT produce TypeScript language fact", () => {
    fc.assert(
      fc.property(
        fc.record({
          compilerOptions: fc.option(
            fc.record({
              target: fc.option(fc.constantFrom("es5", "es6", "esnext"), { nil: undefined }),
            }),
            { nil: undefined },
          ),
        }),
        (config) => {
          const content = JSON.stringify(config);
          const facts = parseTsConfig(content, "jsconfig.json");
          const langFact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
          expect(langFact).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extracts path aliases when compilerOptions.paths is present", () => {
    fc.assert(
      fc.property(
        fc.array(pathAliasKeyArb, { minLength: 1, maxLength: 5 }).map((keys) => [...new Set(keys)]),
        fc.constantFrom("tsconfig.json", "jsconfig.json"),
        (aliasKeys, fileName) => {
          const config = {
            compilerOptions: {
              paths: buildPaths(aliasKeys),
            },
          };
          const content = JSON.stringify(config);
          const facts = parseTsConfig(content, fileName);
          const codingFact = findFact(facts, "project-structure-and-conventions", "coding-standards");
          expect(codingFact).toBeDefined();
          expect(codingFact!.value).toContain("Path aliases:");
          // Each alias key should appear in the value
          for (const key of aliasKeys) {
            expect(codingFact!.value).toContain(key);
          }
          expect(codingFact!.source).toBe("codebase-scan");
          expect(codingFact!.sourceFile).toBe(fileName);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("jsconfig.json extracts path aliases but not TypeScript fact", () => {
    fc.assert(
      fc.property(
        fc.array(pathAliasKeyArb, { minLength: 1, maxLength: 3 }).map((keys) => [...new Set(keys)]),
        (aliasKeys) => {
          const config = {
            compilerOptions: {
              paths: buildPaths(aliasKeys),
            },
          };
          const content = JSON.stringify(config);
          const facts = parseTsConfig(content, "jsconfig.json");

          // Should have path aliases
          const codingFact = findFact(facts, "project-structure-and-conventions", "coding-standards");
          expect(codingFact).toBeDefined();

          // Should NOT have TypeScript language fact
          const langFact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
          expect(langFact).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns empty array for invalid JSON", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
          try { JSON.parse(s); return false; } catch { return true; }
        }),
        (invalidJson) => {
          const facts = parseTsConfig(invalidJson, "tsconfig.json");
          expect(facts).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("no path alias fact when compilerOptions.paths is absent", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("tsconfig.json", "jsconfig.json"),
        (fileName) => {
          const config = { compilerOptions: { strict: true } };
          const content = JSON.stringify(config);
          const facts = parseTsConfig(content, fileName);
          const codingFact = findFact(facts, "project-structure-and-conventions", "coding-standards");
          expect(codingFact).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});
