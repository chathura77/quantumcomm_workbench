import { rankRoutes } from "@/lib/network/routing";
import type { QuantumLink, QuantumNetworkScenario, QuantumNode } from "@/lib/types";

export const BENCHMARK_VERSION = "benchmark-hub.simplified.v1";
export const ADAPTER_BUNDLE_VERSION = "quantumcomm.simulator-adapters.bundle.v1";

export type SimulatorAdapterName = "SeQUeNCe" | "QuISP" | "NetSquid/SquidASM" | "QKDNetSim";

export type BenchmarkAdapterValidation = {
  ok: boolean;
  errors: string[];
};

export type BenchmarkAdapterFile = {
  name: SimulatorAdapterName;
  filename: string;
  status: "mapped-json-ready";
  summary: string;
  validation: BenchmarkAdapterValidation;
  assumptions: string[];
  content: Record<string, unknown>;
};

type AdapterContext = {
  scenario: QuantumNetworkScenario;
  exportedAt: string;
};

function roleForNode(node: QuantumNode) {
  switch (node.type) {
    case "endpoint":
      return "end_host";
    case "trusted_node":
      return "trusted_relay";
    case "repeater":
      return "repeater";
    case "satellite":
      return "satellite";
    case "ground_station":
      return "ground_station";
    case "memory_node":
      return "memory_station";
    default:
      return "generic_node";
  }
}

function memoryForNode(node: QuantumNode) {
  return {
    count: node.memoryCount ?? 0,
    lifetimeMs: node.memoryLifetimeMs ?? 0
  };
}

function totalLossDb(link: QuantumLink) {
  return (link.attenuationDbPerKm ?? 0) * link.lengthKm + (link.lossDb ?? 0);
}

function mappedLinks(scenario: QuantumNetworkScenario) {
  return scenario.links.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
    lengthKm: link.lengthKm,
    attenuationDbPerKm: link.attenuationDbPerKm ?? 0,
    fixedLossDb: link.lossDb ?? 0,
    totalLossDb: totalLossDb(link),
    successProbabilityProxy: link.successProbability ?? 0.1,
    fidelityProxy: link.fidelity ?? 0.95,
    classicalLatencyMs: link.classicalLatencyMs ?? 0
  }));
}

function buildSequenceExport({ scenario, exportedAt }: AdapterContext) {
  return {
    adapter: "SeQUeNCe",
    schemaVersion: "quantumcomm.sequence.adapter.v1",
    exportedAt,
    sourceFormat: "quantum-network-scenario.schema.v1",
    sourceScenario: {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description ?? "",
      metadata: scenario.metadata ?? {}
    },
    topology: {
      timelinePs: 1_000,
      nodes: scenario.nodes.map((node) => ({
        name: node.id,
        label: node.label,
        role: roleForNode(node),
        memory: memoryForNode(node),
        coordinates: { x: node.x ?? 0, y: node.y ?? 0 }
      })),
      quantumChannels: mappedLinks(scenario).map((link) => ({
        name: link.id,
        sender: link.source,
        receiver: link.target,
        distanceM: Math.round(link.lengthKm * 1_000),
        attenuationDbPerKm: link.attenuationDbPerKm,
        fixedLossDb: link.fixedLossDb,
        totalLossDb: link.totalLossDb
      })),
      classicalChannels: mappedLinks(scenario).map((link) => ({
        name: `${link.id}-classical`,
        endpointA: link.source,
        endpointB: link.target,
        oneWayDelayMs: link.classicalLatencyMs
      }))
    },
    scenarioAssumptions: [
      "Maps the workbench scenario to SeQUeNCe-style nodes plus separate quantum and classical channels.",
      "Memory counts and lifetimes remain teaching proxies, not calibrated device models.",
      "No protocol script or detector configuration is generated in-browser."
    ]
  } satisfies Record<string, unknown>;
}

