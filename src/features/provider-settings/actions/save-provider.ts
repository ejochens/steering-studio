"use server";

import { saveProviderSchema, type SaveProviderInput } from "@/lib/validation/provider";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/utils/crypto";

export type SaveProviderResult = {
  success: boolean;
  error?: string;
};

export async function saveProvider(
  data: SaveProviderInput,
  existingId?: string,
): Promise<SaveProviderResult> {
  const parsed = saveProviderSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Invalid provider settings. Please check your inputs." };
  }

  const { providerType, endpoint, region, modelName, authMode, secret, apiVersion } = parsed.data;

  try {
    const payload: Record<string, unknown> = {
      providerType,
      endpoint: endpoint || null,
      region: region || null,
      modelName,
      authMode,
      apiVersion: apiVersion || null,
    };

    // Only update the encrypted secret when a new secret is provided.
    // Empty string means "keep existing" on update.
    if (secret) {
      payload.encryptedSecret = encrypt(secret);
    }

    if (existingId) {
      await prisma.providerConnection.update({
        where: { id: existingId },
        data: payload,
      });
    } else {
      // Auto-set isDefault when this is the first connection
      const existingCount = await prisma.providerConnection.count();
      if (existingCount === 0) {
        payload.isDefault = true;
      }

      await prisma.providerConnection.create({
        data: {
          ...payload,
          encryptedSecret: secret ? encrypt(secret) : null,
        } as Parameters<typeof prisma.providerConnection.create>[0]["data"],
      });
    }
  } catch (error) {
    console.error("[saveProvider] Error:", error);
    return { success: false, error: "Failed to save provider settings. Please try again." };
  }

  revalidatePath("/settings/provider");
  return { success: true };
}
