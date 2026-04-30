// @vitest-environment jsdom
// Feature: multi-model-provider, Property 12: Connection list displays required fields
// Feature: multi-model-provider, Property 13: Unassigned functions show default label

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { render, screen, cleanup } from "@testing-library/react";
import { createElement } from "react";

// ── Mock server actions ──────────────────────────────────────────────

vi.mock("@/features/provider-settings/actions/save-provider", () => ({
  saveProvider: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/features/provider-settings/actions/delete-provider", () => ({
  deleteProvider: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/features/provider-settings/actions/save-assignment", () => ({
  saveAssignment: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/features/provider-settings/actions/set-default", () => ({
  setDefault: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/features/provider-settings/actions/test-connection", () => ({
  testConnection: vi
    .fn()
    .mockResolvedValue({ success: true, message: "OK", latencyMs: 100 }),
}));

// ── Mock next/navigation ─────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// ── Import component after mocks ─────────────────────────────────────

import ProviderSettingsPage, {
  type SanitizedConnection,
  type SanitizedAssignment,
} from "../provider-settings-page";

// ── Generators ───────────────────────────────────────────────────────

const providerTypes = ["openai", "azure_openai", "bedrock"] as const;
const authModes = ["api_key", "iam", "session"] as const;
const testStatuses = ["success", "failure", "untested"] as const;

const connectionArb = (overrides?: Partial<SanitizedConnection>) =>
  fc
    .record({
      id: fc.uuid(),
      providerType: fc.constantFrom(...providerTypes),
      endpoint: fc.constant("https://api.example.com"),
      region: fc.constantFrom("us-east-1", "eu-west-1", "ap-south-1"),
      modelName: fc.constantFrom("gpt-4o", "o3", "claude-3", "titan-v2"),
      authMode: fc.constantFrom(...authModes),
      hasSecret: fc.boolean(),
      apiVersion: fc.constant(""),
      isDefault: fc.constant(false),
      lastTestStatus: fc.constantFrom(...testStatuses),
      lastTestedAt: fc.option(fc.constant("2025-01-15T10:00:00.000Z"), {
        nil: null,
      }),
    })
    .map((c) => ({ ...c, ...overrides }));

/**
 * Generate a list of connections where exactly one is the default.
 * Uses unique IDs to avoid collisions in the DOM.
 */
const connectionsWithOneDefaultArb = fc
  .integer({ min: 1, max: 5 })
  .chain((count) =>
    fc.tuple(
      fc.array(connectionArb(), { minLength: count, maxLength: count }),
      fc.integer({ min: 0, max: count - 1 }),
    ),
  )
  .map(([conns, defaultIdx]) =>
    conns.map((c, i) => ({
      ...c,
      id: `${c.id}-${i}`,
      isDefault: i === defaultIdx,
    })),
  );

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  openai: "OpenAI",
  azure_openai: "Azure",
  bedrock: "Bedrock",
};

// Helper to render the component without JSX
function renderPage(
  connections: SanitizedConnection[],
  assignments: SanitizedAssignment[],
) {
  return render(
    createElement(ProviderSettingsPage, { connections, assignments }),
  );
}

// ── Property 12: Connection list displays required fields ────────────
// **Validates: Requirements 1.1, 4.4, 5.2**

describe("Property 12: Connection list displays required fields", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("each connection shows provider type, model name, and test status", () => {
    fc.assert(
      fc.property(connectionsWithOneDefaultArb, (connections) => {
        cleanup();
        renderPage(connections, []);

        for (const conn of connections) {
          // Provider type is displayed
          const providerEl = screen.getByTestId(`provider-type-${conn.id}`);
          expect(providerEl.textContent).toBe(
            PROVIDER_TYPE_LABELS[conn.providerType] ?? conn.providerType,
          );

          // Model name is displayed
          const modelEl = screen.getByTestId(`model-name-${conn.id}`);
          expect(modelEl.textContent).toBe(conn.modelName);

          // Test status is displayed
          const statusEl = screen.getByTestId(`test-status-${conn.id}`);
          expect(statusEl).toBeTruthy();
          if (conn.lastTestStatus === "success") {
            expect(statusEl.textContent).toContain("Passed");
          } else if (conn.lastTestStatus === "failure") {
            expect(statusEl.textContent).toContain("Failed");
          } else {
            expect(statusEl.textContent).toContain("Untested");
          }
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it("default badge appears on exactly the default connection", () => {
    fc.assert(
      fc.property(connectionsWithOneDefaultArb, (connections) => {
        cleanup();
        const { container } = renderPage(connections, []);

        const defaultConn = connections.find((c) => c.isDefault);
        const nonDefaultConns = connections.filter((c) => !c.isDefault);

        // The default connection has a badge
        if (defaultConn) {
          const badge = screen.getByTestId(
            `default-badge-${defaultConn.id}`,
          );
          expect(badge.textContent).toBe("Default");
        }

        // Non-default connections do NOT have a badge
        for (const conn of nonDefaultConns) {
          const badge = container.querySelector(
            `[data-testid="default-badge-${conn.id}"]`,
          );
          expect(badge).toBeNull();
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 13: Unassigned functions show default label ─────────────
// **Validates: Requirements 2.2**

describe("Property 13: Unassigned functions show default label", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("AI functions with no assignment have 'Default' selected in dropdown", () => {
    const aiFunctions = ["intake", "generation"] as const;

    fc.assert(
      fc.property(
        connectionsWithOneDefaultArb,
        fc.subarray([...aiFunctions], { minLength: 0 }),
        (connections, assignedFunctions) => {
          cleanup();

          // Build assignments only for the selected subset
          const assignments: SanitizedAssignment[] = assignedFunctions.map(
            (fn, i) => ({
              id: `assign-${i}`,
              aiFunction: fn,
              providerConnectionId: connections[0].id,
            }),
          );

          renderPage(connections, assignments);

          for (const fn of aiFunctions) {
            const select = document.getElementById(
              `assignment-${fn}`,
            ) as HTMLSelectElement;
            expect(select).toBeTruthy();

            const isAssigned = assignedFunctions.includes(fn);
            if (!isAssigned) {
              // Unassigned functions should have "" (the Default option) selected
              expect(select.value).toBe("");
            }

            // Verify the "Default" option always exists in every dropdown
            const defaultOption = Array.from(select.options).find(
              (o) => o.text === "Default",
            );
            expect(defaultOption).toBeTruthy();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
