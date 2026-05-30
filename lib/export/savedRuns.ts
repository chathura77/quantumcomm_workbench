import { formatId } from "@/lib/math";
import type { ModelWarning, SavedWorkbenchRun } from "@/lib/types";

export const SAVED_RUNS_STORAGE_KEY = "quantumcomm.saved-runs.v1";

export type SavedRunDraft = {
  toolId: string;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  formulas?: string[];
  references?: string[];
  version: string;
  createdAt?: string;
};

export type SavedRunComparison = {
  sameTool: boolean;
  inputDifferences: string[];
  resultDifferences: string[];
  assumptionDelta: number;
  warningDelta: number;
};

export function createSavedRunRecord(draft: SavedRunDraft): SavedWorkbenchRun {
  const createdAt = draft.createdAt ?? new Date().toISOString();
  return {
    id: `${formatId(draft.toolId)}-${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    toolId: draft.toolId,
    title: draft.title,
    createdAt,
    input: draft.input,
    result: draft.result,
    assumptions: draft.assumptions,
    warnings: draft.warnings,
    formulas: draft.formulas ?? [],
    references: draft.references ?? [],
    version: draft.version
  };
}

export function sortSavedRuns(runs: SavedWorkbenchRun[]) {
  return [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function serializeSavedRun(record: SavedWorkbenchRun) {
  return JSON.stringify(record, null, 2);
}

export function parseSavedRun(value: string) {
  const parsed = JSON.parse(value) as Partial<SavedWorkbenchRun>;
  return normalizeSavedRun(parsed);
}

export function duplicateSavedRun(record: SavedWorkbenchRun, createdAt?: string): SavedWorkbenchRun {
  const duplicatedAt = createdAt ?? new Date().toISOString();
  return createSavedRunRecord({
    ...record,
    title: `${record.title} (copy)`,
    createdAt: duplicatedAt
  });
}

export function compareSavedRuns(a: SavedWorkbenchRun, b: SavedWorkbenchRun): SavedRunComparison {
  return {
    sameTool: a.toolId === b.toolId,
    inputDifferences: diffRecordKeys(a.input, b.input),
    resultDifferences: diffRecordKeys(a.result, b.result),
    assumptionDelta: a.assumptions.length - b.assumptions.length,
    warningDelta: a.warnings.length - b.warnings.length
  };
}

function diffRecordKeys(a: Record<string, unknown>, b: Record<string, unknown>) {
  return Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .sort();
}

function normalizeSavedRun(parsed: Partial<SavedWorkbenchRun>): SavedWorkbenchRun {
  if (typeof parsed.id !== "string" || typeof parsed.toolId !== "string" || typeof parsed.title !== "string" || typeof parsed.createdAt !== "string" || typeof parsed.version !== "string") {
    throw new Error("Saved run is missing required metadata fields.");
  }

  return {
    id: parsed.id,
    toolId: parsed.toolId,
    title: parsed.title,
    createdAt: parsed.createdAt,
    input: isObjectRecord(parsed.input) ? parsed.input : {},
    result: isObjectRecord(parsed.result) ? parsed.result : {},
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.map(String) : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(normalizeWarning) : [],
    formulas: Array.isArray(parsed.formulas) ? parsed.formulas.map(String) : [],
    references: Array.isArray(parsed.references) ? parsed.references.map(String) : [],
    version: parsed.version
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWarning(value: unknown): ModelWarning {
  if (!isObjectRecord(value) || typeof value.code !== "string" || typeof value.message !== "string" || (value.severity !== "info" && value.severity !== "warning" && value.severity !== "critical")) {
    throw new Error("Saved run warning entry is invalid.");
  }
  return {
    code: value.code,
    message: value.message,
    severity: value.severity
  };
}
