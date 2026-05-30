import { describe, expect, it } from "vitest";
import { compareSavedRuns, createSavedRunRecord, duplicateSavedRun, parseSavedRun, serializeSavedRun, sortSavedRuns } from "../lib/export/savedRuns";

describe("saved runs", () => {
  it("creates stable saved run records with formulas and references", () => {
    const run = createSavedRunRecord({
      toolId: "link-budget",
      title: "Metro fiber baseline",
      input: { lengthKm: 25 },
      result: { secretKeyRateHz: 1024 },
      assumptions: ["Simplified asymptotic model."],
      warnings: [{ code: "trusted", message: "Trusted node assumption present.", severity: "warning" }],
      formulas: ["eta = 10^(-loss/10)"],
      references: ["Bennett and Brassard, 1984"],
      version: "test.v1",
      createdAt: "2026-05-29T14:00:00.000Z"
    });

    expect(run.id).toBe("link-budget-20260529140000");
    expect(run.formulas).toEqual(["eta = 10^(-loss/10)"]);
    expect(run.references).toEqual(["Bennett and Brassard, 1984"]);
  });

  it("serializes and parses saved runs without losing caution metadata", () => {
    const original = createSavedRunRecord({
      toolId: "post-processing",
      title: "Lab run",
      input: { qber: 0.02 },
      result: { finalKeyBits: 2048 },
      assumptions: ["Finite-size effects omitted."],
      warnings: [{ code: "non-certified", message: "Educational estimate only.", severity: "info" }],
      version: "test.v1",
      createdAt: "2026-05-29T14:01:00.000Z"
    });

    expect(parseSavedRun(serializeSavedRun(original))).toEqual(original);
  });

  it("duplicates, sorts, and compares runs", () => {
    const first = createSavedRunRecord({
      toolId: "link-budget",
      title: "Run A",
      input: { lengthKm: 10, protocol: "bb84" },
      result: { secretKeyRateHz: 100 },
      assumptions: ["A"],
      warnings: [],
      version: "test.v1",
      createdAt: "2026-05-29T13:00:00.000Z"
    });
    const second = createSavedRunRecord({
      toolId: "link-budget",
      title: "Run B",
      input: { lengthKm: 20, protocol: "bb84" },
      result: { secretKeyRateHz: 50 },
      assumptions: ["A", "B"],
      warnings: [{ code: "high-loss", message: "High loss.", severity: "warning" }],
      version: "test.v1",
      createdAt: "2026-05-29T14:00:00.000Z"
    });
    const copy = duplicateSavedRun(first, "2026-05-29T15:00:00.000Z");

    expect(copy.title).toBe("Run A (copy)");
    expect(sortSavedRuns([first, second, copy]).map((run) => run.createdAt)).toEqual([
      "2026-05-29T15:00:00.000Z",
      "2026-05-29T14:00:00.000Z",
      "2026-05-29T13:00:00.000Z"
    ]);

    expect(compareSavedRuns(first, second)).toEqual({
      sameTool: true,
      inputDifferences: ["lengthKm"],
      resultDifferences: ["secretKeyRateHz"],
      assumptionDelta: -1,
      warningDelta: -1
    });
  });
});
