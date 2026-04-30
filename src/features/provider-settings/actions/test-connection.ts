"use server";

import { saveProviderSchema } from "@/lib/validation/provider";
import { getAdapter } from "@/lib/ai/adapters";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/utils/crypto";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

export type TestConnectionResult = {
  success: boolean;
  message: string;
  latencyMs?: number;
};

export async function testConnection(
  data: {
    providerType: string;
    endpoint?: string;
    region?: string;
    modelName: string;
    authMode: string;
    secret?: string;
    apiVersion?: string;
  },
  existingId?: string,
): Promise<TestConnectionResult> {
  // Validate input using the same schema as save
  const parsed = saveProviderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: "Invalid provider settings. Please check your inputs." };
  }

  const { providerType, endpoint, region, modelName, authMode, secret, apiVersion } = parsed.data;

  // If no secret provided but an existing connection has one, use the stored secret
  let resolvedSecret = secret;
  if (!resolvedSecret && existingId) {
    try {
      const existing = await prisma.providerConnection.findUnique({
        where: { id: existingId },
        select: { encryptedSecret: true },
      });
      if (existing?.encryptedSecret) {
        resolvedSecret = decrypt(existing.encryptedSecret);
      }
    } catch {
      // If lookup fails, proceed without — the adapter will report the missing key
    }
  }

  // Get the adapter for this provider type
  let adapter;
  try {
    adapter = getAdapter(providerType);
  } catch {
    return { success: false, message: `Provider type "${providerType}" is not supported yet.` };
  }

  // Build config and test
  const config: ProviderConfig = {
    providerType: providerType as ProviderConfig["providerType"],
    endpoint,
    region,
    modelName,
    authMode: authMode as ProviderConfig["authMode"],
    secret: resolvedSecret,
    apiVersion,
  };

  const result = await adapter.testConnection(config);

  // Update the stored connection record if one exists
  if (existingId) {
    try {
      await prisma.providerConnection.update({
        where: { id: existingId },
        data: {
          lastTestStatus: result.success ? "success" : "failure",
          lastTestedAt: new Date(),
        },
      });
    } catch {
      // Non-critical — the test result is still valid even if we can't persist status
    }
  }

  // Never return the secret — only success, message, and latency
  return {
    success: result.success,
    message: result.message,
    latencyMs: result.latencyMs,
  };
}
