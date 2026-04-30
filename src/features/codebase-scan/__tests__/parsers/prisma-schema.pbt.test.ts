// Feature: codebase-scan-intake, Property 6: Prisma schema parser extracts database provider and ORM
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parsePrismaSchema } from "../../lib/parsers/prisma-schema";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 6.1, 6.2**

const PROVIDERS: Record<string, string> = {
  sqlite: "SQLite",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlserver: "SQL Server",
  mongodb: "MongoDB",
  cockroachdb: "CockroachDB",
};

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

const providerArb = fc.constantFrom(
  "sqlite",
  "postgresql",
  "postgres",
  "mysql",
  "sqlserver",
  "mongodb",
  "cockroachdb",
);

function buildPrismaSchema(provider: string): string {
  return `datasource db {\n  provider = "${provider}"\n  url      = env("DATABASE_URL")\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n`;
}

describe("Property 6: Prisma schema parser extracts database provider and ORM", () => {
  it("extracts known provider and includes Prisma as ORM", () => {
    fc.assert(
      fc.property(providerArb, (provider) => {
        const content = buildPrismaSchema(provider);
        const facts = parsePrismaSchema(content, "prisma/schema.prisma");
        const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
        expect(dbFact).toBeDefined();
        expect(dbFact!.value).toContain("Prisma");
        expect(dbFact!.value).toContain(PROVIDERS[provider]);
        expect(dbFact!.source).toBe("codebase-scan");
        expect(dbFact!.sourceFile).toBe("prisma/schema.prisma");
      }),
      { numRuns: 100 },
    );
  });

  it("always includes Prisma in the database fact value", () => {
    fc.assert(
      fc.property(providerArb, (provider) => {
        const content = buildPrismaSchema(provider);
        const facts = parsePrismaSchema(content, "prisma/schema.prisma");
        const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
        expect(dbFact).toBeDefined();
        expect(dbFact!.value).toMatch(/Prisma/);
      }),
      { numRuns: 100 },
    );
  });

  it("produces a database fact even for schema without recognized provider", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 15 }).filter((s) => /^[a-z]+$/.test(s) && !(s in PROVIDERS)),
        (unknownProvider) => {
          const content = `datasource db {\n  provider = "${unknownProvider}"\n}`;
          const facts = parsePrismaSchema(content, "prisma/schema.prisma");
          const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
          expect(dbFact).toBeDefined();
          // Should still mention Prisma
          expect(dbFact!.value).toContain("Prisma");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all facts have correct source and sourceFile", () => {
    fc.assert(
      fc.property(
        providerArb,
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        (provider, fileName) => {
          const content = buildPrismaSchema(provider);
          const facts = parsePrismaSchema(content, fileName);
          for (const fact of facts) {
            expect(fact.source).toBe("codebase-scan");
            expect(fact.sourceFile).toBe(fileName);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns Prisma fact for schema with no provider match", () => {
    const content = "generator client {\n  provider = \"prisma-client-js\"\n}\n";
    const facts = parsePrismaSchema(content, "prisma/schema.prisma");
    const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
    // The regex matches the generator provider, but it's not a known DB provider
    // so it should still produce a Prisma fact
    expect(dbFact).toBeDefined();
    expect(dbFact!.value).toContain("Prisma");
  });
});
