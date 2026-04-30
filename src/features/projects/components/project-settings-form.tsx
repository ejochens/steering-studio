"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProjectSettingsSchema,
  type UpdateProjectSettingsInput,
  type TargetOutput,
  type ProjectType,
} from "@/lib/validation/project";
import { updateProjectSettings } from "@/features/projects/actions/update-project-settings";
import { scanCodebase } from "@/features/codebase-scan/actions/scan-codebase";
import type { ScanSummary } from "@/features/codebase-scan/lib/types";
import { useState } from "react";

const TARGET_OPTIONS: { value: TargetOutput; label: string; description: string }[] = [
  { value: "Kiro", label: "Kiro", description: "Generate .kiro/steering files" },
  { value: "Copilot", label: "Copilot", description: "Generate .github/copilot-instructions and prompts" },
  { value: "Both", label: "Both", description: "Generate files for both Kiro and Copilot" },
];

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; description: string }[] = [
  { value: "new", label: "New project", description: "Starting from scratch with no existing context" },
  { value: "extension", label: "Extending existing project", description: "Adding to or refining an existing codebase" },
];

interface ProjectSettingsFormProps {
  projectId: string;
  currentName: string;
  currentWorkingTitle: string;
  currentTargetOutput: TargetOutput;
  currentProjectType: ProjectType;
  currentHasExistingDocs: boolean;
  currentCodebasePath?: string;
}

