import type { ScanFact } from "../types";

const KNOWN_DB_IMAGES: Record<string, string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  mongo: "MongoDB",
};

export function parseDockerfile(content: string, fileName: string): ScanFact[] {
  const facts: ScanFact[] = [];
  const base = { sourceFile: fileName, source: "codebase-scan" as const };
  const baseName = fileName.split("/").pop() ?? fileName;

  if (baseName === "Dockerfile") {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "hosting-deployment",
      value: "Docker",
      ...base,
    });
  }

  if (baseName === "docker-compose.yml" || baseName === "docker-compose.yaml") {
    facts.push({
      sectionKey: "tech-stack-and-architecture",
      fieldKey: "hosting-deployment",
      value: "Docker Compose",
      ...base,
    });

    // Detect known database images in service definitions
    const databases = new Set<string>();
    for (const [imageKey, dbName] of Object.entries(KNOWN_DB_IMAGES)) {
      // Match image: postgres, image: postgres:15, image: "mysql:8", etc.
      const pattern = new RegExp(`image:\\s*["']?${imageKey}(?:[:/"']|\\s|$)`, "m");
      if (pattern.test(content)) {
        databases.add(dbName);
      }
    }

    if (databases.size > 0) {
      facts.push({
        sectionKey: "tech-stack-and-architecture",
        fieldKey: "database",
        value: [...databases].join(", "),
        ...base,
      });
    }
  }

  return facts;
}
