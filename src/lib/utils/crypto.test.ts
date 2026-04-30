import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("crypto utility", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Reset module cache so each test gets fresh state
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  it("encrypts and decrypts a string round-trip", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt, decrypt } = await import("./crypto");

    const plaintext = "sk-my-super-secret-api-key";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same input (random IV)", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt } = await import("./crypto");

    const plaintext = "sk-same-key";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);

    expect(a).not.toBe(b);
  });

  it("returns a base64-encoded string", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt } = await import("./crypto");

    const encrypted = encrypt("hello");
    // base64 should round-trip cleanly
    expect(Buffer.from(encrypted, "base64").toString("base64")).toBe(encrypted);
  });

  it("throws on tampered ciphertext", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt, decrypt } = await import("./crypto");

    const encrypted = encrypt("secret-value");
    const buf = Buffer.from(encrypted, "base64");
    // Flip a byte in the ciphertext portion
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64");

    expect(() => decrypt(tampered)).toThrow();
  });

  it("works with the dev-only default key when ENCRYPTION_KEY is not set", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt, decrypt } = await import("./crypto");

    const plaintext = "dev-secret";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("handles empty string", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt, decrypt } = await import("./crypto");

    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode content", async () => {
    process.env.ENCRYPTION_KEY = "test-key-for-unit-tests";
    const { encrypt, decrypt } = await import("./crypto");

    const plaintext = "🔑 clé secrète 密钥";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });
});
