// Feature: codebase-scan-intake, Property 7: CI/CD parser extracts platform and workflow summary
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseCiCd } from "../../lib/parsers/ci-cd";
import type { ScanFact } from "../../lib/types";

// **Validates: Requirements 7.1, 7.2**

function findFact(facts: ScanFact[], sectionKey: string, fieldKey: string): ScanFact | undefined {
  return facts.find((f) => f.sectionKey === sectionKey && f.fieldKey === fieldKey);
}

const workflowNameArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 _-]{0,30}$/)
  .filter((s) => s.trim().length > 0);

const triggerEventArb = fc.constantFrom(
  "push",
  "pull_request",
  "workflow_dispatch",
  "schedule",
  "release",
  "create",
  "delete",
);

function buildWorkflowYaml(name: string, triggers: string[]): string {
  let yaml = `name: ${name}\n`;
  if (triggers.length === 1) {
    yaml += `on: ${triggers[0]}\n`;
  } else if (triggers.length > 1) {
    yaml += `on: [${triggers.join(", ")}]\n`;
  }
  yaml += `jobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n`;
  return yaml;
}

function buildBlockTriggerYaml(name: string, triggers: string[]): string {
  let yaml = `name: ${name}\n`;
  yaml += `on:\n`;
  for (const t of triggers) {
    yaml += `  ${t}:\n`;
  }
  yaml += `jobs:\n  build:\n    runs-on: ubuntu-latest\n`;
  return yaml;
}

describe("Property 7: CI/CD parser extracts platform and workflow summary", () => {
  it("always sets source-control-platform to GitHub", () => {
    fc.assert(
      fc.property(
        workflowNameArb,
        fc.array(triggerEventArb, { minLength: 1, maxLength: 3 }),
        (name, triggers) => {
          const content = buildWorkflowYaml(name, triggers);
          const facts = parseCiCd(content, ".github/workflows/ci.yml");
          const platformFact = findFact(facts, "workflows-and-team-practices", "source-control-platform");
          expect(platformFact).toBeDefined();
          expect(platformFact!.value).toBe("GitHub");
          expect(platformFact!.source).toBe("codebase-scan");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extracts workflow name into ci-cd-approach", () => {
    fc.assert(
      fc.property(
        workflowNameArb,
        fc.array(triggerEventArb, { minLength: 1, maxLength: 3 }),
        (name, triggers) => {
          const content = buildWorkflowYaml(name, triggers);
          const facts = parseCiCd(content, ".github/workflows/ci.yml");
          const ciCdFact = findFact(facts, "workflows-and-team-practices", "ci-cd-approach");
          expect(ciCdFact).toBeDefined();
          expect(ciCdFact!.value).toContain(name.trim());
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extracts trigger events from inline on: field", () => {
    fc.assert(
      fc.property(
        workflowNameArb,
        fc.array(triggerEventArb, { minLength: 1, maxLength: 3 }).map((arr) => [...new Set(arr)]),
        (name, triggers) => {
          const content = buildWorkflowYaml(name, triggers);
          const facts = parseCiCd(content, ".github/workflows/ci.yml");
          const ciCdFact = findFact(facts, "workflows-and-team-practices", "ci-cd-approach");
          expect(ciCdFact).toBeDefined();
          for (const trigger of triggers) {
            expect(ciCdFact!.value).toContain(trigger);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extracts trigger events from block on: field", () => {
    fc.assert(
      fc.property(
        workflowNameArb,
        fc.array(triggerEventArb, { minLength: 1, maxLength: 3 }).map((arr) => [...new Set(arr)]),
        (name, triggers) => {
          const content = buildBlockTriggerYaml(name, triggers);
          const facts = parseCiCd(content, ".github/workflows/deploy.yml");
          const ciCdFact = findFact(facts, "workflows-and-team-practices", "ci-cd-approach");
          expect(ciCdFact).toBeDefined();
          for (const trigger of triggers) {
            expect(ciCdFact!.value).toContain(trigger);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all facts have correct source and sourceFile", () => {
    fc.assert(
      fc.property(
        workflowNameArb,
        fc.array(triggerEventArb, { minLength: 1, maxLength: 2 }),
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        (name, triggers, fileName) => {
          const content = buildWorkflowYaml(name, triggers);
          const facts = parseCiCd(content, fileName);
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
