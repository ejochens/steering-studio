import { test, expect } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  // Clean the database before each test so we start from a known state
  await request.post("/api/test/reset-db");
});

test("happy path: create project, configure provider, verify dashboard", async ({
  page,
}) => {
  // 1. Navigate to home — expect welcome state (no projects yet)
  await page.goto("/");
  await expect(page.getByText("Welcome to Steering Studio")).toBeVisible();
  await expect(page.getByRole("link", { name: "New Project" })).toBeVisible();

  // 2. Navigate to new project form
  await page.getByRole("link", { name: "New Project" }).click();
  await expect(page).toHaveURL("/projects/new");
  await expect(
    page.getByRole("heading", { name: "Create a new project" })
  ).toBeVisible();

  // 3. Fill in project details
  await page.getByLabel("Project name", { exact: false }).fill("E2E Test Project");
  await page.getByLabel("Working title", { exact: false }).fill("Playwright bootstrap test");
  await page.getByLabel("Kiro").check();

  // 4. Submit the form
  await page.getByRole("button", { name: "Create Project" }).click();

  // 5. Verify redirect to workspace overview
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(
    page.getByRole("heading", { name: "E2E Test Project" })
  ).toBeVisible();

  // 6. Verify setup checklist shows "Project created" as done
  await expect(page.getByText("Project created")).toBeVisible();
  await expect(page.getByText("Done").first()).toBeVisible();

  // 7. Navigate to provider settings via the header Settings link
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL("/settings/provider");

  // 8. Fill in provider settings
  await page.getByLabel("Provider type", { exact: false }).selectOption("openai");
  await page.getByLabel("Endpoint URL").fill("https://api.openai.com");
  await page.getByLabel("Model name", { exact: false }).fill("gpt-4o");
  await page.getByLabel("Authentication mode", { exact: false }).selectOption("api_key");
  await page.getByLabel("API Key").fill("sk-test-key-for-e2e");

  // 9. Save provider settings
  await page.getByRole("button", { name: "Save" }).click();

  // 10. Verify success message
  await expect(page.getByText("Provider settings saved")).toBeVisible();

  // 11. Navigate back to home and verify project card appears
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("E2E Test Project")).toBeVisible();
  await expect(page.getByText("Kiro")).toBeVisible();
});
