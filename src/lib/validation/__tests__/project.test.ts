import { describe, it, expect } from "vitest";
import {
  createProjectSchema,
  targetOutputSchema,
  projectStatusSchema,
  projectTypeSchema,
} from "../project";

// ── Enum schema tests ────────────────────────────────────────────────

describe("targetOutputSchema", () => {
  it.each(["Kiro", "Copilot", "Both"])("accepts '%s'", (value) => {
    expect(targetOutputSchema.parse(value)).toBe(value);
  });

  it("rejects invalid values", () => {
    expect(() => targetOutputSchema.parse("Other")).toThrow();
  });
});

describe("projectStatusSchema", () => {
  it.each(["setup", "intake", "review", "generating", "complete"])(
    "accepts '%s'",
    (value) => {
      expect(projectStatusSchema.parse(value)).toBe(value);
    },
  );

  it("rejects invalid values", () => {
    expect(() => projectStatusSchema.parse("archived")).toThrow();
  });
});

// ── createProjectSchema tests ────────────────────────────────────────

describe("createProjectSchema", () => {
  const validInput = {
    name: "My Project",
    workingTitle: "A working title",
    targetOutput: "Kiro",
    projectType: "new",
    hasExistingDocs: false,
  };

  it("accepts valid project data", () => {
    const result = createProjectSchema.parse(validInput);
    expect(result).toEqual(validInput);
  });

  it.each(["Kiro", "Copilot", "Both"] as const)(
    "accepts targetOutput '%s'",
    (target) => {
      const result = createProjectSchema.parse({
        ...validInput,
        targetOutput: target,
      });
      expect(result.targetOutput).toBe(target);
    },
  );

  it("rejects empty name", () => {
    expect(() =>
      createProjectSchema.parse({ ...validInput, name: "" }),
    ).toThrow();
  });

  it("rejects name over 100 characters", () => {
    expect(() =>
      createProjectSchema.parse({ ...validInput, name: "x".repeat(101) }),
    ).toThrow();
  });

  it("accepts name at exactly 100 characters", () => {
    const result = createProjectSchema.parse({
      ...validInput,
      name: "x".repeat(100),
    });
    expect(result.name).toHaveLength(100);
  });

  it("rejects empty workingTitle", () => {
    expect(() =>
      createProjectSchema.parse({ ...validInput, workingTitle: "" }),
    ).toThrow();
  });

  it("rejects workingTitle over 200 characters", () => {
    expect(() =>
      createProjectSchema.parse({
        ...validInput,
        workingTitle: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts workingTitle at exactly 200 characters", () => {
    const result = createProjectSchema.parse({
      ...validInput,
      workingTitle: "x".repeat(200),
    });
    expect(result.workingTitle).toHaveLength(200);
  });

  it("rejects invalid targetOutput value", () => {
    expect(() =>
      createProjectSchema.parse({ ...validInput, targetOutput: "Invalid" }),
    ).toThrow();
  });
});

// ── projectTypeSchema tests ──────────────────────────────────────────

describe("projectTypeSchema", () => {
  it.each(["new", "extension"])("accepts '%s'", (value) => {
    expect(projectTypeSchema.parse(value)).toBe(value);
  });

  it("rejects invalid values", () => {
    expect(() => projectTypeSchema.parse("other")).toThrow();
  });
});

// ── createProjectSchema – projectType & hasExistingDocs ──────────────

describe("createProjectSchema – project type fields", () => {
  const base = {
    name: "Test",
    workingTitle: "Title",
    targetOutput: "Kiro",
    projectType: "new",
    hasExistingDocs: false,
  };

  it("accepts extension project type with hasExistingDocs true", () => {
    const result = createProjectSchema.parse({
      ...base,
      projectType: "extension",
      hasExistingDocs: true,
    });
    expect(result.projectType).toBe("extension");
    expect(result.hasExistingDocs).toBe(true);
  });

  it("rejects invalid projectType", () => {
    expect(() =>
      createProjectSchema.parse({ ...base, projectType: "fork" }),
    ).toThrow();
  });

  it("rejects non-boolean hasExistingDocs", () => {
    expect(() =>
      createProjectSchema.parse({ ...base, hasExistingDocs: "yes" }),
    ).toThrow();
  });
});
