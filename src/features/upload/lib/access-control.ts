/**
 * Determines whether the upload page should be accessible for a given project.
 * Returns true if the upload page should render, false if it should redirect to intake.
 */
export function canAccessUploadPage(
  projectType: string,
  hasExistingDocs: boolean,
): boolean {
  return projectType === "extension" && hasExistingDocs === true;
}
