import type { ScanFact } from "../types";

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  sqlserver: "SQL Server",
  mongodb: "MongoDB",
  cockroachdb: "CockroachDB",
};

export function parsePrismaSchema(content: string, fileName: string): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };

  // Extract datasource provider value using regex
  const providerMatch = content.match(/provider\s*=\s*"([^"]+)"/);
  const provider = providerMatch?.[1]?.toLowerCase();

  const dbName = provider && provider in PROVIDER_DISPLAY_NAMES
    ? PROVIDER_DISPLAY_NAMES[provider]
    : provider ?? null;

  if (dbName) {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "database",
      value: `${dbName} (Prisma)`,
      ...base,
    });
  } else {
    // Even without a recognized provider, Prisma is the ORM
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "database",
      value: "Prisma",
      ...base,
    });
  }

  return facts;
}
