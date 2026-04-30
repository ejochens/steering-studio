"use server";

import { saveAssignmentSchema } from "@/lib/validation/provider";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export type SaveAssignmentResult = {
  success: boolean;
  error?: string;
};

export async function saveAssignment(
  input: unknown,
): Promise<SaveAssignmentResult> {
  const parsed = saveAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Invalid assignment data." };
  }

  const { aiFunction, providerConnectionId } = parsed.data;

  try {
    if (providerConnectionId) {
      // Verify the connection exists
      const connection = await prisma.providerConnection.findUnique({
        where: { id: providerConnectionId },
        select: { id: true },
      });

      if (!connection) {
        return { success: false, error: "Provider connection not found." };
      }

      // Upsert the assignment
      await prisma.modelAssignment.upsert({
        where: { aiFunction },
        create: { aiFunction, providerConnectionId },
        update: { providerConnectionId },
      });
    } else {
      // Clear the assignment (revert to default)
      await prisma.modelAssignment.deleteMany({
        where: { aiFunction },
      });
    }
  } catch (error) {
    console.error("[saveAssignment] Error:", error);
    return { success: false, error: "Failed to save assignment." };
  }

  revalidatePath("/settings/provider");
  return { success: true };
}
