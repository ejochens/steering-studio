export type { ConnectionTestResult, ProviderConfig, ProviderAdapter, ChatMessage, ChatOptions, ChatResult } from "./types";
export { OpenAIAdapter } from "./openai-adapter";
export { AzureOpenAIAdapter } from "./azure-openai-adapter";

import type { ProviderAdapter } from "./types";
import { OpenAIAdapter } from "./openai-adapter";
import { AzureOpenAIAdapter } from "./azure-openai-adapter";

/**
 * Return the appropriate adapter for the given provider type.
 *
 * Throws for unknown or not-yet-implemented providers.
 */
export function getAdapter(providerType: string): ProviderAdapter {
  switch (providerType) {
    case "openai":
      return new OpenAIAdapter();
    case "azure_openai":
      return new AzureOpenAIAdapter();
    case "bedrock":
      throw new Error("Bedrock adapter is not yet implemented.");
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
