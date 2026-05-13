"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProjectSchema,
  type CreateProjectInput,
  type TargetOutput,
  type ProjectType,
} from "@/lib/validation/project";
import { createProject } from "@/features/projects/actions/create-project";
import { useState } from "react";

const TARGET_OPTIONS: { value: TargetOutput; label: string }[] = [
  { value: "Kiro", label: "Kiro" },
  { value: "Copilot", label: "Copilot" },
  { value: "Both", label: "Both" },
];

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; description: string }[] = [
  { value: "new", label: "New project", description: "Starting from scratch with no existing context" },
  { value: "extension", label: "Extending existing project", description: "Adding to or refining an existing codebase" },
];

export default function NewProjectForm() {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      workingTitle: "",
      targetOutput: undefined,
      projectType: "new",
      hasExistingDocs: false,
      codebasePath: "",
    },
  });

  const selectedProjectType = watch("projectType");

  async function onSubmit(data: CreateProjectInput) {
    setSubmitError(null);
    try {
      const result = await createProject(data);
      if (result?.error) {
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      {submitError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {/* Project name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Project name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          placeholder="My awesome project"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Working title */}
      <div>
        <label
          htmlFor="workingTitle"
          className="block text-sm font-medium text-gray-700"
        >
          Working title <span aria-hidden="true">*</span>
        </label>
        <input
          id="workingTitle"
          type="text"
          {...register("workingTitle")}
          aria-required="true"
          aria-invalid={!!errors.workingTitle}
          aria-describedby={
            errors.workingTitle ? "workingTitle-error" : undefined
          }
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.workingTitle
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300"
          }`}
          placeholder="A short description of what this project is about"
        />
        {errors.workingTitle && (
          <p
            id="workingTitle-error"
            role="alert"
            className="mt-1 text-sm text-red-600"
          >
            {errors.workingTitle.message}
          </p>
        )}
      </div>

      {/* Target output */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">
          Target output <span aria-hidden="true">*</span>
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Choose which tool(s) the generated context pack should target.
        </p>
        <div
          className="mt-2 flex gap-4"
          role="radiogroup"
          aria-required="true"
          aria-invalid={!!errors.targetOutput}
          aria-describedby={
            errors.targetOutput ? "targetOutput-error" : undefined
          }
        >
          {TARGET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="radio"
                value={option.value}
                {...register("targetOutput")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors.targetOutput && (
          <p
            id="targetOutput-error"
            role="alert"
            className="mt-1 text-sm text-red-600"
          >
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
        <div className="mt-2 space-y-3" role="radiogroup">
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
          <label
            htmlFor="codebasePath"
            className="block text-sm font-medium text-gray-700"
          >
            Codebase Path
          </label>
          <input
            id="codebasePath"
            type="text"
            {...register("codebasePath")}
            aria-invalid={!!errors.codebasePath}
            aria-describedby={errors.codebasePath ? "codebasePath-error" : "codebasePath-hint"}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.codebasePath
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-300"
            }`}
            placeholder="C:\Users\dev\my-project"
          />
          {errors.codebasePath ? (
            <p id="codebasePath-error" role="alert" className="mt-1 text-sm text-red-600">
              {errors.codebasePath.message}
            </p>
          ) : (
            <p id="codebasePath-hint" className="mt-1 text-xs text-gray-500">
              The absolute filesystem path to your existing project root directory. You can scan the codebase after creation.
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating…" : "Create Project"}
        </button>
      </div>
    </form>
  );
}
