// Feature: codebase-scan-intake, Property 12: Deterministic facts take precedence over AI facts
// Feature: codebase-scan-intake, Property 13: Merge produces exactly one value per field
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { ScanFact } from "../lib/types";
import { mergeResults } from "../lib/merge-results";

const sectionKeyArb = fc.constantFrom(
  "product-and-users",
  "tech-stack-and-architecture",
  "testing-and-quality",
  "workflows-and-team-practices",
  "project-structure-and-conventions",
  "scope-and-non-goals",
);

const fieldKeyArb = fc.constantFrom(
  "product-name", "product-purpose", "frameworks",
  "testing-framework", "programming-languages",
  "coding-standards", "database", "hosting-deployment",
  "source-control-platform", "ci-cd-approach",
  "folder-structure", "module-organization",
  "future-considerations",
);

const sourceFileArb = fc.constantFrom(
  "package.json", "tsconfig.json", "Dockerfile",
  "docker-compose.yml", "README.md",
  "prisma/schema.prisma", "workflow.yml",
);

const valueArb = fc.constantFrom(
  "React", "Next.js", "TypeScript", "Docker",
  "PostgreSQL", "vitest", "jest", "GitHub",
  "Prisma", "Feature-based", "webpack", "Express",
);

const deterministicFactArb: fc.Arbitrary<ScanFact> = fc.record({
  sectionKey: sectionKeyArb,
  fieldKey: fieldKeyArb,
  value: valueArb,
  sourceFile: sourceFileArb,
  source: fc.constant("codebase-scan" as const),
});

const aiFactArb: fc.Arbitrary<ScanFact> = fc.record({
  sectionKey: sectionKeyArb,
  fieldKey: fieldKeyArb,
  value: valueArb,
  sourceFile: sourceFileArb,
  source: fc.constant("ai-codebase-scan" as const),
});

// **Validates: Requirements 12.7**
describe("Property 12: Deterministic facts take precedence over AI facts", () => {
  it("overlapping fields contain only deterministic values, not AI values", () => {
    const pairArb = fc.record({
      sectionKey: sectionKeyArb,
      fieldKey: fieldKeyArb,
      detSourceFile: sourceFileArb,
      aiSourceFile: sourceFileArb,
    });
    fc.assert(
      fc.property(
        fc.array(pairArb, { minLength: 1, maxLength: 10 }),
        (pairs) => {
          const seen = new Set<string>();
          const uniquePairs = pairs.filter((p) => {
            const key = `${p.sectionKey}::${p.fieldKey}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const detFacts: ScanFact[] = uniquePairs.map((p, i) => ({
            sectionKey: p.sectionKey,
            fieldKey: p.fieldKey,
            value: `DET-value-${i}`,
            sourceFile: p.detSourceFile,
            source: "codebase-scan" as const,
          }));
          const aiFacts: ScanFact[] = uniquePairs.map((p, i) => ({
            sectionKey: p.sectionKey,
            fieldKey: p.fieldKey,
            value: `AI-value-${i}`,
            sourceFile: p.aiSourceFile,
            source: "ai-codebase-scan" as const,
          }));
          const result = mergeResults(detFacts, aiFacts, ["file1.ts"], []);
          for (let i = 0; i < uniquePairs.length; i++) {
            const p = uniquePairs[i];
            const merged = result.facts.find(
              (f) => f.sectionKey === p.sectionKey && f.fieldKey === p.fieldKey,
            );
            expect(merged).toBeDefined();
            expect(merged!.source).toBe("codebase-scan");
            expect(merged!.value).toBe(`DET-value-${i}`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("AI facts fill fields not covered by deterministic parsers", () => {
    fc.assert(
      fc.property(
        fc.array(deterministicFactArb, { minLength: 0, maxLength: 10 }),
        fc.array(aiFactArb, { minLength: 1, maxLength: 10 }),
        (detFacts, aiFacts) => {
          const result = mergeResults(detFacts, aiFacts, [], []);
          const detKeys = new Set(detFacts.map((f) => `${f.sectionKey}::${f.fieldKey}`));
          const aiOnlyKeys = new Set<string>();
          for (const fact of aiFacts) {
            const key = `${fact.sectionKey}::${fact.fieldKey}`;
            if (!detKeys.has(key)) aiOnlyKeys.add(key);
          }
          for (const key of aiOnlyKeys) {
            const [sectionKey, fieldKey] = key.split("::");
            const merged = result.facts.find(
              (f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey,
            );
            expect(merged).toBeDefined();
            expect(merged!.source).toBe("ai-codebase-scan");
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deterministicFieldCount and aiFieldCount reflect unique field counts", () => {
    fc.assert(
      fc.property(
        fc.array(deterministicFactArb, { minLength: 0, maxLength: 10 }),
        fc.array(aiFactArb, { minLength: 0, maxLength: 10 }),
        (detFacts, aiFacts) => {
          const result = mergeResults(detFacts, aiFacts, [], []);
          const detKeys = new Set(detFacts.map((f) => `${f.sectionKey}::${f.fieldKey}`));
          const aiOnlyKeys = new Set<string>();
          for (const fact of aiFacts) {
            const key = `${fact.sectionKey}::${fact.fieldKey}`;
            if (!detKeys.has(key)) aiOnlyKeys.add(key);
          }
          expect(result.deterministicFieldCount).toBe(detKeys.size);
          expect(result.aiFieldCount).toBe(aiOnlyKeys.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 13.1, 13.2, 13.3**
describe("Property 13: Merge produces exactly one value per field", () => {
  it("merged result has at most one entry per unique (sectionKey, fieldKey) pair", () => {
    fc.assert(
      fc.property(
        fc.array(deterministicFactArb, { minLength: 0, maxLength: 15 }),
        fc.array(aiFactArb, { minLength: 0, maxLength: 15 }),
        (detFacts, aiFacts) => {
          const result = mergeResults(detFacts, aiFacts, ["file.ts"], []);
          const keys = result.facts.map((f) => `${f.sectionKey}::${f.fieldKey}`);
          const uniqueKeys = new Set(keys);
          expect(keys.length).toBe(uniqueKeys.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("every fact in the merged result has a non-empty sourceFile", () => {
    fc.assert(
      fc.property(
        fc.array(deterministicFactArb, { minLength: 0, maxLength: 15 }),
        fc.array(aiFactArb, { minLength: 0, maxLength: 15 }),
        (detFacts, aiFacts) => {
          const result = mergeResults(detFacts, aiFacts, ["file.ts"], []);
          for (const fact of result.facts) {
            expect(fact.sourceFile.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("total facts count equals deterministicFieldCount + aiFieldCount", () => {
    fc.assert(
      fc.property(
        fc.array(deterministicFactArb, { minLength: 0, maxLength: 15 }),
        fc.array(aiFactArb, { minLength: 0, maxLength: 15 }),
        (detFacts, aiFacts) => {
          const result = mergeResults(detFacts, aiFacts, ["file.ts"], []);
          expect(result.facts.length).toBe(
            result.deterministicFieldCount + result.aiFieldCount,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
