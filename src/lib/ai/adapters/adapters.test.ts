import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAdapter, OpenAIAdapter, AzureOpenAIAdapter } from "./index";
import type { ChatMessage, ProviderConfig } from "./types";

// ── Factory tests ────────────────────────────────────────────────────

describe("getAdapter", () => {
  it("returns an OpenAIAdapter for 'openai'", () => {
    const adapter = getAdapter("openai");
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
  });

  it("returns an AzureOpenAIAdapter for 'azure_openai'", () => {
    const adapter = getAdapter("azure_openai");
    expect(adapter).toBeInstanceOf(AzureOpenAIAdapter);
  });

  it("throws for 'bedrock' (not yet implemented)", () => {
    expect(() => getAdapter("bedrock")).toThrow("not yet implemented");
  });

  it("throws for unknown provider types", () => {
    expect(() => getAdapter("anthropic")).toThrow("Unknown provider type");
  });
});

// ── OpenAI adapter sendChat tests ────────────────────────────────────

describe("OpenAIAdapter.sendChat", () => {
  const adapter = new OpenAIAdapter();

  const validConfig: ProviderConfig = {
    providerType: "openai",
    endpoint: "https://api.openai.com",
    modelName: "gpt-4o",
    authMode: "api_key",
    secret: "sk-test-key",
  };

  const messages: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello" },
  ];

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Successful response parsing ──

  it("returns content from a valid chat completion response", async () => {
    const body = {
      choices: [{ message: { content: "Hi there!" } }],
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await adapter.sendChat(validConfig, messages);
    expect(result.content).toBe("Hi there!");
  });

  it("sends correct URL, method, headers, and body", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat(validConfig, messages, {
      temperature: 0.5,
      maxTokens: 100,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init?.method).toBe("POST");

    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test-key");
    expect(headers["Content-Type"]).toBe("application/json");

    const parsed = JSON.parse(init?.body as string);
    expect(parsed.model).toBe("gpt-4o");
    expect(parsed.messages).toEqual(messages);
    expect(parsed.temperature).toBe(0.5);
    expect(parsed.max_tokens).toBe(100);
  });

  it("strips trailing slash and /v1 from endpoint", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat(
      { ...validConfig, endpoint: "https://api.openai.com/v1/" },
      messages,
    );

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("omits temperature and max_tokens when options are not provided", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat(validConfig, messages);

    const parsed = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(parsed).not.toHaveProperty("temperature");
    expect(parsed).not.toHaveProperty("max_tokens");
  });

  // ── Pre-flight validation ──

  it("throws when endpoint is missing", async () => {
    await expect(
      adapter.sendChat({ ...validConfig, endpoint: undefined }, messages),
    ).rejects.toThrow(/endpoint/i);
  });

  it("throws when api_key auth mode has no secret", async () => {
    await expect(
      adapter.sendChat({ ...validConfig, secret: undefined }, messages),
    ).rejects.toThrow(/api key/i);
  });

  // ── HTTP error handling ──

  it("throws auth error on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /authentication failed/i,
    );
  });

  it("throws auth error on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /authentication failed/i,
    );
  });

  it("throws not-found error on 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /not found/i,
    );
  });

  it("throws generic HTTP error for other status codes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /HTTP 500/,
    );
  });

  // ── Malformed response handling ──

  it("throws when response has no choices", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /no message content/i,
    );
  });

  it("throws when message content is not a string", async () => {
    const body = { choices: [{ message: { content: 42 } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /no message content/i,
    );
  });

  // ── Network / timeout errors ──

  it("throws timeout error on AbortSignal timeout", async () => {
    const timeoutError = new DOMException("signal timed out", "TimeoutError");
    vi.mocked(fetch).mockRejectedValue(timeoutError);

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /timed out/i,
    );
  });

  it("throws network error on TypeError from fetch", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /could not reach/i,
    );
  });
});

// ── OpenAI adapter testConnection tests ──────────────────────────────

describe("OpenAIAdapter.testConnection", () => {
  const adapter = new OpenAIAdapter();

  const validConfig: ProviderConfig = {
    providerType: "openai",
    endpoint: "https://api.openai.com",
    modelName: "gpt-4o",
    authMode: "api_key",
    secret: "sk-test-key",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns failure when endpoint is missing", async () => {
    const config: ProviderConfig = { ...validConfig, endpoint: undefined };
    const result = await adapter.testConnection(config);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/endpoint/i);
  });

  it("returns failure when api_key auth mode has no secret", async () => {
    const config: ProviderConfig = { ...validConfig, secret: undefined };
    const result = await adapter.testConnection(config);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/api key/i);
  });

  it("returns success on HTTP 200", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Connection successful.");
    expect(result.latencyMs).toBeTypeOf("number");
  });

  it("calls the correct URL with trailing slash stripped", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await adapter.testConnection({ ...validConfig, endpoint: "https://api.openai.com/" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends Authorization header with the secret", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await adapter.testConnection(validConfig);

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test-key");
  });

  it("returns auth failure message on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/authentication failed/i);
  });

  it("returns auth failure message on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/authentication failed/i);
  });

  it("returns not-found message on 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });

  it("returns generic HTTP error for other status codes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/HTTP 500/);
  });

  it("handles network errors gracefully", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/could not reach/i);
  });

  it("handles timeout errors", async () => {
    const timeoutError = new DOMException("signal timed out", "TimeoutError");
    vi.mocked(fetch).mockRejectedValue(timeoutError);

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/timed out/i);
  });
});


