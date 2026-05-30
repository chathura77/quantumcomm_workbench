"use client";

import { useMemo, useState } from "react";
import presetsJson from "@/fixtures/presets.json";
import { ShareUrlControls, useShareableToolState } from "@/components/shareable-tool-state";
import { buildRunReport } from "@/lib/export/report";
import { createSavedRunRecord, SAVED_RUNS_STORAGE_KEY, sortSavedRuns } from "@/lib/export/savedRuns";
import { estimateMdiQkd } from "@/lib/qkd/mdiQkd";
import type { MdiQkdInput, ModelWarning, SavedWorkbenchRun } from "@/lib/types";
import { MetricCard, SecondaryButton, SelectField, NumberField, SimpleLineChart, ToolShell, WarningPanel } from "@/components/ui";

const mdiPresets = (presetsJson.mdiQkd as unknown) as Array<{ id: string; name: string; input: MdiQkdInput }>;

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
  input: MdiQkdInput;
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
      toolId: "mdi-qkd-estimator",
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
        toolId: "mdi-qkd-estimator",
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

export function MdiQkdTool() {
  const { state: input, setState: setInput, shareMessage, copyShareUrl } = useShareableToolState<MdiQkdInput>("input", mdiPresets[0].input);
  const response = useMemo(() => estimateMdiQkd(input), [input]);
  const set = (patch: Partial<MdiQkdInput>) => setInput((current) => ({ ...current, ...patch }));
  const formulas = [
    "loss_A = alpha L_A + L_conn,A, loss_B = alpha L_B + L_conn,B",
    "eta_A = 10^(-loss_A / 10), eta_B = 10^(-loss_B / 10)",
    "p_A = 1 - exp(-mu_A eta_A eta_det,relay), p_B = 1 - exp(-mu_B eta_B eta_det,relay)",
    "symmetry = min(eta_A, eta_B) / max(eta_A, eta_B)",
    "p_joint = p_A p_B eta_BSM V sqrt(symmetry)",
    "Q = (p_joint ((1 - V)/2 + e_det) + 0.5 p_noise) / max(p_joint + p_noise, epsilon)",
    "R = R_src q_basis (p_joint + p_noise) max(0, 1 - f_ec h2(Q) - h2(Q))"
  ];
  const references = [
    "Lo, Curty, and Qi (2012) measurement-device-independent QKD.",
    "Tamaki et al. and related MDI-QKD reviews for interference-visibility and source-assumption context."
  ];

  return (
    <ToolShell
      title="MDI-QKD relay estimator"
      description="Estimate two-arm loss, relay coincidence probability, QBER, and asymptotic key-rate intuition for a measurement-device-independent QKD teaching setup."
      inputs={fieldList(<>
        <ShareUrlControls onCopy={copyShareUrl} message={shareMessage} />
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = mdiPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...mdiPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField
          label="Relay model"
          value={input.relayMode}
          onChange={(relayMode) => set({ relayMode })}
          options={[
            { value: "untrusted", label: "Untrusted relay" },
            { value: "monitored", label: "Monitored relay" }
          ]}
          help="Both options remain teaching approximations; the relay report channel is still assumed to be authenticated."
        />
        <NumberField label="Alice arm length" unit="km" value={input.aliceLengthKm} min={0} onChange={(aliceLengthKm) => set({ aliceLengthKm })} />
        <NumberField label="Bob arm length" unit="km" value={input.bobLengthKm} min={0} onChange={(bobLengthKm) => set({ bobLengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Alice connector loss" unit="dB" value={input.aliceConnectorLossDb} min={0} onChange={(aliceConnectorLossDb) => set({ aliceConnectorLossDb })} />
        <NumberField label="Bob connector loss" unit="dB" value={input.bobConnectorLossDb} min={0} onChange={(bobConnectorLossDb) => set({ bobConnectorLossDb })} />
        <NumberField label="Pulse rate" unit="Hz" value={input.sourceRateHz} min={1} onChange={(sourceRateHz) => set({ sourceRateHz })} />
        <NumberField label="Alice mean photon number" unit="mu" value={input.aliceMeanPhotonNumber} min={0} max={10} onChange={(aliceMeanPhotonNumber) => set({ aliceMeanPhotonNumber })} />
        <NumberField label="Bob mean photon number" unit="mu" value={input.bobMeanPhotonNumber} min={0} max={10} onChange={(bobMeanPhotonNumber) => set({ bobMeanPhotonNumber })} />
        <NumberField label="Relay detector efficiency" value={input.relayDetectorEfficiency} min={0} max={1} onChange={(relayDetectorEfficiency) => set({ relayDetectorEfficiency })} />
        <NumberField label="Relay dark count probability" value={input.relayDarkCountProbability} min={0} max={1} onChange={(relayDarkCountProbability) => set({ relayDarkCountProbability })} />
        <NumberField label="Background count probability" value={input.backgroundCountProbability} min={0} max={1} onChange={(backgroundCountProbability) => set({ backgroundCountProbability })} />
        <NumberField label="Interference visibility" value={input.interferenceVisibility} min={0} max={1} onChange={(interferenceVisibility) => set({ interferenceVisibility })} help="Captures phase/reference alignment and mode-overlap quality as one scalar teaching knob." />
        <NumberField label="Misalignment error" value={input.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Bell-state measurement efficiency" value={input.bellStateMeasurementEfficiency} min={0} max={1} onChange={(bellStateMeasurementEfficiency) => set({ bellStateMeasurementEfficiency })} />
        <NumberField label="Basis sifting factor" value={input.basisSiftingFactor} min={0} max={1} onChange={(basisSiftingFactor) => set({ basisSiftingFactor })} />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
        <NumberField label="Block size" unit="pulses" value={input.blockSize} min={1} onChange={(blockSize) => set({ blockSize: Math.floor(blockSize) })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total span" value={fmt(response.result.totalDistanceKm)} unit="km" />
          <MetricCard label="Coincidence probability" value={percent(response.result.coincidenceProbability)} />
          <MetricCard label="QBER proxy" value={percent(response.result.qber)} />
          <MetricCard label="Secret-key-rate proxy" value={fmt(response.result.secretKeyRateHz)} unit="Hz" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Alice arm loss" value={fmt(response.result.aliceTotalLossDb)} unit="dB" />
          <MetricCard label="Bob arm loss" value={fmt(response.result.bobTotalLossDb)} unit="dB" />
          <MetricCard label="Arm symmetry" value={percent(response.result.symmetryRatio)} note="1.0 is perfectly balanced." />
          <MetricCard label="Interference penalty" value={percent(response.result.interferencePenalty)} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Relay accounting</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Alice relay detection" value={percent(response.result.aliceRelayDetectionProbability)} />
            <MetricCard label="Bob relay detection" value={percent(response.result.bobRelayDetectionProbability)} />
            <MetricCard label="Joint signal probability" value={percent(response.result.jointSignalProbability)} />
            <MetricCard label="Relay noise probability" value={percent(response.result.relayNoiseProbability)} />
            <MetricCard label="Bell announcements" value={response.result.announcedBellEvents} unit="per block" />
            <MetricCard label="Sifted bits" value={response.result.siftedBitsPerBlock} unit="per block" />
          </div>
          <div className="mt-4">
            <ExportPanel
              title="MDI-QKD estimator run"
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
          label="Symmetric total-distance sweep"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            totalDistanceKm: point.totalDistanceKm,
            qber: point.qber * 100
          }))}
          xKey="totalDistanceKm"
          yKey="qber"
          label="Distance vs QBER proxy (%)"
        />
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={references}
    />
  );
}

export default MdiQkdTool;
