import { describe, it, expect } from "vitest";
import { parsePackageJson } from "../../lib/parsers/package-json";
import { parseTsConfig } from "../../lib/parsers/tsconfig";
import { parsePrismaSchema } from "../../lib/parsers/prisma-schema";
import { parseCiCd } from "../../lib/parsers/ci-cd";
import { parseDockerfile } from "../../lib/parsers/dockerfile";
import { parseReadme } from "../../lib/parsers/readme";
import { parseDirectoryStructure } from "../../lib/parsers/directory-structure";
import { parseSteeringDocs } from "../../lib/parsers/steering-docs";
import type { ScanFact } from "../../lib/types";

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

describe("package-json parser", () => {
  const fixture = JSON.stringify({
    name: "steering-studio",
    description: "A web app that creates starter context packs for agentic development tools",
    dependencies: {
      next: "15.1.0",
      react: "19.0.0",
      "react-dom": "19.0.0",
      "@prisma/client": "6.3.1",
    },
    devDependencies: {
      typescript: "5.7.3",
      vitest: "3.0.5",
      "@playwright/test": "1.50.1",
      vite: "6.0.0",
      eslint: "9.18.0",
    },
  });

  it("extracts product name", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "product-and-users", "product-name");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("steering-studio");
  });

  it("extracts product purpose from description", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "product-and-users", "product-purpose");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("starter context packs");
  });

  it("detects frameworks", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "tech-stack-and-architecture", "frameworks");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Next.js");
    expect(fact!.value).toContain("React");
  });

  it("detects test runners", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "testing-and-quality", "testing-framework");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Vitest");
    expect(fact!.value).toContain("Playwright");
  });

  it("detects build tools", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "tech-stack-and-architecture", "coding-standards");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Vite");
  });

  it("detects TypeScript", () => {
    const facts = parsePackageJson(fixture, "package.json");
    const fact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("TypeScript");
  });

  it("sets correct source on all facts", () => {
    const facts = parsePackageJson(fixture, "package.json");
    for (const fact of facts) {
      expect(fact.source).toBe("codebase-scan");
      expect(fact.sourceFile).toBe("package.json");
    }
  });
});

