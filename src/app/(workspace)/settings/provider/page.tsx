import { prisma } from "@/lib/db/prisma";
import ProviderSettingsPage from "@/features/provider-settings/components/provider-settings-page";

export default async function ProviderSettingsRoute() {
  const rawConnections = await prisma.providerConnection.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const connections = rawConnections.map((c) => ({
    id: c.id,
    providerType: c.providerType,
    endpoint: c.endpoint ?? "",
    region: c.region ?? "",
    modelName: c.modelName,
    authMode: c.authMode,
    hasSecret: !!c.encryptedSecret,
    apiVersion: c.apiVersion ?? "",
    isDefault: c.isDefault,
    lastTestStatus: c.lastTestStatus ?? "untested",
    lastTestedAt: c.lastTestedAt?.toISOString() ?? null,
  }));

  const rawAssignments = await prisma.modelAssignment.findMany();
  const assignments = rawAssignments.map((a) => ({
    id: a.id,
    aiFunction: a.aiFunction,
    providerConnectionId: a.providerConnectionId,
  }));

  return (
    <section>
      <h2 className="text-lg font-medium text-gray-900">
        Provider Connections
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Configure AI model providers and assign them to specific functions.
      </p>
      <div className="mt-6">
        <ProviderSettingsPage connections={connections} assignments={assignments} />
      </div>
    </section>
  );
}
