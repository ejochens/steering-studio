"use server";

import { deleteProviderSchema } from "@/lib/validation/provider";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export type SetDefaultResult = {
  success: boolean;
  error?: string;
};

export async function setDefault(
  input: unknown,
): Promise<SetDefaultResult> {
  const parsed = deleteProviderSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid provider ID." };
  }

  const { id } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Verify the target connection exists
      const connection = await tx.providerConnection.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!connection) {
        throw new Error("Provider connection not found.");
      }

      // Clear isDefault on all connections
      await tx.providerConnection.updateMany({
        data: { isDefault: false },
      });

      // Set isDefault on the target connection
      await tx.providerConnection.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set default provider.";
    console.error("[setDefault] Error:", error);
    return { success: false, error: message };
  }

  revalidatePath("/settings/provider");
  return { success: true };
}
