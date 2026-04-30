"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  saveProviderSchema,
  type SaveProviderInput,
  type ProviderType,
  type AuthMode,
} from "@/lib/validation/provider";
import { saveProvider } from "@/features/provider-settings/actions/save-provider";
import { testConnection, type TestConnectionResult } from "@/features/provider-settings/actions/test-connection";
import { useState } from "react";

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

type InitialData = {
  id: string;
  providerType: string;
  endpoint: string;
  region: string;
  modelName: string;
  authMode: string;
  hasSecret: boolean;
  lastTestStatus: string;
  apiVersion: string;
};

interface ProviderSettingsFormProps {
  initialData: InitialData | null;
}

const SECRET_PLACEHOLDER = "••••••••";

const inputClass = (hasError: boolean) =>
  `mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-red-400 focus:ring-red-500" : "border-gray-300"
  }`;

export default function ProviderSettingsForm({
  initialData,
}: ProviderSettingsFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SaveProviderInput>({
    resolver: zodResolver(saveProviderSchema),
    defaultValues: {
      providerType: (initialData?.providerType as ProviderType) ?? "openai",
      endpoint: initialData?.endpoint ?? "",
      region: initialData?.region ?? "",
      modelName: initialData?.modelName ?? "",
      authMode: (initialData?.authMode as AuthMode) ?? "api_key",
      secret: "",
      apiVersion: initialData?.apiVersion ?? "",
    },
  });

  const providerType = watch("providerType");
  const authMode = watch("authMode");

  async function onSubmit(data: SaveProviderInput) {
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const result = await saveProvider(data, initialData?.id);
      if (result.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.error ?? "Save failed.");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  async function handleTestConnection() {
    setTestResult(null);
    setIsTesting(true);
    try {
      const values = getValues();
      const result = await testConnection(values, initialData?.id);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "Something went wrong. Please try again." });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          Provider settings saved.
        </div>
      )}

      {/* Provider type */}
      <div>
        <label
          htmlFor="providerType"
          className="block text-sm font-medium text-gray-700"
        >
          Provider type <span aria-hidden="true">*</span>
        </label>
        <select
          id="providerType"
          {...register("providerType")}
          aria-required="true"
          aria-invalid={!!errors.providerType}
          aria-describedby={errors.providerType ? "providerType-error" : undefined}
          className={inputClass(!!errors.providerType)}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.providerType && (
          <p id="providerType-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.providerType.message}
          </p>
        )}
      </div>

      {/* Azure field-mapping guide */}
      {providerType === "azure_openai" && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <p className="font-medium">Where to find these values in Azure AI Foundry:</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            <li><span className="font-medium">Endpoint URL</span> → the host part of the Target URI (before <code className="rounded bg-blue-100 px-1">/openai/...</code>)</li>
            <li><span className="font-medium">Deployment name</span> → Deployment info → <span className="font-medium">Name</span> (not &quot;Model name&quot; or &quot;Model version&quot;)</li>
            <li><span className="font-medium">API version</span> → leave as default, or copy from the <code className="rounded bg-blue-100 px-1">api-version=</code> query string in the Target URI</li>
            <li><span className="font-medium">API Key</span> → the Key shown on the deployment page</li>
          </ul>
        </div>
      )}

      {/* Endpoint — shown for openai and azure_openai */}
      {(providerType === "openai" || providerType === "azure_openai") && (
        <div>
          <label
            htmlFor="endpoint"
            className="block text-sm font-medium text-gray-700"
          >
            Endpoint URL
          </label>
          <input
            id="endpoint"
            type="url"
            {...register("endpoint")}
            aria-invalid={!!errors.endpoint}
            aria-describedby={`endpoint-hint${errors.endpoint ? " endpoint-error" : ""}`}
            className={inputClass(!!errors.endpoint)}
            placeholder={
              providerType === "azure_openai"
                ? "https://your-resource.openai.azure.com"
                : "https://api.openai.com"
            }
          />
          <p id="endpoint-hint" className="mt-1 text-xs text-gray-500">
            {providerType === "azure_openai"
              ? <>The host from your Azure Target URI. You can paste the full Target URI — the path and query string are stripped automatically.</>
              : <>Base URL only, no path segments. For OpenAI: <code className="rounded bg-gray-100 px-1 text-xs">https://api.openai.com</code></>}
          </p>
          {errors.endpoint && (
            <p id="endpoint-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.endpoint.message}
            </p>
          )}
        </div>
      )}

      {/* Region — shown for bedrock */}
      {providerType === "bedrock" && (
        <div>
          <label
            htmlFor="region"
            className="block text-sm font-medium text-gray-700"
          >
            AWS Region
          </label>
          <input
            id="region"
            type="text"
            {...register("region")}
            aria-invalid={!!errors.region}
            aria-describedby={errors.region ? "region-error" : undefined}
            className={inputClass(!!errors.region)}
            placeholder="us-east-1"
          />
          {errors.region && (
            <p id="region-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.region.message}
            </p>
          )}
        </div>
      )}

      {/* Model name / Deployment name */}
      <div>
        <label
          htmlFor="modelName"
          className="block text-sm font-medium text-gray-700"
        >
          {providerType === "azure_openai" ? "Deployment name" : "Model name"} <span aria-hidden="true">*</span>
        </label>
        <input
          id="modelName"
          type="text"
          {...register("modelName")}
          aria-required="true"
          aria-invalid={!!errors.modelName}
          aria-describedby={`${providerType === "azure_openai" ? "modelName-hint" : ""}${errors.modelName ? " modelName-error" : ""}`.trim() || undefined}
          className={inputClass(!!errors.modelName)}
          placeholder={providerType === "azure_openai" ? "gpt-5.4" : "gpt-4o"}
        />
        {providerType === "azure_openai" && (
          <p id="modelName-hint" className="mt-1 text-xs text-gray-500">
            In Azure AI Foundry: Deployment info → &quot;Name&quot; field. This is often the same as the model name (e.g. <code className="rounded bg-gray-100 px-1 text-xs">gpt-5.4-pro</code>), but can be custom. Not the &quot;Model version&quot; (which is a date like 2026-03-05).
          </p>
        )}
        {errors.modelName && (
          <p id="modelName-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.modelName.message}
          </p>
        )}
      </div>

      {/* API version — shown for azure_openai */}
      {providerType === "azure_openai" && (
        <div>
          <label
            htmlFor="apiVersion"
            className="block text-sm font-medium text-gray-700"
          >
            API version
          </label>
          <input
            id="apiVersion"
            type="text"
            {...register("apiVersion")}
            aria-invalid={!!errors.apiVersion}
            aria-describedby={`apiVersion-hint${errors.apiVersion ? " apiVersion-error" : ""}`}
            className={inputClass(!!errors.apiVersion)}
            placeholder="2024-12-01-preview"
          />
          <p id="apiVersion-hint" className="mt-1 text-xs text-gray-500">
            Leave blank to use the default (<code className="rounded bg-gray-100 px-1 text-xs">2024-12-01-preview</code>). This is the Azure REST API version, not the model version. If your model only supports the newer Responses API, the adapter detects this automatically.
          </p>
          {errors.apiVersion && (
            <p id="apiVersion-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.apiVersion.message}
            </p>
          )}
        </div>
      )}

      {/* Auth mode */}
      <div>
        <label
          htmlFor="authMode"
          className="block text-sm font-medium text-gray-700"
        >
          Authentication mode <span aria-hidden="true">*</span>
        </label>
        <select
          id="authMode"
          {...register("authMode")}
          aria-required="true"
          aria-invalid={!!errors.authMode}
          aria-describedby={errors.authMode ? "authMode-error" : undefined}
          className={inputClass(!!errors.authMode)}
        >
          {AUTH_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.authMode && (
          <p id="authMode-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.authMode.message}
          </p>
        )}
      </div>

      {/* Secret / API key — shown when auth mode is api_key */}
      {authMode === "api_key" && (
        <div>
          <label
            htmlFor="secret"
            className="block text-sm font-medium text-gray-700"
          >
            API Key
          </label>
          <input
            id="secret"
            type="password"
            {...register("secret")}
            aria-invalid={!!errors.secret}
            aria-describedby={
              errors.secret
                ? "secret-error"
                : initialData?.hasSecret
                  ? "secret-hint"
                  : undefined
            }
            className={inputClass(!!errors.secret)}
            placeholder={initialData?.hasSecret ? SECRET_PLACEHOLDER : providerType === "azure_openai" ? "" : "sk-..."}
          />
          {initialData?.hasSecret && (
            <p id="secret-hint" className="mt-1 text-xs text-gray-500">
              A secret is already saved. Leave blank to keep the existing value.
            </p>
          )}
          {errors.secret && (
            <p id="secret-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.secret.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
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
          disabled={isTesting || isSubmitting}
          onClick={handleTestConnection}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? "Testing…" : "Test Connection"}
        </button>
      </div>

      {/* Test connection result */}
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
  );
}
