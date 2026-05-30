"use client";

import { useMemo, useState } from "react";
import presetsJson from "@/fixtures/presets.json";
import { buildRunReport } from "@/lib/export/report";
import { createSavedRunRecord, SAVED_RUNS_STORAGE_KEY, sortSavedRuns } from "@/lib/export/savedRuns";
import { estimateCvQkd } from "@/lib/qkd/cvQkd";
import type { CvQkdInput, ModelWarning, SavedWorkbenchRun } from "@/lib/types";
import { MetricCard, NumberField, SecondaryButton, SelectField, SimpleLineChart, ToolShell, WarningPanel } from "@/components/ui";

const cvQkdPresets = (presetsJson.cvQkd as unknown) as Array<{ id: string; name: string; input: CvQkdInput }>;

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
  input: CvQkdInput;
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
      toolId: "cv-qkd-estimator",
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
        toolId: "cv-qkd-estimator",
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

export function CvQkdTool() {
  const [input, setInput] = useState<CvQkdInput>(cvQkdPresets[0].input);
  const response = useMemo(() => estimateCvQkd(input), [input]);
  const set = (patch: Partial<CvQkdInput>) => setInput((current) => ({ ...current, ...patch }));
  const formulas = [
    "loss = alpha L + L_excess, eta_ch = 10^(-loss / 10)",
    "eta_eff = eta_ch eta_det eta_phase",
    "chi_line = (1 / eta_ch - 1) + xi + nu_prep",
    "chi_rx = delta_het + nu_el / max(eta_det eta_phase, epsilon)",
    "SNR = eta_eff V_A / (1 + chi_line + chi_rx)",
    "I_AB = g log2(1 + SNR), g = 0.5 for homodyne and 1 for heterodyne",
    "R = R_src u max(0, beta I_AB - chi_BE,proxy)"
  ];
  const references = [
    "Grosshans and Grangier continuous-variable QKD.",
    "Weedbrook et al. review for Gaussian-modulated CV-QKD assumptions and noise terminology."
  ];

  return (
    <ToolShell
      title="CV-QKD teaching estimator"
      description="Estimate transmittance, SNR, covariance-style observables, and a cautious secret-key-rate proxy for a continuous-variable QKD teaching link."
      inputs={fieldList(<>
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = cvQkdPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...cvQkdPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField
          label="Detection mode"
          value={input.detectionMode}
          onChange={(detectionMode) => set({ detectionMode })}
          options={[
            { value: "homodyne", label: "Homodyne" },
            { value: "heterodyne", label: "Heterodyne" }
          ]}
          help="Heterodyne adds an extra vacuum-noise unit in this teaching model but reports both quadratures per use."
        />
        <SelectField
          label="Receiver trust"
          value={input.receiverTrustMode}
          onChange={(receiverTrustMode) => set({ receiverTrustMode })}
          options={[
            { value: "trusted_receiver", label: "Trusted receiver noise" },
            { value: "untrusted_receiver", label: "Untrusted receiver noise" }
          ]}
          help="This toggles whether receiver electronics are counted inside the Eve-information proxy or treated as trusted calibration noise."
        />
        <NumberField label="Distance" unit="km" value={input.distanceKm} min={0} onChange={(distanceKm) => set({ distanceKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Excess insertion loss" unit="dB" value={input.excessLossDb} min={0} onChange={(excessLossDb) => set({ excessLossDb })} />
        <NumberField label="Symbol rate" unit="Hz" value={input.sourceRateHz} min={1} onChange={(sourceRateHz) => set({ sourceRateHz })} />
        <NumberField label="Modulation variance" unit="SNU" value={input.modulationVarianceSnu} min={0.01} onChange={(modulationVarianceSnu) => set({ modulationVarianceSnu })} help="Gaussian modulation variance relative to shot-noise units." />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={0} max={1} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} help="Teaching proxy for beta in reverse-reconciliation style formulas." />
        <NumberField label="Excess noise" unit="SNU" value={input.excessNoiseSnu} min={0} onChange={(excessNoiseSnu) => set({ excessNoiseSnu })} help="Input-referred channel excess noise above the unavoidable vacuum-loss contribution." />
        <NumberField label="Preparation noise" unit="SNU" value={input.preparationNoiseSnu} min={0} onChange={(preparationNoiseSnu) => set({ preparationNoiseSnu })} help="Trusted source-side variance penalty for imperfect modulation and calibration." />
        <NumberField label="Detector efficiency" value={input.detectorEfficiency} min={0} max={1} onChange={(detectorEfficiency) => set({ detectorEfficiency })} />
        <NumberField label="Electronic noise" unit="SNU" value={input.electronicNoiseSnu} min={0} onChange={(electronicNoiseSnu) => set({ electronicNoiseSnu })} />
        <NumberField label="Phase recovery efficiency" value={input.phaseRecoveryEfficiency} min={0} max={1} onChange={(phaseRecoveryEfficiency) => set({ phaseRecoveryEfficiency })} help="Bundles pilot-tone, phase-tracking, and coherent-reference quality into one observable correlation penalty." />
        <NumberField label="Usable symbol fraction" value={input.symbolUseFactor} min={0} max={1} onChange={(symbolUseFactor) => set({ symbolUseFactor })} help="Reserves room for pilot symbols, calibration slots, or discarded training data." />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total loss" value={fmt(response.result.totalLossDb)} unit="dB" />
          <MetricCard label="Channel transmittance" value={fmt(response.result.channelTransmittance, 5)} />
          <MetricCard label="SNR" value={fmt(response.result.snr, 4)} />
          <MetricCard label="Secret-key-rate proxy" value={fmt(response.result.secretKeyRateHz)} unit="Hz" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Mutual information" value={fmt(response.result.mutualInformationAB, 5)} note="bits per use" />
          <MetricCard label="Holevo proxy" value={fmt(response.result.holevoBoundProxy, 5)} note="bits per use" />
          <MetricCard label="Covariance proxy" value={fmt(response.result.covarianceProxy, 5)} unit="SNU" />
          <MetricCard label="Correlation coefficient" value={percent(response.result.correlationCoefficient)} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Noise accounting in shot-noise units</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Line noise" value={fmt(response.result.lineNoiseSnu, 5)} unit="SNU" />
            <MetricCard label="Receiver-added noise" value={fmt(response.result.receiverAddedNoiseSnu, 5)} unit="SNU" />
            <MetricCard label="Trusted noise slice" value={fmt(response.result.trustedNoiseSnu, 5)} unit="SNU" />
            <MetricCard label="Untrusted noise slice" value={fmt(response.result.untrustedNoiseSnu, 5)} unit="SNU" />
            <MetricCard label="Total noise" value={fmt(response.result.totalNoiseSnu, 5)} unit="SNU" />
            <MetricCard label="Received quadrature variance" value={fmt(response.result.receivedQuadratureVarianceSnu, 5)} unit="SNU" />
          </div>
          <div className="mt-4">
            <ExportPanel
              title="CV-QKD estimator run"
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
            distanceKm: point.distanceKm,
            secretKeyRateHz: point.secretKeyRateHz
          }))}
          xKey="distanceKm"
          yKey="secretKeyRateHz"
          label="Distance vs secret-key-rate proxy"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            distanceKm: point.distanceKm,
            snr: point.snr
          }))}
          xKey="distanceKm"
          yKey="snr"
          label="Distance vs SNR"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            distanceKm: point.distanceKm,
            holevoProxy: point.holevoBoundProxy
          }))}
          xKey="distanceKm"
          yKey="holevoProxy"
          label="Distance vs Eve-information proxy"
        />
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={references}
    />
  );
}

export default CvQkdTool;
