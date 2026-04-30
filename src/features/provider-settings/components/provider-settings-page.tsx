"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  saveProviderSchema,
  type SaveProviderInput,
  type ProviderType,
  type AuthMode,
} from "@/lib/validation/provider";
import { saveProvider } from "@/features/provider-settings/actions/save-provider";
import { deleteProvider } from "@/features/provider-settings/actions/delete-provider";
import { saveAssignment } from "@/features/provider-settings/actions/save-assignment";
import { setDefault } from "@/features/provider-settings/actions/set-default";
import {
  testConnection,
  type TestConnectionResult,
} from "@/features/provider-settings/actions/test-connection";
import { shouldNotifyRegeneration } from "@/features/provider-settings/lib/should-notify-regeneration";

// ── Exported interfaces ──────────────────────────────────────────────

export interface SanitizedConnection {
  id: string;
  providerType: string;
  endpoint: string;
  region: string;
  modelName: string;
  authMode: string;
  hasSecret: boolean;
  apiVersion: string;
  isDefault: boolean;
  lastTestStatus: string;
  lastTestedAt: string | null;
}

export interface SanitizedAssignment {
  id: string;
  aiFunction: string;
  providerConnectionId: string;
}

// ── Constants ────────────────────────────────────────────────────────

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "azure_openai", label: "Azure OpenAI" },
  { value: "bedrock", label: "Amazon Bedrock" },
];

const AUTH_MODE_OPTIONS: { value: AuthMode; label: string }[] = [
  { value: "api_key", label: "API Key" },
  { value: "iam", label: "IAM" },
  { value: "session", label: "Session" },
];

const AI_FUNCTIONS = ["intake", "generation"] as const;

const AI_FUNCTION_LABELS: Record<string, string> = {
  intake: "Intake",
  generation: "Generation",
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  openai: "OpenAI",
  azure_openai: "Azure",
  bedrock: "Bedrock",
};

const SECRET_PLACEHOLDER = "••••••••";

const inputClass = (hasError: boolean) =>
  `mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-red-400 focus:ring-red-500" : "border-gray-300"
  }`;

// ── Props ────────────────────────────────────────────────────────────

interface ProviderSettingsPageProps {
  connections: SanitizedConnection[];
  assignments: SanitizedAssignment[];
}

// ── Component ────────────────────────────────────────────────────────

