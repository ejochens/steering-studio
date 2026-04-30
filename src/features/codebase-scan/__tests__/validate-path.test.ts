import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, symlink, realpath } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { validateCodebasePath } from "../lib/validate-path";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "unit-validate-path-"));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("validateCodebasePath", () => {
  describe("empty and relative paths", () => {
    it("rejects empty string", async () => {
      const result = await validateCodebasePath("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter an absolute filesystem path");
    });

    it("rejects whitespace-only string", async () => {
      const result = await validateCodebasePath("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter an absolute filesystem path");
    });

    it("rejects relative path", async () => {
      const result = await validateCodebasePath("relative/path/here");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter an absolute filesystem path");
    });

    it("rejects dot-relative path", async () => {
      const result = await validateCodebasePath("./some/dir");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please enter an absolute filesystem path");
    });
  });

  describe("non-existent paths", () => {
    it("rejects path that does not exist", async () => {
      const fakePath = path.join(tempDir, "does-not-exist-xyz");
      const result = await validateCodebasePath(fakePath);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Directory not found: ${fakePath}`);
    });
  });

  describe("file vs directory", () => {
    it("rejects path pointing to a file", async () => {
      const filePath = path.join(tempDir, "a-file.txt");
      await writeFile(filePath, "hello");
      const result = await validateCodebasePath(filePath);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`Path is not a directory: ${filePath}`);
    });

    it("accepts a valid directory", async () => {
      const dirPath = path.join(tempDir, "valid-dir");
      await mkdir(dirPath, { recursive: true });
      const result = await validateCodebasePath(dirPath);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(path.isAbsolute(result.resolvedPath)).toBe(true);
    });
  });

  describe("system roots", () => {
    it("rejects Unix root /", async () => {
      if (process.platform !== "win32") {
        const result = await validateCodebasePath("/");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Cannot scan a system root directory");
      }
    });

    it("rejects Windows drive root C:\\", async () => {
      if (process.platform === "win32") {
        const result = await validateCodebasePath("C:\\");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Cannot scan a system root directory");
      }
    });

    it("rejects non-existent Windows drive roots as system root", async () => {
      if (process.platform === "win32") {
        // Even if D:\ doesn't exist, it should be rejected as a system root
        const result = await validateCodebasePath("D:\\");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Cannot scan a system root directory");
      }
    });
  });

  describe("symlinks", () => {
    it("resolves symlink to a valid directory", async () => {
      const realDir = path.join(tempDir, "real-target");
      const linkPath = path.join(tempDir, "symlink-to-dir");
      await mkdir(realDir, { recursive: true });
      try {
        await symlink(realDir, linkPath, "dir");
      } catch {
        // Symlink creation may fail on Windows without admin privileges; skip
        return;
      }
      const result = await validateCodebasePath(linkPath);
      expect(result.valid).toBe(true);
      const expectedResolved = await realpath(realDir);
      expect(result.resolvedPath).toBe(expectedResolved);
    });

    it("rejects symlink pointing to non-existent target", async () => {
      const linkPath = path.join(tempDir, "broken-symlink");
      try {
        await symlink(
          path.join(tempDir, "no-such-target"),
          linkPath,
          "dir",
        );
      } catch {
        // Symlink creation may fail; skip
        return;
      }
      const result = await validateCodebasePath(linkPath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Directory not found");
    });
  });

  describe("path normalization", () => {
    it("normalizes paths with trailing separators", async () => {
      const dirPath = path.join(tempDir, "trailing-sep");
      await mkdir(dirPath, { recursive: true });
      const result = await validateCodebasePath(dirPath + path.sep);
      expect(result.valid).toBe(true);
    });
  });
});