function buildQuispExport({ scenario, exportedAt }: AdapterContext) {
  return {
    adapter: "QuISP",
    schemaVersion: "quantumcomm.quisp.adapter.v1",
    exportedAt,
    sourceFormat: "quantum-network-scenario.schema.v1",
    sourceScenario: {
      id: scenario.id,
      name: scenario.name
    },
    omnetpp: {
      networkName: scenario.id.replace(/[^a-zA-Z0-9_]+/g, "_"),
      modules: scenario.nodes.map((node) => ({
        name: node.id,
        displayName: node.label,
        role: roleForNode(node),
        stationaryQubits: Math.max(memoryForNode(node).count, node.type === "repeater" ? 2 : 0),
        memoryLifetimeMs: memoryForNode(node).lifetimeMs
      })),
      channels: mappedLinks(scenario).map((link) => ({
        name: link.id,
        left: link.source,
        right: link.target,
        distanceKm: link.lengthKm,
        attenuationDbPerKm: link.attenuationDbPerKm,
        totalLossDb: link.totalLossDb,
        classicalLatencyMs: link.classicalLatencyMs
      }))
    },
    scenarioAssumptions: [
      "Exports a QuISP-oriented network/module view that can seed NED/INI authoring.",
      "Success probability and fidelity remain sidecar teaching metadata, not direct QuISP runtime knobs.",
      "Error-correction, purification, and traffic scheduling policies are intentionally left to the downstream simulator project."
    ],
    teachingMetadata: mappedLinks(scenario).map((link) => ({
      linkId: link.id,
      successProbabilityProxy: link.successProbabilityProxy,
      fidelityProxy: link.fidelityProxy
    }))
  } satisfies Record<string, unknown>;
}

function buildNetSquidExport({ scenario, exportedAt }: AdapterContext) {
  return {
    adapter: "NetSquid/SquidASM",
    schemaVersion: "quantumcomm.netsquid.adapter.v1",
    exportedAt,
    sourceFormat: "quantum-network-scenario.schema.v1",
    sourceScenario: {
      id: scenario.id,
      name: scenario.name
    },
    pythonModel: {
      runtimeFamily: "netsquid_or_squidasm",
      nodes: scenario.nodes.map((node) => ({
        name: node.id,
        role: roleForNode(node),
        qmemoryPositions: Math.max(memoryForNode(node).count, 0),
        memoryLifetimeNs: Math.round(memoryForNode(node).lifetimeMs * 1_000_000)
      })),
      quantumLinks: mappedLinks(scenario).map((link) => ({
        name: link.id,
        nodeA: link.source,
        nodeB: link.target,
        lengthKm: link.lengthKm,
        totalLossDb: link.totalLossDb,
        delayNs: Math.round(link.classicalLatencyMs * 1_000_000),
        successProbabilityProxy: link.successProbabilityProxy,
        fidelityProxy: link.fidelityProxy
      })),
      experimentHints: {
        preferredProtocolFamily: scenario.metadata?.useCase ?? "generic_quantum_network",
        builtInBalancedRoute: rankRoutes({
          scenario,
          sourceNodeId: scenario.nodes[0]?.id ?? "",
          targetNodeId: scenario.nodes[scenario.nodes.length - 1]?.id ?? "",
          objective: "balanced"
        }).result.routes[0] ?? null
      }
    },
    scenarioAssumptions: [
      "Exports node and link tables that can be consumed by NetSquid or SquidASM Python setup code.",
      "No executable Python is emitted; the file stays a transparent mapping artifact for review and adaptation.",
      "Timing, fidelity, and success values remain simplified instructional proxies."
    ]
  } satisfies Record<string, unknown>;
}

