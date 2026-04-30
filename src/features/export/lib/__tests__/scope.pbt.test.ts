// Feature: zip-export, Property 5: Scope filtering includes only target-appropriate documents
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getTemplatesForScope, getAllowedScopes } from "../scope";
import type { ExportScope } from "@/lib/validation";
import type { TargetOutput } from "@/lib/validation";

// **Validates: Requirements 5.3, 5.4, 5.5**

/**
 * Generator: produces a valid (scope, targetOutput) pair where the scope
 * is in getAllowedScopes(targetOutput). This ensures we only test
 * combinations that the system actually supports.
 */
const scopeAndTargetArb = fc
  .constantFrom<TargetOutput>("Kiro", "Copilot", "Both")
  .chain((targetOutput) => {
    const allowed = getAllowedScopes(targetOutput);
    return fc
      .constantFrom(...(allowed as [ExportScope, ...ExportScope[]]))
      .map((scope) => ({ scope, targetOutput }));
  });

describe("Property: Scope filtering includes only target-appropriate documents", () => {
  it("returned templates have targets matching the requested scope", () => {
    fc.assert(
      fc.property(scopeAndTargetArb, ({ scope, targetOutput }) => {
        const templates = getTemplatesForScope(scope, targetOutput);

        if (scope === "kiro") {
          // Every template must have target === "kiro"
          for (const t of templates) {
            expect(t.target).toBe("kiro");
          }
        } else if (scope === "copilot") {
          // Every template must have target === "copilot"
          for (const t of templates) {
            expect(t.target).toBe("copilot");
          }
        } else {
          // scope === "all": templates should include both targets
          // (at least all targets available for that targetOutput)
          const targets = new Set(templates.map((t) => t.target));

          if (targetOutput === "Both") {
            expect(targets.has("kiro")).toBe(true);
            expect(targets.has("copilot")).toBe(true);
          } else if (targetOutput === "Kiro") {
            expect(targets.has("kiro")).toBe(true);
          } else {
            expect(targets.has("copilot")).toBe(true);
          }
        }

        // All templates should have a non-empty filePath
        for (const t of templates) {
          expect(t.filePath).toBeTruthy();
        }

        // Result should be non-empty for any valid combination
        expect(templates.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
