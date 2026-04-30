import { describe, it, expect } from "vitest";
import {
  getAllowedScopes,
  getDefaultScope,
  getTemplatesForScope,
} from "@/features/export/lib/scope";

describe("getAllowedScopes", () => {
  it('returns ["kiro"] for "Kiro"', () => {
    expect(getAllowedScopes("Kiro")).toEqual(["kiro"]);
  });

  it('returns ["copilot"] for "Copilot"', () => {
    expect(getAllowedScopes("Copilot")).toEqual(["copilot"]);
  });

  it('returns ["all", "kiro", "copilot"] for "Both"', () => {
    expect(getAllowedScopes("Both")).toEqual(["all", "kiro", "copilot"]);
  });
});

describe("getDefaultScope", () => {
  it('returns "kiro" for "Kiro"', () => {
    expect(getDefaultScope("Kiro")).toBe("kiro");
  });

  it('returns "copilot" for "Copilot"', () => {
    expect(getDefaultScope("Copilot")).toBe("copilot");
  });

  it('returns "all" for "Both"', () => {
    expect(getDefaultScope("Both")).toBe("all");
  });
});

describe("getTemplatesForScope", () => {
  it('scope "kiro" with "Both" returns only kiro templates', () => {
    const templates = getTemplatesForScope("kiro", "Both");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.target === "kiro")).toBe(true);
  });

  it('scope "copilot" with "Both" returns only copilot templates', () => {
    const templates = getTemplatesForScope("copilot", "Both");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.target === "copilot")).toBe(true);
  });

  it('scope "all" with "Both" returns all templates', () => {
    const all = getTemplatesForScope("all", "Both");
    const kiro = getTemplatesForScope("kiro", "Both");
    const copilot = getTemplatesForScope("copilot", "Both");
    expect(all).toHaveLength(kiro.length + copilot.length);
  });

  it('scope "kiro" with "Kiro" returns kiro templates', () => {
    const templates = getTemplatesForScope("kiro", "Kiro");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.target === "kiro")).toBe(true);
  });

  it('scope "copilot" with "Copilot" returns copilot templates', () => {
    const templates = getTemplatesForScope("copilot", "Copilot");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.target === "copilot")).toBe(true);
  });
});
