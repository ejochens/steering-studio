// Feature: codebase-scan-intake, Property 4: package.json parser extracts correct fields
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parsePackageJson } from "../../lib/parsers/package-json";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.3**

const KNOWN_FRAMEWORKS: Record<string, string> = {
  react: "React",
  "react-dom": "React",
  next: "Next.js",
  vue: "Vue",
  "@angular/core": "Angular",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
};

const KNOWN_TEST_RUNNERS: Record<string, string> = {
  vitest: "Vitest",
  jest: "Jest",
  mocha: "Mocha",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  cypress: "Cypress",
};

const KNOWN_BUILD_TOOLS: Record<string, string> = {
  webpack: "Webpack",
  vite: "Vite",
  esbuild: "esbuild",
  turbopack: "Turbopack",
  rollup: "Rollup",
};

const KNOWN_ORMS: Record<string, string> = {
  typeorm: "TypeORM",
  sequelize: "Sequelize",
  "drizzle-orm": "Drizzle ORM",
  knex: "Knex",
  mongoose: "Mongoose",
};

const ALL_KNOWN_PACKAGES = new Set([
  ...Object.keys(KNOWN_FRAMEWORKS),
  ...Object.keys(KNOWN_TEST_RUNNERS),
  ...Object.keys(KNOWN_BUILD_TOOLS),
  ...Object.keys(KNOWN_ORMS),
  "typescript",
]);

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

// Arbitrary for a known framework dependency name
const knownFrameworkArb = fc.constantFrom(...Object.keys(KNOWN_FRAMEWORKS));
const knownTestRunnerArb = fc.constantFrom(...Object.keys(KNOWN_TEST_RUNNERS));
const knownBuildToolArb = fc.constantFrom(...Object.keys(KNOWN_BUILD_TOOLS));
const knownOrmArb = fc.constantFrom(...Object.keys(KNOWN_ORMS));

// Arbitrary for an unknown package name (not in any known list)
const unknownPackageArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-z]/.test(s) && !ALL_KNOWN_PACKAGES.has(s));

// Arbitrary for a version string
const versionArb = fc.constantFrom("^1.0.0", "~2.3.4", "3.0.0", "*", "latest");

// Build a deps object from an array of package names
function buildDeps(names: string[]): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const name of names) {
    deps[name] = "^1.0.0";
  }
  return deps;
}

describe("Property 4: package.json parser extracts correct fields", () => {
  it("extracts name to product-and-users/product-name", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (name) => {
          const content = JSON.stringify({ name });
          const facts = parsePackageJson(content, "package.json");
          const fact = findFact(facts, "product-and-users", "product-name");
          expect(fact).toBeDefined();
          expect(fact!.value).toBe(name.trim());
          expect(fact!.source).toBe("codebase-scan");
          expect(fact!.sourceFile).toBe("package.json");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extracts description to product-and-users/product-purpose", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        (description) => {
          const content = JSON.stringify({ description });
          const facts = parsePackageJson(content, "package.json");
          const fact = findFact(facts, "product-and-users", "product-purpose");
          expect(fact).toBeDefined();
          expect(fact!.value).toBe(description.trim());
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects known frameworks from dependencies", () => {
    fc.assert(
      fc.property(
        fc.array(knownFrameworkArb, { minLength: 1, maxLength: 4 }),
        (frameworkDeps) => {
          const pkg = { dependencies: buildDeps(frameworkDeps) };
          const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
          const fact = findFact(facts, "tech-stack-and-architecture", "frameworks");
          expect(fact).toBeDefined();
          // Each known framework should appear in the value
          const expectedNames = new Set(frameworkDeps.map((d) => KNOWN_FRAMEWORKS[d]));
          for (const name of expectedNames) {
            expect(fact!.value).toContain(name);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects known test runners from devDependencies", () => {
    fc.assert(
      fc.property(
        fc.array(knownTestRunnerArb, { minLength: 1, maxLength: 3 }),
        (testDeps) => {
          const pkg = { devDependencies: buildDeps(testDeps) };
          const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
          const fact = findFact(facts, "testing-and-quality", "testing-framework");
          expect(fact).toBeDefined();
          const expectedNames = new Set(testDeps.map((d) => KNOWN_TEST_RUNNERS[d]));
          for (const name of expectedNames) {
            expect(fact!.value).toContain(name);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects known build tools from dependencies", () => {
    fc.assert(
      fc.property(
        fc.array(knownBuildToolArb, { minLength: 1, maxLength: 3 }),
        (buildDeps_) => {
          const pkg = { dependencies: buildDeps(buildDeps_) };
          const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
          const fact = findFact(facts, "tech-stack-and-architecture", "coding-standards");
          expect(fact).toBeDefined();
          const expectedNames = new Set(buildDeps_.map((d) => KNOWN_BUILD_TOOLS[d]));
          for (const name of expectedNames) {
            expect(fact!.value).toContain(name);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects known ORMs from dependencies", () => {
    fc.assert(
      fc.property(
        fc.array(knownOrmArb, { minLength: 1, maxLength: 3 }),
        (ormDeps) => {
          const pkg = { dependencies: buildDeps(ormDeps) };
          const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
          const fact = findFact(facts, "tech-stack-and-architecture", "database");
          expect(fact).toBeDefined();
          const expectedNames = new Set(ormDeps.map((d) => KNOWN_ORMS[d]));
          for (const name of expectedNames) {
            expect(fact!.value).toContain(name);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("detects TypeScript dependency and produces programming-languages fact", () => {
    fc.assert(
      fc.property(versionArb, (version) => {
        const pkg = { dependencies: { typescript: version } };
        const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
        const fact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
        expect(fact).toBeDefined();
        expect(fact!.value).toBe("TypeScript");
      }),
      { numRuns: 100 },
    );
  });

  it("ignores unknown packages — they produce no facts", () => {
    fc.assert(
      fc.property(
        fc.array(unknownPackageArb, { minLength: 1, maxLength: 10 }),
        (unknownDeps) => {
          const pkg = { dependencies: buildDeps(unknownDeps) };
          const facts = parsePackageJson(JSON.stringify(pkg), "package.json");
          // No framework, test runner, build tool, ORM, or language facts
          expect(findFact(facts, "tech-stack-and-architecture", "frameworks")).toBeUndefined();
          expect(findFact(facts, "testing-and-quality", "testing-framework")).toBeUndefined();
          expect(findFact(facts, "tech-stack-and-architecture", "coding-standards")).toBeUndefined();
          expect(findFact(facts, "tech-stack-and-architecture", "database")).toBeUndefined();
          expect(findFact(facts, "tech-stack-and-architecture", "programming-languages")).toBeUndefined();
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
          const facts = parsePackageJson(invalidJson, "package.json");
          expect(facts).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all facts have source 'codebase-scan' and correct sourceFile", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          description: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          dependencies: fc.option(
            fc.dictionary(
              fc.constantFrom("react", "vitest", "webpack", "typeorm", "typescript", "lodash"),
              versionArb,
            ),
            { nil: undefined },
          ),
        }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (pkg, fileName) => {
          const content = JSON.stringify(pkg);
          const facts = parsePackageJson(content, fileName);
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
