export interface ScanFact {
  sectionKey: string;
  fieldKey: string;
  value: string;
  sourceFile: string;
  source: "codebase-scan" | "ai-codebase-scan";
}

export interface ScanResult {
  facts: ScanFact[];
  filesScanned: string[];
  deterministicFieldCount: number;
  aiFieldCount: number;
  warnings: string[];
}

export interface ScanSummary {
  success: boolean;
  filesScanned: number;
  deterministicFieldCount: number;
  aiFieldCount: number;
  warnings: string[];
  error?: string;
}

export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  error?: string;
}

export interface DiscoveredFiles {
  known: Map<string, string>;
  unrecognized: Map<string, string>;
  directoryListing: string[];
  srcSubdirs: string[];
}

export interface PersistResult {
  fieldsCreated: number;
  fieldsUpdated: number;
  fieldsSkipped: number;
}

export type ParserFn = (content: string, fileName: string) => ScanFact[];
