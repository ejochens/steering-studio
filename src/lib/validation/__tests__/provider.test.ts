import { describe, it, expect } from "vitest";
import {
  saveProviderSchema,
  providerTypeSchema,
  authModeSchema,
  testStatusSchema,
} from "../provider";

// ── Enum schema tests ────────────────────────────────────────────────

describe("providerTypeSchema", () => {
  it.each(["openai", "bedrock"])("accepts '%s'", (value) => {
    expect(providerTypeSchema.parse(value)).toBe(value);
  });

  it("rejects invalid values", () => {
    expect(() => providerTypeSchema.parse("anthropic")).toThrow();
  });
});

describe("authModeSchema", () => {
  it.each(["api_key", "iam", "session"])("accepts '%s'", (value) => {
    expect(authModeSchema.parse(value)).toBe(value);
  });

  it("rejects invalid values", () => {
    expect(() => authModeSchema.parse("oauth")).toThrow();
  });
});

describe("testStatusSchema", () => {
  it.each(["success", "failure", "untested"])("accepts '%s'", (value) => {
    expect(testStatusSchema.parse(value)).toBe(value);
  });

  it("rejects invalid values", () => {
    expect(() => testStatusSchema.parse("pending")).toThrow();
  });
});

// ── saveProviderSchema tests ─────────────────────────────────────────

describe("saveProviderSchema", () => {
  const validOpenai = {
    providerType: "openai",
    endpoint: "https://api.openai.com",
    modelName: "gpt-4o",
    authMode: "api_key",
  };

  const validBedrock = {
    providerType: "bedrock",
    region: "us-east-1",
    modelName: "anthropic.claude-3-sonnet",
    authMode: "iam",
  };

  it("accepts valid openai config with endpoint", () => {
    const result = saveProviderSchema.parse(validOpenai);
    expect(result.providerType).toBe("openai");
    expect(result.endpoint).toBe("https://api.openai.com");
  });

  it("accepts valid bedrock config with region", () => {
    const result = saveProviderSchema.parse(validBedrock);
    expect(result.providerType).toBe("bedrock");
    expect(result.region).toBe("us-east-1");
  });

  it("rejects empty modelName", () => {
    expect(() =>
      saveProviderSchema.parse({ ...validOpenai, modelName: "" }),
    ).toThrow();
  });

  it("rejects invalid providerType", () => {
    expect(() =>
      saveProviderSchema.parse({ ...validOpenai, providerType: "azure" }),
    ).toThrow();
  });

  it("rejects invalid authMode", () => {
    expect(() =>
      saveProviderSchema.parse({ ...validOpenai, authMode: "oauth" }),
    ).toThrow();
  });

  it("accepts optional endpoint, region, and secret", () => {
    const minimal = {
      providerType: "openai",
      modelName: "gpt-4o",
      authMode: "api_key",
    };
    const result = saveProviderSchema.parse(minimal);
    expect(result.endpoint).toBeUndefined();
    expect(result.region).toBeUndefined();
    expect(result.secret).toBeUndefined();
  });

  it("accepts secret when provided", () => {
    const result = saveProviderSchema.parse({
      ...validOpenai,
      secret: "sk-test-key-123",
    });
    expect(result.secret).toBe("sk-test-key-123");
  });

  it("validates endpoint as a URL when provided", () => {
    expect(() =>
      saveProviderSchema.parse({ ...validOpenai, endpoint: "not-a-url" }),
    ).toThrow();
  });

  it("accepts a valid URL for endpoint", () => {
    const result = saveProviderSchema.parse({
      ...validOpenai,
      endpoint: "https://my-proxy.example.com/v1",
    });
    expect(result.endpoint).toBe("https://my-proxy.example.com/v1");
  });
});
