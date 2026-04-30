import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  ConnectionTestResult,
  ProviderAdapter,
  ProviderConfig,
} from "./types";

/**
 * Adapter for Azure OpenAI Service.
 *
 * Supports two API surfaces:
 *   1. Chat Completions (deployment-scoped, api-version query param, api-key header):
 *      POST {endpoint}/openai/deployments/{name}/chat/completions?api-version={ver}
 *
 *   2. Responses API (v1 path, model in body, Bearer auth):
 *      POST {endpoint}/openai/v1/responses
 *
 * The adapter tries Chat Completions first. If the model doesn't support that
 * operation (HTTP 400 with "does not work with the specified model"), it
 * automatically retries using the Responses API.
 */
export class AzureOpenAIAdapter implements ProviderAdapter {
  /**
   * Normalise an Azure endpoint to just scheme + host.
   * Strips path segments and query strings that Azure Portal includes
   * in the "Target URI" (e.g. /openai/responses?api-version=...).
   */
  private normaliseEndpoint(raw: string): string {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    } catch {
      return raw.replace(/\/+$/, "");
    }
  }

  private getBase(config: ProviderConfig): string {
    if (!config.endpoint) throw new Error("Endpoint URL is required for Azure OpenAI.");
    return this.normaliseEndpoint(config.endpoint);
  }

  private static readonly DEFAULT_API_VERSION = "2024-12-01-preview";

  private chatCompletionsUrl(config: ProviderConfig): string {
    const apiVersion = config.apiVersion || AzureOpenAIAdapter.DEFAULT_API_VERSION;
    const base = this.getBase(config);
    return `${base}/openai/deployments/${config.modelName}/chat/completions?api-version=${apiVersion}`;
  }

  /** Responses API uses /openai/v1/responses — no deployment in URL, no api-version query. */
  private responsesUrl(config: ProviderConfig): string {
    const base = this.getBase(config);
    return `${base}/openai/v1/responses`;
  }

  /** Headers for the deployment-scoped Chat Completions API (api-key header). */
  private buildChatHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.secret) headers["api-key"] = config.secret;
    return headers;
  }

  /** Headers for the Responses API (api-key header, same as Chat Completions). */
  private buildResponsesHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.secret) headers["api-key"] = config.secret;
    return headers;
  }

  /**
   * Detect whether a 400 response indicates the model doesn't support
   * the chat/completions operation (and should use /responses instead).
   */
  private isUnsupportedOperationError(status: number, errorBody: unknown): boolean {
    if (status !== 400) return false;
    const msg =
      (errorBody as { error?: { message?: string } })?.error?.message ?? "";
    const lower = msg.toLowerCase();
    return (
      lower.includes("does not work with the specified model") ||
      lower.includes("the requested operation is unsupported")
    );
  }

  // ── sendChat ────────────────────────────────────────────────────────

  async sendChat(
    config: ProviderConfig,
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<ChatResult> {
    if (config.authMode === "api_key" && !config.secret) {
      throw new Error("API key is required when auth mode is api_key.");
    }

    const timeoutMs = options?.reasoning ? 300_000 : 60_000;

    // --- Try Chat Completions first ---
    try {
      return await this.sendChatCompletions(config, messages, options, timeoutMs);
    } catch (error: unknown) {
      if (error instanceof UnsupportedOperationError) {
        console.debug(`[AzureOpenAI] Chat Completions unsupported for ${config.modelName}, falling back to Responses API`);
        return this.sendResponses(config, messages, options, timeoutMs);
      }
      throw error;
    }
  }

  private async sendChatCompletions(
    config: ProviderConfig,
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    timeoutMs: number,
  ): Promise<ChatResult> {
    const url = this.chatCompletionsUrl(config);
    const headers = this.buildChatHeaders(config);
    const body: Record<string, unknown> = { messages };

    if (options?.reasoning) {
      body.reasoning_effort = "high";
      if (options.reasoningBudget) body.max_completion_tokens = options.reasoningBudget;
    } else {
      if (options?.temperature !== undefined) body.temperature = options.temperature;
      if (options?.maxTokens !== undefined) body.max_completion_tokens = options.maxTokens;
    }

    const response = await this.safeFetch(url, headers, JSON.stringify(body), timeoutMs, options);

    if (!response.ok) {
      const errorBody = await this.tryParseJson(response);
      if (this.isUnsupportedOperationError(response.status, errorBody)) {
        throw new UnsupportedOperationError();
      }
      throw this.httpError(response.status, errorBody);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response from provider: no message content returned.");
    }
    return { content };
  }

  /**
   * Send a request using the Responses API with streaming.
   *
   * URL:  POST {endpoint}/openai/v1/responses
   * Auth: Authorization: Bearer {key}
   *
   * The Responses API uses different conventions from Chat Completions:
   *   - "system" role → use the top-level "instructions" field
   *   - "user"/"assistant" roles → go in the "input" array
   *   - Content uses { type: "input_text", text } format
   *   - Streaming gives instant HTTP 200 confirmation
   */
  private async sendResponses(
    config: ProviderConfig,
    messages: ChatMessage[],
    options: ChatOptions | undefined,
    timeoutMs: number,
  ): Promise<ChatResult> {
    const url = this.responsesUrl(config);
    const headers = this.buildResponsesHeaders(config);

    // Separate system messages into "instructions" and the rest into "input"
    let instructions: string | undefined;
    const input: Array<{ role: string; content: string }> = [];

    for (const m of messages) {
      if (m.role === "system") {
        // Combine multiple system messages if present
        instructions = instructions ? `${instructions}\n\n${m.content}` : m.content;
      } else {
        input.push({ role: m.role, content: m.content });
      }
    }

    const body: Record<string, unknown> = {
      model: config.modelName,
      input,
      stream: true,
    };
    if (instructions) body.instructions = instructions;

    // Only send reasoning params for models that support it (o-series).
    const isReasoningModel = /^o[1-9]/i.test(config.modelName);

    if (options?.reasoning && isReasoningModel) {
      body.reasoning = { effort: "high" };
      if (options.reasoningBudget) body.max_output_tokens = options.reasoningBudget;
    } else {
      if (options?.temperature !== undefined) body.temperature = options.temperature;
      if (options?.maxTokens !== undefined) body.max_output_tokens = options.maxTokens;
      if (options?.reasoning && !isReasoningModel) {
        body.max_output_tokens = options.reasoningBudget ?? 16_000;
      }
    }

    const response = await this.safeFetch(url, headers, JSON.stringify(body), timeoutMs, options);

    if (!response.ok) {
      const errorBody = await this.tryParseJson(response);
      console.error(`[AzureOpenAI] Responses API error: HTTP ${response.status}`, errorBody);
      throw this.httpError(response.status, errorBody);
    }

    // Read the SSE stream and collect text deltas
    const content = await this.readResponsesStream(response);
    if (!content) {
      throw new Error("Invalid response from provider: no output content returned.");
    }
    return { content };
  }

  /**
   * Read an SSE stream from the Responses API and collect output text.
   *
   * Events of interest:
   *   - response.output_text.delta  → { delta: "..." }  (incremental text)
   *   - response.completed          → done
   *   - response.failed             → error
   */
  private async readResponsesStream(response: Response): Promise<string | null> {
    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let buffer = "";
    let result = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") return result || null;

          try {
            const event = JSON.parse(data);
            if (event.type === "response.output_text.delta" && event.delta) {
              result += event.delta;
            } else if (event.type === "response.failed") {
              const errMsg = event.response?.status_details?.error?.message ?? "Response failed";
              throw new Error(`Responses API failed: ${errMsg}`);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // skip malformed JSON lines
            throw e;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return result || null;
  }

  // ── testConnection ──────────────────────────────────────────────────

  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    if (!config.endpoint) {
      return { success: false, message: "Endpoint URL is required for Azure OpenAI." };
    }
    if (config.authMode === "api_key" && !config.secret) {
      return { success: false, message: "API key is required when auth mode is api_key." };
    }

    const start = Date.now();

    // Try Chat Completions first (fast for models that support it)
    const chatUrl = this.chatCompletionsUrl(config);
    const chatHeaders = this.buildChatHeaders(config);
    const chatBody = JSON.stringify({
      messages: [{ role: "user", content: "Say ok" }],
      max_completion_tokens: 5,
    });

    try {
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: chatHeaders,
        body: chatBody,
        signal: AbortSignal.timeout(15_000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return { success: true, message: "Connection successful.", latencyMs };
      }

      // Check if this model needs the Responses API instead
      const errorBody = await this.tryParseJson(response);
      if (this.isUnsupportedOperationError(response.status, errorBody)) {
        return this.testConnectionViaResponses(config, start);
      }

      return this.testConnectionErrorResult(response.status, errorBody, latencyMs);
    } catch (error: unknown) {
      return this.testConnectionCatchResult(error, start);
    }
  }

  /**
   * Fallback test using the Responses API with streaming.
   *
   * We send stream: true so we only need to check the HTTP status (200 = success)
   * without waiting for the model to finish generating tokens. This makes the
   * test fast even for large models like gpt-5.4-pro.
   */
  private async testConnectionViaResponses(
    config: ProviderConfig,
    start: number,
  ): Promise<ConnectionTestResult> {
    const url = this.responsesUrl(config);
    const headers = this.buildResponsesHeaders(config);
    const body = JSON.stringify({
      model: config.modelName,
      input: "ok",
      stream: true,
      max_output_tokens: 16,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(15_000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        // We got a 200 — connection works. No need to consume the stream.
        // Cancel the response body to free resources.
        try { response.body?.cancel(); } catch { /* ignore */ }
        return { success: true, message: "Connection successful (Responses API).", latencyMs };
      }

      const errorBody = await this.tryParseJson(response);
      return this.testConnectionErrorResult(response.status, errorBody, latencyMs);
    } catch (error: unknown) {
      return this.testConnectionCatchResult(error, start);
    }
  }

  // ── Shared helpers ──────────────────────────────────────────────────

  private async safeFetch(
    url: string,
    headers: Record<string, string>,
    body: string,
    timeoutMs: number,
    options?: ChatOptions,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error(
          options?.reasoning
            ? "Request timed out after 5 minutes. Reasoning calls may need a faster model or smaller input."
            : "Request timed out after 60 seconds.",
        );
      }
      if (error instanceof TypeError) {
        throw new Error("Could not reach the provider. Check the endpoint URL and your network.");
      }
      throw new Error("An unexpected error occurred during the request.");
    }
  }

  private async tryParseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private httpError(status: number, errorBody: unknown): Error {
    if (status === 401 || status === 403) {
      return new Error("Authentication failed. Check your API key.");
    }
    if (status === 404) {
      return new Error("Deployment not found. Verify the endpoint URL and deployment name.");
    }
    const detail =
      (errorBody as { error?: { message?: string } })?.error?.message ?? "";
    const base = `Provider returned HTTP ${status}.`;
    return new Error(detail ? `${base} ${detail}` : `${base} Verify your endpoint and credentials.`);
  }

  private testConnectionErrorResult(
    status: number,
    errorBody: unknown,
    latencyMs: number,
  ): ConnectionTestResult {
    if (status === 401 || status === 403) {
      return { success: false, message: "Authentication failed. Check your API key.", latencyMs };
    }
    if (status === 404) {
      return { success: false, message: "Deployment not found. Verify the endpoint URL and deployment name.", latencyMs };
    }
    const detail =
      (errorBody as { error?: { message?: string } })?.error?.message ?? "";
    const base = `Provider returned HTTP ${status}.`;
    return {
      success: false,
      message: detail ? `${base} ${detail}` : `${base} Verify your endpoint and credentials.`,
      latencyMs,
    };
  }

  private testConnectionCatchResult(error: unknown, start: number): ConnectionTestResult {
    const latencyMs = Date.now() - start;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { success: false, message: "Connection timed out. The model may need more time to respond — try again.", latencyMs };
    }
    if (error instanceof TypeError) {
      return { success: false, message: "Could not reach the provider. Check the endpoint URL and your network.", latencyMs };
    }
    return { success: false, message: "An unexpected error occurred during the connection test.", latencyMs };
  }
}

/** Sentinel error used internally to signal a fallback to the Responses API. */
class UnsupportedOperationError extends Error {
  constructor() {
    super("Model does not support this operation");
    this.name = "UnsupportedOperationError";
  }
}
