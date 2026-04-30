"use server";

import { deleteProviderSchema } from "@/lib/validation/provider";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export type DeleteProviderResult = {
  success: boolean;
  error?: string;
};

export async function deleteProvider(
  input: unknown,
): Promise<DeleteProviderResult> {
  const parsed = deleteProviderSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid provider ID." };
  }

  const { id } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Check if the connection being deleted is the default
      const connection = await tx.providerConnection.findUnique({
        where: { id },
        select: { isDefault: true },
      });

      if (!connection) {
        throw new Error("Provider connection not found.");
      }

      // Delete the connection (cascade handles ModelAssignment cleanup)
      await tx.providerConnection.delete({ where: { id } });

      // If it was the default, promote the most recently updated remaining connection
      if (connection.isDefault) {
        const nextDefault = await tx.providerConnection.findFirst({
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });

        if (nextDefault) {
          await tx.providerConnection.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete provider.";
    console.error("[deleteProvider] Error:", error);
    return { success: false, error: message };
  }

  revalidatePath("/settings/provider");
  return { success: true };
}
