"use client";

import { useEffect, useMemo, useState } from "react";
import { createSavedRunRecord, compareSavedRuns, duplicateSavedRun, SAVED_RUNS_STORAGE_KEY, serializeSavedRun, sortSavedRuns } from "@/lib/export/savedRuns";
import { buildShareableStateUrl, decodeShareableState, encodeShareableState } from "@/lib/export/shareableState";
import presetsJson from "@/fixtures/presets.json";
import sampleScenariosJson from "@/fixtures/sample-scenarios.json";
import { Button, CheckboxField, EmptyState, ErrorState, MetricCard, NumberField, SecondaryButton, SelectField, SimpleBandChart, SimpleLineChart, TextAreaField, TextField, ToolShell, WarningPanel } from "@/components/ui";
import { buildRunReport } from "@/lib/export/report";
import { runKmsSimulation } from "@/lib/kms/simulator";
import { runBuiltInBenchmark, serializeBenchmarkAdapterBundle, serializeSimulatorAdapter } from "@/lib/network/benchmark";
import { optimizeRepeaterChain, type RepeaterOptimizeInput } from "@/lib/network/repeater";
import { createSavedScenarioRecord, duplicateSavedScenario, parseSavedScenarioBundle, SAVED_SCENARIOS_STORAGE_KEY, serializeSavedScenarioBundle, sortSavedScenarios } from "@/lib/network/scenarioLibrary";
import { rankRoutes, type RouteObjective } from "@/lib/network/routing";
import { exportScenario, importScenario, validateScenario } from "@/lib/network/scenario";
import { runAttackModel } from "@/lib/qkd/attacks";
import { planChannel, type ChannelPlannerInput } from "@/lib/qkd/channelPlanner";
import { estimateFiniteKeyBb84 } from "@/lib/qkd/finiteKeyBb84";
import { decideHybridArchitecture, type HybridDecisionInput } from "@/lib/qkd/hybrid";
import { computeLinkBudget, sweepLinkBudget } from "@/lib/qkd/linkBudget";
import { extractPaperParameters } from "@/lib/qkd/paperExtractor";
import { calculatePhaseEncoding, type PhaseEncodingInput } from "@/lib/qkd/phaseEncoding";
import { estimatePostProcessing } from "@/lib/qkd/postProcessing";
import { analyzeQber } from "@/lib/qkd/qber";
import { listConformanceExamples, mockApiExamples, serializeMockApiExampleBundle } from "@/lib/standards/mockExamples";
import { checkMockQkdConformance, type ConformanceKind } from "@/lib/standards/conformance";
import type {
  AttackInput,
  AttackType,
  FiniteKeyBb84Input,
  FiniteKeySweepAxis,
  KmsSimulationInput,
  LinkBudgetInput,
  ModelWarning,
  PostProcessingInput,
  QberForensicsInput,
  QuantumLink,
  QuantumNetworkScenario,
  QuantumNode,
  QuantumNodeType,
  SavedScenarioRecord,
  SavedWorkbenchRun
} from "@/lib/types";

const linkPresets = [
  ...((presetsJson.linkBudget as unknown) as Array<{ id: string; name: string; input: LinkBudgetInput }>),
  {
    id: "free-space-demo",
    name: "Free-space demo - 1 km",
    input: {
      protocol: "bb84",
      lengthKm: 1,
      fiberLossDbPerKm: 0,
      connectorLossDb: 18,
      sourceRateHz: 100000000,
      meanPhotonNumber: 0.35,
      detectorEfficiency: 0.35,
      darkCountProbability: 0.000001,
      backgroundCountProbability: 0.00005,
      misalignmentError: 0.02,
      basisSiftingFactor: 0.5,
      senderZBasisProbability: 0.5,
      receiverZBasisProbability: 0.5,
      detectorDeadTimeNs: 0,
      afterpulseProbability: 0,
      reconciliationEfficiency: 1.18,
      blockSize: 1000000
    } satisfies LinkBudgetInput
  }
];

const finiteKeyPresets: Array<{ id: string; name: string; input: FiniteKeyBb84Input }> = [
  {
    id: "metro-finite-key",
    name: "Metro BB84 finite-key lesson",
    input: {
      ...linkPresets[1].input,
      protocol: "bb84",
      blockSize: 10_000_000,
      sampleFraction: 0.1,
      epsilonCorrectness: 1e-12,
      epsilonSecrecy: 1e-10,
      epsilonParameterEstimation: 1e-9
    }
  },
  {
    id: "long-haul-finite-key",
    name: "Long-haul cautionary block",
    input: {
      ...linkPresets[2].input,
      protocol: "decoy_bb84",
      blockSize: 20_000_000,
      sampleFraction: 0.15,
      epsilonCorrectness: 1e-12,
      epsilonSecrecy: 1e-10,
      epsilonParameterEstimation: 1e-8
    }
  }
];

const kmsPresets = (presetsJson.kms as unknown) as Array<{ id: string; name: string; input: KmsSimulationInput }>;
const sampleScenarios = (sampleScenariosJson as unknown) as QuantumNetworkScenario[];
const quantumNodeTypeOptions: Array<{ value: QuantumNodeType; label: string }> = [
  { value: "endpoint", label: "Endpoint" },
  { value: "trusted_node", label: "Trusted node" },
  { value: "repeater", label: "Repeater" },
  { value: "satellite", label: "Satellite" },
  { value: "ground_station", label: "Ground station" },
  { value: "memory_node", label: "Memory node" }
];

function fmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toLocaleString(undefined, { maximumSignificantDigits: digits });
}

function percent(value: number): string {
  return `${fmt(value * 100, 3)}%`;
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fieldList(children: React.ReactNode) {
  return <div className="grid gap-4">{children}</div>;
}

function downloadText(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadSavedRuns(): SavedWorkbenchRun[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(SAVED_RUNS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as SavedWorkbenchRun[];
  return sortSavedRuns(Array.isArray(parsed) ? parsed : []);
}

function persistSavedRuns(runs: SavedWorkbenchRun[]) {
  window.localStorage.setItem(SAVED_RUNS_STORAGE_KEY, JSON.stringify(sortSavedRuns(runs)));
  window.dispatchEvent(new Event("quantumcomm:saved-runs-updated"));
}

function loadSavedScenarios(): SavedScenarioRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(SAVED_SCENARIOS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as SavedScenarioRecord[];
  return sortSavedScenarios(Array.isArray(parsed) ? parsed : []);
}

function persistSavedScenarios(records: SavedScenarioRecord[]) {
  window.localStorage.setItem(SAVED_SCENARIOS_STORAGE_KEY, JSON.stringify(sortSavedScenarios(records)));
  window.dispatchEvent(new Event("quantumcomm:saved-scenarios-updated"));
}

function useSavedRuns() {
  const [runs, setRuns] = useState<SavedWorkbenchRun[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      try {
        setRuns(loadSavedRuns());
        setStorageError(null);
      } catch {
        setStorageError("Saved runs are unavailable because the local history could not be read.");
      }
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("quantumcomm:saved-runs-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("quantumcomm:saved-runs-updated", sync);
    };
  }, []);

  const saveRun = (draft: {
    toolId: string;
    title: string;
    input: Record<string, unknown>;
    result: Record<string, unknown>;
    assumptions: string[];
    warnings: ModelWarning[];
    version: string;
    formulas?: string[];
    references?: string[];
  }) => {
    try {
      const record = createSavedRunRecord(draft);
      const next = sortSavedRuns([record, ...loadSavedRuns()]);
      persistSavedRuns(next);
      setRuns(next);
      setStorageError(null);
      return record;
    } catch {
      setStorageError("Saving failed because the browser storage entry could not be updated.");
      return null;
    }
  };

  const deleteRun = (runId: string) => {
    try {
      const next = loadSavedRuns().filter((run) => run.id !== runId);
      persistSavedRuns(next);
      setRuns(next);
      setStorageError(null);
    } catch {
      setStorageError("Deleting failed because the browser storage entry could not be updated.");
    }
  };

  const duplicateRunToStorage = (runId: string) => {
    try {
      const existing = loadSavedRuns();
      const match = existing.find((run) => run.id === runId);
      if (!match) return null;
      const copied = duplicateSavedRun(match);
      const next = sortSavedRuns([copied, ...existing]);
      persistSavedRuns(next);
      setRuns(next);
      setStorageError(null);
      return copied;
    } catch {
      setStorageError("Duplicate failed because the browser storage entry could not be updated.");
      return null;
    }
  };

  return { runs, storageError, saveRun, deleteRun, duplicateRunToStorage };
}

function useSavedScenarios() {
  const [records, setRecords] = useState<SavedScenarioRecord[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      try {
        setRecords(loadSavedScenarios());
        setStorageError(null);
      } catch {
        setStorageError("Saved scenarios are unavailable because the local scenario library could not be read.");
      }
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("quantumcomm:saved-scenarios-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("quantumcomm:saved-scenarios-updated", sync);
    };
  }, []);

  const saveScenario = (title: string, scenario: QuantumNetworkScenario) => {
    try {
      const record = createSavedScenarioRecord({ title, scenario });
      const next = sortSavedScenarios([record, ...loadSavedScenarios()]);
      persistSavedScenarios(next);
      setRecords(next);
      setStorageError(null);
      return record;
    } catch {
      setStorageError("Saving failed because the scenario library entry could not be updated.");
      return null;
    }
  };

  const deleteScenario = (recordId: string) => {
    try {
      const next = loadSavedScenarios().filter((record) => record.id !== recordId);
      persistSavedScenarios(next);
      setRecords(next);
      setStorageError(null);
    } catch {
      setStorageError("Deleting failed because the scenario library entry could not be updated.");
    }
  };

  const duplicateScenarioToStorage = (recordId: string) => {
    try {
      const existing = loadSavedScenarios();
      const match = existing.find((record) => record.id === recordId);
      if (!match) return null;
      const copied = duplicateSavedScenario(match);
      const next = sortSavedScenarios([copied, ...existing]);
      persistSavedScenarios(next);
      setRecords(next);
      setStorageError(null);
      return copied;
    } catch {
      setStorageError("Duplicate failed because the scenario library entry could not be updated.");
      return null;
    }
  };

  const importScenarioBundleToStorage = (bundleText: string) => {
    try {
      const bundle = parseSavedScenarioBundle(bundleText);
      const deduped = new Map<string, SavedScenarioRecord>();
      for (const record of [...bundle.scenarios, ...loadSavedScenarios()]) {
        deduped.set(record.id, record);
      }
      const next = sortSavedScenarios(Array.from(deduped.values()));
      persistSavedScenarios(next);
      setRecords(next);
      setStorageError(null);
      return { importedCount: bundle.scenarios.length };
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Import failed because the scenario bundle is invalid.");
      return null;
    }
  };

  return { records, storageError, saveScenario, deleteScenario, duplicateScenarioToStorage, importScenarioBundleToStorage };
}

function ExportButtons({
  title,
  toolId,
  input,
  result,
  assumptions,
  warnings,
  version,
  formulas = [],
  references = []
}: {
  title: string;
  toolId: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  version: string;
  formulas?: string[];
  references?: string[];
}) {
  const { saveRun, storageError } = useSavedRuns();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const exportFormat = (format: "json" | "markdown") => {
    const report = buildRunReport({ title, toolId, input, result, assumptions, warnings, version, formulas, format });
    downloadText(report.filename, report.mimeType, report.content);
  };

  const saveLocally = () => {
    const record = saveRun({ title, toolId, input, result, assumptions, warnings, version, formulas, references });
    setSaveMessage(record ? `Saved locally as ${record.id}.` : null);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={() => exportFormat("json")}>Export JSON</SecondaryButton>
        <SecondaryButton onClick={() => exportFormat("markdown")}>Export Markdown</SecondaryButton>
        <SecondaryButton onClick={saveLocally}>Save run locally</SecondaryButton>
      </div>
      {saveMessage ? <p className="text-xs text-emerald-700">{saveMessage}</p> : null}
      {storageError ? <p className="text-xs text-rose-700">{storageError}</p> : null}
    </div>
  );
}

function ResultPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">{children}</div>;
}