function buildQkdNetSimExport({ scenario, exportedAt }: AdapterContext) {
  return {
    adapter: "QKDNetSim",
    schemaVersion: "quantumcomm.qkdnetsim.adapter.v1",
    exportedAt,
    sourceFormat: "quantum-network-scenario.schema.v1",
    sourceScenario: {
      id: scenario.id,
      name: scenario.name
    },
    ns3Topology: {
      nodes: scenario.nodes.map((node, index) => ({
        name: node.id,
        displayName: node.label,
        role: roleForNode(node),
        ns3NodeIndex: index
      })),
      fiberLinks: mappedLinks(scenario).map((link) => ({
        name: link.id,
        from: link.source,
        to: link.target,
        distanceKm: link.lengthKm,
        attenuationDbPerKm: link.attenuationDbPerKm,
        fixedLossDb: link.fixedLossDb,
        totalLossDb: link.totalLossDb,
        classicalLatencyMs: link.classicalLatencyMs
      }))
    },
    qkdApplicationHints: {
      keyRelayNodes: scenario.nodes.filter((node) => node.type === "trusted_node").map((node) => node.id),
      entanglementCapableNodes: scenario.nodes.filter((node) => node.type === "repeater" || node.type === "memory_node").map((node) => node.id),
      demoOnly: true
    },
    scenarioAssumptions: [
      "Maps the scenario to an NS-3-style topology plus QKD application hints for downstream scripting.",
      "Does not emit deployable protocol code, secret material, or production key management behavior.",
      "Trusted-node annotations remain explicit so relay trust is never hidden."
    ]
  } satisfies Record<string, unknown>;
}

