"use client";

import { useId, useMemo, useState } from "react";
import {
  buildBb84LabSummary,
  buildBb84TeachingLab,
  buildE91LabSummary,
  buildE91TeachingLab,
  buildTeachingLabExport,
  type TeachingLabAnswer,
  type TeachingLabQuestion,
  type TeachingLabWorksheet
} from "@/lib/learnLabs";
import { Button, MetricCard, NumberField, SecondaryButton, TextAreaField } from "@/components/ui";

function triggerDownload(filename: string, content: string, mimeType: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function downloadWorksheet(worksheet: TeachingLabWorksheet, answers: TeachingLabAnswer[], format: "json" | "markdown") {
  const exported = buildTeachingLabExport(worksheet, answers, format);
  triggerDownload(exported.filename, exported.content, exported.mimeType);
}

function setWorksheetAnswer(
  current: TeachingLabAnswer[],
  id: string,
  response: string
) {
  const next = current.filter((answer) => answer.id !== id);
  next.push({ id, response });
  return next;
}

function WorksheetFields({
  questions,
  answers,
  onAnswer
}: {
  questions: TeachingLabQuestion[];
  answers: TeachingLabAnswer[];
  onAnswer: (id: string, response: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ink">Question {index + 1}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{question.prompt}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Expected observation: {question.expectedObservation}</p>
          <div className="mt-3">
            <TextAreaField
              label={`Your answer for question ${index + 1}`}
              value={answers.find((answer) => answer.id === question.id)?.response ?? ""}
              onChange={(response) => onAnswer(question.id, response)}
              rows={4}
              help="Keep the answer evidence-based and tied to the displayed metrics or table rather than claiming certified security."
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BB84TeachingLab() {
  const [eveFraction, setEveFraction] = useState(0.1);
  const [answers, setAnswers] = useState<TeachingLabAnswer[]>([]);
  const summaryId = useId();
  const summary = useMemo(() => buildBb84LabSummary({ eveFraction }), [eveFraction]);
  const worksheet = useMemo(() => buildBb84TeachingLab({ eveFraction }), [eveFraction]);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[260px,1fr]">
          <NumberField label="Eve/intercept fraction" value={eveFraction} min={0} max={1} onChange={setEveFraction} />
          <div className="grid gap-3 md:grid-cols-3">
            {worksheet.metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {worksheet.steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyanline">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
        <p id={summaryId} className="mt-4 text-sm leading-6 text-slate-600">
          The worksheet table below records the same 16-bit teaching trace used to compute {worksheet.metrics[0]?.value} sifted bits and a {(summary.qber * 100).toFixed(1)}% QBER proxy.
          Use it to justify each worksheet answer from visible evidence rather than from generalized security claims.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" aria-describedby={summaryId}>
            <caption className="pb-2 text-left text-xs leading-5 text-slate-500">
              BB84 worksheet trace with row-level intercept flags, sifted-bit retention, and error outcomes for the current teaching preset.
            </caption>
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">i</th>
                <th>Alice bit</th>
                <th>Alice basis</th>
                <th>Bob basis</th>
                <th>Bob bit</th>
                <th>Eve touched</th>
                <th>Kept</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.rows.map((row) => (
                <tr key={row.index}>
                  <td className="py-2">{row.index}</td>
                  <td>{row.aliceBit}</td>
                  <td>{row.aliceBasis}</td>
                  <td>{row.bobBasis}</td>
                  <td>{row.bobBit}</td>
                  <td>{row.eveTouches ? "yes" : "no"}</td>
                  <td>{row.kept ? "yes" : "no"}</td>
                  <td>{row.error ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{worksheet.caution}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Worksheet mode</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Capture observations, then export the answers as reproducible JSON or Markdown for lab handoff.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => downloadWorksheet(worksheet, answers, "json")}>Export JSON</SecondaryButton>
            <Button onClick={() => downloadWorksheet(worksheet, answers, "markdown")}>Export Markdown</Button>
          </div>
        </div>
        <div className="mt-4">
          <WorksheetFields
            questions={worksheet.questions}
            answers={answers}
            onAnswer={(id, response) => setAnswers((current) => setWorksheetAnswer(current, id, response))}
          />
        </div>
      </div>
    </div>
  );
}

export function E91TeachingLab() {
  const [visibility, setVisibility] = useState(0.94);
  const [noiseFraction, setNoiseFraction] = useState(0.02);
  const [answers, setAnswers] = useState<TeachingLabAnswer[]>([]);
  const summary = useMemo(() => buildE91LabSummary({ visibility, noiseFraction }), [visibility, noiseFraction]);
  const worksheet = useMemo(() => buildE91TeachingLab({ visibility, noiseFraction }), [visibility, noiseFraction]);

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[220px,220px,1fr]">
          <NumberField label="Visibility" value={visibility} min={0} max={1} onChange={setVisibility} />
          <NumberField label="Noise fraction" value={noiseFraction} min={0} max={1} onChange={setNoiseFraction} />
          <div className="grid gap-3 md:grid-cols-3">
            {worksheet.metrics.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {worksheet.steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyanline">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-ink">Bell-style interpretation</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            The current CHSH-style score is <span className="font-semibold">{summary.chshScore.toFixed(3)}</span>, which is{" "}
            <span className="font-semibold">{summary.indicator}</span> the classical threshold of 2. The margin is{" "}
            {summary.bellViolationMargin.toFixed(3)}.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{worksheet.caution}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Worksheet mode</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Record what changed in the Bell indicator and export the answers for teaching-lab review.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => downloadWorksheet(worksheet, answers, "json")}>Export JSON</SecondaryButton>
            <Button onClick={() => downloadWorksheet(worksheet, answers, "markdown")}>Export Markdown</Button>
          </div>
        </div>
        <div className="mt-4">
          <WorksheetFields
            questions={worksheet.questions}
            answers={answers}
            onAnswer={(id, response) => setAnswers((current) => setWorksheetAnswer(current, id, response))}
          />
        </div>
      </div>
    </div>
  );
}