function AssumptionList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function parseJsonText(value: string): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true, data: parsed as Record<string, unknown> };
    }
    return { ok: false, error: "Input must be a JSON object with input, result, assumptions, and version fields." };
  } catch {
    return { ok: false, error: "Input is not valid JSON. Fix the syntax to regenerate reports and re-enable structured checks." };
  }
}

function useShareableToolState<T extends Record<string, unknown>>(queryKey: string, defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const encoded = new URLSearchParams(window.location.search).get(queryKey);
    if (!encoded) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = decodeShareableState<Partial<T>>(encoded);
      setState({ ...defaults, ...parsed });
      setShareMessage("Loaded calculator inputs from the shareable URL.");
    } catch {
      setShareMessage("Shareable URL data was invalid, so the default preset stayed active.");
    }

    setHydrated(true);
  }, [defaults, queryKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set(queryKey, encodeShareableState(state));
    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [hydrated, queryKey, state]);

  const copyShareUrl = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const url = buildShareableStateUrl(window.location.pathname, queryKey, state);
    const absoluteUrl = `${window.location.origin}${url}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(absoluteUrl);
      setShareMessage("Shareable URL copied. It includes teaching inputs only, never secret key material.");
    } catch {
      setShareMessage(`Shareable URL ready: ${absoluteUrl}`);
    }
  };

  return { state, setState, shareMessage, setShareMessage, copyShareUrl };
}

function ShareUrlControls({
  onCopy,
  message
}: {
  onCopy: () => void | Promise<void>;
  message: string | null;
}) {
  return (
    <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Shareable URL state</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Keep the current calculator inputs in the URL so this teaching setup can be reopened or shared without exporting files.</p>
        </div>
        <SecondaryButton onClick={() => void onCopy()}>Copy share URL</SecondaryButton>
      </div>
      {message ? <p className="mt-2 text-xs text-cyan-900">{message}</p> : <p className="mt-2 text-xs text-slate-500">Only model inputs are stored in the link. No keys or telemetry are added.</p>}
    </div>
  );
}

export function LinkBudgetTool() {
  const { state: input, setState: setInput, shareMessage, copyShareUrl } = useShareableToolState<LinkBudgetInput>("input", linkPresets[1].input);
  const response = useMemo(() => computeLinkBudget(input), [input]);
  const sweep = useMemo(() => sweepLinkBudget(input, Math.max(40, input.lengthKm * 1.6, 160), 36), [input]);
  const set = (patch: Partial<LinkBudgetInput>) => setInput((current) => ({ ...current, ...patch }));
  const linkBudgetFormulas = [
    "eta_channel = 10^(-loss_dB / 10)",
    "p_after = p_afterpulse * (p_signal,base + p_noise,base)",
    "availability_dead = 1 / (1 + R_source p_click,pre tau_dead)",
    "q_basis,eff = q_basis * (pZ_A pZ_B + (1 - pZ_A)(1 - pZ_B)) / 0.5",
    "QBER = (e_det p_signal + 0.5 p_noise) / p_click",
    "secret fraction = max(0, 1 - f_ec h2(Q) - h2(Q))"
  ];

  if (response.result.decoyLowerBound) {
    linkBudgetFormulas.push(
      "P1 = mu exp(-mu), P_multi = 1 - exp(-mu) (1 + mu)",
      "Y0_proxy = p_noise, Y1_L = eta_total + Y0_proxy (1 - eta_total)",
      "e1_U = (e_det eta_total + 0.5 Y0_proxy + p_after) / Y1_L",
      "Q1_L = P1 Y1_L",
      "R_decoy = q_basis max(0, -Q_mu f_ec h2(E_mu) + Q1_L (1 - h2(e1_U)))"
    );
  }

  return (
    <ToolShell
      title="QKD link-budget calculator"
      description="Estimate channel loss, detection probability, QBER, and a cautious asymptotic secret-key-rate proxy with a distance sweep."
      inputs={fieldList(<>
        <ShareUrlControls onCopy={copyShareUrl} message={shareMessage} />
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = linkPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...linkPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField label="Protocol" value={input.protocol} onChange={(protocol) => set({ protocol })} options={[
          { value: "bb84", label: "BB84" },
          { value: "decoy_bb84", label: "Decoy-state BB84" },
          { value: "e91", label: "E91" },
          { value: "bbm92", label: "BBM92" },
          { value: "mdi_qkd", label: "MDI-QKD proxy" },
          { value: "tf_qkd", label: "Twin-field proxy" },
          { value: "cv_qkd", label: "CV-QKD proxy" }
        ]} />
        <NumberField label="Length" unit="km" value={input.lengthKm} min={0} onChange={(lengthKm) => set({ lengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Connector/component loss" unit="dB" value={input.connectorLossDb} min={0} onChange={(connectorLossDb) => set({ connectorLossDb })} />
        <NumberField label="Source rate" unit="Hz" value={input.sourceRateHz} min={1} onChange={(sourceRateHz) => set({ sourceRateHz })} />
        <NumberField label="Mean photon number" unit="mu" value={input.meanPhotonNumber} min={0} max={10} onChange={(meanPhotonNumber) => set({ meanPhotonNumber })} />
        <NumberField label="Detector efficiency" value={input.detectorEfficiency} min={0} max={1} onChange={(detectorEfficiency) => set({ detectorEfficiency })} />
        <NumberField label="Dark count probability" value={input.darkCountProbability} min={0} max={1} onChange={(darkCountProbability) => set({ darkCountProbability })} />
        <NumberField label="Background count probability" value={input.backgroundCountProbability} min={0} max={1} onChange={(backgroundCountProbability) => set({ backgroundCountProbability })} />
        <NumberField label="Misalignment error" value={input.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Detector dead time" unit="ns" value={input.detectorDeadTimeNs} min={0} onChange={(detectorDeadTimeNs) => set({ detectorDeadTimeNs })} help="Non-paralyzable availability proxy applied after the click estimate." />
        <NumberField label="Afterpulse probability" value={input.afterpulseProbability} min={0} max={0.5} onChange={(afterpulseProbability) => set({ afterpulseProbability })} help="Adds click-correlated noise as a teaching proxy for detector memory effects." />
        <NumberField label="Sender Z-basis probability" value={input.senderZBasisProbability} min={0} max={1} onChange={(senderZBasisProbability) => set({ senderZBasisProbability })} help="Controls basis bias relative to the unbiased 50/50 BB84 baseline." />
        <NumberField label="Receiver Z-basis probability" value={input.receiverZBasisProbability} min={0} max={1} onChange={(receiverZBasisProbability) => set({ receiverZBasisProbability })} help="Mismatch vs the sender changes the effective sifted fraction in this teaching model." />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Total loss" value={fmt(response.result.totalLossDb)} unit="dB" />
          <MetricCard label="QBER" value={percent(response.result.qber)} />
          <MetricCard label="Secret key rate" value={fmt(response.result.secretKeyRateHz)} unit="bits/s" />
          <MetricCard label="Raw click rate" value={fmt(response.result.rawRateHz)} unit="Hz" />
          <MetricCard label="Signal detection" value={percent(response.result.signalDetectionProbability)} />
          <MetricCard label="Secret fraction" value={percent(response.result.secretFraction)} />
          <MetricCard label="Dead-time availability" value={percent(response.result.deadTimeAvailabilityFactor)} note="1.0 means the detector timing proxy is inactive." />
          <MetricCard label="Afterpulse noise" value={percent(response.result.afterpulseNoiseProbability)} note="Click-correlated noise term added before the dead-time availability scaling." />
          <MetricCard label="Effective sifted fraction" value={percent(response.result.effectiveSiftingFactor)} note={`Basis agreement ${percent(response.result.basisAgreementProbability)} relative to the configured baseline.`} />
        </div>
        {response.result.decoyLowerBound ? (
          <ResultPanel>
            <h2 className="text-lg font-semibold text-ink">Decoy-state lower-bound view</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              This teaching panel exposes the single-photon lower-bound proxy that replaces the asymptotic BB84 secret fraction when decoy-state mode is selected.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Single-photon emission" value={percent(response.result.decoyLowerBound.singlePhotonEmissionProbability)} />
              <MetricCard label="Multi-photon emission" value={percent(response.result.decoyLowerBound.multiPhotonEmissionProbability)} />
              <MetricCard label="Single-photon gain lower bound" value={percent(response.result.decoyLowerBound.singlePhotonGainLowerBound)} />
              <MetricCard label="Single-photon error upper bound" value={percent(response.result.decoyLowerBound.singlePhotonErrorUpperBound)} />
              <MetricCard label="Single-photon click share" value={percent(response.result.decoyLowerBound.singlePhotonContributionFraction)} note="Lower-bound contribution relative to total click probability." />
              <MetricCard label="Decoy lower-bound rate" value={fmt(response.result.decoyLowerBound.lowerBoundSecretKeyRateHz)} unit="bits/s" />
            </div>
          </ResultPanel>
        ) : null}
        <SimpleLineChart points={sweep} xKey="distanceKm" yKey="secretKeyRateHz" label="Distance sweep: secret-key-rate proxy" />
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons
            title="QKD link-budget run"
            toolId="link-budget"
            input={input as unknown as Record<string, unknown>}
            result={response.result as unknown as Record<string, unknown>}
            assumptions={response.assumptions}
            warnings={response.warnings}
            version={response.version}
            formulas={linkBudgetFormulas}
          />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={["docs/SIMULATION_SPEC.md", "ETSI ISG QKD publications", "NIST PQC project for complementary cryptography context"]}
    />
  );
}

export function FiniteKeyBb84Tool() {
  const { state: input, setState: setInput, shareMessage, copyShareUrl } = useShareableToolState<FiniteKeyBb84Input>("input", finiteKeyPresets[0].input);
  const [selectedSweep, setSelectedSweep] = useState<FiniteKeySweepAxis>("distanceKm");
  const response = useMemo(() => estimateFiniteKeyBb84(input), [input]);
  const set = (patch: Partial<FiniteKeyBb84Input>) => setInput((current) => ({ ...current, ...patch }));
  const activeSweep = response.result.sensitivitySweeps.find((sweep) => sweep.axis === selectedSweep) ?? response.result.sensitivitySweeps[0];
  const finiteKeyFormulas = [
    "n_raw = floor(N_emit p_click)",
    "p_after = p_afterpulse * (p_signal,base + p_noise,base)",
    "availability_dead = 1 / (1 + R_source p_click,pre tau_dead)",
    "q_basis,eff = q_basis * (pZ_A pZ_B + (1 - pZ_A)(1 - pZ_B)) / 0.5",
    "delta = sqrt(ln(2 / epsilon) / (2 n_sample))",
    "Q_upper = Q_obs + delta_pe + delta_sec",
    "l = n_key - leak_EC - n_key h2(Q_upper) - log2(2 / epsilon_correct) - 2 log2(1 / epsilon_sec)",
    "Sensitivity sweeps vary one control at a time while holding the remaining teaching inputs fixed.",
    "Uncertainty band uses observed-QBER, PE-only, and full finite-key QBER slack variants over the distance sweep."
  ];

  if (response.result.decoyLowerBound) {
    finiteKeyFormulas.splice(
      4,
      0,
      "P1 = mu exp(-mu), P_multi = 1 - exp(-mu) (1 + mu)",
      "Y0_proxy = p_noise, Y1_L = eta_total + Y0_proxy (1 - eta_total), Q1_L = P1 Y1_L",
      "R_decoy = q_basis max(0, -Q_mu f_ec h2(E_mu) + Q1_L (1 - h2(e1_U))) before finite-key penalties"
    );
  }

  return (
    <ToolShell
      title="Finite-key BB84 teaching estimator"
      description="Translate the simplified BB84 link budget into an explicit finite-key teaching bound with configurable epsilon parameters, sampling fraction, and non-certified caution labels."
      inputs={fieldList(<>
        <ShareUrlControls onCopy={copyShareUrl} message={shareMessage} />
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = finiteKeyPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...finiteKeyPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField
          label="Protocol family"
          value={input.protocol}
          onChange={(protocol) => set({ protocol })}
          options={[
            { value: "bb84", label: "BB84" },
            { value: "decoy_bb84", label: "Decoy-state BB84 proxy" }
          ]}
          help="This slice keeps the same pedagogical decoy proxy as the link-budget tool; it does not implement a rigorous decoy optimization."
        />
        <NumberField label="Length" unit="km" value={input.lengthKm} min={0} onChange={(lengthKm) => set({ lengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Connector/component loss" unit="dB" value={input.connectorLossDb} min={0} onChange={(connectorLossDb) => set({ connectorLossDb })} />
        <NumberField label="Source rate" unit="Hz" value={input.sourceRateHz} min={1} onChange={(sourceRateHz) => set({ sourceRateHz })} />
        <NumberField label="Block size" unit="signals" value={input.blockSize} min={1} onChange={(blockSize) => set({ blockSize: Math.max(1, Math.floor(blockSize)) })} help="Teaching proxy for the emitted pulse block used in one finite-key batch." />
        <NumberField label="Sample fraction" value={input.sampleFraction} min={0.001} max={0.5} onChange={(sampleFraction) => set({ sampleFraction })} help="Fraction of sifted bits revealed for parameter estimation." />
        <NumberField label="Mean photon number" unit="mu" value={input.meanPhotonNumber} min={0} max={10} onChange={(meanPhotonNumber) => set({ meanPhotonNumber })} />
        <NumberField label="Detector efficiency" value={input.detectorEfficiency} min={0} max={1} onChange={(detectorEfficiency) => set({ detectorEfficiency })} />
        <NumberField label="Dark count probability" value={input.darkCountProbability} min={0} max={1} onChange={(darkCountProbability) => set({ darkCountProbability })} />
        <NumberField label="Background count probability" value={input.backgroundCountProbability} min={0} max={1} onChange={(backgroundCountProbability) => set({ backgroundCountProbability })} />
        <NumberField label="Misalignment error" value={input.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Detector dead time" unit="ns" value={input.detectorDeadTimeNs} min={0} onChange={(detectorDeadTimeNs) => set({ detectorDeadTimeNs })} help="Non-paralyzable click-availability proxy folded into the shared link-budget kernel." />
        <NumberField label="Afterpulse probability" value={input.afterpulseProbability} min={0} max={0.5} onChange={(afterpulseProbability) => set({ afterpulseProbability })} help="Click-correlated noise proxy that raises QBER and can suppress the finite-key block." />
        <NumberField label="Sender Z-bias" value={input.senderZBasisProbability} min={0} max={1} onChange={(senderZBasisProbability) => set({ senderZBasisProbability })} help="Bias toward the Z basis. 0.5 recovers unbiased BB84." />
        <NumberField label="Receiver Z-bias" value={input.receiverZBasisProbability} min={0} max={1} onChange={(receiverZBasisProbability) => set({ receiverZBasisProbability })} help="Receiver basis bias enters the effective sifted fraction through basis agreement." />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
        <NumberField label="Correctness epsilon" value={input.epsilonCorrectness} min={1e-15} max={0.1} step="any" onChange={(epsilonCorrectness) => set({ epsilonCorrectness })} help="Penalty term ceil(log2(2 / epsilon_correct))." />
        <NumberField label="Secrecy epsilon" value={input.epsilonSecrecy} min={1e-15} max={0.1} step="any" onChange={(epsilonSecrecy) => set({ epsilonSecrecy })} help="Penalty term ceil(2 log2(1 / epsilon_sec))." />
        <NumberField label="Parameter-estimation epsilon" value={input.epsilonParameterEstimation} min={1e-15} max={0.1} step="any" onChange={(epsilonParameterEstimation) => set({ epsilonParameterEstimation })} help="Hoeffding-style slack applied to the observed QBER sample." />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Observed QBER" value={percent(response.result.observedQber)} />
          <MetricCard label="Finite-key QBER upper bound" value={percent(response.result.qberUpperBound)} />
          <MetricCard label="Final key block" value={fmt(response.result.finalKeyBits)} unit="bits" />
          <MetricCard label="Secret fraction per pulse" value={percent(response.result.secretFractionPerPulse)} />
          <MetricCard label="Secret key rate" value={fmt(response.result.secretKeyRateHz)} unit="bits/s" />
          <MetricCard label="Statistical penalty" value={percent(response.result.statisticalPenalty)} note="Combined PE and secrecy slack added to the observed QBER bound." />
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Finite-key accounting</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <MetricCard label="Emitted signals" value={fmt(response.result.emittedSignals)} />
            <MetricCard label="Raw detections" value={fmt(response.result.rawDetections)} />
            <MetricCard label="Sifted bits" value={fmt(response.result.siftedBits)} />
            <MetricCard label="PE sample bits" value={fmt(response.result.parameterEstimationBits)} />
            <MetricCard label="Dead-time availability" value={percent(response.result.deadTimeAvailabilityFactor)} note="Imported from the shared link-budget proxy." />
            <MetricCard label="Afterpulse noise" value={percent(response.result.afterpulseNoiseProbability)} note="Noise contribution that feeds the observed QBER teaching bound." />
            <MetricCard label="Effective sifted fraction" value={percent(response.result.effectiveSiftingFactor)} note="Configured sifting factor adjusted by the sender/receiver basis agreement proxy." />
            <MetricCard label="PE slack" value={percent(response.result.parameterEstimationPenalty)} note="Hoeffding-style penalty from the revealed sample size and epsilon_PE." />
            <MetricCard label="Secrecy slack" value={percent(response.result.secrecyQberPenalty)} note="Additional QBER slack tied to the configured secrecy bookkeeping epsilon." />
            <MetricCard label="Leakage" value={fmt(response.result.reconciliationLeakageBits)} unit="bits" />
            <MetricCard label="Privacy amplification" value={fmt(response.result.privacyAmplificationBits)} unit="bits" />
            <MetricCard label="Correctness penalty" value={fmt(response.result.correctnessPenaltyBits)} unit="bits" />
            <MetricCard label="Secrecy penalty" value={fmt(response.result.secrecyPenaltyBits)} unit="bits" />
          </div>
        </ResultPanel>
        {response.result.decoyLowerBound ? (
          <ResultPanel>
            <h2 className="text-lg font-semibold text-ink">Decoy-state lower-bound snapshot</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              This panel shows the shared single-photon lower-bound proxy before finite-key bookkeeping reduces the final block.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Single-photon emission" value={percent(response.result.decoyLowerBound.singlePhotonEmissionProbability)} />
              <MetricCard label="Multi-photon emission" value={percent(response.result.decoyLowerBound.multiPhotonEmissionProbability)} />
              <MetricCard label="Single-photon gain lower bound" value={percent(response.result.decoyLowerBound.singlePhotonGainLowerBound)} />
              <MetricCard label="Single-photon error upper bound" value={percent(response.result.decoyLowerBound.singlePhotonErrorUpperBound)} />
              <MetricCard label="Single-photon click share" value={percent(response.result.decoyLowerBound.singlePhotonContributionFraction)} />
              <MetricCard label="Pre-finite-key decoy rate" value={fmt(response.result.decoyLowerBound.lowerBoundSecretKeyRateHz)} unit="bits/s" />
            </div>
          </ResultPanel>
        ) : null}
        <ResultPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Sensitivity sweeps</h2>
              <p className="mt-1 text-sm text-slate-600">Explore how the same teaching kernel reacts to distance, added loss, observed QBER, detector efficiency, and block size.</p>
            </div>
            <div className="min-w-[220px]">
              <SelectField
                label="Displayed sweep"
                value={selectedSweep}
                onChange={setSelectedSweep}
                options={response.result.sensitivitySweeps.map((sweep) => ({ value: sweep.axis, label: sweep.label }))}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <SimpleLineChart
              points={activeSweep.points.map((point) => ({
                value: point.value,
                secretKeyRateHz: point.secretKeyRateHz
              }))}
              xKey="value"
              yKey="secretKeyRateHz"
              label={`${activeSweep.label}: secret-key-rate proxy${activeSweep.unit ? ` (${activeSweep.unit})` : ""}`}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="Sweep start" value={fmt(activeSweep.points[0]?.value ?? 0)} unit={activeSweep.unit} />
              <MetricCard label="Sweep end" value={fmt(activeSweep.points[activeSweep.points.length - 1]?.value ?? 0)} unit={activeSweep.unit} />
              <MetricCard
                label="Worst-case final key"
                value={fmt(Math.min(...activeSweep.points.map((point) => point.finalKeyBits)))}
                unit="bits"
                note="Minimum across the selected sweep."
              />
            </div>
          </div>
        </ResultPanel>
        <SimpleBandChart
          points={response.result.distanceUncertaintyBand.map((point) => ({
            distanceKm: point.distanceKm,
            optimisticKeyRateHz: point.optimisticKeyRateHz,
            baselineKeyRateHz: point.baselineKeyRateHz,
            conservativeKeyRateHz: point.conservativeKeyRateHz
          }))}
          xKey="distanceKm"
          lowKey="conservativeKeyRateHz"
          midKey="baselineKeyRateHz"
          highKey="optimisticKeyRateHz"
          label="Distance sweep with statistical uncertainty band"
        />
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons
            title="Finite-key BB84 teaching run"
            toolId="finite-key-bb84"
            input={input as unknown as Record<string, unknown>}
            result={response.result as unknown as Record<string, unknown>}
            assumptions={response.assumptions}
            warnings={response.warnings}
            version={response.version}
            formulas={finiteKeyFormulas}
            references={["Finite-key BB84 teaching proxy", "Hoeffding-style concentration bound"]}
          />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={["Finite-key BB84 teaching literature", "ETSI ISG QKD publications", "Simplified model limitations page: /resources/model-limitations"]}
    />
  );
}

export function QberForensicsTool() {
  const [input, setInput] = useState<QberForensicsInput>({
    measuredQber: 0.035,
    misalignmentError: 0.012,
    visibility: 0.98,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000004,
    detectorMismatch: 0.02,
    eveInterceptFraction: 0,
    signalDetectionProbability: 0.02
  });
  const response = useMemo(() => analyzeQber(input), [input]);
  const set = (patch: Partial<QberForensicsInput>) => setInput((current) => ({ ...current, ...patch }));
  const barPoints = response.result.contributions.map((contribution) => ({
    label: contribution.label,
    value: contribution.qberContribution
  }));

  return (
    <ToolShell
      title="QBER forensics dashboard"
      description="Decompose measured QBER into transparent additive proxies for calibration, visibility, noise, mismatch, and educational intercept-resend disturbance."
      inputs={fieldList(<>
        <NumberField label="Measured QBER" value={input.measuredQber} min={0} max={0.5} onChange={(measuredQber) => set({ measuredQber })} />
        <NumberField label="Misalignment error" value={input.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Visibility" value={input.visibility} min={0} max={1} onChange={(visibility) => set({ visibility })} />
        <NumberField label="Dark count probability" value={input.darkCountProbability} min={0} max={1} onChange={(darkCountProbability) => set({ darkCountProbability })} />
        <NumberField label="Background probability" value={input.backgroundCountProbability} min={0} max={1} onChange={(backgroundCountProbability) => set({ backgroundCountProbability })} />
        <NumberField label="Detector mismatch" value={input.detectorMismatch} min={0} max={1} onChange={(detectorMismatch) => set({ detectorMismatch })} />
        <NumberField label="Eve/intercept fraction" value={input.eveInterceptFraction} min={0} max={1} onChange={(eveInterceptFraction) => set({ eveInterceptFraction })} help="Simulation-only disturbance variable." />
        <NumberField label="Signal detection probability" value={input.signalDetectionProbability} min={0} max={1} onChange={(signalDetectionProbability) => set({ signalDetectionProbability })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Measured QBER" value={percent(response.result.measuredQber)} />
          <MetricCard label="Modeled QBER" value={percent(response.result.modeledQber)} />
          <MetricCard label="Residual" value={percent(response.result.residualQber)} />
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Contribution breakdown</h2>
          <div className="mt-4 grid gap-3">
            {barPoints.map((point) => (
              <div key={point.label}>
                <div className="flex justify-between text-sm text-slate-700"><span>{point.label}</span><span>{percent(point.value)}</span></div>
                <div className="mt-1 h-3 rounded bg-slate-100"><div className="h-3 rounded bg-cyanline" style={{ width: `${Math.min(100, point.value * 400)}%` }} /></div>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold text-ink">Likely causes</h3>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700">
            {response.result.likelyCauses.map((cause) => <li key={cause}>{cause}</li>)}
          </ul>
        </ResultPanel>
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons title="QBER forensics run" toolId="qber-forensics" input={input as unknown as Record<string, unknown>} result={response.result as unknown as Record<string, unknown>} assumptions={response.assumptions} warnings={response.warnings} version={response.version} formulas={["misalignment + visibility + noise + detectorMismatch + interceptResend", "residual = measured QBER - modeled QBER"]} />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function PostProcessingTool() {
  const [input, setInput] = useState<PostProcessingInput>({
    rawDetections: 1000000,
    basisSiftingFactor: 0.5,
    qber: 0.025,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  });
  const response = useMemo(() => estimatePostProcessing(input), [input]);
  const set = (patch: Partial<PostProcessingInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="Post-processing workbench"
      description="Estimate sifting, parameter estimation, reconciliation leakage, authentication, privacy amplification, and final key length."
      inputs={fieldList(<>
        <NumberField label="Raw detections" unit="bits" value={input.rawDetections} min={0} onChange={(rawDetections) => set({ rawDetections: Math.floor(rawDetections) })} />
        <NumberField label="Basis sifting factor" value={input.basisSiftingFactor} min={0} max={1} onChange={(basisSiftingFactor) => set({ basisSiftingFactor })} />
        <NumberField label="QBER" value={input.qber} min={0} max={0.5} onChange={(qber) => set({ qber })} />
        <NumberField label="Sample fraction" value={input.sampleFraction} min={0} max={1} onChange={(sampleFraction) => set({ sampleFraction })} />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
        <NumberField label="Verification bits" value={input.verificationBits} min={0} onChange={(verificationBits) => set({ verificationBits: Math.floor(verificationBits) })} />
        <NumberField label="Authentication bits" value={input.authenticationBits} min={0} onChange={(authenticationBits) => set({ authenticationBits: Math.floor(authenticationBits) })} />
        <NumberField label="Security margin bits" value={input.securityMarginBits} min={0} onChange={(securityMarginBits) => set({ securityMarginBits: Math.floor(securityMarginBits) })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Sifted bits" value={fmt(response.result.siftedBits)} />
          <MetricCard label="Leakage bits" value={fmt(response.result.reconciliationLeakageBits)} />
          <MetricCard label="Final key bits" value={fmt(response.result.finalKeyBits)} />
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Pipeline stages</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="py-2">Stage</th><th>Before</th><th>After</th><th>Note</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {response.result.stages.map((stage) => (
                  <tr key={stage.stage}><td className="py-2 font-medium">{stage.stage}</td><td>{fmt(stage.beforeBits)}</td><td>{fmt(stage.afterBits)}</td><td className="text-slate-600">{stage.note}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResultPanel>
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons title="QKD post-processing run" toolId="post-processing" input={input as unknown as Record<string, unknown>} result={response.result as unknown as Record<string, unknown>} assumptions={response.assumptions} warnings={response.warnings} version={response.version} formulas={["sifted = floor(raw * q_basis)", "leakage = ceil(f_ec * remaining * h2(Q))", "final = max(0, remaining - leakage - phase - verification - authentication - margin)"]} />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function AttackExplorerTool() {
  const [attackType, setAttackType] = useState<AttackType>("intercept_resend");
  const [parameters, setParameters] = useState<AttackInput["parameters"]>({
    eveInterceptFraction: 0.1,
    sampleSize: 10000,
    detectionThreshold: 0.03,
    meanPhotonNumber: 0.4,
    channelLossAdvantageFactor: 0.5,
    decoyStateEnabled: true,
    eta0: 0.2,
    eta1: 0.18,
    timingShiftFraction: 0.2,
    probePhotons: 1000,
    backReflection: 0.000001,
    isolationDb: 60,
    monitoringProbability: 0.9,
    backgroundCountProbability: 0.0001,
    darkCountProbability: 0.000001,
    signalDetectionProbability: 0.02,
    secretKeyRateNoNoise: 1000
  });
  const input = useMemo<AttackInput>(() => ({ attackType, parameters }), [attackType, parameters]);
  const response = useMemo(() => runAttackModel(input), [input]);
  const setNumber = (key: string, value: number) => setParameters((current) => ({ ...current, [key]: value }));

  const commonFields = attackType === "intercept_resend" ? (
    <>
      <NumberField label="Eve/intercept fraction" value={Number(parameters.eveInterceptFraction)} min={0} max={1} onChange={(value) => setNumber("eveInterceptFraction", value)} />
      <NumberField label="Sample size" value={Number(parameters.sampleSize)} min={1} onChange={(value) => setNumber("sampleSize", value)} />
      <NumberField label="Detection threshold" value={Number(parameters.detectionThreshold)} min={0} max={0.5} onChange={(value) => setNumber("detectionThreshold", value)} />
    </>
  ) : attackType === "pns_risk" ? (
    <>
      <NumberField label="Mean photon number" value={Number(parameters.meanPhotonNumber)} min={0} max={5} onChange={(value) => setNumber("meanPhotonNumber", value)} />
      <NumberField label="Channel loss advantage factor" value={Number(parameters.channelLossAdvantageFactor)} min={0} max={2} onChange={(value) => setNumber("channelLossAdvantageFactor", value)} />
      <CheckboxField
        label="Decoy-state enabled"
        checked={Boolean(parameters.decoyStateEnabled)}
        onChange={(decoyStateEnabled) => setParameters((current) => ({ ...current, decoyStateEnabled }))}
        help="Use this only as a teaching toggle for the simplified photon-number-splitting risk proxy."
      />
    </>
  ) : attackType === "detector_mismatch" ? (
    <>
      <NumberField label="Detector eta0" value={Number(parameters.eta0)} min={0} max={1} onChange={(value) => setNumber("eta0", value)} />
      <NumberField label="Detector eta1" value={Number(parameters.eta1)} min={0} max={1} onChange={(value) => setNumber("eta1", value)} />
      <NumberField label="Timing shift fraction" value={Number(parameters.timingShiftFraction)} min={0} max={1} onChange={(value) => setNumber("timingShiftFraction", value)} />
    </>
  ) : attackType === "trojan_horse_risk" ? (
    <>
      <NumberField label="Probe photon proxy" value={Number(parameters.probePhotons)} min={0} onChange={(value) => setNumber("probePhotons", value)} />
      <NumberField label="Back reflection" value={Number(parameters.backReflection)} min={0} max={1} onChange={(value) => setNumber("backReflection", value)} />
      <NumberField label="Isolation" unit="dB" value={Number(parameters.isolationDb)} min={0} onChange={(value) => setNumber("isolationDb", value)} />
      <NumberField label="Monitoring probability" value={Number(parameters.monitoringProbability)} min={0} max={1} onChange={(value) => setNumber("monitoringProbability", value)} />
    </>
  ) : (
    <>
      <NumberField label="Background count probability" value={Number(parameters.backgroundCountProbability)} min={0} max={1} onChange={(value) => setNumber("backgroundCountProbability", value)} />
      <NumberField label="Dark count probability" value={Number(parameters.darkCountProbability)} min={0} max={1} onChange={(value) => setNumber("darkCountProbability", value)} />
      <NumberField label="Signal detection probability" value={Number(parameters.signalDetectionProbability)} min={0} max={1} onChange={(value) => setNumber("signalDetectionProbability", value)} />
      <NumberField label="No-noise key rate" unit="bits/s" value={Number(parameters.secretKeyRateNoNoise)} min={1} onChange={(value) => setNumber("secretKeyRateNoNoise", value)} />
    </>
  );

  return (
    <ToolShell
      title="Attack explorer"
      description="Simulation-only educational modules for QKD disturbance and risk indicators, with assumptions and non-operational countermeasure concepts."
      inputs={fieldList(<>
        <SelectField label="Module" value={attackType} onChange={setAttackType} options={[
          { value: "intercept_resend", label: "Intercept-resend" },
          { value: "pns_risk", label: "Photon-number splitting risk" },
          { value: "detector_mismatch", label: "Detector-efficiency mismatch" },
          { value: "trojan_horse_risk", label: "Trojan-horse leakage risk" },
          { value: "dos_background", label: "Background-light denial of service" }
        ]} />
        {commonFields}
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Risk level" value={response.result.riskLevel} />
          {Object.entries(response.result.metrics).slice(0, 2).map(([key, value]) => (
            <MetricCard key={key} label={key} value={typeof value === "number" ? fmt(value) : String(value)} />
          ))}
        </div>
        <ResultPanel>
          <p className="text-sm leading-6 text-slate-700">{response.result.explanation}</p>
          <h2 className="mt-4 text-sm font-semibold text-ink">Countermeasure concepts</h2>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700">
            {response.result.countermeasureConcepts.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </ResultPanel>
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons title="QKD attack explorer run" toolId="attack-explorer" input={input as unknown as Record<string, unknown>} result={response.result as unknown as Record<string, unknown>} assumptions={response.assumptions} warnings={response.warnings} version={response.version} />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function QkdEngineeringLabTool() {
  const [linkInput, setLinkInput] = useState<LinkBudgetInput>(linkPresets[1].input);
  const [attackType, setAttackType] = useState<AttackType>("dos_background");
  const link = useMemo(() => computeLinkBudget(linkInput), [linkInput]);
  const post = useMemo(() => estimatePostProcessing({
    rawDetections: Math.max(0, Math.floor(link.result.rawRateHz)),
    basisSiftingFactor: link.result.effectiveSiftingFactor,
    qber: link.result.qber,
    sampleFraction: 0.1,
    reconciliationEfficiency: linkInput.reconciliationEfficiency,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  }), [link, linkInput]);
  const attack = useMemo(() => runAttackModel({
    attackType,
    parameters: {
      backgroundCountProbability: linkInput.backgroundCountProbability,
      darkCountProbability: linkInput.darkCountProbability,
      signalDetectionProbability: link.result.signalDetectionProbability,
      secretKeyRateNoNoise: Math.max(1, link.result.secretKeyRateHz),
      eveInterceptFraction: 0.1,
      meanPhotonNumber: linkInput.meanPhotonNumber,
      channelLossAdvantageFactor: 0.5,
      decoyStateEnabled: linkInput.protocol === "decoy_bb84"
    }
  }), [attackType, linkInput, link]);
  const warnings = [...link.warnings, ...post.warnings, ...attack.warnings];
  const set = (patch: Partial<LinkBudgetInput>) => setLinkInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="QKD engineering lab"
      description="A complete first-pass workflow combining link budget, QBER estimate, post-processing accounting, and a selected simulation-only risk module."
      inputs={fieldList(<>
        <SelectField label="Preset" value="custom" onChange={(id) => {
          const preset = linkPresets.find((item) => item.id === id);
          if (preset) setLinkInput(preset.input);
        }} options={[{ value: "custom", label: "Custom/current" }, ...linkPresets.map((preset) => ({ value: preset.id, label: preset.name }))]} />
        <NumberField label="Length" unit="km" value={linkInput.lengthKm} min={0} onChange={(lengthKm) => set({ lengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={linkInput.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Mean photon number" value={linkInput.meanPhotonNumber} min={0} max={10} onChange={(meanPhotonNumber) => set({ meanPhotonNumber })} />
        <NumberField label="Detector efficiency" value={linkInput.detectorEfficiency} min={0} max={1} onChange={(detectorEfficiency) => set({ detectorEfficiency })} />
        <NumberField label="Misalignment error" value={linkInput.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Detector dead time" unit="ns" value={linkInput.detectorDeadTimeNs} min={0} onChange={(detectorDeadTimeNs) => set({ detectorDeadTimeNs })} />
        <NumberField label="Afterpulse probability" value={linkInput.afterpulseProbability} min={0} max={0.5} onChange={(afterpulseProbability) => set({ afterpulseProbability })} />
        <NumberField label="Sender Z-bias" value={linkInput.senderZBasisProbability} min={0} max={1} onChange={(senderZBasisProbability) => set({ senderZBasisProbability })} />
        <NumberField label="Receiver Z-bias" value={linkInput.receiverZBasisProbability} min={0} max={1} onChange={(receiverZBasisProbability) => set({ receiverZBasisProbability })} />
        <SelectField label="Risk module" value={attackType} onChange={setAttackType} options={[
          { value: "dos_background", label: "Background-light DoS" },
          { value: "intercept_resend", label: "Intercept-resend" },
          { value: "pns_risk", label: "PNS risk" },
          { value: "detector_mismatch", label: "Detector mismatch" },
          { value: "trojan_horse_risk", label: "Trojan-horse risk" }
        ]} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Raw detections/s" value={fmt(link.result.rawRateHz)} />
          <MetricCard label="QBER" value={percent(link.result.qber)} />
          <MetricCard label="Secret key rate" value={fmt(link.result.secretKeyRateHz)} unit="bits/s" />
          <MetricCard label="Dead-time availability" value={percent(link.result.deadTimeAvailabilityFactor)} />
          <MetricCard label="Reconciliation leakage" value={fmt(post.result.reconciliationLeakageBits)} unit="bits" />
          <MetricCard label="Final key block" value={fmt(post.result.finalKeyBits)} unit="bits" />
          <MetricCard label="Risk module" value={attack.result.riskLevel} />
        </div>
        <WarningPanel warnings={warnings} />
        <ResultPanel>
          <ExportButtons title="QKD engineering lab run" toolId="qkd-engineering-lab" input={linkInput as unknown as Record<string, unknown>} result={{ link: link.result, postProcessing: post.result, attack: attack.result }} assumptions={[...link.assumptions, ...post.assumptions, ...attack.assumptions]} warnings={warnings} version="qkd-engineering-lab.mvp.v1" />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={[...link.assumptions, ...post.assumptions, ...attack.assumptions]} />}
    />
  );
}

export function EtsiApiSandboxTool() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [applicationId, setApplicationId] = useState("demo-app");
  const [keyLengthBits, setKeyLengthBits] = useState(256);
  const [numberOfKeys, setNumberOfKeys] = useState(2);
  const [priority, setPriority] = useState(1);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [selectedExampleId, setSelectedExampleId] = useState(mockApiExamples[0]?.id ?? "");
  const selectedExample = mockApiExamples.find((example) => example.id === selectedExampleId) ?? mockApiExamples[0];

  const refreshStatus = async () => {
    const res = await fetch("/api/qkd-mock/status");
    setStatus(await res.json());
  };
  useEffect(() => { void refreshStatus(); }, []);

  const requestKeys = async () => {
    const res = await fetch("/api/qkd-mock/keys/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, keyLengthBits, numberOfKeys, priority })
    });
    const body = await res.json();
    setResponse(body);
    await refreshStatus();
  };

  const loadExample = () => {
    if (!selectedExample) return;
    setResponse(selectedExample.responseBody);
  };

  return (
    <ToolShell
      title="ETSI-style QKD mock API sandbox"
      description="Exercise demo-only key-pool status, key request, retrieval shape, and exhaustion behavior inspired by key-delivery API workflows."
      inputs={fieldList(<>
        <TextField label="Application ID" value={applicationId} onChange={setApplicationId} />
        <NumberField label="Key length" unit="bits" value={keyLengthBits} min={1} onChange={(value) => setKeyLengthBits(Math.floor(value))} />
        <NumberField label="Number of keys" value={numberOfKeys} min={1} onChange={(value) => setNumberOfKeys(Math.floor(value))} />
        <NumberField label="Priority" value={priority} min={0} max={10} onChange={(value) => setPriority(Math.floor(value))} />
        <div className="flex flex-wrap gap-2"><Button onClick={requestKeys}>Request keys</Button><SecondaryButton onClick={refreshStatus}>Refresh status</SecondaryButton></div>
        <SelectField label="Mock example payload" value={selectedExampleId} onChange={setSelectedExampleId} options={mockApiExamples.map((example) => ({ value: example.id, label: example.title }))} />
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={loadExample}>Load example response</SecondaryButton>
          <SecondaryButton onClick={() => downloadText("etsi-qkd-mock-examples.json", "application/json", serializeMockApiExampleBundle())}>Download example bundle</SecondaryButton>
        </div>
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Available pool" value={fmt(Number(status?.availableBits ?? 0))} unit="bits" />
          <MetricCard label="Capacity" value={fmt(Number(status?.capacityBits ?? 0))} unit="bits" />
          <MetricCard label="Status" value={String(status?.status ?? "loading")} />
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Latest response</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(response ?? status, null, 2)}</pre>
        </ResultPanel>
        <ResultPanel>
          <h2 className="text-sm font-semibold text-ink">Mock API examples</h2>
          <p className="mt-2 text-sm text-slate-700">{selectedExample.description}</p>
          <pre className="mt-3 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-800">{selectedExample.method} {selectedExample.endpoint}{"\n"}status {selectedExample.status}{selectedExample.requestBody ? `\nrequest ${JSON.stringify(selectedExample.requestBody, null, 2)}` : ""}</pre>
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={["The mock store is in memory and resets with the development server.", "Key material is a demo-only string, never production cryptographic material.", "Requests fail with InsufficientKeyMaterial when requested bits exceed the pool.", "Downloaded examples are static teaching payloads for conformance drills, not a claim of certified ETSI interoperability."]} />}
    />
  );
}

export function KmsSimulatorTool() {
  const [input, setInput] = useState<KmsSimulationInput>(kmsPresets[0].input);
  const response = useMemo(() => runKmsSimulation(input), [input]);
  const set = (patch: Partial<KmsSimulationInput>) => setInput((current) => ({ ...current, ...patch }));
  const setServiceRate = (index: number, requestRatePerSecond: number) => setInput((current) => ({
    ...current,
    services: current.services.map((service, i) => i === index ? { ...service, requestRatePerSecond } : service)
  }));

  return (
    <ToolShell
      title="KMS simulator"
      description="Model key generation, service consumption, priority ordering, buffer capacity, and exhaustion risk over time."
      inputs={fieldList(<>
        <NumberField label="Duration" unit="s" value={input.durationSeconds} min={1} onChange={(durationSeconds) => set({ durationSeconds })} />
        <NumberField label="Time step" unit="s" value={input.timeStepSeconds} min={0.001} onChange={(timeStepSeconds) => set({ timeStepSeconds })} />
        <NumberField label="Initial buffer" unit="bits" value={input.initialBufferBits} min={0} onChange={(initialBufferBits) => set({ initialBufferBits })} />
        <NumberField label="Buffer capacity" unit="bits" value={input.bufferCapacityBits} min={1} onChange={(bufferCapacityBits) => set({ bufferCapacityBits })} />
        <NumberField label="Generation rate" unit="bits/s" value={input.generationRateBitsPerSecond} min={0} onChange={(generationRateBitsPerSecond) => set({ generationRateBitsPerSecond })} />
        {input.services.map((service, index) => (
          <NumberField key={service.id} label={`${service.name} request rate`} unit="req/s" value={service.requestRatePerSecond} min={0} onChange={(value) => setServiceRate(index, value)} />
        ))}
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Final buffer" value={fmt(response.result.finalBufferBits)} unit="bits" />
          <MetricCard label="Generated" value={fmt(response.result.totalGeneratedBits)} unit="bits" />
          <MetricCard label="Consumed" value={fmt(response.result.totalConsumedBits)} unit="bits" />
          <MetricCard label="Denied requests" value={fmt(response.result.totalDeniedRequests)} />
        </div>
        <SimpleLineChart points={response.result.timeline.map((point) => ({ t: point.t, bufferBits: point.bufferBits }))} xKey="t" yKey="bufferBits" label="Buffer over time" />
        <WarningPanel warnings={response.warnings} />
        <ResultPanel>
          <ExportButtons title="KMS simulation run" toolId="kms-simulator" input={input as unknown as Record<string, unknown>} result={response.result as unknown as Record<string, unknown>} assumptions={response.assumptions} warnings={response.warnings} version={response.version} />
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function HybridDecisionTool() {
  const [input, setInput] = useState<HybridDecisionInput>({
    useCase: "Metro data-center interconnect",
    distanceKm: 25,
    topology: "metro",
    trustModel: "trusted-nodes-ok",
    keyRateNeed: "medium",
    availabilityNeed: "high",
    budgetMaturity: "moderate",
    complianceDriver: true
  });
  const result = useMemo(() => decideHybridArchitecture(input), [input]);
  const set = (patch: Partial<HybridDecisionInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="Hybrid PQC + QKD decision tool"
      description="A neutral scorecard for PQC-only, QKD-only, and hybrid architectures based on topology, trust, rate, availability, maturity, and compliance constraints."
      inputs={fieldList(<>
        <TextField label="Use case" value={input.useCase} onChange={(useCase) => set({ useCase })} />
        <NumberField label="Distance" unit="km" value={input.distanceKm} min={0} onChange={(distanceKm) => set({ distanceKm })} />
        <SelectField label="Topology" value={input.topology} onChange={(topology) => set({ topology })} options={[{ value: "local", label: "Local" }, { value: "metro", label: "Metro" }, { value: "long-haul", label: "Long-haul" }, { value: "satellite", label: "Satellite" }]} />
        <SelectField label="Trust model" value={input.trustModel} onChange={(trustModel) => set({ trustModel })} options={[{ value: "trusted-nodes-ok", label: "Trusted nodes acceptable" }, { value: "avoid-trusted-nodes", label: "Avoid trusted nodes" }, { value: "software-only", label: "Software only" }]} />
        <SelectField label="Key-rate need" value={input.keyRateNeed} onChange={(keyRateNeed) => set({ keyRateNeed })} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
        <SelectField label="Availability" value={input.availabilityNeed} onChange={(availabilityNeed) => set({ availabilityNeed })} options={[{ value: "standard", label: "Standard" }, { value: "high", label: "High" }, { value: "mission-critical", label: "Mission-critical" }]} />
        <SelectField label="Operational maturity" value={input.budgetMaturity} onChange={(budgetMaturity) => set({ budgetMaturity })} options={[{ value: "early", label: "Early" }, { value: "moderate", label: "Moderate" }, { value: "mature", label: "Mature" }]} />
        <CheckboxField
          label="Compliance driver present"
          checked={input.complianceDriver}
          onChange={(complianceDriver) => set({ complianceDriver })}
          help="Flags environments where standards alignment or audit posture materially changes the architecture tradeoff."
        />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          {result.scorecard.map((item) => <MetricCard key={item.architecture} label={item.architecture} value={item.score} unit="/100" />)}
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Recommendation: {result.recommendation}</h2>
          <div className="mt-4 grid gap-4">
            {result.scorecard.map((item) => (
              <div key={item.architecture}>
                <h3 className="text-sm font-semibold text-ink">{item.architecture}</h3>
                <ul className="mt-1 grid gap-1 text-sm text-slate-700">{item.rationale.map((line) => <li key={line}>{line}</li>)}</ul>
              </div>
            ))}
          </div>
          {result.redFlags.length ? <ul className="mt-4 grid gap-1 text-sm text-amber-900">{result.redFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={["Scores are decision-support heuristics, not procurement guidance.", "QKD and PQC are treated as complementary options with different deployment assumptions."]} />}
    />
  );
}

export function PhaseEncodingTool() {
  const [input, setInput] = useState<PhaseEncodingInput>({
    timeBinSeparationPs: 500,
    wavelengthNm: 1550,
    linewidthHz: 1000000,
    effectiveIndex: 1.4682,
    physicalLengthMeters: 10,
    lengthChangeNm: 10,
    deltaTemperatureC: 1,
    thermoOpticCoefficient: 8.6e-6
  });
  const response = useMemo(() => calculatePhaseEncoding(input), [input]);
  const set = (patch: Partial<PhaseEncodingInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="Phase-encoding calculator"
      description="Calculate time-bin path differences, phase shift from length changes, coherence compatibility, and thermal drift proxies."
      inputs={fieldList(<>
        <NumberField label="Time-bin separation" unit="ps" value={input.timeBinSeparationPs} min={0} onChange={(timeBinSeparationPs) => set({ timeBinSeparationPs })} />
        <NumberField label="Wavelength" unit="nm" value={input.wavelengthNm} min={1} onChange={(wavelengthNm) => set({ wavelengthNm })} />
        <NumberField label="Laser linewidth" unit="Hz" value={input.linewidthHz} min={1} onChange={(linewidthHz) => set({ linewidthHz })} />
        <NumberField label="Effective index" value={input.effectiveIndex} min={1} onChange={(effectiveIndex) => set({ effectiveIndex })} />
        <NumberField label="Physical length" unit="m" value={input.physicalLengthMeters} min={0} onChange={(physicalLengthMeters) => set({ physicalLengthMeters })} />
        <NumberField label="Length change" unit="nm" value={input.lengthChangeNm} onChange={(lengthChangeNm) => set({ lengthChangeNm })} />
        <NumberField label="Temperature change" unit="C" value={input.deltaTemperatureC} onChange={(deltaTemperatureC) => set({ deltaTemperatureC })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Path difference" value={fmt(response.result.deltaLengthMeters)} unit="m" />
          <MetricCard label="Phase shift" value={fmt(response.result.phaseShiftRadians)} unit="rad" />
          <MetricCard label="Coherence length" value={fmt(response.result.coherenceLengthMeters)} unit="m" />
          <MetricCard label="Round-trip delay" value={fmt(response.result.roundTripDelaySeconds * 1e9)} unit="ns" />
          <MetricCard label="Thermal phase drift" value={fmt(response.result.thermalPhaseDriftRadians)} unit="rad" />
          <MetricCard label="Coherence compatible" value={response.result.coherenceCompatible ? "yes" : "no"} />
        </div>
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function ChannelPlannerTool() {
  const [input, setInput] = useState<ChannelPlannerInput>({
    linkType: "fiber",
    lengthKm: 25,
    fiberLossDbPerKm: 0.2,
    connectorLossDb: 3,
    spliceLossDb: 1,
    componentLossDb: 2,
    geometricLossDb: 18,
    pointingLossDb: 2,
    atmosphericLossDb: 3,
    receiverOpticalLossDb: 2,
    filterLossDb: 1,
    averageSatelliteLossDb: 35,
    dutyCycle: 0.1,
    sourceRateHz: 1000000000,
    meanPhotonNumber: 0.4,
    detectorEfficiency: 0.25,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    misalignmentError: 0.015
  });
  const response = useMemo(() => planChannel(input), [input]);
  const set = (patch: Partial<ChannelPlannerInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="Channel planner"
      description="Plan fiber, free-space, and satellite-style channels by adding dB losses and passing the result into the simplified QKD key-rate model."
      inputs={fieldList(<>
        <SelectField label="Link type" value={input.linkType} onChange={(linkType) => set({ linkType })} options={[{ value: "fiber", label: "Fiber" }, { value: "free_space", label: "Free-space demo" }, { value: "satellite", label: "Satellite-style pass" }]} />
        <NumberField label="Length" unit="km" value={input.lengthKm} min={0} onChange={(lengthKm) => set({ lengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Connector loss" unit="dB" value={input.connectorLossDb} min={0} onChange={(connectorLossDb) => set({ connectorLossDb })} />
        <NumberField label="Geometric loss" unit="dB" value={input.geometricLossDb} min={0} onChange={(geometricLossDb) => set({ geometricLossDb })} />
        <NumberField label="Pointing loss" unit="dB" value={input.pointingLossDb} min={0} onChange={(pointingLossDb) => set({ pointingLossDb })} />
        <NumberField label="Atmospheric loss" unit="dB" value={input.atmosphericLossDb} min={0} onChange={(atmosphericLossDb) => set({ atmosphericLossDb })} />
        <NumberField label="Average satellite loss" unit="dB" value={input.averageSatelliteLossDb} min={0} onChange={(averageSatelliteLossDb) => set({ averageSatelliteLossDb })} />
        <NumberField label="Duty cycle" value={input.dutyCycle} min={0} max={1} onChange={(dutyCycle) => set({ dutyCycle })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Total loss" value={fmt(response.result.totalLossDb)} unit="dB" />
          <MetricCard label="Detection probability" value={percent(response.result.detectionProbability)} />
          <MetricCard label="Key-rate estimate" value={fmt(response.result.keyRateEstimateHz)} unit="bits/s" />
          <MetricCard label="QBER" value={percent(response.result.qber)} />
          <MetricCard label="Availability" value={percent(response.result.availabilityFactor)} />
          <MetricCard label="Transmittance" value={fmt(response.result.channelTransmittance)} />
        </div>
        <ResultPanel><ul className="grid gap-1 text-sm text-slate-700">{response.result.linkNotes.map((note) => <li key={note}>{note}</li>)}</ul></ResultPanel>
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function PaperExtractorTool() {
  const [text, setText] = useState("We demonstrate decoy-state BB84 over 100 km with 20 dB loss, QBER of 1.8%, secret key rate of 1.2 kbps at 1550 nm, detector efficiency of 20%, dark count rate 100 cps, and repetition rate of 1 GHz.");
  const results = useMemo(() => extractPaperParameters(text), [text]);

  return (
    <ToolShell
      title="Paper-to-parameter extractor"
      description="Extract common quantum communication quantities from abstracts, captions, and table text using transparent regex rules and confidence flags."
      inputs={
        <TextAreaField
          label="Paper text"
          value={text}
          onChange={setText}
          rows={14}
          help="Paste an abstract, caption, or methods excerpt. The extractor matches explicit units and common QKD phrasing only."
        />
      }
      results={<ResultPanel>
        <h2 className="text-lg font-semibold text-ink">Extracted parameters</h2>
        <div className="mt-4 grid gap-3">
          {results.map((item) => <MetricCard key={item.id} label={`${item.label} (${item.confidence})`} value={item.value} unit={item.unit} note={item.span} />)}
          {results.length === 0 ? (
            <EmptyState
              title="No supported quantities found"
              message="Try adding explicit units such as km, dB, Hz, kcps, or percentage values so the rule-based extractor can match them."
            />
          ) : null}
        </div>
      </ResultPanel>}
      formulas={<AssumptionList items={["Rule-based extraction favors explicit units and common paper phrasing.", "Confidence flags reflect pattern specificity, not scientific validation."]} />}
    />
  );
}

export function ReportGeneratorTool() {
  const sample = JSON.stringify({
    toolId: "link-budget",
    title: "Sample link-budget report",
    input: linkPresets[0].input,
    result: computeLinkBudget(linkPresets[0].input).result,
    assumptions: computeLinkBudget(linkPresets[0].input).assumptions,
    warnings: computeLinkBudget(linkPresets[0].input).warnings,
    version: computeLinkBudget(linkPresets[0].input).version
  }, null, 2);
  const [text, setText] = useState(sample);
  const [format, setFormat] = useState<"json" | "markdown">("markdown");
  const [selectedRunId, setSelectedRunId] = useState("sample");
  const [compareRunId, setCompareRunId] = useState("none");
  const { runs, storageError, deleteRun, duplicateRunToStorage } = useSavedRuns();
  const parsed = useMemo(() => parseJsonText(text), [text]);
  const parseError = parsed.ok ? undefined : parsed.error;
  const selectedRun = runs.find((run) => run.id === selectedRunId);
  const compareRun = runs.find((run) => run.id === compareRunId);
  const output = useMemo(() => {
    if (!parsed.ok) {
      return null;
    }
    return buildRunReport({
      toolId: String(parsed.data.toolId ?? "manual-run"),
      title: String(parsed.data.title ?? "Manual run report"),
      input: (parsed.data.input ?? {}) as Record<string, unknown>,
      result: (parsed.data.result ?? {}) as Record<string, unknown>,
      assumptions: Array.isArray(parsed.data.assumptions) ? parsed.data.assumptions.map(String) : [],
      warnings: Array.isArray(parsed.data.warnings) ? parsed.data.warnings as ModelWarning[] : [],
      version: typeof parsed.data.version === "string" ? parsed.data.version : undefined,
      format
    });
  }, [format, parsed]);
  const comparison = useMemo(() => {
    if (!selectedRun || !compareRun) {
      return null;
    }
    return compareSavedRuns(selectedRun, compareRun);
  }, [compareRun, selectedRun]);

  useEffect(() => {
    if (selectedRun) {
      setText(serializeSavedRun(selectedRun));
      return;
    }

    if (selectedRunId === "sample") {
      setText(sample);
    }
  }, [sample, selectedRun, selectedRunId]);

  useEffect(() => {
    if (selectedRunId !== "sample" && !selectedRun) {
      setSelectedRunId("sample");
    }
    if (compareRunId !== "none" && !compareRun) {
      setCompareRunId("none");
    }
  }, [compareRun, compareRunId, selectedRun, selectedRunId]);

  return (
    <ToolShell
      title="Report generator"
      description="Paste a run JSON or load one from local saved history, then generate a reproducible Markdown or JSON report with timestamp, assumptions, formulas, warnings, and model version."
      inputs={fieldList(<>
        <SelectField label="Format" value={format} onChange={setFormat} options={[{ value: "markdown", label: "Markdown" }, { value: "json", label: "JSON" }]} />
        <SelectField
          label="Report source"
          value={selectedRunId}
          onChange={setSelectedRunId}
          options={[
            { value: "sample", label: "Sample run JSON" },
            ...runs.map((run) => ({ value: run.id, label: `${run.title} (${run.toolId})` }))
          ]}
          help="Choose a locally saved run to preload the editor, or stay on the sample/manual mode and paste JSON directly."
        />
        <TextAreaField
          label="Run JSON"
          value={text}
          onChange={setText}
          rows={20}
          help="Include the original tool ID, input, result, assumptions, warnings, and version so the report remains reproducible. Loading a saved run fills this editor automatically."
          error={parseError}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => output && downloadText(output.filename, output.mimeType, output.content)} disabled={!output}>Download report</Button>
          <SecondaryButton onClick={() => setSelectedRunId("sample")}>Switch to manual/sample mode</SecondaryButton>
        </div>
      </>)}
      results={<>
        <ResultPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Saved runs</h2>
            {storageError ? <span className="text-xs text-rose-700">{storageError}</span> : null}
          </div>
          {runs.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No saved runs yet"
                message="Use Save run locally from a calculator or simulator result panel, then return here to reuse, compare, duplicate, or delete it."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Selected saved run"
                  value={selectedRunId === "sample" ? runs[0].id : selectedRunId}
                  onChange={setSelectedRunId}
                  options={runs.map((run) => ({ value: run.id, label: `${run.title} · ${run.toolId}` }))}
                  help="Loading a run replaces the editable JSON above so the report preview stays reproducible."
                />
                <SelectField
                  label="Compare against"
                  value={compareRunId}
                  onChange={setCompareRunId}
                  options={[
                    { value: "none", label: "No comparison" },
                    ...runs.filter((run) => run.id !== selectedRunId).map((run) => ({ value: run.id, label: `${run.title} · ${run.toolId}` }))
                  ]}
                  help="Compare the selected saved run with another local run to spot changed inputs, outputs, or caution volume."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => selectedRun && setText(serializeSavedRun(selectedRun))} disabled={!selectedRun}>Load selected run</SecondaryButton>
                <SecondaryButton onClick={() => selectedRun && duplicateRunToStorage(selectedRun.id)} disabled={!selectedRun}>Duplicate selected run</SecondaryButton>
                <SecondaryButton onClick={() => selectedRun && deleteRun(selectedRun.id)} disabled={!selectedRun}>Delete selected run</SecondaryButton>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th scope="col" className="py-2">Saved at</th>
                      <th scope="col">Title</th>
                      <th scope="col">Tool</th>
                      <th scope="col">Warnings</th>
                      <th scope="col">Assumptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {runs.map((run) => (
                      <tr key={run.id} className={run.id === selectedRunId ? "bg-cyan-50" : undefined}>
                        <td className="py-2">{run.createdAt.replace("T", " ").replace("Z", " UTC")}</td>
                        <td className="font-medium text-ink">{run.title}</td>
                        <td>{run.toolId}</td>
                        <td>{run.warnings.length}</td>
                        <td>{run.assumptions.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {comparison ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-ink">Comparison summary</h3>
                  <p className="mt-2 text-sm text-slate-700">Tool alignment: {comparison.sameTool ? "same tool family" : "different tools; compare with caution"}.</p>
                  <p className="mt-2 text-sm text-slate-700">Changed input fields: {comparison.inputDifferences.length ? comparison.inputDifferences.join(", ") : "none"}.</p>
                  <p className="mt-2 text-sm text-slate-700">Changed result fields: {comparison.resultDifferences.length ? comparison.resultDifferences.join(", ") : "none"}.</p>
                  <p className="mt-2 text-sm text-slate-700">Assumption delta: {comparison.assumptionDelta}. Warning delta: {comparison.warningDelta}.</p>
                </div>
              ) : null}
            </div>
          )}
        </ResultPanel>
        {output ? (
          <ResultPanel><pre className="max-h-[620px] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{output.content}</pre></ResultPanel>
        ) : (
          <ErrorState
            title="Report preview unavailable"
            message={parseError ?? "Report input is unavailable."}
            retryLabel="Correct the JSON syntax to restore the preview and download action"
          />
        )}
      </>}
      formulas={<AssumptionList items={["Reports preserve input parameters, result values, assumptions, warnings, timestamp, and model version.", "Markdown reports are intended for reproducible notes, not certified lab records."]} />}
    />
  );
}

export function StandardsConformanceTool() {
  const [kind, setKind] = useState<ConformanceKind>("status");
  const availableExamples = useMemo(() => listConformanceExamples(kind), [kind]);
  const [selectedExampleId, setSelectedExampleId] = useState(availableExamples[0]?.id ?? "");
  const [payload, setPayload] = useState(JSON.stringify(availableExamples[0]?.payload ?? { poolId: "demo", availableBits: 1024, capacityBits: 2048, refillRateBitsPerSecond: 128, oldestKeyAgeSeconds: 1, status: "ready", demoOnly: true }, null, 2));
  const selectedExample = availableExamples.find((example) => example.id === selectedExampleId) ?? availableExamples[0];
  const parsed = useMemo(() => parseJsonText(payload), [payload]);
  const parseError = parsed.ok ? undefined : parsed.error;
  const result = useMemo(() => parsed.ok ? checkMockQkdConformance(kind, parsed.data) : null, [kind, parsed]);

  useEffect(() => {
    if (!availableExamples.length) return;
    setSelectedExampleId(availableExamples[0].id);
    setPayload(JSON.stringify(availableExamples[0].payload, null, 2));
  }, [availableExamples]);

  useEffect(() => {
    if (!selectedExample) return;
    setPayload(JSON.stringify(selectedExample.payload, null, 2));
  }, [selectedExampleId, selectedExample]);

  return (
    <ToolShell
      title="Standards conformance checker"
      description="Check MVP mock QKD API response shapes and lifecycle flags against the local schema expectations."
      inputs={fieldList(<>
        <SelectField label="Payload kind" value={kind} onChange={setKind} options={[{ value: "status", label: "Pool status" }, { value: "key-request-success", label: "Key request success" }, { value: "key-request-error", label: "Insufficient material error" }, { value: "key-descriptor", label: "Key descriptor" }]} />
        <SelectField label="Built-in example" value={selectedExampleId} onChange={setSelectedExampleId} options={availableExamples.map((example) => ({ value: example.id, label: example.title }))} />
        <TextAreaField
          label="Response JSON"
          value={payload}
          onChange={setPayload}
          rows={14}
          help="Paste a mock API response object to check its local schema shape and demo-only lifecycle notes."
          error={parseError}
        />
      </>)}
      results={result ? (
        <ResultPanel>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Conformance" value={result.ok ? "pass" : "needs attention"} />
            <MetricCard label="Expected outcome" value={selectedExample?.expectedOk ? "pass" : "needs attention"} />
            <MetricCard label="Example match" value={selectedExample?.expectedOk === result.ok ? "aligned" : "diverged"} />
          </div>
          {selectedExample ? <p className="mt-4 text-sm text-slate-700">{selectedExample.summary}</p> : null}
          <h2 className="mt-5 text-sm font-semibold text-ink">Issues</h2>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700">{result.issues.length ? result.issues.map((issue) => <li key={issue}>{issue}</li>) : <li>No schema issues found.</li>}</ul>
          <h2 className="mt-5 text-sm font-semibold text-ink">Lifecycle notes</h2>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700">{result.lifecycleNotes.map((note) => <li key={note}>{note}</li>)}</ul>
        </ResultPanel>
      ) : (
        <ErrorState
          title="Conformance checks paused"
          message={parseError ?? "Conformance input is unavailable."}
          retryLabel="Provide a valid JSON object to run the schema and lifecycle checks"
        />
      )}
      formulas={<AssumptionList items={["The checker validates the MVP mock response schemas, not the full ETSI specification.", "Lifecycle checks are educational guardrails for demo-only key material and exhaustion behavior."]} />}
    />
  );
}

export function ScenarioBuilderTool() {
  const [text, setText] = useState(exportScenario(sampleScenarios[0]));
  const [selectedScenarioId, setSelectedScenarioId] = useState("none");
  const [importBundleText, setImportBundleText] = useState("");
  const [importBundleMessage, setImportBundleMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { records, storageError, saveScenario, deleteScenario, duplicateScenarioToStorage, importScenarioBundleToStorage } = useSavedScenarios();
  const validation = useMemo(() => importScenario(text), [text]);
  const scenario = validation.ok ? validation.scenario : sampleScenarios[0];
  const selectedScenario = records.find((record) => record.id === selectedScenarioId);
  const canEditTables = validation.ok;

  useEffect(() => {
    if (selectedScenarioId !== "none" && !selectedScenario) {
      setSelectedScenarioId("none");
    }
  }, [selectedScenario, selectedScenarioId]);

  const updateScenario = (updater: (current: QuantumNetworkScenario) => QuantumNetworkScenario) => {
    if (!validation.ok) return;
    setText(exportScenario(updater(validation.scenario)));
  };
  const updateNode = (nodeId: string, patch: Partial<QuantumNode>) => {
    updateScenario((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node))
    }));
  };
  const updateLink = (linkId: string, patch: Partial<QuantumLink>) => {
    updateScenario((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link))
    }));
  };
  const addNode = () => {
    updateScenario((current) => ({
      ...current,
      nodes: [
        ...current.nodes,
        {
          id: `node-${current.nodes.length + 1}`,
          label: `Node ${current.nodes.length + 1}`,
          type: "endpoint"
        }
      ]
    }));
  };
  const removeNode = (nodeId: string) => {
    updateScenario((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      links: current.links.filter((link) => link.source !== nodeId && link.target !== nodeId)
    }));
  };
  const addLink = () => {
    updateScenario((current) => {
      const source = current.nodes[0]?.id ?? "node-1";
      const target = current.nodes[1]?.id ?? source;
      return {
        ...current,
        links: [
          ...current.links,
          {
            id: `link-${current.links.length + 1}`,
            source,
            target,
            lengthKm: 10,
            attenuationDbPerKm: 0.2,
            successProbability: 0.7,
            fidelity: 0.9,
            classicalLatencyMs: 0.1
          }
        ]
      };
    });
  };
  const removeLink = (linkId: string) => {
    updateScenario((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== linkId)
    }));
  };
  const saveCurrentScenario = () => {
    if (!validation.ok) return;
    const record = saveScenario(validation.scenario.name, validation.scenario);
    setSaveMessage(record ? `Saved locally as ${record.id}.` : null);
  };
  const importBundle = () => {
    const result = importScenarioBundleToStorage(importBundleText);
    if (!result) {
      setImportBundleMessage(null);
      return;
    }
    setImportBundleMessage(`Imported ${result.importedCount} saved scenario entr${result.importedCount === 1 ? "y" : "ies"}.`);
    setImportBundleText("");
  };

  return (
    <ToolShell
      title="Network scenario builder"
      description="Import, validate, edit, export, and locally save quantum-network scenarios matching the MVP JSON schema."
      inputs={fieldList(<>
        <SelectField label="Sample scenario" value={scenario.id} onChange={(id) => {
          const selected = sampleScenarios.find((item) => item.id === id);
          if (selected) setText(exportScenario(selected));
        }} options={sampleScenarios.map((item) => ({ value: item.id, label: item.name }))} />
        <TextAreaField
          label="Scenario JSON"
          value={text}
          onChange={setText}
          rows={20}
          help="Edit the schema-backed scenario directly, or load a sample first and adjust nodes and links in the tables below."
          error={validation.ok ? undefined : "Scenario JSON does not satisfy the local schema. Table editing is paused until the listed issues are fixed."}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadText(`${scenario.id}.json`, "application/json", exportScenario(scenario))}>Export scenario</Button>
          <SecondaryButton onClick={saveCurrentScenario} disabled={!validation.ok}>Save scenario locally</SecondaryButton>
          <SecondaryButton onClick={() => downloadText("saved-scenarios.bundle.json", "application/json", serializeSavedScenarioBundle(records))} disabled={records.length === 0}>Export saved scenario bundle</SecondaryButton>
        </div>
        {saveMessage ? <p className="text-xs text-emerald-700">{saveMessage}</p> : null}
        {storageError ? <p className="text-xs text-rose-700">{storageError}</p> : null}
      </>)}
      results={<>
        <ResultPanel>
          <MetricCard label="Validation" value={validation.ok ? "valid" : "invalid"} />
          {!validation.ok ? (
            <div className="mt-4 space-y-4">
              <ErrorState
                title="Scenario validation failed"
                message="Fix the schema issues below before editing rows or exporting the scenario bundle."
                retryLabel="Correct the JSON object and the editor will unlock automatically"
              />
              <ul className="text-sm text-amber-900">{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          ) : null}
        </ResultPanel>
        <ResultPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Saved scenario library</h2>
            {storageError ? <span className="text-xs text-rose-700">{storageError}</span> : null}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
            <div className="space-y-4">
              {records.length === 0 ? (
                <EmptyState
                  title="No saved scenarios yet"
                  message="Save a validated scenario from the editor, then return here to reload, duplicate, delete, or export it in a bundle."
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Selected saved scenario"
                      value={selectedScenarioId === "none" ? records[0].id : selectedScenarioId}
                      onChange={setSelectedScenarioId}
                      options={records.map((record) => ({ value: record.id, label: `${record.title} · ${record.scenario.id}` }))}
                      help="Load a prior scenario snapshot back into the editor without changing the saved library entry."
                    />
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-ink">Bundle status</p>
                      <p className="mt-1 text-sm text-slate-700">{records.length} saved scenario{records.length === 1 ? "" : "s"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">The bundle export includes scenario JSON, timestamps, and trust-assumption warnings for each saved entry.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => selectedScenario && setText(exportScenario(selectedScenario.scenario))} disabled={!selectedScenario}>Load selected scenario</SecondaryButton>
                    <SecondaryButton onClick={() => selectedScenario && duplicateScenarioToStorage(selectedScenario.id)} disabled={!selectedScenario}>Duplicate selected scenario</SecondaryButton>
                    <SecondaryButton onClick={() => selectedScenario && deleteScenario(selectedScenario.id)} disabled={!selectedScenario}>Delete selected scenario</SecondaryButton>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th scope="col" className="py-2">Saved at</th>
                          <th scope="col">Title</th>
                          <th scope="col">Scenario ID</th>
                          <th scope="col">Nodes</th>
                          <th scope="col">Links</th>
                          <th scope="col">Warnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map((record) => (
                          <tr key={record.id} className={record.id === selectedScenarioId ? "bg-cyan-50" : undefined}>
                            <td className="py-2">{record.createdAt.replace("T", " ").replace("Z", " UTC")}</td>
                            <td className="font-medium text-ink">{record.title}</td>
                            <td>{record.scenario.id}</td>
                            <td>{record.scenario.nodes.length}</td>
                            <td>{record.scenario.links.length}</td>
                            <td>{record.warnings.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-4">
              <TextAreaField
                label="Import scenario bundle"
                value={importBundleText}
                onChange={setImportBundleText}
                rows={14}
                help="Paste a previously exported saved-scenarios bundle to merge it into this browser's local scenario library."
              />
              <Button onClick={importBundle} disabled={!importBundleText.trim()}>Import bundle</Button>
              {importBundleMessage ? <p className="text-xs text-emerald-700">{importBundleMessage}</p> : null}
            </div>
          </div>
        </ResultPanel>
        <ResultPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Editable nodes and links</h2>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton onClick={addNode} disabled={!canEditTables}>Add node</SecondaryButton>
              <SecondaryButton onClick={addLink} disabled={!canEditTables || scenario.nodes.length === 0}>Add link</SecondaryButton>
            </div>
          </div>
          {!canEditTables ? (
            <div className="mt-4">
              <EmptyState
                title="Scenario editing paused"
                message="Fix the scenario JSON above to re-enable table editing, routing analysis, and export."
              />
            </div>
          ) : null}
          <div className="mt-4 grid gap-6">
            <div>
              <h3 className="text-sm font-semibold text-ink">Nodes</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <caption className="pb-2 text-left text-xs text-slate-500">Editable node records for the current scenario, including trust role, memory properties, and layout coordinates.</caption>
                  <thead className="text-slate-500">
                    <tr>
                      <th scope="col" className="py-2">ID</th>
                      <th scope="col">Label</th>
                      <th scope="col">Type</th>
                      <th scope="col">Memory lifetime (ms)</th>
                      <th scope="col">Memory count</th>
                      <th scope="col">X</th>
                      <th scope="col">Y</th>
                      <th scope="col" className="text-right">Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scenario.nodes.map((node) => (
                      <tr key={node.id}>
                        <td className="py-2">
                          <input className="w-28 rounded-md border border-slate-300 px-2 py-1" value={node.id} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { id: event.target.value })} />
                        </td>
                        <td>
                          <input className="w-40 rounded-md border border-slate-300 px-2 py-1" value={node.label} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { label: event.target.value })} />
                        </td>
                        <td>
                          <select className="w-36 rounded-md border border-slate-300 px-2 py-1" value={node.type} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { type: event.target.value as QuantumNodeType })}>
                            {quantumNodeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="w-28 rounded-md border border-slate-300 px-2 py-1" type="number" value={node.memoryLifetimeMs ?? ""} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { memoryLifetimeMs: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" value={node.memoryCount ?? ""} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { memoryCount: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-20 rounded-md border border-slate-300 px-2 py-1" type="number" value={node.x ?? ""} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { x: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-20 rounded-md border border-slate-300 px-2 py-1" type="number" value={node.y ?? ""} disabled={!canEditTables} onChange={(event) => updateNode(node.id, { y: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td className="text-right">
                          <button className="text-sm text-rose-700 disabled:text-slate-400" type="button" disabled={!canEditTables || scenario.nodes.length <= 1} onClick={() => removeNode(node.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Links</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <caption className="pb-2 text-left text-xs text-slate-500">Editable link records for attenuation, loss, success probability, fidelity, and classical latency proxies.</caption>
                  <thead className="text-slate-500">
                    <tr>
                      <th scope="col" className="py-2">ID</th>
                      <th scope="col">Source</th>
                      <th scope="col">Target</th>
                      <th scope="col">Length (km)</th>
                      <th scope="col">Attenuation (dB/km)</th>
                      <th scope="col">Loss (dB)</th>
                      <th scope="col">Success probability</th>
                      <th scope="col">Fidelity</th>
                      <th scope="col">Latency (ms)</th>
                      <th scope="col" className="text-right">Row</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scenario.links.map((link) => (
                      <tr key={link.id}>
                        <td className="py-2">
                          <input className="w-28 rounded-md border border-slate-300 px-2 py-1" value={link.id} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { id: event.target.value })} />
                        </td>
                        <td>
                          <select className="w-28 rounded-md border border-slate-300 px-2 py-1" value={link.source} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { source: event.target.value })}>
                            {scenario.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="w-28 rounded-md border border-slate-300 px-2 py-1" value={link.target} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { target: event.target.value })}>
                            {scenario.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.lengthKm} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { lengthKm: Number(event.target.value) || 0 })} />
                        </td>
                        <td>
                          <input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.attenuationDbPerKm ?? ""} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { attenuationDbPerKm: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-20 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.lossDb ?? ""} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { lossDb: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.successProbability ?? ""} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { successProbability: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-20 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.fidelity ?? ""} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { fidelity: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td>
                          <input className="w-20 rounded-md border border-slate-300 px-2 py-1" type="number" value={link.classicalLatencyMs ?? ""} disabled={!canEditTables} onChange={(event) => updateLink(link.id, { classicalLatencyMs: parseOptionalNumber(event.target.value) })} />
                        </td>
                        <td className="text-right">
                          <button className="text-sm text-rose-700 disabled:text-slate-400" type="button" disabled={!canEditTables || scenario.links.length <= 1} onClick={() => removeLink(link.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={["The schema requires id, name, nodes, and links.", "Trusted-node scenarios are labeled because they add operational trust assumptions.", "Routing tools treat links as undirected in the MVP."]} />}
    />
  );
}

export function EntanglementRoutingTool() {
  const [scenarioId, setScenarioId] = useState(sampleScenarios[1].id);
  const scenario = sampleScenarios.find((item) => item.id === scenarioId) ?? sampleScenarios[1];
  const [source, setSource] = useState(scenario.nodes[0].id);
  const [target, setTarget] = useState(scenario.nodes[scenario.nodes.length - 1].id);
  const [objective, setObjective] = useState<RouteObjective>("balanced");
  useEffect(() => {
    setSource(scenario.nodes[0].id);
    setTarget(scenario.nodes[scenario.nodes.length - 1].id);
  }, [scenarioId, scenario.nodes]);
  const response = useMemo(() => rankRoutes({ scenario, sourceNodeId: source, targetNodeId: target, objective }), [scenario, source, target, objective]);

  return (
    <ToolShell
      title="Entanglement routing sandbox"
      description="Rank candidate paths using link success probability, Werner-swap fidelity proxy, latency, and memory-lifetime warnings."
      inputs={fieldList(<>
        <SelectField label="Scenario" value={scenarioId} onChange={setScenarioId} options={sampleScenarios.map((item) => ({ value: item.id, label: item.name }))} />
        <SelectField label="Source" value={source} onChange={setSource} options={scenario.nodes.map((node) => ({ value: node.id, label: node.label }))} />
        <SelectField label="Target" value={target} onChange={setTarget} options={scenario.nodes.map((node) => ({ value: node.id, label: node.label }))} />
        <SelectField label="Objective" value={objective} onChange={setObjective} options={[{ value: "balanced", label: "Balanced" }, { value: "rate", label: "Rate" }, { value: "fidelity", label: "Fidelity" }, { value: "latency", label: "Latency" }]} />
      </>)}
      results={<>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Ranked routes</h2>
          <div className="mt-4 grid gap-3">
            {response.result.routes.map((route) => (
              <div key={route.linkIds.join("-")} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-ink">{route.nodePath.join(" -> ")}</p>
                <p className="mt-2 text-sm text-slate-700">success {percent(route.successProbability)}, fidelity {percent(route.fidelity)}, latency {fmt(route.latencyMs)} ms, rate {fmt(route.rateProxyHz)} Hz</p>
              </div>
            ))}
            {response.result.routes.length === 0 ? (
              <EmptyState
                title="No candidate route found"
                message="This scenario has no connected path between the selected endpoints under the current topology."
              />
            ) : null}
          </div>
        </ResultPanel>
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function RepeaterOptimizerTool() {
  const [input, setInput] = useState<RepeaterOptimizeInput>({
    totalDistanceKm: 200,
    attenuationDbPerKm: 0.2,
    memoryLifetimeMs: 100,
    attemptRateHz: 100000,
    targetFidelity: 0.8,
    maxRepeaters: 6
  });
  const response = useMemo(() => optimizeRepeaterChain(input), [input]);
  const set = (patch: Partial<RepeaterOptimizeInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <ToolShell
      title="Repeater-chain optimizer"
      description="Explore equal-spacing repeater candidates and tradeoffs between segment loss, success proxy, fidelity proxy, and rate proxy."
      inputs={fieldList(<>
        <NumberField label="Total distance" unit="km" value={input.totalDistanceKm} min={0} onChange={(totalDistanceKm) => set({ totalDistanceKm })} />
        <NumberField label="Attenuation" unit="dB/km" value={input.attenuationDbPerKm} min={0} onChange={(attenuationDbPerKm) => set({ attenuationDbPerKm })} />
        <NumberField label="Memory lifetime" unit="ms" value={input.memoryLifetimeMs} min={0} onChange={(memoryLifetimeMs) => set({ memoryLifetimeMs })} />
        <NumberField label="Attempt rate" unit="Hz" value={input.attemptRateHz} min={1} onChange={(attemptRateHz) => set({ attemptRateHz })} />
        <NumberField label="Target fidelity" value={input.targetFidelity} min={0} max={1} onChange={(targetFidelity) => set({ targetFidelity })} />
        <NumberField label="Max repeaters" value={input.maxRepeaters} min={0} max={100} onChange={(maxRepeaters) => set({ maxRepeaters: Math.floor(maxRepeaters) })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Best repeaters" value={response.result.bestCandidate.repeaters} />
          <MetricCard label="Segment length" value={fmt(response.result.bestCandidate.segmentLengthKm)} unit="km" />
          <MetricCard label="Fidelity proxy" value={percent(response.result.bestCandidate.fidelityProxy)} />
          <MetricCard label="Rate proxy" value={fmt(response.result.bestCandidate.rateProxyHz)} unit="Hz" />
        </div>
        <SimpleLineChart points={response.result.candidates.map((candidate) => ({ repeaters: candidate.repeaters, rateProxyHz: candidate.rateProxyHz }))} xKey="repeaters" yKey="rateProxyHz" label="Repeater count vs rate proxy" />
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
    />
  );
}

export function BenchmarkHubTool() {
  const [scenarioId, setScenarioId] = useState(sampleScenarios[0].id);
  const scenario = sampleScenarios.find((item) => item.id === scenarioId) ?? sampleScenarios[0];
  const validation = validateScenario(scenario);
  const result = useMemo(() => runBuiltInBenchmark(scenario), [scenario]);

  return (
    <ToolShell
      title="Benchmark hub"
      description="Run the built-in simplified engine over a scenario and export concrete simulator-mapping JSON for SeQUeNCe, QuISP, NetSquid/SquidASM, and QKDNetSim."
      inputs={fieldList(<>
        <SelectField label="Scenario" value={scenarioId} onChange={setScenarioId} options={sampleScenarios.map((item) => ({ value: item.id, label: item.name }))} />
        <Button onClick={() => downloadText(`${scenario.id}-benchmark.json`, "application/json", JSON.stringify({ scenario, result }, null, 2))}>Export benchmark JSON</Button>
        <Button onClick={() => downloadText(`${scenario.id}-adapter-bundle.json`, "application/json", serializeBenchmarkAdapterBundle(scenario))}>Export adapter bundle</Button>
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Nodes" value={result.nodeCount} />
          <MetricCard label="Links" value={result.linkCount} />
          <MetricCard label="Scenario validation" value={validation.ok ? "valid" : "invalid"} />
        </div>
        <ResultPanel>
          <h2 className="text-lg font-semibold text-ink">Simulator export adapters</h2>
          <div className="mt-4 grid gap-3">
            {result.adapters.map((adapter) => (
              <div key={adapter.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <MetricCard label={adapter.name} value={adapter.status} note={`${adapter.summary} Validation: ${adapter.validation.ok ? "ok" : adapter.validation.errors.join("; ")}`} />
                <ul className="mt-3 grid gap-1 text-sm text-slate-700">
                  {adapter.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                </ul>
                <div className="mt-3">
                  <SecondaryButton onClick={() => downloadText(
                    adapter.filename,
                    "application/json",
                    serializeSimulatorAdapter(scenario, adapter.name)
                  )}>
                    Export {adapter.name} JSON
                  </SecondaryButton>
                </div>
              </div>
            ))}
          </div>
        </ResultPanel>
      </>}
      formulas={<AssumptionList items={["The built-in engine reuses the simplified route-ranking model.", "Each adapter is a transparent mapping artifact from the workbench schema into simulator-oriented JSON, not an executable simulator run file.", "Exports carry only teaching topology, loss, fidelity, memory, and latency proxies; they never include secret material or production cryptographic behavior."]} />}
    />
  );
}
