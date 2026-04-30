// Feature: multi-model-provider, Property 4: Secret encrypt/decrypt round-trip
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { encrypt, decrypt } from "@/lib/utils/crypto";

/**
 * Validates: Requirements 3.4
 */
describe("crypto property tests", () => {
  // Feature: multi-model-provider, Property 4: Secret encrypt/decrypt round-trip
  describe("Property 4: Secret encrypt/decrypt round-trip", () => {
    it("for any non-empty string, decrypt(encrypt(s)) === s", { timeout: 30_000 }, () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (plaintext) => {
            const encrypted = encrypt(plaintext);
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
