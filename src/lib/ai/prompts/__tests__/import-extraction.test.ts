import { describe, it, expect } from "vitest";
import { buildImportExtractionPrompt } from "../import-extraction";
import type { IntakeSectionDef } from "@/features/intake/config/sections";

describe("buildImportExtractionPrompt", () => {
  const sampleDefinitions: IntakeSectionDef[] = [
    {
      sectionKey: "product-and-users",
      displayName: "Product and Users",
      description: "Define what the product is.",
      sortOrder: 0,
      fields: [
        {
          fieldKey: "product-name",
          label: "Product Name",
          type: "short-text",
          status: "required",
          helpText: "The working name for the product.",
          placeholder: "e.g. My App",
        },
        {
          fieldKey: "target-users",
          label: "Target Users",
          type: "long-text",
          status: "required",
          helpText: "Describe the primary users.",
        },
      ],
    },
    {
      sectionKey: "tech-stack-and-architecture",
      displayName: "Tech Stack and Architecture",
      description: "Specify the tech stack.",
      sortOrder: 3,
      fields: [
        {
          fieldKey: "architecture-pattern",
          label: "Architecture Pattern",
          type: "single-select",
          status: "required",
          helpText: "Which architecture pattern?",
          options: ["Monolith", "Microservices", "Serverless"],
        },
      ],
    },
  ];

  const documentPayload = "# My Project\n\nThis is a web app built with React.";

  it("returns an array of two ChatMessage objects", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(2);
  });

  it("has a system message first and user message second", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes the document payload in the user message", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    expect(messages[1].content).toContain(documentPayload);
  });

  it("includes JSON output format instructions in the system message", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("[sectionKey]");
    expect(system).toContain("[fieldKey]");
    expect(system).toContain("JSON");
  });

  it("includes all section keys in the system message", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("product-and-users");
    expect(system).toContain("tech-stack-and-architecture");
  });

  it("includes all field keys in the system message", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("product-name");
    expect(system).toContain("target-users");
    expect(system).toContain("architecture-pattern");
  });

  it("includes field labels and help text in the system message", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("Product Name");
    expect(system).toContain("The working name for the product.");
    expect(system).toContain("Target Users");
    expect(system).toContain("Describe the primary users.");
  });

  it("includes options for select fields", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("Monolith");
    expect(system).toContain("Microservices");
    expect(system).toContain("Serverless");
  });

  it("instructs AI to extract only explicit or strongly implied facts", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("explicitly stated or strongly implied");
  });

  it("instructs AI to use exact field/section keys", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("exact section keys and field keys");
  });

  it("instructs AI to return empty strings for missing fields", () => {
    const messages = buildImportExtractionPrompt(documentPayload, sampleDefinitions);
    const system = messages[0].content;
    expect(system).toContain("empty strings");
  });

  it("works with empty field definitions", () => {
    const messages = buildImportExtractionPrompt(documentPayload, []);
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain(documentPayload);
  });

  it("works with empty document payload", () => {
    const messages = buildImportExtractionPrompt("", sampleDefinitions);
    expect(messages.length).toBe(2);
    expect(messages[0].content).toContain("product-and-users");
  });
});
