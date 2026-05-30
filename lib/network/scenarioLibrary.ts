import { formatId } from "@/lib/math";
import { validateScenario } from "@/lib/network/scenario";
import type { ModelWarning, SavedScenarioBundle, SavedScenarioRecord } from "@/lib/types";

export const SAVED_SCENARIOS_STORAGE_KEY = "quantumcomm.saved-scenarios.v1";
export const SAVED_SCENARIO_BUNDLE_VERSION = "quantumcomm.saved-scenarios.bundle.v1";

export function createSavedScenarioRecord({
  title,
  scenario,
  createdAt
}: {
  title: string;
  scenario: unknown;
  createdAt?: string;
}): SavedScenarioRecord {
  const validation = validateScenario(scenario);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const timestamp = createdAt ?? new Date().toISOString();
  return {
    id: `${formatId(validation.scenario.id)}-${timestamp.replace(/[^0-9]/g, "").slice(0, 14)}`,
    title,
    createdAt: timestamp,
    scenario: validation.scenario,
    warnings: validation.warnings
  };
}

export function duplicateSavedScenario(record: SavedScenarioRecord, createdAt?: string): SavedScenarioRecord {
  return createSavedScenarioRecord({
    title: `${record.title} (copy)`,
    scenario: record.scenario,
    createdAt
  });
}

export function sortSavedScenarios(records: SavedScenarioRecord[]) {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function serializeSavedScenarioBundle(records: SavedScenarioRecord[], exportedAt?: string) {
  const bundle: SavedScenarioBundle = {
    version: SAVED_SCENARIO_BUNDLE_VERSION,
    exportedAt: exportedAt ?? new Date().toISOString(),
    scenarios: sortSavedScenarios(records)
  };

  return JSON.stringify(bundle, null, 2);
}

export function parseSavedScenarioBundle(value: string): SavedScenarioBundle {
  const parsed = JSON.parse(value) as Partial<SavedScenarioBundle>;
  if (parsed.version !== SAVED_SCENARIO_BUNDLE_VERSION || typeof parsed.exportedAt !== "string" || !Array.isArray(parsed.scenarios)) {
    throw new Error("Scenario bundle is missing required version, export timestamp, or scenario entries.");
  }

  return {
    version: parsed.version,
    exportedAt: parsed.exportedAt,
    scenarios: sortSavedScenarios(parsed.scenarios.map(normalizeSavedScenarioRecord))
  };
}

function normalizeSavedScenarioRecord(value: unknown): SavedScenarioRecord {
  if (!isObjectRecord(value) || typeof value.id !== "string" || typeof value.title !== "string" || typeof value.createdAt !== "string") {
    throw new Error("Saved scenario entry is missing required metadata fields.");
  }

  const validation = validateScenario(value.scenario);
  if (!validation.ok) {
    throw new Error(`Saved scenario ${value.id} is invalid: ${validation.errors.join(" ")}`);
  }

  const warnings = Array.isArray(value.warnings) ? value.warnings.map(normalizeWarning) : validation.warnings;
  return {
    id: value.id,
    title: value.title,
    createdAt: value.createdAt,
    scenario: validation.scenario,
    warnings
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeWarning(value: unknown): ModelWarning {
  if (!isObjectRecord(value) || typeof value.code !== "string" || typeof value.message !== "string" || (value.severity !== "info" && value.severity !== "warning" && value.severity !== "critical")) {
    throw new Error("Saved scenario warning entry is invalid.");
  }

  return {
    code: value.code,
    message: value.message,
    severity: value.severity
  };
}