export default function ProviderSettingsPage({
  connections,
  assignments,
}: ProviderSettingsPageProps) {
  const router = useRouter();

  // Form visibility & editing state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Feedback state
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, TestConnectionResult>
  >({});
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [showRegenNotification, setShowRegenNotification] = useState(false);

  // Find the connection being edited (if any)
  const editingConnection = editingId
    ? connections.find((c) => c.id === editingId) ?? null
    : null;

  // ── Handlers ─────────────────────────────────────────────────────

  function openAddForm() {
    setEditingId(null);
    setShowForm(true);
    setActionFeedback(null);
  }

  function openEditForm(id: string) {
    setEditingId(id);
    setShowForm(true);
    setActionFeedback(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setActionFeedback(null);
    const result = await deleteProvider({ id });
    if (result.success) {
      setActionFeedback({ type: "success", message: "Connection deleted." });
      if (editingId === id) closeForm();
      router.refresh();
    } else {
      setActionFeedback({
        type: "error",
        message: result.error ?? "Failed to delete connection.",
      });
    }
  }

  async function handleSetDefault(id: string) {
    setActionFeedback(null);
    const result = await setDefault({ id });
    if (result.success) {
      setActionFeedback({ type: "success", message: "Default updated." });
      if (
        shouldNotifyRegeneration({
          savedConnectionId: id,
          isDefault: true,
          assignments,
        })
      ) {
        setShowRegenNotification(true);
      }
      router.refresh();
    } else {
      setActionFeedback({
        type: "error",
        message: result.error ?? "Failed to set default.",
      });
    }
  }

  async function handleTestConnection(conn: SanitizedConnection) {
    // Clear previous result immediately so stale errors don't linger
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[conn.id];
      return next;
    });
    setTestingIds((prev) => new Set(prev).add(conn.id));
    try {
      const result = await testConnection(
        {
          providerType: conn.providerType,
          endpoint: conn.endpoint || undefined,
          region: conn.region || undefined,
          modelName: conn.modelName,
          authMode: conn.authMode,
          apiVersion: conn.apiVersion || undefined,
        },
        conn.id,
      );
      setTestResults((prev) => ({ ...prev, [conn.id]: result }));
      router.refresh();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [conn.id]: { success: false, message: "Test failed unexpectedly." },
      }));
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(conn.id);
        return next;
      });
    }
  }

  async function handleAssignmentChange(
    aiFunction: string,
    providerConnectionId: string,
  ) {
    setActionFeedback(null);
    const payload = providerConnectionId
      ? { aiFunction, providerConnectionId }
      : { aiFunction };
    const result = await saveAssignment(payload);
    if (result.success) {
      setActionFeedback({ type: "success", message: "Assignment updated." });
      if (
        shouldNotifyRegeneration({
          savedConnectionId: providerConnectionId || "",
          isDefault: false,
          aiFunction,
          assignments,
        })
      ) {
        setShowRegenNotification(true);
      }
      router.refresh();
    } else {
      setActionFeedback({
        type: "error",
        message: result.error ?? "Failed to update assignment.",
      });
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Action feedback banner */}
      {actionFeedback && (
        <div
          role="status"
          className={`rounded-md border p-3 text-sm ${
            actionFeedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Regeneration notification banner */}
      {showRegenNotification && (
        <div
          role="status"
          data-testid="regen-notification"
          className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <span>
            The provider for document generation has changed. You may want to
            regenerate your documents.
          </span>
          <button
            type="button"
            onClick={() => setShowRegenNotification(false)}
            className="ml-4 shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
            aria-label="Dismiss regeneration notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Section 1: Connection List ──────────────────────────── */}
      <section aria-labelledby="connections-heading">
        <h3 id="connections-heading" className="text-base font-medium text-gray-900">
          Connections
        </h3>

        {connections.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No connections configured. Add one to get started.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200">
            {connections.map((conn) => (
              <li
                key={conn.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span data-testid={`provider-type-${conn.id}`}>
                    {PROVIDER_TYPE_LABELS[conn.providerType] ?? conn.providerType}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span data-testid={`model-name-${conn.id}`} className="font-medium">
                    {conn.modelName}
                  </span>
                  {conn.isDefault && (
                    <span
                      data-testid={`default-badge-${conn.id}`}
                      className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      Default
                    </span>
                  )}
                  <span
                    data-testid={`test-status-${conn.id}`}
                    className={`text-xs ${
                      conn.lastTestStatus === "success"
                        ? "text-green-600"
                        : conn.lastTestStatus === "failure"
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {conn.lastTestStatus === "success"
                      ? "✓ Passed"
                      : conn.lastTestStatus === "failure"
                        ? "✗ Failed"
                        : "Untested"}
                    {conn.lastTestedAt && (
                      <span className="ml-1">
                        ({new Date(conn.lastTestedAt).toLocaleDateString()})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(conn)}
                    disabled={testingIds.has(conn.id)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    aria-label={`Test connection ${conn.modelName}`}
                  >
                    {testingIds.has(conn.id) ? "Testing…" : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(conn.id)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    aria-label={`Edit connection ${conn.modelName}`}
                  >
                    Edit
                  </button>
                  {!conn.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(conn.id)}
                      className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      aria-label={`Set ${conn.modelName} as default`}
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(conn.id)}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    aria-label={`Delete connection ${conn.modelName}`}
                  >
                    Delete
                  </button>
                </div>

                {/* Inline test result or loading indicator */}
                {testingIds.has(conn.id) && (
                  <div
                    role="status"
                    className="flex w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700"
                  >
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Testing connection…
                  </div>
                )}
                {!testingIds.has(conn.id) && testResults[conn.id] && (
                  <div
                    role="status"
                    className={`w-full rounded-md border p-2 text-xs ${
                      testResults[conn.id].success
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {testResults[conn.id].message}
                    {testResults[conn.id].latencyMs != null && (
                      <span className="ml-2 opacity-75">
                        ({testResults[conn.id].latencyMs}ms)
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={openAddForm}
          className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Add Connection
        </button>
      </section>

      {/* ── Section 2: Add/Edit Connection Form ─────────────────── */}
      {showForm && (
        <ConnectionForm
          editingConnection={editingConnection}
          onClose={closeForm}
          onSuccess={(savedId?: string) => {
            closeForm();
            setActionFeedback({ type: "success", message: "Connection saved." });
            // Check if the saved connection affects the generation function
            if (savedId) {
              const conn = connections.find((c) => c.id === savedId);
              if (
                shouldNotifyRegeneration({
                  savedConnectionId: savedId,
                  isDefault: conn?.isDefault ?? false,
                  assignments,
                })
              ) {
                setShowRegenNotification(true);
              }
            } else {
              // New connection — if no other connections exist, it becomes default
              if (connections.length === 0) {
                const hasGenerationAssignment = assignments.some(
                  (a) => a.aiFunction === "generation",
                );
                if (!hasGenerationAssignment) {
                  setShowRegenNotification(true);
                }
              }
            }
            router.refresh();
          }}
          onError={(msg) =>
            setActionFeedback({ type: "error", message: msg })
          }
        />
      )}

      {/* ── Section 3: Model Assignments ────────────────────────── */}
      <section aria-labelledby="assignments-heading">
        <h3
          id="assignments-heading"
          className="text-base font-medium text-gray-900"
        >
          Model Assignments
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Assign a specific connection to each AI function, or leave as
          &quot;Default&quot; to use the default connection.
        </p>

        <div className="mt-3 space-y-4">
          {AI_FUNCTIONS.map((fn) => {
            const current = assignments.find((a) => a.aiFunction === fn);
            return (
              <div key={fn} className="flex items-center gap-4">
                <label
                  htmlFor={`assignment-${fn}`}
                  className="w-28 text-sm font-medium text-gray-700"
                >
                  {AI_FUNCTION_LABELS[fn] ?? fn}
                </label>
                <select
                  id={`assignment-${fn}`}
                  value={current?.providerConnectionId ?? ""}
                  onChange={(e) => handleAssignmentChange(fn, e.target.value)}
                  className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Model assignment for ${AI_FUNCTION_LABELS[fn] ?? fn}`}
                >
                  <option value="">Default</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {PROVIDER_TYPE_LABELS[c.providerType] ?? c.providerType} /{" "}
                      {c.modelName}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── ConnectionForm sub-component ─────────────────────────────────────

interface ConnectionFormProps {
  editingConnection: SanitizedConnection | null;
  onClose: () => void;
  onSuccess: (savedId?: string) => void;
  onError: (msg: string) => void;
}

function ConnectionForm({
  editingConnection,
  onClose,
  onSuccess,
  onError,
}: ConnectionFormProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SaveProviderInput>({
    resolver: zodResolver(saveProviderSchema),
    defaultValues: {
      providerType:
        (editingConnection?.providerType as ProviderType) ?? "openai",
      endpoint: editingConnection?.endpoint ?? "",
      region: editingConnection?.region ?? "",
      modelName: editingConnection?.modelName ?? "",
      authMode: (editingConnection?.authMode as AuthMode) ?? "api_key",
      secret: "",
      apiVersion: editingConnection?.apiVersion ?? "",
    },
  });

  const providerType = watch("providerType");
  const authMode = watch("authMode");

  async function onSubmit(data: SaveProviderInput) {
    try {
      const result = await saveProvider(data, editingConnection?.id);
      if (result.success) {
        onSuccess(editingConnection?.id);
      } else {
        onError(result.error ?? "Save failed.");
      }
    } catch {
      onError("Something went wrong. Please try again.");
    }
  }

  async function handleTestConnection() {
    setTestResult(null);
    setIsTesting(true);
    try {
      const values = getValues();
      const result = await testConnection(values, editingConnection?.id);
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <section aria-labelledby="form-heading">
      <h3 id="form-heading" className="text-base font-medium text-gray-900">
        {editingConnection ? "Edit Connection" : "Add Connection"}
      </h3>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-3 space-y-5 rounded-md border border-gray-200 p-4"
      >
        {/* Provider type */}
        <div>
          <label
            htmlFor="form-providerType"
            className="block text-sm font-medium text-gray-700"
          >
            Provider type <span aria-hidden="true">*</span>
          </label>
          <select
            id="form-providerType"
            {...register("providerType")}
            aria-required="true"
            aria-invalid={!!errors.providerType}
            className={inputClass(!!errors.providerType)}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.providerType && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.providerType.message}
            </p>
          )}
        </div>

        {/* Endpoint — openai / azure_openai */}
        {(providerType === "openai" || providerType === "azure_openai") && (
          <div>
            <label
              htmlFor="form-endpoint"
              className="block text-sm font-medium text-gray-700"
            >
              Endpoint URL
            </label>
            <input
              id="form-endpoint"
              type="url"
              {...register("endpoint")}
              aria-invalid={!!errors.endpoint}
              className={inputClass(!!errors.endpoint)}
              placeholder={
                providerType === "azure_openai"
                  ? "https://your-resource.openai.azure.com"
                  : "https://api.openai.com"
              }
            />
            {errors.endpoint && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.endpoint.message}
              </p>
            )}
          </div>
        )}

        {/* Region — bedrock */}
        {providerType === "bedrock" && (
          <div>
            <label
              htmlFor="form-region"
              className="block text-sm font-medium text-gray-700"
            >
              AWS Region
            </label>
            <input
              id="form-region"
              type="text"
              {...register("region")}
              aria-invalid={!!errors.region}
              className={inputClass(!!errors.region)}
              placeholder="us-east-1"
            />
            {errors.region && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.region.message}
              </p>
            )}
          </div>
        )}

        {/* Model name */}
        <div>
          <label
            htmlFor="form-modelName"
            className="block text-sm font-medium text-gray-700"
          >
            {providerType === "azure_openai" ? "Deployment name" : "Model name"}{" "}
            <span aria-hidden="true">*</span>
          </label>
          <input
            id="form-modelName"
            type="text"
            {...register("modelName")}
            aria-required="true"
            aria-invalid={!!errors.modelName}
            className={inputClass(!!errors.modelName)}
            placeholder={
              providerType === "azure_openai" ? "gpt-5.4" : "gpt-4o"
            }
          />
          {errors.modelName && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.modelName.message}
            </p>
          )}
        </div>

        {/* API version — azure_openai */}
        {providerType === "azure_openai" && (
          <div>
            <label
              htmlFor="form-apiVersion"
              className="block text-sm font-medium text-gray-700"
            >
              API version
            </label>
            <input
              id="form-apiVersion"
              type="text"
              {...register("apiVersion")}
              aria-invalid={!!errors.apiVersion}
              className={inputClass(!!errors.apiVersion)}
              placeholder="2025-04-01-preview"
            />
            {errors.apiVersion && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.apiVersion.message}
              </p>
            )}
          </div>
        )}

        {/* Auth mode */}
        <div>
          <label
            htmlFor="form-authMode"
            className="block text-sm font-medium text-gray-700"
          >
            Authentication mode <span aria-hidden="true">*</span>
          </label>
          <select
            id="form-authMode"
            {...register("authMode")}
            aria-required="true"
            aria-invalid={!!errors.authMode}
            className={inputClass(!!errors.authMode)}
          >
            {AUTH_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.authMode && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {errors.authMode.message}
            </p>
          )}
        </div>

        {/* Secret — api_key auth */}
        {authMode === "api_key" && (
          <div>
            <label
              htmlFor="form-secret"
              className="block text-sm font-medium text-gray-700"
            >
              API Key
            </label>
            <input
              id="form-secret"
              type="password"
              {...register("secret")}
              aria-invalid={!!errors.secret}
              className={inputClass(!!errors.secret)}
              placeholder={
                editingConnection?.hasSecret ? SECRET_PLACEHOLDER : "sk-..."
              }
            />
            {editingConnection?.hasSecret && (
              <p className="mt-1 text-xs text-gray-500">
                A secret is already saved. Leave blank to keep the existing
                value.
              </p>
            )}
            {errors.secret && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.secret.message}
              </p>
            )}
          </div>
        )}

        {/* Form actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isTesting || isSubmitting}
            onClick={handleTestConnection}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? "Testing…" : "Test Connection"}
          </button>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            role="status"
            className={`rounded-md border p-3 text-sm ${
              testResult.success
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p>{testResult.message}</p>
            {testResult.latencyMs != null && (
              <p className="mt-1 text-xs opacity-75">
                Response time: {testResult.latencyMs}ms
              </p>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
