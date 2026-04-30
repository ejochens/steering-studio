import { describe, it, expect } from "vitest";
import { buildIntakeAnswerPrompt } from "../intake-answers";

describe("buildIntakeAnswerPrompt", () => {
  const existingAnswers = {
    "product-and-users": {
      "product-name": "Steering Studio",
      "product-purpose": "A web app for creating AI context packs",
    },
  };

  const blankFields = {
    "problem-and-outcomes": [
      {
        fieldKey: "problem-statement",
        label: "Problem Statement",
        type: "long-text",
        helpText: "What specific problem does this product solve?",
      },
      {
        fieldKey: "key-value-proposition",
        label: "Key Value Proposition",
        type: "short-text",
        helpText: "One sentence that captures the core value.",
      },
    ],
    "tech-stack-and-architecture": [
      {
        fieldKey: "architecture-pattern",
        label: "Architecture Pattern",
        type: "single-select",
        helpText: "Which architecture pattern best describes the project?",
        options: ["Monolith", "Microservices", "Serverless"],
      },
    ],
  };

  it("returns an array of ChatMessage objects", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(2);
  });

  it("has a system message as the first element", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    expect(messages[0].role).toBe("system");
  });

  it("has a user message as the second element", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    expect(messages[1].role).toBe("user");
  });

  it("includes JSON output format instructions in the system message", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("[sectionKey]");
    expect(system).toContain("[fieldKey]");
    expect(system).toContain("JSON");
  });

  it("includes existing answers as context in the system message", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("product-and-users");
    expect(system).toContain("product-name");
    expect(system).toContain("Steering Studio");
    expect(system).toContain("product-purpose");
  });

  it("includes blank field definitions with label, helpText, and type", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("problem-and-outcomes");
    expect(system).toContain("problem-statement");
    expect(system).toContain("Problem Statement");
    expect(system).toContain("long-text");
    expect(system).toContain("What specific problem does this product solve?");
  });

  it("includes options for fields that have them", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("Monolith");
    expect(system).toContain("Microservices");
    expect(system).toContain("Serverless");
  });

  it("handles empty existing answers", () => {
    const messages = buildIntakeAnswerPrompt({}, blankFields);
    const system = messages[0].content;
    expect(system).not.toContain("Existing Project Answers");
    expect(system).toContain("Blank Fields to Fill");
  });

  it("handles empty blank fields", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, {});
    const system = messages[0].content;
    expect(system).toContain("Existing Project Answers");
    expect(system).not.toContain("Blank Fields to Fill");
  });

  it("includes instructions for different field types", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("single-select");
    expect(system).toContain("multi-select");
    expect(system).toContain("tag-list");
    expect(system).toContain("short-text");
    expect(system).toContain("long-text");
  });

  it("instructs AI to base answers on existing context", () => {
    const messages = buildIntakeAnswerPrompt(existingAnswers, blankFields);
    const system = messages[0].content;
    expect(system).toContain("existing project context");
  });

  it("skips sections with empty field entries in existing answers", () => {
    const answers = {
      "product-and-users": {},
      "problem-and-outcomes": { "problem-statement": "Some problem" },
    };
    const messages = buildIntakeAnswerPrompt(answers, {});
    const system = messages[0].content;
    expect(system).not.toContain("Section: product-and-users");
    expect(system).toContain("Section: problem-and-outcomes");
  });
});