export default function ProjectSettingsForm({
  projectId,
  currentName,
  currentWorkingTitle,
  currentTargetOutput,
  currentProjectType,
  currentHasExistingDocs,
  currentCodebasePath,
}: ProjectSettingsFormProps) {
  const [submitStatus, setSubmitStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRegenHint, setShowRegenHint] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [scanResult, setScanResult] = useState<ScanSummary | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateProjectSettingsInput>({
    resolver: zodResolver(updateProjectSettingsSchema),
    defaultValues: {
      name: currentName,
      workingTitle: currentWorkingTitle,
      targetOutput: currentTargetOutput,
      projectType: currentProjectType,
      hasExistingDocs: currentHasExistingDocs,
      codebasePath: currentCodebasePath ?? "",
    },
  });

  const nameLength = watch("name")?.length ?? 0;
  const titleLength = watch("workingTitle")?.length ?? 0;
  const selectedProjectType = watch("projectType");
  const watchedCodebasePath = watch("codebasePath");

  async function handleScanCodebase() {
    setScanStatus("scanning");
    setScanResult(null);
    try {
      const result = await scanCodebase(projectId);
      setScanResult(result);
      setScanStatus(result.success ? "done" : "error");
    } catch {
      setScanStatus("error");
      setScanResult({
        success: false,
        filesScanned: 0,
        deterministicFieldCount: 0,
        aiFieldCount: 0,
        warnings: [],
        error: "An unexpected error occurred while scanning.",
      });
    }
  }

  async function onSubmit(values: UpdateProjectSettingsInput) {
    setSubmitStatus("saving");
    setSubmitError(null);
    setShowRegenHint(false);

    const targetChanged = values.targetOutput !== currentTargetOutput;

    const result = await updateProjectSettings(projectId, values);

    if (result.error) {
      setSubmitStatus("error");
      setSubmitError(result.error);
    } else {
      setSubmitStatus("saved");
      if (targetChanged) {
        setShowRegenHint(true);
      } else {
        setTimeout(() => setSubmitStatus("idle"), 2000);
      }
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

      {showRegenHint && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <p className="font-medium">Target output changed</p>
          <p className="mt-1">
            Your generated documents were built for the previous target. Go to the{" "}
            <a
              href={`/projects/${projectId}/documents`}
              className="font-medium underline hover:text-amber-900"
            >
              Documents
            </a>{" "}
            page and regenerate to include the new target&apos;s files.
          </p>
        </div>
      )}

      {/* Project name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Project name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          maxLength={100}
          {...register("name")}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : "name-hint"}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-red-400 focus:ring-red-500" : "border-gray-300"
          }`}
        />
        <div className="mt-1 flex justify-between">
          {errors.name ? (
            <p id="name-error" role="alert" className="text-sm text-red-600">
              {errors.name.message}
            </p>
          ) : (
            <span id="name-hint" />
          )}
          <span className="text-xs text-gray-400">{nameLength}/100</span>
        </div>
      </div>

      {/* Working title */}
      <div>
        <label htmlFor="workingTitle" className="block text-sm font-medium text-gray-700">
          Working title <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="workingTitle"
          maxLength={200}
          rows={3}
          {...register("workingTitle")}
          aria-required="true"
          aria-invalid={!!errors.workingTitle}
          aria-describedby={errors.workingTitle ? "workingTitle-error" : "workingTitle-hint"}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.workingTitle ? "border-red-400 focus:ring-red-500" : "border-gray-300"
          }`}
        />
        <div className="mt-1 flex justify-between">
          {errors.workingTitle ? (
            <p id="workingTitle-error" role="alert" className="text-sm text-red-600">
              {errors.workingTitle.message}
            </p>
          ) : (
            <span id="workingTitle-hint" />
          )}
          <span className="text-xs text-gray-400">{titleLength}/200</span>
        </div>
      </div>

      {/* Target output */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">
          Target output <span aria-hidden="true">*</span>
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Choose which tool(s) the generated context pack should target. You can change this at any time.
        </p>
        <div className="mt-3 space-y-3" role="radiogroup" aria-required="true">
          {TARGET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={option.value}
                {...register("targetOutput")}
                className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.targetOutput && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.targetOutput.message}
          </p>
        )}
      </fieldset>

      {/* Project type */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">
          Project type
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Is this a brand new project or are you extending an existing one?
        </p>
        <div className="mt-3 space-y-3" role="radiogroup">
          {PROJECT_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={option.value}
                {...register("projectType")}
                className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <p className="text-xs text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Has existing docs (only shown for extension projects) */}
      {selectedProjectType === "extension" && (
        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("hasExistingDocs")}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Has existing steering documents</span>
              <p className="text-xs text-gray-500">
                If you already have steering or context documents, they can be imported and used to pre-fill the intake form.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Codebase path (only shown for extension projects) */}
      {selectedProjectType === "extension" && (
        <div>
          <label htmlFor="codebasePath" className="block text-sm font-medium text-gray-700">
            Codebase Path
          </label>
          <input
            id="codebasePath"
            type="text"
            {...register("codebasePath")}
            placeholder="Enter absolute path to your codebase (e.g., C:\Users\dev\my-project)"
            aria-describedby={errors.codebasePath ? "codebasePath-error" : "codebasePath-hint"}
            aria-invalid={!!errors.codebasePath}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.codebasePath ? "border-red-400 focus:ring-red-500" : "border-gray-300"
            }`}
          />
          {errors.codebasePath ? (
            <p id="codebasePath-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.codebasePath.message}
            </p>
          ) : (
            <p id="codebasePath-hint" className="mt-1 text-xs text-gray-500">
              The absolute filesystem path to your existing project root directory.
            </p>
          )}

          {watchedCodebasePath && (
            <button
              type="button"
              onClick={handleScanCodebase}
              disabled={scanStatus === "scanning" || isDirty}
              className="mt-2 inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanStatus === "scanning" ? "Scanning codebase…" : "Scan Codebase"}
            </button>
          )}

          {/* Scan status display */}
          {scanStatus === "scanning" && (
            <div role="status" className="mt-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning codebase…
            </div>
          )}

          {scanStatus === "done" && scanResult && (
            scanResult.deterministicFieldCount === 0 && scanResult.aiFieldCount === 0 ? (
              <div role="status" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No recognizable project files found at the specified path.
              </div>
            ) : (
              <div role="status" className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <p className="font-medium">Scan complete</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  <li>{scanResult.filesScanned} file{scanResult.filesScanned !== 1 ? "s" : ""} scanned</li>
                  <li>{scanResult.deterministicFieldCount} field{scanResult.deterministicFieldCount !== 1 ? "s" : ""} populated by deterministic parsing</li>
                  <li>{scanResult.aiFieldCount} field{scanResult.aiFieldCount !== 1 ? "s" : ""} populated by AI analysis</li>
                </ul>
                {scanResult.warnings.length > 0 && (
                  <div className="mt-2 border-t border-green-200 pt-2">
                    <p className="font-medium text-amber-700">Warnings:</p>
                    <ul className="mt-0.5 list-disc pl-5 text-amber-700">
                      {scanResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          )}

          {scanStatus === "error" && scanResult && (
            <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">Scan failed</p>
              <p className="mt-1">{scanResult.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!isDirty || submitStatus === "saving"}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitStatus === "saving" ? "Saving…" : "Save"}
        </button>
        {submitStatus === "saved" && (
          <span className="text-sm text-green-600">Settings saved.</span>
        )}
      </div>
    </form>
  );
}
