"use client";

import { useMemo, useState } from "react";
import presetsJson from "@/fixtures/presets.json";
import { buildRunReport } from "@/lib/export/report";
import { createSavedRunRecord, SAVED_RUNS_STORAGE_KEY, sortSavedRuns } from "@/lib/export/savedRuns";
import { estimateEntanglementQkd } from "@/lib/qkd/entanglementQkd";
import type { EntanglementProtocol, EntanglementQkdInput, ModelWarning, SavedWorkbenchRun } from "@/lib/types";
import { MetricCard, NumberField, SecondaryButton, SelectField, SimpleLineChart, ToolShell, WarningPanel } from "@/components/ui";

const entanglementPresets = (presetsJson.entanglementQkd as unknown) as Array<{ id: string; name: string; input: EntanglementQkdInput }>;

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
  input: EntanglementQkdInput;
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
      toolId: "entanglement-qkd-estimator",
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
        toolId: "entanglement-qkd-estimator",
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

export function EntanglementQkdTool() {
  const [input, setInput] = useState<EntanglementQkdInput>(entanglementPresets[0].input);
  const response = useMemo(() => estimateEntanglementQkd(input), [input]);
  const set = (patch: Partial<EntanglementQkdInput>) => setInput((current) => ({ ...current, ...patch }));
  const formulas = [
    "loss_A = alpha L_A + L_ins,A, loss_B = alpha L_B + L_ins,B",
    "eta_A = eta_det,A 10^(-loss_A / 10), eta_B = eta_det,B 10^(-loss_B / 10)",
    "p_pair,coll = p_emit eta_A eta_B",
    "p_acc = w_c R_pair [p_pair,coll (p_noise,A + p_noise,B) + p_noise,A p_noise,B]",
    "Q = (p_pair,coll ((1 - V_eff)/2 + e_det) + 0.5 p_acc) / max(p_pair,coll + p_acc, epsilon)",
    "S_CHSH = 2 sqrt(2) V_eff max(0, 1 - 2Q)",
    "R = R_pair q_basis k_gen max(0, 1 - f_ec h2(Q) - h2(Q)) (p_pair,coll + p_acc)"
  ];
  const references = [
    "Ekert (1991) entanglement-based QKD and Bell-correlation motivation.",
    "Bennett, Brassard, and Mermin (1992) BBM92 entanglement-based key distribution.",
    "Entanglement-based QKD reviews covering source visibility, accidental coincidences, and detector assumptions."
  ];

  return (
    <ToolShell
      title="Entanglement-based BBM92 and E91 estimator"
      description="Estimate source-in-the-middle coincidence rates, QBER, and Bell-correlation teaching outputs while keeping entanglement-based assumptions separate from prepare-and-measure BB84."
      inputs={fieldList(<>
        <SelectField
          label="Preset"
          value="custom"
          onChange={(id) => {
            const preset = entanglementPresets.find((item) => item.id === id);
            if (preset) setInput(preset.input);
          }}
          options={[{ value: "custom", label: "Custom/current" }, ...entanglementPresets.map((preset) => ({ value: preset.id, label: preset.name }))]}
        />
        <SelectField
          label="Protocol"
          value={input.protocol}
          onChange={(protocol) => set({ protocol: protocol as EntanglementProtocol })}
          options={[
            { value: "bbm92", label: "BBM92" },
            { value: "e91", label: "E91" }
          ]}
          help="Both modes use the same entangled-pair link model here, but E91 reserves more samples for Bell-correlation monitoring."
        />
        <NumberField label="Alice arm length" unit="km" value={input.aliceLengthKm} min={0} onChange={(aliceLengthKm) => set({ aliceLengthKm })} />
        <NumberField label="Bob arm length" unit="km" value={input.bobLengthKm} min={0} onChange={(bobLengthKm) => set({ bobLengthKm })} />
        <NumberField label="Fiber attenuation" unit="dB/km" value={input.fiberLossDbPerKm} min={0} onChange={(fiberLossDbPerKm) => set({ fiberLossDbPerKm })} />
        <NumberField label="Alice insertion loss" unit="dB" value={input.aliceInsertionLossDb} min={0} onChange={(aliceInsertionLossDb) => set({ aliceInsertionLossDb })} />
        <NumberField label="Bob insertion loss" unit="dB" value={input.bobInsertionLossDb} min={0} onChange={(bobInsertionLossDb) => set({ bobInsertionLossDb })} />
        <NumberField label="Pair generation rate" unit="Hz" value={input.pairGenerationRateHz} min={1} onChange={(pairGenerationRateHz) => set({ pairGenerationRateHz })} />
        <NumberField label="Pair emission probability" value={input.pairEmissionProbability} min={0} max={1} onChange={(pairEmissionProbability) => set({ pairEmissionProbability })} help="Probability that the source emits a usable entangled pair in each attempt." />
        <NumberField label="Source visibility" value={input.sourceVisibility} min={0} max={1} onChange={(sourceVisibility) => set({ sourceVisibility })} help="Bundles interferometric visibility, polarization alignment, and mode overlap into a single entanglement-quality proxy." />
        <NumberField label="Bell-state fidelity" value={input.sourceBellStateFidelity} min={0} max={1} onChange={(sourceBellStateFidelity) => set({ sourceBellStateFidelity })} help="Maps source quality into the CHSH and QBER teaching proxies without claiming state tomography." />
        <NumberField label="Alice detector efficiency" value={input.detectorEfficiencyAlice} min={0} max={1} onChange={(detectorEfficiencyAlice) => set({ detectorEfficiencyAlice })} />
        <NumberField label="Bob detector efficiency" value={input.detectorEfficiencyBob} min={0} max={1} onChange={(detectorEfficiencyBob) => set({ detectorEfficiencyBob })} />
        <NumberField label="Alice dark count probability" value={input.darkCountProbabilityAlice} min={0} max={1} onChange={(darkCountProbabilityAlice) => set({ darkCountProbabilityAlice })} />
        <NumberField label="Bob dark count probability" value={input.darkCountProbabilityBob} min={0} max={1} onChange={(darkCountProbabilityBob) => set({ darkCountProbabilityBob })} />
        <NumberField label="Alice background probability" value={input.backgroundCountProbabilityAlice} min={0} max={1} onChange={(backgroundCountProbabilityAlice) => set({ backgroundCountProbabilityAlice })} />
        <NumberField label="Bob background probability" value={input.backgroundCountProbabilityBob} min={0} max={1} onChange={(backgroundCountProbabilityBob) => set({ backgroundCountProbabilityBob })} />
        <NumberField label="Coincidence window" unit="ns" value={input.coincidenceWindowNs} min={0} onChange={(coincidenceWindowNs) => set({ coincidenceWindowNs })} help="Wider coincidence windows increase accidental-pair proxies and should be interpreted cautiously." />
        <NumberField label="Misalignment error" value={input.misalignmentError} min={0} max={0.5} onChange={(misalignmentError) => set({ misalignmentError })} />
        <NumberField label="Basis sifting factor" value={input.basisSiftingFactor} min={0} max={1} onChange={(basisSiftingFactor) => set({ basisSiftingFactor })} />
        <NumberField label="Bell-test sample fraction" value={input.bellTestFraction} min={0} max={0.5} onChange={(bellTestFraction) => set({ bellTestFraction })} help="For E91 this reserves detected pairs for Bell-style monitoring; BBM92 uses it as a lighter parameter-estimation reserve." />
        <NumberField label="Reconciliation efficiency" value={input.reconciliationEfficiency} min={1} max={5} onChange={(reconciliationEfficiency) => set({ reconciliationEfficiency })} />
        <NumberField label="Block size" unit="attempts" value={input.blockSize} min={1} onChange={(blockSize) => set({ blockSize: Math.floor(blockSize) })} />
      </>)}
      results={<>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total span" value={fmt(response.result.totalDistanceKm)} unit="km" />
          <MetricCard label="Coincidence probability" value={percent(response.result.coincidenceProbability)} />
          <MetricCard label="QBER proxy" value={percent(response.result.qber)} />
          <MetricCard label="Secret-key-rate proxy" value={fmt(response.result.secretKeyRateHz)} unit="Hz" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="CHSH score proxy" value={fmt(response.result.chshScore, 5)} note="Classical threshold is 2 for E91-style monitoring." />
          <MetricCard label="Bell-violation margin" value={fmt(response.result.bellViolationMargin, 5)} />
          <MetricCard label="Effective visibility" value={percent(response.result.effectiveVisibility)} />
          <MetricCard label="Key-generation fraction" value={percent(response.result.keyGenerationFraction)} note="After Bell-test or parameter-estimation reservations." />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Entangled-pair link accounting</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Alice arm loss" value={fmt(response.result.aliceTotalLossDb)} unit="dB" />
            <MetricCard label="Bob arm loss" value={fmt(response.result.bobTotalLossDb)} unit="dB" />
            <MetricCard label="Pair collection probability" value={percent(response.result.pairCollectionProbability)} />
            <MetricCard label="Accidental coincidences" value={percent(response.result.accidentalCoincidenceProbability)} />
            <MetricCard label="Estimated coincidences" value={response.result.estimatedPairsPerBlock} unit="per block" />
            <MetricCard label="Key-generation pairs" value={response.result.keyGenerationPairsPerBlock} unit="per block" />
          </div>
          <div className="mt-4">
            <ExportPanel
              title="Entanglement-based QKD estimator run"
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
          label="Distance vs secret-key-rate proxy"
        />
        <SimpleLineChart
          points={response.result.distanceSweep.map((point) => ({
            totalDistanceKm: point.totalDistanceKm,
            chshScore: point.chshScore
          }))}
          xKey="totalDistanceKm"
          yKey="chshScore"
          label="Distance vs CHSH-style Bell score"
        />
        <WarningPanel warnings={response.warnings} />
      </>}
      formulas={<AssumptionList items={response.assumptions} />}
      references={references}
    />
  );
}
