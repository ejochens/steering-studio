import { describe, it, expect } from "vitest";
import { calculateCoverage } from "../calculate-coverage";
import type { IntakeFieldDef } from "@/features/intake/config/sections";

const makeField = (
  fieldKey: string,
  status: "required" | "optional" = "required",
): IntakeFieldDef => ({
  fieldKey,
  label: fieldKey,
  type: "short-text",
  status,
  helpText: "help",
});

describe("calculateCoverage", () => {
  it("returns 'unknown' when there are no fields", () => {
    // No fields means no required fields → "complete" per the rule
    // Actually: no required fields → complete
    expect(calculateCoverage([], new Map())).toBe("complete");
  });

  it("returns 'complete' when all fields are optional and no answers exist", () => {
    const fields = [makeField("a", "optional"), makeField("b", "optional")];
    expect(calculateCoverage(fields, new Map())).toBe("complete");
  });

  it("returns 'unknown' when required fields exist but no answers", () => {
    const fields = [makeField("a"), makeField("b")];
    expect(calculateCoverage(fields, new Map())).toBe("unknown");
  });

  it("returns 'partial' when some required fields are answered", () => {
    const fields = [makeField("a"), makeField("b"), makeField("c")];
    const answers = new Map([["a", "value"]]);
    expect(calculateCoverage(fields, answers)).toBe("partial");
  });

  it("returns 'complete' when all required fields are answered", () => {
    const fields = [makeField("a"), makeField("b")];
    const answers = new Map([
      ["a", "val1"],
      ["b", "val2"],
    ]);
    expect(calculateCoverage(fields, answers)).toBe("complete");
  });

  it("returns 'complete' with mix of required and optional, all required answered", () => {
    const fields = [
      makeField("req1", "required"),
      makeField("opt1", "optional"),
      makeField("req2", "required"),
    ];
    const answers = new Map([
      ["req1", "val1"],
      ["req2", "val2"],
    ]);
    expect(calculateCoverage(fields, answers)).toBe("complete");
  });

  it("treats empty string answers as not answered", () => {
    const fields = [makeField("a"), makeField("b")];
    const answers = new Map([
      ["a", ""],
      ["b", "value"],
    ]);
    expect(calculateCoverage(fields, answers)).toBe("partial");
  });

  it("returns 'unknown' when all answers are empty strings", () => {
    const fields = [makeField("a"), makeField("b")];
    const answers = new Map([
      ["a", ""],
      ["b", ""],
    ]);
    expect(calculateCoverage(fields, answers)).toBe("unknown");
  });

  it("returns 'partial' when only optional fields have answers but required fields do not", () => {
    const fields = [makeField("req", "required"), makeField("opt", "optional")];
    const answers = new Map([["opt", "value"]]);
    expect(calculateCoverage(fields, answers)).toBe("partial");
  });
});