// ── Azure OpenAI adapter sendChat tests ──────────────────────────────

describe("AzureOpenAIAdapter.sendChat", () => {
  const adapter = new AzureOpenAIAdapter();

  const validConfig: ProviderConfig = {
    providerType: "azure_openai",
    endpoint: "https://my-resource.openai.azure.com",
    modelName: "gpt-4o",
    authMode: "api_key",
    secret: "test-azure-key",
    apiVersion: "2025-01-01-preview",
  };

  const messages: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello" },
  ];

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns content from a valid chat completion response", async () => {
    const body = { choices: [{ message: { content: "Hi there!" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await adapter.sendChat(validConfig, messages);
    expect(result.content).toBe("Hi there!");
  });

  it("sends correct Azure URL with deployment name and api-version", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat(validConfig, messages, {
      temperature: 0.5,
      maxTokens: 100,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(
      "https://my-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview",
    );
    expect(init?.method).toBe("POST");

    const headers = init?.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("test-azure-key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers).not.toHaveProperty("Authorization");

    const parsed = JSON.parse(init?.body as string);
    expect(parsed.messages).toEqual(messages);
    expect(parsed.temperature).toBe(0.5);
    expect(parsed.max_completion_tokens).toBe(100);
    // Azure does not send model in body — it's in the URL
    expect(parsed).not.toHaveProperty("model");
  });

  it("strips trailing slash from endpoint", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat(
      { ...validConfig, endpoint: "https://my-resource.openai.azure.com/" },
      messages,
    );

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("https://my-resource.openai.azure.com/openai/deployments/");
  });

  it("throws when endpoint is missing", async () => {
    await expect(
      adapter.sendChat({ ...validConfig, endpoint: undefined }, messages),
    ).rejects.toThrow(/endpoint/i);
  });

  it("uses default apiVersion when none is provided", async () => {
    const body = { choices: [{ message: { content: "ok" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.sendChat({ ...validConfig, apiVersion: undefined }, messages);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("api-version=2024-12-01-preview");
  });

  it("throws when api_key auth mode has no secret", async () => {
    await expect(
      adapter.sendChat({ ...validConfig, secret: undefined }, messages),
    ).rejects.toThrow(/api key/i);
  });

  it("throws auth error on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /authentication failed/i,
    );
  });

  it("throws not-found error on 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /deployment not found/i,
    );
  });

  it("throws generic HTTP error for other status codes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it("throws when response has no choices", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /no message content/i,
    );
  });

  it("throws timeout error on AbortSignal timeout", async () => {
    const timeoutError = new DOMException("signal timed out", "TimeoutError");
    vi.mocked(fetch).mockRejectedValue(timeoutError);
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /timed out/i,
    );
  });

  it("throws network error on TypeError from fetch", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(adapter.sendChat(validConfig, messages)).rejects.toThrow(
      /could not reach/i,
    );
  });
});

// ── Azure OpenAI adapter testConnection tests ────────────────────────

describe("AzureOpenAIAdapter.testConnection", () => {
  const adapter = new AzureOpenAIAdapter();

  const validConfig: ProviderConfig = {
    providerType: "azure_openai",
    endpoint: "https://my-resource.openai.azure.com",
    modelName: "gpt-4o",
    authMode: "api_key",
    secret: "test-azure-key",
    apiVersion: "2025-01-01-preview",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns failure when endpoint is missing", async () => {
    const result = await adapter.testConnection({ ...validConfig, endpoint: undefined });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/endpoint/i);
  });

  it("uses default apiVersion when none is provided", async () => {
    const body = { choices: [{ message: { content: "" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await adapter.testConnection({ ...validConfig, apiVersion: undefined });
    expect(result.success).toBe(true);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("api-version=2024-12-01-preview");
  });

  it("returns failure when api_key auth mode has no secret", async () => {
    const result = await adapter.testConnection({ ...validConfig, secret: undefined });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/api key/i);
  });

  it("returns success on HTTP 200", async () => {
    const body = { choices: [{ message: { content: "" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Connection successful.");
    expect(result.latencyMs).toBeTypeOf("number");
  });

  it("sends a minimal chat completion request with api-key header", async () => {
    const body = { choices: [{ message: { content: "" } }] };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    await adapter.testConnection(validConfig);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(
      "https://my-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview",
    );
    expect(init?.method).toBe("POST");

    const headers = init?.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("test-azure-key");
    expect(headers).not.toHaveProperty("Authorization");

    const parsed = JSON.parse(init?.body as string);
    expect(parsed.messages).toEqual([{ role: "user", content: "Say ok" }]);
    expect(parsed.max_completion_tokens).toBe(5);
  });

  it("returns auth failure message on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 401 }));
    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/authentication failed/i);
  });

  it("returns not-found message on 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/deployment not found/i);
  });

  it("returns generic HTTP error for other status codes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));
    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/HTTP 500/);
  });

  it("handles network errors gracefully", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/could not reach/i);
  });

  it("handles timeout errors", async () => {
    const timeoutError = new DOMException("signal timed out", "TimeoutError");
    vi.mocked(fetch).mockRejectedValue(timeoutError);
    const result = await adapter.testConnection(validConfig);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/timed out/i);
  });
});
