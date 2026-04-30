import { describe, it, expect } from "vitest";
import {
  buildFactExtractionPrompt,
  parseFactExtractionResponse,
} from "../fact-extractor";
import type { ChatMessage } from "@/lib/ai/adapters/types";
import { INTAKE_SECTIONS } from "@/features/intake/config/sections";

describe("buildFactExtractionPrompt", () => {
  const transcript: ChatMessage[] = [
    { role: "user", content: "We are building a task manager." },
    { role: "assistant", content: "What tech stack are you using?" },
    { role: "user", content: "Next.js with TypeScript and PostgreSQL." },
  ];

  it("returns a system message followed by the transcript", () => {
    const result = buildFactExtractionPrompt(transcript);
    expect(result[0].role).toBe("system");
    expect(result.slice(1)).toEqual(transcript);
  });

  it("system prompt contains all section keys from INTAKE_SECTIONS", () => {
    const result = buildFactExtractionPrompt(transcript);
    const systemContent = result[0].content;
    for (const section of INTAKE_SECTIONS) {
      expect(systemContent).toContain(section.sectionKey);
    }
  });

  it("system prompt contains all field keys from INTAKE_SECTIONS", () => {
    const result = buildFactExtractionPrompt(transcript);
    const systemContent = result[0].content;
    for (const section of INTAKE_SECTIONS) {
      for (const field of section.fields) {
        expect(systemContent).toContain(field.fieldKey);
      }
    }
  });

  it("system prompt instructs JSON-only response", () => {
    const result = buildFactExtractionPrompt(transcript);
    const systemContent = result[0].content;
    expect(systemContent).toContain("Respond with JSON only");
  });

  it("system prompt instructs to extract only explicit or strongly implied facts", () => {
    const result = buildFactExtractionPrompt(transcript);
    const systemContent = result[0].content;
    expect(systemContent).toContain("explicitly stated or strongly implied");
  });

  it("works with an empty transcript", () => {
    const result = buildFactExtractionPrompt([]);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("system");
  });
});

describe("parseFactExtractionResponse", () => {
  it("parses valid JSON with known keys", () => {
    const raw = JSON.stringify({
      "product-and-users": {
        "product-name": "Task Manager",
        "product-purpose": "Helps teams track work",
      },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(2);
    expect(facts[0]).toEqual({
      sectionKey: "product-and-users",
      fieldKey: "product-name",
      sectionName: "Product and Users",
      fieldLabel: "Product Name",
      value: "Task Manager",
    });
    expect(facts[1]).toEqual({
      sectionKey: "product-and-users",
      fieldKey: "product-purpose",
      sectionName: "Product and Users",
      fieldLabel: "Product Purpose",
      value: "Helps teams track work",
    });
  });

  it("strips markdown code fences before parsing", () => {
    const raw = '```json\n{"product-and-users":{"product-name":"Foo"}}\n```';
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].value).toBe("Foo");
  });

  it("strips code fences without json label", () => {
    const raw = '```\n{"product-and-users":{"product-name":"Bar"}}\n```';
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].value).toBe("Bar");
  });

  it("filters out unknown section keys", () => {
    const raw = JSON.stringify({
      "product-and-users": { "product-name": "Valid" },
      "unknown-section": { "some-field": "Ignored" },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].sectionKey).toBe("product-and-users");
  });

  it("filters out unknown field keys within valid sections", () => {
    const raw = JSON.stringify({
      "product-and-users": {
        "product-name": "Valid",
        "nonexistent-field": "Ignored",
      },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].fieldKey).toBe("product-name");
  });

  it("filters out non-string values", () => {
    const raw = JSON.stringify({
      "product-and-users": {
        "product-name": "Valid",
        "product-purpose": 42,
        "target-users": null,
        "primary-use-cases": true,
      },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].fieldKey).toBe("product-name");
  });

  it("filters out empty string values", () => {
    const raw = JSON.stringify({
      "product-and-users": {
        "product-name": "Valid",
        "product-purpose": "",
        "target-users": "   ",
      },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
  });

  it("returns empty array for invalid JSON", () => {
    const facts = parseFactExtractionResponse("not json at all");
    expect(facts).toEqual([]);
  });

  it("returns empty array for JSON array", () => {
    const facts = parseFactExtractionResponse('[{"a": 1}]');
    expect(facts).toEqual([]);
  });

  it("returns empty array for JSON primitive", () => {
    const facts = parseFactExtractionResponse('"hello"');
    expect(facts).toEqual([]);
  });

  it("returns empty array for empty object", () => {
    const facts = parseFactExtractionResponse("{}");
    expect(facts).toEqual([]);
  });

  it("enriches facts with correct display names", () => {
    const raw = JSON.stringify({
      "tech-stack-and-architecture": {
        "database": "PostgreSQL",
      },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(1);
    expect(facts[0].sectionName).toBe("Tech Stack and Architecture");
    expect(facts[0].fieldLabel).toBe("Database");
  });

  it("handles multiple sections in one response", () => {
    const raw = JSON.stringify({
      "product-and-users": { "product-name": "MyApp" },
      "testing-and-quality": { "testing-framework": "Vitest" },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toHaveLength(2);
    const sectionKeys = facts.map((f) => f.sectionKey);
    expect(sectionKeys).toContain("product-and-users");
    expect(sectionKeys).toContain("testing-and-quality");
  });

  it("trims whitespace from values", () => {
    const raw = JSON.stringify({
      "product-and-users": { "product-name": "  Trimmed App  " },
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts[0].value).toBe("Trimmed App");
  });

  it("skips section entries that are arrays instead of objects", () => {
    const raw = JSON.stringify({
      "product-and-users": ["not", "an", "object"],
    });
    const facts = parseFactExtractionResponse(raw);
    expect(facts).toEqual([]);
  });
});
