import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/utils/crypto";
import type { ProviderConfig } from "@/lib/ai/adapters/types";

export type { AiFunction } from "@/lib/validation/provider";
import type { AiFunction } from "@/lib/validation/provider";

/**
 * Resolves the ProviderConfig for a given AI function.
 *
 * Resolution order:
 * 1. ModelAssignment for the specific aiFunction
 * 2. Default ProviderConnection (isDefault = true)
 * 3. Most recently updated ProviderConnection
 * 4. null if no connections exist
 */
export async function resolveProvider(
  aiFunction: AiFunction,
): Promise<ProviderConfig | null> {
  // 1. Check for a direct ModelAssignment
  const assignment = await prisma.modelAssignment.findUnique({
    where: { aiFunction },
    include: { providerConnection: true },
  });

  if (assignment) {
    return toProviderConfig(assignment.providerConnection);
  }

  // 2. Fall back to the default connection
  const defaultConnection = await prisma.providerConnection.findFirst({
    where: { isDefault: true },
  });

  if (defaultConnection) {
    return toProviderConfig(defaultConnection);
  }

  // 3. Fall back to the most recently updated connection
  const latestConnection = await prisma.providerConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!latestConnection) {
    return null;
  }

  return toProviderConfig(latestConnection);
}

/** Map a ProviderConnection record to a sanitized ProviderConfig with decrypted secret. */
function toProviderConfig(
  connection: {
    providerType: string;
    endpoint: string | null;
    region: string | null;
    modelName: string;
    authMode: string;
    encryptedSecret: string | null;
    apiVersion: string | null;
  },
): ProviderConfig | null {
  let secret: string | undefined;

  if (connection.encryptedSecret) {
    try {
      secret = decrypt(connection.encryptedSecret);
    } catch {
      return null;
    }
  }

  return {
    providerType: connection.providerType as ProviderConfig["providerType"],
    endpoint: connection.endpoint ?? undefined,
    region: connection.region ?? undefined,
    modelName: connection.modelName,
    authMode: connection.authMode as ProviderConfig["authMode"],
    secret,
    apiVersion: connection.apiVersion ?? undefined,
  };
}