export function validateBenchmarkAdapterExport(adapter: Record<string, unknown>): BenchmarkAdapterValidation {
  const errors: string[] = [];
  const adapterName = typeof adapter.adapter === "string" ? adapter.adapter : "";
  const scenarioSource = adapter.sourceScenario;

  if (!adapterName) {
    errors.push("Missing adapter name.");
  }
  if (typeof adapter.schemaVersion !== "string" || !adapter.schemaVersion.startsWith("quantumcomm.")) {
    errors.push("Missing schemaVersion.");
  }
  if (typeof adapter.exportedAt !== "string") {
    errors.push("Missing exportedAt timestamp.");
  }
  if (!scenarioSource || typeof scenarioSource !== "object") {
    errors.push("Missing sourceScenario block.");
  }

  if (adapterName === "SeQUeNCe") {
    const topology = adapter.topology as { nodes?: unknown[]; quantumChannels?: unknown[]; classicalChannels?: unknown[] } | undefined;
    if (!Array.isArray(topology?.nodes) || topology.nodes.length === 0) errors.push("SeQUeNCe export requires nodes.");
    if (!Array.isArray(topology?.quantumChannels) || topology.quantumChannels.length === 0) errors.push("SeQUeNCe export requires quantumChannels.");
    if (!Array.isArray(topology?.classicalChannels) || topology.classicalChannels.length === 0) errors.push("SeQUeNCe export requires classicalChannels.");
  } else if (adapterName === "QuISP") {
    const omnetpp = adapter.omnetpp as { modules?: unknown[]; channels?: unknown[] } | undefined;
    if (!Array.isArray(omnetpp?.modules) || omnetpp.modules.length === 0) errors.push("QuISP export requires modules.");
    if (!Array.isArray(omnetpp?.channels) || omnetpp.channels.length === 0) errors.push("QuISP export requires channels.");
  } else if (adapterName === "NetSquid/SquidASM") {
    const pythonModel = adapter.pythonModel as { nodes?: unknown[]; quantumLinks?: unknown[] } | undefined;
    if (!Array.isArray(pythonModel?.nodes) || pythonModel.nodes.length === 0) errors.push("NetSquid/SquidASM export requires nodes.");
    if (!Array.isArray(pythonModel?.quantumLinks) || pythonModel.quantumLinks.length === 0) errors.push("NetSquid/SquidASM export requires quantumLinks.");
  } else if (adapterName === "QKDNetSim") {
    const ns3Topology = adapter.ns3Topology as { nodes?: unknown[]; fiberLinks?: unknown[] } | undefined;
    if (!Array.isArray(ns3Topology?.nodes) || ns3Topology.nodes.length === 0) errors.push("QKDNetSim export requires nodes.");
    if (!Array.isArray(ns3Topology?.fiberLinks) || ns3Topology.fiberLinks.length === 0) errors.push("QKDNetSim export requires fiberLinks.");
  } else {
    errors.push(`Unsupported adapter ${adapterName || "<missing>"}.`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function buildSimulatorAdapterExport(
  scenario: QuantumNetworkScenario,
  adapterName: SimulatorAdapterName,
  exportedAt = new Date().toISOString()
) {
  const context = { scenario, exportedAt };
  switch (adapterName) {
    case "SeQUeNCe":
      return buildSequenceExport(context);
    case "QuISP":
      return buildQuispExport(context);
    case "NetSquid/SquidASM":
      return buildNetSquidExport(context);
    case "QKDNetSim":
      return buildQkdNetSimExport(context);
  }
}

export function buildBenchmarkAdapterBundle(
  scenario: QuantumNetworkScenario,
  exportedAt = new Date().toISOString()
): BenchmarkAdapterFile[] {
  const adapters: Array<{ name: SimulatorAdapterName; summary: string; assumptions: string[] }> = [
    {
      name: "SeQUeNCe",
      summary: "Node and channel tables for SeQUeNCe-style topology setup.",
      assumptions: [
        "Quantum and classical channels are split explicitly.",
        "Device physics beyond topology and coarse loss stays outside this export."
      ]
    },
    {
      name: "QuISP",
      summary: "OMNeT++/QuISP-oriented module and channel seed data.",
      assumptions: [
        "Exports topology and memory hints, not executable NED/INI files.",
        "Probability/fidelity values remain sidecar teaching metadata."
      ]
    },
    {
      name: "NetSquid/SquidASM",
      summary: "Python-model seed data for NetSquid or SquidASM scripts.",
      assumptions: [
        "No executable Python is generated.",
        "Built-in route output is included only as experiment guidance."
      ]
    },
    {
      name: "QKDNetSim",
      summary: "NS-3/QKDNetSim topology mapping with application hints.",
      assumptions: [
        "Trusted relays stay explicit in the export.",
        "No real key lifecycle or secret material is emitted."
      ]
    }
  ];

  return adapters.map((adapter) => {
    const content = buildSimulatorAdapterExport(scenario, adapter.name, exportedAt);
    return {
      name: adapter.name,
      filename: `${scenario.id}-${adapter.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
      status: "mapped-json-ready",
      summary: adapter.summary,
      assumptions: adapter.assumptions,
      validation: validateBenchmarkAdapterExport(content),
      content
    };
  });
}

export function serializeBenchmarkAdapterBundle(
  scenario: QuantumNetworkScenario,
  exportedAt = new Date().toISOString()
) {
  return JSON.stringify({
    version: ADAPTER_BUNDLE_VERSION,
    exportedAt,
    scenarioId: scenario.id,
    adapters: buildBenchmarkAdapterBundle(scenario, exportedAt).map((adapter) => ({
      name: adapter.name,
      filename: adapter.filename,
      status: adapter.status,
      validation: adapter.validation,
      content: adapter.content
    }))
  }, null, 2);
}

export function serializeSimulatorAdapter(
  scenario: QuantumNetworkScenario,
  adapterName: SimulatorAdapterName,
  exportedAt = new Date().toISOString()
) {
  return JSON.stringify(buildSimulatorAdapterExport(scenario, adapterName, exportedAt), null, 2);
}

export function runBuiltInBenchmark(scenario: QuantumNetworkScenario) {
  const first = scenario.nodes[0]?.id;
  const last = scenario.nodes[scenario.nodes.length - 1]?.id;
  const routeResult = first && last
    ? rankRoutes({ scenario, sourceNodeId: first, targetNodeId: last, objective: "balanced" }).result.routes[0]
    : undefined;
  const adapters = buildBenchmarkAdapterBundle(scenario);

  return {
    scenarioId: scenario.id,
    nodeCount: scenario.nodes.length,
    linkCount: scenario.links.length,
    builtInEngine: BENCHMARK_VERSION,
    bestRoute: routeResult,
    adapters
  };
}
