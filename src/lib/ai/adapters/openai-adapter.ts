import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  ConnectionTestResult,
  ProviderAdapter,
  ProviderConfig,
} from "./types";

/**
 * Adapter for OpenAI-compatible APIs.
 *
 * Uses plain fetch — no SDK dependency needed for a simple connection test.
 */
export class OpenAIAdapter implements ProviderAdapter {
  async sendChat(
      config: ProviderConfig,
      messages: ChatMessage[],
      options?: ChatOptions,
    ): Promise<ChatResult> {
      const endpoint = config.endpoint
        ?.replace(/\/+$/, "")
        ?.replace(/\/v1$/, "");
      if (!endpoint) {
        throw new Error("Endpoint URL is required for OpenAI-compatible providers.");
      }

      if (config.authMode === "api_key" && !config.secret) {
        throw new Error("API key is required when auth mode is api_key.");
      }

      const url = `${endpoint}/v1/chat/completions`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.secret) {
        headers["Authorization"] = `Bearer ${config.secret}`;
      }

      const body: Record<string, unknown> = {
        model: config.modelName,
        messages,
      };

      if (options?.reasoning) {
        // Reasoning models (o1, o3, etc.) use reasoning_effort instead of temperature
        body.reasoning_effort = "high";
        if (options.reasoningBudget) {
          body.max_completion_tokens = options.reasoningBudget;
        }
      } else {
        if (options?.temperature !== undefined) {
          body.temperature = options.temperature;
        }
        if (options?.maxTokens !== undefined) {
          body.max_tokens = options.maxTokens;
        }
      }

      // Reasoning calls can take much longer
      const timeoutMs = options?.reasoning ? 300_000 : 60_000;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 401 || status === 403) {
            throw new Error("Authentication failed. Check your API key.");
          }
          if (status === 404) {
            throw new Error("Chat completions endpoint not found. Verify the endpoint URL.");
          }
          throw new Error(`Provider returned HTTP ${status}. Verify your endpoint and credentials.`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("Invalid response from provider: no message content returned.");
        }

        return { content };
      } catch (error: unknown) {
        // Re-throw our own errors (from status checks or content validation above)
        if (error instanceof Error && !(error instanceof TypeError) && !(error instanceof DOMException)) {
          throw error;
        }

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

        throw new Error("An unexpected error occurred during the chat request.");
      }
    }



  async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
    const endpoint = config.endpoint
      ?.replace(/\/+$/, "")
      ?.replace(/\/v1$/, "");
    if (!endpoint) {
      return { success: false, message: "Endpoint URL is required for OpenAI-compatible providers." };
    }

    if (config.authMode === "api_key" && !config.secret) {
      return { success: false, message: "API key is required when auth mode is api_key." };
    }

    const url = `${endpoint}/v1/models`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.secret) {
      headers["Authorization"] = `Bearer ${config.secret}`;
    }

    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          success: true,
          message: "Connection successful.",
          latencyMs,
        };
      }

      // Surface a useful message without leaking raw provider internals
      const status = response.status;
      if (status === 401 || status === 403) {
        return { success: false, message: "Authentication failed. Check your API key.", latencyMs };
      }
      if (status === 404) {
        return { success: false, message: "Models endpoint not found. Verify the endpoint URL.", latencyMs };
      }

      return {
        success: false,
        message: `Provider returned HTTP ${status}. Verify your endpoint and credentials.`,
        latencyMs,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - start;

      if (error instanceof DOMException && error.name === "TimeoutError") {
        return { success: false, message: "Connection timed out after 15 seconds.", latencyMs };
      }
      if (error instanceof TypeError) {
        // fetch throws TypeError for network-level failures (DNS, refused, etc.)
        return { success: false, message: "Could not reach the provider. Check the endpoint URL and your network.", latencyMs };
      }

      return { success: false, message: "An unexpected error occurred during the connection test.", latencyMs };
    }
  }
}
