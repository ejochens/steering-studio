import { getAdapter } from "@/lib/ai/adapters";
import type {
  ProviderConfig,
  ChatMessage,
} from "@/lib/ai/adapters/types";
import { isSensitiveFile } from "./security";
import type { ScanFact } from "./types";

export interface AiAnalyzerResult {
  facts: ScanFact[];
  error?: string;
}

/**
 * Valid (sectionKey, fieldKey) pairs the AI is allowed to populate.
 * Any AI response referencing keys outside this set is discarded.
 */
const VALID_FIELD_KEYS: ReadonlySet<string> = new Set([
  "tech-stack-and-architecture::programming-languages",
  "tech-stack-and-architecture::frameworks",
  "tech-stack-and-architecture::database",
  "tech-stack-and-architecture::hosting-deployment",
  "tech-stack-and-architecture::coding-standards",
  "testing-and-quality::testing-framework",
  "project-structure-and-conventions::module-organization",
  "project-structure-and-conventions::folder-structure",
  "workflows-and-team-practices::ci-cd-approach",
  "product-and-users::product-purpose",
]);

const SYSTEM_PROMPT = [
  "You are a senior software engineer analyzing project configuration files.",
  "Your task is to identify technical facts about the project from the provided files.",
  "Identify: programming languages, frameworks, libraries, build tools, test runners, databases, and deployment targets.",
  "",
  "Return your response as a single JSON object with this exact structure:",
  '{',
  '  "[sectionKey]": {',
  '    "[fieldKey]": "value"',
  '  }',
  '}',
  "",
  "Valid sectionKey/fieldKey pairs:",
  '  tech-stack-and-architecture: programming-languages, frameworks, database, hosting-deployment, coding-standards',
  '  testing-and-quality: testing-framework',
  '  project-structure-and-conventions: module-organization, folder-structure',
  '  workflows-and-team-practices: ci-cd-approach',
  '  product-and-users: product-purpose',
  "",
  "Rules:",
  "- Only use the section keys and field keys listed above.",
  "- Values should be concise descriptions or comma-separated lists.",
  "- Only include fields you can confidently identify from the files.",
  "- Return only valid JSON. No markdown fences, no commentary.",
].join("\n");

/**
 * Sends unrecognized project files to the configured AI provider for
 * interpretation and maps the response to ScanFact[].
 *
 * - Filters out sensitive files before sending
 * - Skips entirely when no provider config is provided
 * - Catches errors/timeouts and returns partial result with error message
 */
export async function analyzeUnrecognizedFiles(
  files: Map<string, string>,
  providerConfig: ProviderConfig,
): Promise<AiAnalyzerResult> {
  // Filter out sensitive files
  const safeFiles = new Map<string, string>();
  for (const [filePath, content] of files) {
    const fileName = filePath.split("/").pop() ?? filePath;
    if (!isSensitiveFile(fileName)) {
      safeFiles.set(filePath, content);
    }
  }

  if (safeFiles.size === 0) {
    return { facts: [] };
  }

  // Build the user message with file contents
  const fileParts: string[] = ["Here are the project files to analyze:\n"];
  for (const [filePath, content] of safeFiles) {
    fileParts.push(`--- ${filePath} ---`);
    fileParts.push(content);
    fileParts.push("");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: fileParts.join("\n") },
  ];

  try {
    const adapter = getAdapter(providerConfig.providerType);
    const result = await adapter.sendChat(providerConfig, messages, {
      temperature: 0.2,
      maxTokens: 2048,
    });

    const facts = parseAiResponse(result.content, safeFiles);
    return { facts };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyzeUnrecognizedFiles] AI analysis failed: ${message}`);
    return { facts: [], error: message };
  }
}

/**
 * Parses the AI JSON response into ScanFact[].
 * Strips markdown code fences if present, validates keys against the
 * allowed set, and discards any unrecognized entries.
 */
function parseAiResponse(
  raw: string,
  files: Map<string, string>,
): ScanFact[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed: unknown = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [];
  }

  const sourceFile = [...files.keys()].join(", ");
  const facts: ScanFact[] = [];
  const record = parsed as Record<string, unknown>;

  for (const [sectionKey, fields] of Object.entries(record)) {
    if (typeof fields !== "object" || fields === null || Array.isArray(fields)) {
      continue;
    }

    const fieldRecord = fields as Record<string, unknown>;
    for (const [fieldKey, value] of Object.entries(fieldRecord)) {
      const compositeKey = `${sectionKey}::${fieldKey}`;
      if (!VALID_FIELD_KEYS.has(compositeKey)) {
        continue;
      }

      const strValue = typeof value === "string" ? value.trim() : String(value).trim();
      if (strValue.length === 0) {
        continue;
      }

      facts.push({
        sectionKey,
        fieldKey,
        value: strValue,
        sourceFile,
        source: "ai-codebase-scan",
      });
    }
  }

  return facts;
}
