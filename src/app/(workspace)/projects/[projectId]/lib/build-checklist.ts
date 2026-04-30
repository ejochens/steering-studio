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
    answerCount,
    generatedDocumentCount,
    projectId,
  } = input;

  const isExtensionWithDocs =
    projectType === "extension" && hasExistingDocs === true;

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
            label: "Upload Documents",
            done: uploadedDocumentCount > 0,
            href: `/projects/${projectId}/upload`,
            actionLabel: "Upload",
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