describe("tsconfig parser", () => {
  const fixture = JSON.stringify({
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      paths: {
        "@/*": ["./src/*"],
        "@components/*": ["./src/components/*"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  });

  it("detects TypeScript language", () => {
    const facts = parseTsConfig(fixture, "tsconfig.json");
    const fact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("TypeScript");
  });

  it("extracts path aliases", () => {
    const facts = parseTsConfig(fixture, "tsconfig.json");
    const fact = findFact(facts, "project-structure-and-conventions", "coding-standards");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("@/*");
    expect(fact!.value).toContain("@components/*");
  });

  it("does not add TypeScript fact for jsconfig.json", () => {
    const facts = parseTsConfig(fixture, "jsconfig.json");
    const fact = findFact(facts, "tech-stack-and-architecture", "programming-languages");
    expect(fact).toBeUndefined();
  });

  it("still extracts path aliases from jsconfig.json", () => {
    const facts = parseTsConfig(fixture, "jsconfig.json");
    const fact = findFact(facts, "project-structure-and-conventions", "coding-standards");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Path aliases");
  });
});

describe("prisma-schema parser", () => {
  const fixture = `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

model Project {
  id            String          @id @default(cuid())
  name          String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  intakeSections IntakeSection[]
}

model IntakeSection {
  id              String   @id @default(cuid())
  projectId       String
  sectionKey      String
  coverageStatus  String   @default("unknown")
  project         Project  @relation(fields: [projectId], references: [id])
  answers         Answer[]
}

model Answer {
  id              String        @id @default(cuid())
  intakeSectionId String
  fieldKey        String
  value           String
  source          String        @default("user-form")
  intakeSection   IntakeSection @relation(fields: [intakeSectionId], references: [id])
}
`;

  it("extracts database provider and Prisma ORM", () => {
    const facts = parsePrismaSchema(fixture, "prisma/schema.prisma");
    const fact = findFact(facts, "tech-stack-and-architecture", "database");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("SQLite");
    expect(fact!.value).toContain("Prisma");
  });

  it("sets correct source metadata", () => {
    const facts = parsePrismaSchema(fixture, "prisma/schema.prisma");
    for (const fact of facts) {
      expect(fact.source).toBe("codebase-scan");
      expect(fact.sourceFile).toBe("prisma/schema.prisma");
    }
  });
});

describe("ci-cd parser", () => {
  const fixture = `name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
`;

  it("sets source-control-platform to GitHub", () => {
    const facts = parseCiCd(fixture, ".github/workflows/ci.yml");
    const fact = findFact(facts, "workflows-and-team-practices", "source-control-platform");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("GitHub");
  });

  it("extracts workflow name and triggers", () => {
    const facts = parseCiCd(fixture, ".github/workflows/ci.yml");
    const fact = findFact(facts, "workflows-and-team-practices", "ci-cd-approach");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("CI Pipeline");
    expect(fact!.value).toContain("push");
    expect(fact!.value).toContain("pull_request");
  });
});

describe("dockerfile parser", () => {
  const dockerfileFixture = `FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "server.js"]
`;

  const composeFixture = `version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
`;

  it("detects Docker from Dockerfile", () => {
    const facts = parseDockerfile(dockerfileFixture, "Dockerfile");
    const fact = findFact(facts, "tech-stack-and-architecture", "hosting-deployment");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("Docker");
  });

  it("detects Docker Compose from docker-compose.yml", () => {
    const facts = parseDockerfile(composeFixture, "docker-compose.yml");
    const fact = findFact(facts, "tech-stack-and-architecture", "hosting-deployment");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("Docker Compose");
  });

  it("detects database images in docker-compose.yml", () => {
    const facts = parseDockerfile(composeFixture, "docker-compose.yml");
    const fact = findFact(facts, "tech-stack-and-architecture", "database");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("PostgreSQL");
    expect(fact!.value).toContain("Redis");
  });
});

describe("readme parser", () => {
  const fixture = `# Steering Studio

A web application that helps software teams create high-quality starter packs for agentic development tools like Amazon Kiro and GitHub Copilot.

## Getting Started

1. Clone the repository
2. Run \`npm install\`
3. Run \`npm run dev\`

## Features

- Guided intake flow
- AI-assisted clarification
- Document generation and export
`;

  it("extracts heading and first paragraph as product-purpose", () => {
    const facts = parseReadme(fixture, "README.md");
    const fact = findFact(facts, "product-and-users", "product-purpose");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Steering Studio");
    expect(fact!.value).toContain("starter packs");
  });

  it("sets correct source metadata", () => {
    const facts = parseReadme(fixture, "README.md");
    for (const fact of facts) {
      expect(fact.source).toBe("codebase-scan");
      expect(fact.sourceFile).toBe("README.md");
    }
  });

  it("returns empty for content with no heading", () => {
    const facts = parseReadme("Just some text without headings.", "README.md");
    expect(facts).toHaveLength(0);
  });
});

describe("directory-structure parser", () => {
  it("maps top-level directories to folder-structure", () => {
    const dirs = ["src", "prisma", "public", "tests", "node_modules"];
    const facts = parseDirectoryStructure(dirs, ["app", "features", "lib", "components"], ".");
    const fact = findFact(facts, "project-structure-and-conventions", "folder-structure");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("src");
    expect(fact!.value).toContain("prisma");
    expect(fact!.value).toContain("public");
  });

  it("detects feature-based organization", () => {
    const facts = parseDirectoryStructure(
      ["src", "prisma"],
      ["app", "features", "components", "lib"],
      ".",
    );
    const fact = findFact(facts, "project-structure-and-conventions", "module-organization");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("Feature-based (grouped by domain)");
  });

  it("detects layer-based organization", () => {
    const facts = parseDirectoryStructure(
      ["src", "prisma"],
      ["controllers", "services", "models", "utils"],
      ".",
    );
    const fact = findFact(facts, "project-structure-and-conventions", "module-organization");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("Layer-based (grouped by type)");
  });

  it("feature-based takes precedence over layer-based", () => {
    const facts = parseDirectoryStructure(
      ["src"],
      ["features", "controllers", "services"],
      ".",
    );
    const fact = findFact(facts, "project-structure-and-conventions", "module-organization");
    expect(fact).toBeDefined();
    expect(fact!.value).toBe("Feature-based (grouped by domain)");
  });

  it("returns no module-organization when neither pattern exists", () => {
    const facts = parseDirectoryStructure(["src"], ["app", "lib", "utils"], ".");
    const fact = findFact(facts, "project-structure-and-conventions", "module-organization");
    expect(fact).toBeUndefined();
  });
});

describe("steering-docs parser", () => {
  const kiroSteeringFixture = `# Product Overview

## Product name
Steering Studio

## Product summary
A web application for creating starter context packs.
`;

  const copilotFixture = `# Copilot Instructions

This repository uses TypeScript with Next.js.
Always follow the existing patterns.
`;

  it("detects existing Kiro steering documents", () => {
    const facts = parseSteeringDocs(kiroSteeringFixture, ".kiro/steering/product.md");
    const fact = findFact(facts, "scope-and-non-goals", "future-considerations");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Existing steering document found");
    expect(fact!.value).toContain(".kiro/steering/product.md");
  });

  it("detects existing Copilot instructions", () => {
    const facts = parseSteeringDocs(copilotFixture, ".github/copilot-instructions.md");
    const fact = findFact(facts, "scope-and-non-goals", "future-considerations");
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("Existing Copilot instructions found");
  });

  it("returns empty for unrecognized file paths", () => {
    const facts = parseSteeringDocs("some content", "random/file.md");
    expect(facts).toHaveLength(0);
  });

  it("sets correct source metadata", () => {
    const facts = parseSteeringDocs(kiroSteeringFixture, ".kiro/steering/product.md");
    for (const fact of facts) {
      expect(fact.source).toBe("codebase-scan");
      expect(fact.sourceFile).toBe(".kiro/steering/product.md");
    }
  });
});
