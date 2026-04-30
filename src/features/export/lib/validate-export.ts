export type DocumentStatus = "ready" | "warning" | "missing" | "empty";

export interface DocumentReadiness {
  filePath: string;
  status: DocumentStatus;
  missingFields: string[];
  required: boolean;
}

export interface ReadinessResult {
  documents: DocumentReadiness[];
  summary: { ready: number; warning: number; missing: number; empty: number };
  canExport: boolean;
  allReady: boolean;
}

export function validateExportReadiness(
  generatedDocs: Array<{
    filePath: string;
    content: string;
    completeness: string;
    missingFields: string;
  }>,
  expectedTemplates: Array<{ filePath: string; required: boolean }>,
): ReadinessResult {
  const documents: DocumentReadiness[] = expectedTemplates.map((template) => {
    const doc = generatedDocs.find((d) => d.filePath === template.filePath);

    if (!doc) {
      return {
        filePath: template.filePath,
        status: "missing" as const,
        missingFields: [],
        required: template.required,
      };
    }

    if (doc.content === "") {
      return {
        filePath: template.filePath,
        status: "empty" as const,
        missingFields: [],
        required: template.required,
      };
    }

    if (doc.completeness === "partial") {
      let parsed: string[] = [];
      try {
        const result = JSON.parse(doc.missingFields);
        if (Array.isArray(result)) {
          parsed = result;
        }
      } catch {
        parsed = [];
      }
      return {
        filePath: template.filePath,
        status: "warning" as const,
        missingFields: parsed,
        required: template.required,
      };
    }

    return {
      filePath: template.filePath,
      status: "ready" as const,
      missingFields: [],
      required: template.required,
    };
  });

  const summary = { ready: 0, warning: 0, missing: 0, empty: 0 };
  for (const doc of documents) {
    summary[doc.status]++;
  }

  const canExport = !documents.some(
    (d) => d.required && (d.status === "missing" || d.status === "empty"),
  );

  const allReady = documents.every((d) => d.status === "ready");

  return { documents, summary, canExport, allReady };
}
