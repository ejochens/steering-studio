import type { ScanFact } from "../types";

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

export function parsePackageJson(content: string, fileName: string): ScanFact[] {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return [];
  }

  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  // Extract name
  if (typeof pkg.name === "string" && pkg.name.trim().length > 0) {
    facts.push({
      sectionKey: "product-and-users",
      fieldKey: "product-name",
      value: pkg.name.trim(),
      ...base,
    });
  }

  // Extract description
  if (typeof pkg.description === "string" && pkg.description.trim().length > 0) {
    facts.push({
      sectionKey: "product-and-users",
      fieldKey: "product-purpose",
      value: pkg.description.trim(),
      ...base,
    });
  }

  // Merge dependencies and devDependencies
  const deps: Record<string, unknown> = {
    ...((typeof pkg.dependencies === "object" && pkg.dependencies !== null
      ? pkg.dependencies
      : {}) as Record<string, unknown>),
    ...((typeof pkg.devDependencies === "object" && pkg.devDependencies !== null
      ? pkg.devDependencies
      : {}) as Record<string, unknown>),
  };

  const depNames = Object.keys(deps);

  // Detect frameworks
  const frameworks = new Set<string>();
  for (const dep of depNames) {
    if (Object.hasOwn(KNOWN_FRAMEWORKS, dep)) {
      frameworks.add(KNOWN_FRAMEWORKS[dep]);
    }
  }
  if (frameworks.size > 0) {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "frameworks",
      value: [...frameworks].join(", "),
      ...base,
    });
  }

  // Detect test runners
  const testRunners = new Set<string>();
  for (const dep of depNames) {
    if (Object.hasOwn(KNOWN_TEST_RUNNERS, dep)) {
      testRunners.add(KNOWN_TEST_RUNNERS[dep]);
    }
  }
  if (testRunners.size > 0) {
    facts.push({
      sectionKey: "testing-and-quality",
      fieldKey: "testing-framework",
      value: [...testRunners].join(", "),
      ...base,
    });
  }

  // Detect build tools
  const buildTools = new Set<string>();
  for (const dep of depNames) {
    if (Object.hasOwn(KNOWN_BUILD_TOOLS, dep)) {
      buildTools.add(KNOWN_BUILD_TOOLS[dep]);
    }
  }
  if (buildTools.size > 0) {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "coding-standards",
      value: `Build tools: ${[...buildTools].join(", ")}`,
      ...base,
    });
  }

  // Detect ORMs
  const orms = new Set<string>();
  for (const dep of depNames) {
    if (Object.hasOwn(KNOWN_ORMS, dep)) {
      orms.add(KNOWN_ORMS[dep]);
    }
  }
  if (orms.size > 0) {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "database",
      value: `ORM: ${[...orms].join(", ")}`,
      ...base,
    });
  }

  // Detect TypeScript
  if (Object.hasOwn(deps, "typescript")) {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "programming-languages",
      value: "TypeScript",
      ...base,
    });
  }

  return facts;
}
