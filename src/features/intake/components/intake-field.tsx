"use client";

import { useState, useCallback } from "react";
import type { IntakeFieldDef } from "@/features/intake/config/sections";
import { saveAnswer } from "@/features/intake/actions/save-answer";

export interface IntakeFieldProps {
  field: IntakeFieldDef;
  answer?: { value: string; source: string };
  projectId: string;
  sectionKey: string;
  disabled?: boolean;
}

export function IntakeField({
  field,
  answer,
  projectId,
  sectionKey,
  disabled = false,
}: IntakeFieldProps) {
  const [value, setValue] = useState(answer?.value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const source = answer?.source;

  const persist = useCallback(
    async (val: string) => {
      setSaving(true);
      setError(null);
      try {
        const result = await saveAnswer({
          projectId,
          sectionKey,
          fieldKey: field.fieldKey,
          value: val,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to save.");
        }
      } catch {
        setError("Failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [projectId, sectionKey, field.fieldKey],
  );

  const handleBlur = useCallback(() => {
    persist(value);
  }, [persist, value]);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
    },
    [],
  );

  const handleSelectChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      persist(newValue);
    },
    [persist],
  );

  const fieldId = `field-${sectionKey}-${field.fieldKey}`;
  const errorId = `${fieldId}-error`;

  const statusBadge =
    source === "codebase-scan" ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Auto-detected
      </span>
    ) : source === "ai-codebase-scan" ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
        AI-detected
      </span>
    ) : source === "ai-inferred" ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
        AI-inferred
      </span>
    ) : field.status === "required" ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Required
      </span>
    ) : (
      <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        Optional
      </span>
    );

  const inputClasses = `mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300${disabled ? " bg-gray-100 opacity-60 cursor-not-allowed" : ""}`;

  return (
    <div className="mb-4">
      <label htmlFor={fieldId} className="flex items-center text-sm font-medium text-gray-700">
        {field.label}
        {statusBadge}
      </label>
      {field.helpText && (
        <p className="mt-0.5 text-xs text-gray-500">{field.helpText}</p>
      )}

      {field.type === "short-text" && (
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          aria-label={field.label}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          disabled={disabled}
          className={inputClasses}
        />
      )}

      {field.type === "long-text" && (
        <textarea
          id={fieldId}
          rows={3}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          aria-label={field.label}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          disabled={disabled}
          className={inputClasses}
        />
      )}

      {field.type === "single-select" && (
        <select
          id={fieldId}
          value={value}
          onChange={(e) => handleSelectChange(e.target.value)}
          aria-label={field.label}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          disabled={disabled}
          className={inputClasses}
        >
          <option value="">{field.placeholder ?? "Select an option"}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "multi-select" && (
        <MultiSelectField
          fieldId={fieldId}
          options={field.options ?? []}
          value={value}
          onChange={(newVal) => {
            setValue(newVal);
            persist(newVal);
          }}
          error={error}
          errorId={errorId}
          label={field.label}
          disabled={disabled}
        />
      )}

      {field.type === "tag-list" && (
        <TagListField
          fieldId={fieldId}
          value={value}
          onChange={(newVal) => {
            setValue(newVal);
            persist(newVal);
          }}
          placeholder={field.placeholder}
          error={error}
          errorId={errorId}
          label={field.label}
          disabled={disabled}
        />
      )}

      {saving && (
        <p className="mt-1 text-xs text-gray-400">Saving…</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}


// ── Multi-select sub-component ───────────────────────────────────────

function MultiSelectField({
  fieldId,
  options,
  value,
  onChange,
  error,
  errorId,
  label,
  disabled = false,
}: {
  fieldId: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  error: string | null;
  errorId: string;
  label: string;
  disabled?: boolean;
}) {
  let selected: string[] = [];
  try {
    selected = value ? JSON.parse(value) : [];
  } catch {
    selected = [];
  }

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onChange(JSON.stringify(next));
  };

  return (
    <fieldset
      aria-label={label}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={!!error}
      className="mt-1 space-y-1"
    >
      {options.map((opt) => (
        <label key={opt} className={`flex items-center gap-2 text-sm text-gray-700 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {opt}
        </label>
      ))}
    </fieldset>
  );
}

// ── Tag-list sub-component ───────────────────────────────────────────

function TagListField({
  fieldId,
  value,
  onChange,
  placeholder,
  error,
  errorId,
  label,
  disabled = false,
}: {
  fieldId: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error: string | null;
  errorId: string;
  label: string;
  disabled?: boolean;
}) {
  let tags: string[] = [];
  try {
    tags = value ? JSON.parse(value) : [];
  } catch {
    tags = [];
  }

  const [input, setInput] = useState("");

  const addTags = (raw: string) => {
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));
    if (newTags.length > 0) {
      onChange(JSON.stringify([...tags, ...newTags]));
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(JSON.stringify(tags.filter((t) => t !== tag)));
  };

  return (
    <div>
      <div className="mt-1 flex flex-wrap gap-1 mb-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              disabled={disabled}
              className="ml-0.5 text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        id={fieldId}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={() => {
          if (input.trim()) addTags(input);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (input.trim()) addTags(input);
          }
        }}
        placeholder={placeholder ?? "Type and press Enter or comma to add"}
        aria-label={label}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        disabled={disabled}
        className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300${disabled ? " bg-gray-100 opacity-60 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}
