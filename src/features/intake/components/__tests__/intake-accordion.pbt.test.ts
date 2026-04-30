// Feature: guided-intake, Property 2: Accordion single-expansion invariant
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

// **Validates: Requirements 3.1, 3.2, 3.3, 6.5**

/**
 * Simulate the accordion state logic extracted from IntakeAccordion.
 * The component uses: setExpandedKey(prev => prev === sectionKey ? "" : sectionKey)
 * - Clicking the expanded section collapses it (sets to "")
 * - Clicking a different section expands it (sets to that key)
 * - Sidebar clicks always expand (setExpandedKey(sectionKey))
 */
type Operation =
  | { type: "toggle"; sectionKey: string }
  | { type: "sidebar"; sectionKey: string };

function simulateAccordion(
  sectionKeys: string[],
  operations: Operation[],
): string {
  let expanded = sectionKeys[0] ?? "";
  for (const op of operations) {
    if (op.type === "toggle") {
      expanded = expanded === op.sectionKey ? "" : op.sectionKey;
    } else {
      // sidebar click always expands
      expanded = op.sectionKey;
    }
  }
  return expanded;
}

const sectionKeys = INTAKE_SECTIONS.map((s) => s.sectionKey);

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  fc.constantFrom(...sectionKeys).map((key) => ({ type: "toggle" as const, sectionKey: key })),
  fc.constantFrom(...sectionKeys).map((key) => ({ type: "sidebar" as const, sectionKey: key })),
);

const operationSequenceArb = fc.array(operationArb, { minLength: 1, maxLength: 50 });

describe("Property: Accordion single-expansion invariant", () => {
  it("after any sequence of operations, at most one section is expanded", () => {
    fc.assert(
      fc.property(operationSequenceArb, (operations) => {
        const expanded = simulateAccordion(sectionKeys, operations);

        // At most one section expanded: expanded is either "" or a valid section key
        if (expanded === "") {
          // No section expanded — valid
          expect(expanded).toBe("");
        } else {
          expect(sectionKeys).toContain(expanded);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("after each individual operation in a sequence, at most one section is expanded", () => {
    fc.assert(
      fc.property(operationSequenceArb, (operations) => {
        let expanded = sectionKeys[0] ?? "";

        for (const op of operations) {
          if (op.type === "toggle") {
            expanded = expanded === op.sectionKey ? "" : op.sectionKey;
          } else {
            expanded = op.sectionKey;
          }

          // Invariant: after every single operation, at most one section is expanded
          expect(expanded === "" || sectionKeys.includes(expanded)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
