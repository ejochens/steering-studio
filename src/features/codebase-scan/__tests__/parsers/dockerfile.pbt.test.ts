// Feature: codebase-scan-intake, Property 8: Docker parser extracts deployment and database info
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseDockerfile } from "../../lib/parsers/dockerfile";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 8.1, 8.2, 8.3**

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

const dbImageArb = fc.constantFrom("postgres", "mysql", "redis", "mongo");

const DB_IMAGE_NAMES: Record<string, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  mongo: "MongoDB",
};

const versionTagArb = fc.constantFrom(":latest", ":15", ":8.0", ":7", ":6.2", "");

function buildDockerfile(): string {
  return `FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["node", "server.js"]\n`;
}

function buildDockerCompose(dbImages: { image: string; tag: string }[]): string {
  let yaml = `version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n`;
  for (const { image, tag } of dbImages) {
    yaml += `  ${image}:\n    image: ${image}${tag}\n    ports:\n      - "5432:5432"\n`;
  }
  return yaml;
}

describe("Property 8: Docker parser extracts deployment and database info", () => {
  it("Dockerfile produces Docker hosting-deployment fact", () => {
    fc.assert(
      fc.property(
        fc.constant(buildDockerfile()),
        (content) => {
          const facts = parseDockerfile(content, "Dockerfile");
          const deployFact = findFact(facts, "tech-stack-and-architecture", "hosting-deployment");
          expect(deployFact).toBeDefined();
          expect(deployFact!.value).toBe("Docker");
          expect(deployFact!.source).toBe("codebase-scan");
          expect(deployFact!.sourceFile).toBe("Dockerfile");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("docker-compose.yml produces Docker Compose hosting-deployment fact", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ image: dbImageArb, tag: versionTagArb }),
          { minLength: 0, maxLength: 3 },
        ),
        (dbImages) => {
          const content = buildDockerCompose(dbImages);
          const facts = parseDockerfile(content, "docker-compose.yml");
          const deployFact = findFact(facts, "tech-stack-and-architecture", "hosting-deployment");
          expect(deployFact).toBeDefined();
          expect(deployFact!.value).toBe("Docker Compose");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("docker-compose.yml detects known database images", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ image: dbImageArb, tag: versionTagArb }),
          { minLength: 1, maxLength: 4 },
        ),
        (dbImages) => {
          const content = buildDockerCompose(dbImages);
          const facts = parseDockerfile(content, "docker-compose.yml");
          const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
          expect(dbFact).toBeDefined();
          const expectedNames = new Set(dbImages.map((d) => DB_IMAGE_NAMES[d.image]));
          for (const name of expectedNames) {
            expect(dbFact!.value).toContain(name);
          }
          expect(dbFact!.source).toBe("codebase-scan");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("docker-compose.yml without database images produces no database fact", () => {
    const content = `version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n`;
    const facts = parseDockerfile(content, "docker-compose.yml");
    const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
    expect(dbFact).toBeUndefined();
  });

  it("Dockerfile does not produce database facts", () => {
    fc.assert(
      fc.property(
        fc.constant(buildDockerfile()),
        (content) => {
          const facts = parseDockerfile(content, "Dockerfile");
          const dbFact = findFact(facts, "tech-stack-and-architecture", "database");
          expect(dbFact).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all facts have correct source and sourceFile", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("Dockerfile", "docker-compose.yml"),
        (fileName) => {
          const content = fileName === "Dockerfile"
            ? buildDockerfile()
            : buildDockerCompose([{ image: "postgres", tag: ":15" }]);
          const facts = parseDockerfile(content, fileName);
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
