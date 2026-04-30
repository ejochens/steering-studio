/**
 * Provider adapter contract for Steering Studio.
 *
 * `testConnection` is required for the bootstrap slice.
 * `sendChat` is required for the intake AI assist slice.
 * Future slices will add extractStructuredData, generateDocuments.
 */

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface ProviderConfig {
  providerType: "openai" | "azure_openai" | "bedrock";
  endpoint?: string;
  region?: string;
  modelName: string;
  authMode: "api_key" | "iam" | "session";
  secret?: string;
  apiVersion?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Enable extended thinking / reasoning mode for complex generation tasks. */
  reasoning?: boolean;
  /** Budget tokens for reasoning (used by models that support it, e.g. o1, o3). */
  reasoningBudget?: number;
}

export interface ChatResult {
  content: string;
}

export interface ProviderAdapter {
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  sendChat(config: ProviderConfig, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;

  // Future methods:
  // extractStructuredData(schema, messages, options): Promise<ExtractionResult>
  // generateDocuments(input, templateSet, options): Promise<GenerationResult>
}
