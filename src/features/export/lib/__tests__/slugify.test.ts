import { describe, it, expect } from "vitest";
import { slugify, buildExportFilename } from "@/features/export/lib/slugify";

describe("slugify", () => {
  it("converts spaces to hyphens and lowercases", () => {
    expect(slugify("My Project")).toBe("my-project");
  });

  it("collapses consecutive hyphens", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("trims surrounding spaces", () => {
    expect(slugify("  spaces  ")).toBe("spaces");
  });

  it("converts uppercase to lowercase", () => {
    expect(slugify("UPPERCASE")).toBe("uppercase");
  });

  it("replaces special characters with hyphens", () => {
    expect(slugify("special!@#chars")).toBe("special-chars");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---leading-trailing---")).toBe("leading-trailing");
  });

  it('returns "project" for empty string', () => {
    expect(slugify("")).toBe("project");
  });

  it('returns "project" when all characters are special', () => {
    expect(slugify("!!!")).toBe("project");
  });

  it("strips non-ASCII unicode characters", () => {
    expect(slugify("café")).toBe("caf");
  });
});

describe("buildExportFilename", () => {
  it('uses "both" as scope segment for scope "all"', () => {
    const filename = buildExportFilename("My Project", "all");
    expect(filename).toMatch(
      /^steering-studio-my-project-both-\d{8}-\d{6}\.zip$/,
    );
  });

  it('uses "kiro" as scope segment for scope "kiro"', () => {
    const filename = buildExportFilename("My Project", "kiro");
    expect(filename).toMatch(
      /^steering-studio-my-project-kiro-\d{8}-\d{6}\.zip$/,
    );
  });

  it('uses "copilot" as scope segment for scope "copilot"', () => {
    const filename = buildExportFilename("My Project", "copilot");
    expect(filename).toMatch(
      /^steering-studio-my-project-copilot-\d{8}-\d{6}\.zip$/,
    );
  });
});
