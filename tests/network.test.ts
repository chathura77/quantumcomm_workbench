import { describe, expect, it } from "vitest";
import scenarios from "../fixtures/sample-scenarios.json";
import { buildBenchmarkAdapterBundle, buildSimulatorAdapterExport, serializeBenchmarkAdapterBundle, validateBenchmarkAdapterExport } from "../lib/network/benchmark";
import { rankRoutes } from "../lib/network/routing";
import { createSavedScenarioRecord, duplicateSavedScenario, parseSavedScenarioBundle, serializeSavedScenarioBundle, sortSavedScenarios } from "../lib/network/scenarioLibrary";
import { optimizeRepeaterChain } from "../lib/network/repeater";
import { validateScenario } from "../lib/network/scenario";
import type { QuantumNetworkScenario } from "../lib/types";

const sample = scenarios[1] as QuantumNetworkScenario;

describe("scenario validation", () => {
  it("validates sample scenarios", () => {
    for (const scenario of scenarios) {
      expect(validateScenario(scenario).ok).toBe(true);
    }
  });
});

describe("route ranking", () => {
  it("returns routes for connected source and target", () => {
    const response = rankRoutes({ scenario: sample, sourceNodeId: "a", targetNodeId: "b", objective: "balanced" });
    expect(response.result.routes.length).toBeGreaterThan(0);
    expect(response.result.routes[0].successProbability).toBeGreaterThan(0);
  });

  it("warns when the only path is removed", () => {
    const response = rankRoutes({ scenario: { ...sample, links: [] }, sourceNodeId: "a", targetNodeId: "b", objective: "balanced" });
    expect(response.result.routes.length).toBe(0);
    expect(response.warnings.some((warning) => warning.code === "no-route")).toBe(true);
  });

  it("lower success probability reduces score", () => {
    const high = rankRoutes({ scenario: sample, sourceNodeId: "a", targetNodeId: "b", objective: "rate" }).result.routes[0];
    const weaker: QuantumNetworkScenario = {
      ...sample,
      links: sample.links.map((link) => ({ ...link, successProbability: 0.01 }))
    };
    const low = rankRoutes({ scenario: weaker, sourceNodeId: "a", targetNodeId: "b", objective: "rate" }).result.routes[0];
    expect(low.score).toBeLessThan(high.score);
  });
});

describe("repeater optimizer", () => {
  it("generates candidates and selects a best candidate", () => {
    const response = optimizeRepeaterChain({
      totalDistanceKm: 200,
      attenuationDbPerKm: 0.2,
      memoryLifetimeMs: 100,
      attemptRateHz: 100000,
      targetFidelity: 0.8,
      maxRepeaters: 5
    });
    expect(response.result.candidates).toHaveLength(6);
    expect(response.result.candidates[1].segmentLengthKm).toBeLessThan(response.result.candidates[0].segmentLengthKm);
    expect(response.result.bestCandidate).toBeDefined();
  });
});

describe("saved scenario library", () => {
  it("serializes, parses, duplicates, and sorts saved scenario bundles", () => {
    const first = createSavedScenarioRecord({
      title: "Metro baseline",
      scenario: scenarios[0],
      createdAt: "2026-05-29T13:00:00.000Z"
    });
    const second = createSavedScenarioRecord({
      title: "Trusted backbone",
      scenario: scenarios[1],
      createdAt: "2026-05-29T14:00:00.000Z"
    });
    const bundle = parseSavedScenarioBundle(serializeSavedScenarioBundle([first, second], "2026-05-29T15:00:00.000Z"));
    const copy = duplicateSavedScenario(first, "2026-05-29T16:00:00.000Z");

    expect(bundle.version).toBe("quantumcomm.saved-scenarios.bundle.v1");
    expect(bundle.exportedAt).toBe("2026-05-29T15:00:00.000Z");
    expect(bundle.scenarios.map((record) => record.id)).toEqual([second.id, first.id]);
    expect(copy.title).toBe("Metro baseline (copy)");
    expect(sortSavedScenarios([first, second, copy]).map((record) => record.createdAt)).toEqual([
      "2026-05-29T16:00:00.000Z",
      "2026-05-29T14:00:00.000Z",
      "2026-05-29T13:00:00.000Z"
    ]);
  });
});

describe("benchmark adapter exports", () => {
  it("builds validated simulator adapter files for every supported family", () => {
    const bundle = buildBenchmarkAdapterBundle(sample, "2026-05-30T08:00:00.000Z");

    expect(bundle.map((adapter) => adapter.name)).toEqual([
      "SeQUeNCe",
      "QuISP",
      "NetSquid/SquidASM",
      "QKDNetSim"
    ]);
    for (const adapter of bundle) {
      expect(adapter.status).toBe("mapped-json-ready");
      expect(adapter.validation.ok).toBe(true);
      expect(adapter.filename).toContain(sample.id);
    }
  });

  it("maps scenario topology into simulator-specific structures", () => {
    const sequenceExport = buildSimulatorAdapterExport(sample, "SeQUeNCe", "2026-05-30T08:00:00.000Z");
    const netSquidExport = buildSimulatorAdapterExport(sample, "NetSquid/SquidASM", "2026-05-30T08:00:00.000Z");
    const qkdNetSimExport = buildSimulatorAdapterExport(sample, "QKDNetSim", "2026-05-30T08:00:00.000Z");

    expect(((sequenceExport as { topology: { quantumChannels: Array<{ distanceM: number }> } }).topology.quantumChannels[0]).distanceM).toBe(20_000);
    expect(((netSquidExport as { pythonModel: { nodes: Array<{ memoryLifetimeNs: number }> } }).pythonModel.nodes[1]).memoryLifetimeNs).toBe(100_000_000);
    expect((qkdNetSimExport as { qkdApplicationHints: { entanglementCapableNodes: string[] } }).qkdApplicationHints.entanglementCapableNodes).toContain("r1");
  });

  it("serializes bundle metadata and detects malformed adapter exports", () => {
    const serialized = JSON.parse(serializeBenchmarkAdapterBundle(sample, "2026-05-30T08:00:00.000Z")) as {
      version: string;
      adapters: Array<{ validation: { ok: boolean } }>;
    };
    const invalid = validateBenchmarkAdapterExport({ adapter: "SeQUeNCe" });

    expect(serialized.version).toBe("quantumcomm.simulator-adapters.bundle.v1");
    expect(serialized.adapters.every((adapter) => adapter.validation.ok)).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});
