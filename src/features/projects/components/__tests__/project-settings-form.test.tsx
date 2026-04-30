// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ── Mock server actions ──────────────────────────────────────────────

vi.mock("@/features/projects/actions/update-project-settings", () => ({
  updateProjectSettings: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/features/codebase-scan/actions/scan-codebase", () => ({
  scanCodebase: vi.fn().mockResolvedValue({
    success: true,
    filesScanned: 0,
    deterministicFieldCount: 0,
    aiFieldCount: 0,
    warnings: [],
  }),
}));

// ── Import component after mocks ─────────────────────────────────────

import ProjectSettingsForm from "../project-settings-form";

// ── Helpers ──────────────────────────────────────────────────────────

const baseProps = {
  projectId: "test-project-id",
  currentName: "Test Project",
  currentWorkingTitle: "A test project",
  currentTargetOutput: "Kiro" as const,
  currentHasExistingDocs: false,
};

// ── Tests ────────────────────────────────────────────────────────────

describe("ProjectSettingsForm — codebasePath visibility", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Validates: Requirement 1.1
   * WHILE the project type is "extension", THE Project_Settings_Form
   * SHALL display a text input field for the Codebase_Path.
   */
  it('shows codebasePath input when projectType is "extension"', () => {
    render(
      <ProjectSettingsForm
        {...baseProps}
        currentProjectType="extension"
      />,
    );

    const input = screen.getByLabelText(/codebase path/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  /**
   * Validates: Requirement 1.2
   * WHILE the project type is "new", THE Project_Settings_Form
   * SHALL hide the Codebase_Path input field.
   */
  it('hides codebasePath input when projectType is "new"', () => {
    render(
      <ProjectSettingsForm
        {...baseProps}
        currentProjectType="new"
      />,
    );

    const input = screen.queryByLabelText(/codebase path/i);
    expect(input).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirements 1.1, 1.2
   * Changing projectType from "new" to "extension" should reveal the input.
   */
  it('reveals codebasePath input when switching projectType from "new" to "extension"', () => {
    render(
      <ProjectSettingsForm
        {...baseProps}
        currentProjectType="new"
      />,
    );

    // Initially hidden
    expect(screen.queryByLabelText(/codebase path/i)).not.toBeInTheDocument();

    // Click the "extension" radio button
    const extensionRadio = screen.getByLabelText(/extending existing project/i);
    fireEvent.click(extensionRadio);

    // Now visible
    expect(screen.getByLabelText(/codebase path/i)).toBeInTheDocument();
  });
});
