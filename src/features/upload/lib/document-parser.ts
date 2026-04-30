/**
 * Document parser module for normalizing uploaded markdown files
 * into a single text payload suitable for AI extraction.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

export interface ParsedDocumentPayload {
  text: string;
  truncated: boolean;
  documentCount: number;
}

const MAX_PAYLOAD_LENGTH = 100_000;
const TRUNCATION_NOTICE =
  "\n\n[Truncated: content exceeded 100,000 character limit]";

/**
 * Strips YAML front matter from the beginning of a markdown document.
 * Front matter is content between `---` delimiters at the very start.
 */
function stripFrontMatter(content: string): string {
  const frontMatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
  return content.replace(frontMatterRegex, "");
}

/**
 * Parses an array of uploaded documents into a single normalized text payload.
 *
 * - Strips YAML front matter from each document
 * - Concatenates with boundary markers including the filename
 * - Preserves markdown headings, lists, and code blocks as-is
 * - Truncates to 100,000 characters with a truncation notice if exceeded
 */
export function parseDocuments(
  documents: { filename: string; content: string }[]
): ParsedDocumentPayload {
  const parts: string[] = [];

  for (const doc of documents) {
    const cleaned = stripFrontMatter(doc.content);
    const boundary = `\n\n--- Document: ${doc.filename} ---\n\n`;
    parts.push(boundary + cleaned);
  }

  let text = parts.join("");

  // Remove leading newlines from the very start of the concatenated payload
  text = text.replace(/^\n+/, "");

  let truncated = false;

  if (text.length > MAX_PAYLOAD_LENGTH) {
    truncated = true;
    // Reserve space for the truncation notice
    const truncateAt = MAX_PAYLOAD_LENGTH - TRUNCATION_NOTICE.length;
    text = text.slice(0, truncateAt) + TRUNCATION_NOTICE;
  }

  return {
    text,
    truncated,
    documentCount: documents.length,
  };
}
