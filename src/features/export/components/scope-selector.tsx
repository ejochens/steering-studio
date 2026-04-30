"use client";

import type { ExportScope } from "@/lib/validation";

export interface ScopeSelectorProps {
  scope: ExportScope;
  allowedScopes: ExportScope[];
  onChange: (scope: ExportScope) => void;
}

const SCOPE_LABELS: Record<ExportScope, string> = {
  all: "All targets",
  kiro: "Kiro only",
  copilot: "Copilot only",
};

export function ScopeSelector({
  scope,
  allowedScopes,
  onChange,
}: ScopeSelectorProps) {
  const isDisabled = allowedScopes.length === 1;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-900">
        Export scope
      </legend>
      <div className="flex gap-4">
        {allowedScopes.map((s) => {
          const id = `scope-${s}`;
          return (
            <label
              key={s}
              htmlFor={id}
              className={`flex items-center gap-2 text-sm ${
                isDisabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 cursor-pointer"
              }`}
            >
              <input
                type="radio"
                id={id}
                name="export-scope"
                value={s}
                checked={scope === s}
                disabled={isDisabled}
                onChange={() => onChange(s)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              {SCOPE_LABELS[s]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
