export interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
}

export interface BuildChecklistInput {
  projectType: string;
  hasExistingDocs: boolean;
  isProviderConfigured: boolean;
  uploadedDocumentCount: number;
  extractedFactCount: number;
  answerCount: number;
  generatedDocumentCount: number;
  projectId: string;
}

export function buildChecklistItems(input: BuildChecklistInput): ChecklistItem[] {
  const {
    projectType,
    hasExistingDocs,
    isProviderConfigured,
    uploadedDocumentCount,
    extractedFactCount,
    answerCount,
    generatedDocumentCount,
    projectId,
  } = input;

  const isExtensionWithDocs =
    projectType === "extension" && hasExistingDocs === true;

  // Upload is only truly "done" when files are uploaded AND facts were extracted
  const uploadDone = uploadedDocumentCount > 0 && extractedFactCount > 0;

  return [
    {
      label: "Project created",
      done: true,
    },
    {
      label: "Provider configured",
      done: isProviderConfigured,
      href: "/settings/provider",
      actionLabel: "Configure",
    },
    ...(isExtensionWithDocs
      ? [
          {
            label: uploadedDocumentCount > 0 && extractedFactCount === 0
              ? "Upload Documents (uploaded, extraction pending)"
              : "Upload Documents",
            done: uploadDone,
            href: `/projects/${projectId}/upload`,
            actionLabel: uploadedDocumentCount > 0 ? "Re-upload" : "Upload",
          },
        ]
      : []),
    {
      label: answerCount > 0 ? "Intake completed" : "Intake started",
      done: answerCount > 0,
      href: `/projects/${projectId}/intake`,
      actionLabel: answerCount > 0 ? "Continue intake" : "Start intake",
    },
    {
      label: "Documents generated",
      done: generatedDocumentCount > 0,
      href: `/projects/${projectId}/documents`,
      actionLabel: "View documents",
    },
  ];
}
