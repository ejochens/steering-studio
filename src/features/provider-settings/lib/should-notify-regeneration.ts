/**
 * Determines whether a save operation affects the "generation" AI function,
 * signaling that existing documents may benefit from regeneration.
 */

export interface ShouldNotifyRegenerationParams {
  /** The ID of the connection that was just saved/updated */
  savedConnectionId: string;
  /** Whether the saved connection is the default */
  isDefault: boolean;
  /** If this was an assignment save, which AI function was assigned */
  aiFunction?: string;
  /** Current model assignments */
  assignments: Array<{ aiFunction: string; providerConnectionId: string }>;
}

export function shouldNotifyRegeneration(
  params: ShouldNotifyRegenerationParams,
): boolean {
  const { savedConnectionId, isDefault, aiFunction, assignments } = params;

  // Direct assignment save for "generation"
  if (aiFunction === "generation") {
    return true;
  }

  const generationAssignment = assignments.find(
    (a) => a.aiFunction === "generation",
  );

  // The saved connection is explicitly assigned to "generation"
  if (
    generationAssignment &&
    generationAssignment.providerConnectionId === savedConnectionId
  ) {
    return true;
  }

  // The saved connection is the default AND there's no explicit "generation" assignment
  if (isDefault && !generationAssignment) {
    return true;
  }

  return false;
}
