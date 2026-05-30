"use client";

import { useMemo, useState } from "react";
import presetsJson from "@/fixtures/presets.json";
import { buildRunReport } from "@/lib/export/report";
import { createSavedRunRecord, SAVED_RUNS_STORAGE_KEY, sortSavedRuns } from "@/lib/export/savedRuns";
import { estimateTwinFieldQkd } from "@/lib/qkd/twinFieldQkd";
import type { ModelWarning, SavedWorkbenchRun, TwinFieldQkdInput } from "@/lib/types";
import { MetricCard, NumberField, SecondaryButton, SelectField, SimpleLineChart, ToolShell, WarningPanel } from "@/components/ui";

const twinFieldPresets = (presetsJson.twinFieldQkd as unknown) as Array<{ id: string; name: string; input: TwinFieldQkdInput }>;

function fmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "n/a";
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toLocaleString(undefined, { maximumSignificantDigits: digits });
}

function percent(value: number): string {
  return `${fmt(value * 100, 3)}%`;
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

function fieldList(children: React.ReactNode) {
  return <div className="grid gap-4">{children}</div>;
}

function AssumptionList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
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

function saveRunLocally(draft: {
  toolId: string;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  version: string;
  formulas: string[];
  references: string[];
}) {
  const record = createSavedRunRecord(draft);
  const next = sortSavedRuns([record, ...loadSavedRuns()]);
  window.localStorage.setItem(SAVED_RUNS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("quantumcomm:saved-runs-updated"));
  return record;
}

function ExportPanel({
  title,
  input,
  result,
  assumptions,
  warnings,
  version,
  formulas,
  references
}: {
  title: string;
  input: TwinFieldQkdInput;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  version: string;
  formulas: string[];
  references: string[];
}) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const exportFormat = (format: "json" | "markdown") => {
    const report = buildRunReport({
      title,
      toolId: "twin-field-qkd-estimator",
      input: input as unknown as Record<string, unknown>,
      result,
      assumptions,
      warnings,
      version,
      formulas,
      references,
      format
    });
    downloadText(report.filename, report.mimeType, report.content);
  };

  const save = () => {
    try {
      const record = saveRunLocally({
        toolId: "twin-field-qkd-estimator",
        title,
        input: input as unknown as Record<string, unknown>,
        result,
        assumptions,
        warnings,
        version,
        formulas,
        references
      });
      setSaveMessage(`Saved locally as ${record.id}.`);
      setSaveError(null);
    } catch {
      setSaveMessage(null);
      setSaveError("Saving failed because the browser storage entry could not be updated.");
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={() => exportFormat("json")}>Export JSON</SecondaryButton>
        <SecondaryButton onClick={() => exportFormat("markdown")}>Export Markdown</SecondaryButton>
        <SecondaryButton onClick={save}>Save run locally</SecondaryButton>
      </div>
      {saveMessage ? <p className="text-xs text-emerald-700">{saveMessage}</p> : null}
      {saveError ? <p className="text-xs text-rose-700">{saveError}</p> : null}
    </div>
  );
}

export function TwinFieldQkdTool() {
  const [input, setInput] = useState<TwinFieldQkdInput>(twinFieldPresets[0].input);
  const response = useMemo(() => estimateTwinFieldQkd(input), [input]);
  const set = (patch: Partial<TwinFieldQkdInput>) => setInput((current) => ({ ...current, ...patch }));
  const formulas = [
    "loss_A = alpha L_A + L_conn,A, loss_B = alpha L_B + L_conn,B",
    "eta_A = 10^(-loss_A / 10), eta_B = 10^(-loss_B / 10)",
    "p_A = 1 - exp(-mu_A eta_A eta_det,mid), p_B = 1 - exp(-mu_B eta_B eta_det,mid)",
    "eta_phase = eta_track exp(-sigma_phi^2 / 2)",
    "p_sig = 0.5 (p_A + p_B) w_1 V eta_phase sqrt(symmetry) f_post",
    "Q = (p_sig (1 - V eta_phase sqrt(symmetry))/2 + 0.5 p_noise) / max(p_sig + p_noise, epsilon)",
    "R = R_src q_basis (p_sig + p_noise) max(0, 1 - f_ec h2(Q) - 0.5 h2(Q))"
  ];
  const references = [
    "Lucamarini et al. twin-field QKD.",
    "Twin-field QKD review literature for phase-reference distribution, post-selection, and decoy-analysis caveats."
  ];

  return (
    <ToolShell
      title="Twin-field QKD estimator"
      description="Estimate middle-station interference, phase-stability penalties, and a cautious secret-key-rate proxy for a twin-field QKD teaching setup."
      inputs={fieldList(<>
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = twinFieldPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...twinFieldPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField
          label="Middle-station model"
          value={input.stationMode}
          onChange={(stationMode) => set({ stationMode })}
          options={[
            { value: "untrusted", label: "Untrusted station" },
            { value: "monitored", label: "Monitored station" }
          ]}
          help="Both options remain teaching approximations; authenticated classical coordination is still assumed."
        />
        <NumberField label="Alice arm length" unit="km" value={input.aliceLengthKm} min={0} onChange={(aliceLengthKm) => set({ aliceLengthKm })} />
        <NumberField label="Bob arm length" unit="km" value={input.bobLengthKm} min={0} onChange={(bobLengthKm) => set({ bobLengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Alice connector loss" unit="dB" value={input.aliceConnectorLossDb} min={0} onChange={(aliceConnectorLossDb) => set({ aliceConnectorLossDb })} />
        <NumberField label="Bob connector loss" unit="dB" value={input.bobConnectorLossDb} min={0} onChange={(bobConnectorLossDb) => set({ bobConnectorLossDb })} />
        <NumberField label="Pulse rate" unit="Hz" value={input.sourceRateHz} min={1} onChange={(sourceRateHz) => set({ sourceRateHz })} />
        <NumberField label="Alice mean photon number" unit="mu" value={input.aliceMeanPhotonNumber} min={0} max={10} onChange={(aliceMeanPhotonNumber) => set({ aliceMeanPhotonNumber })} />
        <NumberField label="Bob mean photon number" unit="mu" value={input.bobMeanPhotonNumber} min={0} max={10} onChange={(bobMeanPhotonNumber) => set({ bobMeanPhotonNumber })} />
        <NumberField label="Middle-station detector efficiency" value={input.middleStationDetectorEfficiency} min={0} max={1} onChange={(middleStationDetectorEfficiency) => set({ middleStationDetectorEfficiency })} />
        <NumberField label="Dark count probability" value={input.darkCountProbability} min={0} max={1} onChange={(darkCountProbability) => set({ darkCountProbability })} />
        <NumberField label="Background count probability" value={input.backgroundCountProbability} min={0} max={1} onChange={(backgroundCountProbability) => set({ backgroundCountProbability })} />
        <NumberField label="Interference visibility" value={input.interferenceVisibility} min={0} max={1} onChange={(interferenceVisibility) => set({ interferenceVisibility })} help="Bundles mode overlap and coherent interference quality into one scalar teaching control." />
        <NumberField label="Phase tracking efficiency" value={input.phaseTrackingEfficiency} min={0} max={1} onChange={(phaseTrackingEfficiency) => set({ phaseTrackingEfficiency })} help="Proxy for reference dissemination, drift compensation, and servo quality." />
        <NumberField label="RMS phase error" unit="rad" value={input.phaseErrorSigmaRad} min={0} max={10} onChange={(phaseErrorSigmaRad) => set({ phaseErrorSigmaRad })} help="Higher sigma directly suppresses the interference term through exp(-sigma^2 / 2)." />
        <NumberField label="Accepted phase-window fraction" value={input.phasePostSelectionFraction} min={0} max={1} onChange={(phasePostSelectionFraction) => set({ phasePostSelectionFraction })} help="Teaching proxy for phase-slice post-selection or accepted matching windows." />
        <NumberField label="Basis sifting factor" value={input.basisSiftingFactor} min={0} max={1} onChange={(basisSiftingFactor) => set({ basisSiftingFactor })} />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
        <NumberField label="Block size" unit="pulses" value={input.blockSize} min={1} onChange={(blockSize) => set({ blockSize: Math.floor(blockSize) })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total span" value={fmt(response.result.totalDistanceKm)} unit="km" />
          <MetricCard label="Middle-station click probability" value={percent(response.result.clickProbability)} />
          <MetricCard label="QBER proxy" value={percent(response.result.qber)} />
          <MetricCard label="Secret-key-rate proxy" value={fmt(response.result.secretKeyRateHz)} unit="Hz" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Phase stability factor" value={percent(response.result.phaseStabilityFactor)} />
          <MetricCard label="Interference penalty" value={percent(response.result.interferencePenalty)} />
          <MetricCard label="Arm symmetry" value={percent(response.result.symmetryRatio)} note="1.0 is perfectly balanced." />
          <MetricCard label="Single-photon weight proxy" value={percent(response.result.singlePhotonWeight)} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Middle-station accounting</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Alice arm loss" value={fmt(response.result.aliceTotalLossDb)} unit="dB" />
            <MetricCard label="Bob arm loss" value={fmt(response.result.bobTotalLossDb)} unit="dB" />
            <MetricCard label="Alice arrival probability" value={percent(response.result.aliceArrivalProbability)} />
            <MetricCard label="Bob arrival probability" value={percent(response.result.bobArrivalProbability)} />
            <MetricCard label="Signal probability" value={percent(response.result.middleStationSignalProbability)} />
            <MetricCard label="Noise probability" value={percent(response.result.middleStationNoiseProbability)} />
            <MetricCard label="Click rate" value={fmt(response.result.middleStationClickRateHz)} unit="Hz" />
            <MetricCard label="Accepted windows" value={response.result.acceptedWindowsPerBlock} unit="per block" />
            <MetricCard label="Sifted bits" value={response.result.siftedBitsPerBlock} unit="per block" />
          </div>
          <div className="mt-4">
            <ExportPanel
              title="Twin-field QKD estimator run"
              input={input}
              result={response.result as unknown as Record<string, unknown>}
              assumptions={response.assumptions}
              warnings={response.warnings}
              version={response.version}
              formulas={formulas}
              references={references}
            />
          </div>
        </div>
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            totalDistanceKm: point.totalDistanceKm,
            secretKeyRateHz: point.secretKeyRateHz
          }))}
          xKey="totalDistanceKm"
          yKey="secretKeyRateHz"
          label="Total distance vs secret-key-rate proxy"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            totalDistanceKm: point.totalDistanceKm,
            qber: point.qber * 100
          }))}
          xKey="totalDistanceKm"
          yKey="qber"
          label="Total distance vs QBER proxy (%)"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            totalDistanceKm: point.totalDistanceKm,
            phaseStabilityFactor: point.phaseStabilityFactor * 100
          }))}
          xKey="totalDistanceKm"
          yKey="phaseStabilityFactor"
          label="Distance vs phase-stability factor (%)"
        />
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={references}
    />
  );
}

export default TwinFieldQkdTool;
