import Link from "next/link";
import { useId } from "react";
import type { ModelWarning } from "@/lib/types";

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-5 py-10">
      {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-cyanline">{eyebrow}</p> : null}
      <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-ink md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
    </header>
  );
}

export function CardLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-cyanline focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </Link>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ToolShell({
  title,
  description,
  inputs,
  results,
  formulas,
  references
}: {
  title: string;
  description: string;
  inputs: React.ReactNode;
  results: React.ReactNode;
  formulas?: React.ReactNode;
  references?: string[];
}) {
  return (
    <main>
      <PageHeader eyebrow="Workbench tool" title={title} description={description} />
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 pb-10 lg:grid-cols-[380px,1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">{inputs}</div>
        <div className="space-y-5" aria-live="polite">{results}</div>
      </section>
      {formulas ? (
        <Section title="Formulas and assumptions">
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700">{formulas}</div>
        </Section>
      ) : null}
      {references?.length ? (
        <Section title="References">
          <ul className="grid gap-2 text-sm text-slate-700">
            {references.map((reference) => (
              <li key={reference}>{reference}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </main>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  unit,
  help
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  unit?: string;
  help?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;

  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-ink" id={`${id}-label`}>
        {label}
        {unit ? <span className="text-xs font-normal text-slate-500">{unit}</span> : null}
      </span>
      <input
        id={id}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cyanline focus:ring-2 focus:ring-cyan-100"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={helpId}
      />
      {help ? <span id={helpId} className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  help
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;

  return (
    <label className="block">
      <span className="text-sm font-medium text-ink" id={`${id}-label`}>{label}</span>
      <input
        id={id}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cyanline focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={helpId}
      />
      {help ? <span id={helpId} className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  help,
  rows = 8,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  rows?: number;
  error?: string;
}) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <label className="block">
      <span className="text-sm font-medium text-ink" id={`${id}-label`}>{label}</span>
      <textarea
        id={id}
        rows={rows}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cyanline focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
      />
      {help ? <span id={`${id}-help`} className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
      {error ? <span id={`${id}-error`} className="mt-1 block text-xs leading-5 text-rose-700">{error}</span> : null}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  help
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  help?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;

  return (
    <label className="block">
      <span className="text-sm font-medium text-ink" id={`${id}-label`}>{label}</span>
      <select
        id={id}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cyanline focus:ring-2 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-describedby={helpId}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {help ? <span id={helpId} className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  help
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={helpId}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyanline focus:ring-2 focus:ring-cyanline"
        />
        <span>
          <span className="block text-sm font-medium text-ink">{label}</span>
          {help ? <span id={helpId} className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
        </span>
      </label>
    </div>
  );
}

export function MetricCard({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-ink">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span> : null}
      </p>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

export function WarningPanel({ warnings }: { warnings: ModelWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        No model warnings for the current inputs.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-950">Warnings and cautions</h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950">
        {warnings.map((warning) => (
          <li key={`${warning.code}-${warning.message}`}>{warning.severity}: {warning.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function SimpleLineChart({
  points,
  xKey,
  yKey,
  label
}: {
  points: Array<Record<string, number>>;
  xKey: string;
  yKey: string;
  label: string;
}) {
  const chartId = useId();
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No chart data is available for the current inputs. Adjust the preset or input values to generate a sweep.
        </p>
      </div>
    );
  }

  const width = 720;
  const height = 220;
  const padding = 36;
  const xs = points.map((point) => point[xKey]);
  const ys = points.map((point) => point[yKey]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const safeX = Math.max(maxX - minX, 1e-9);
  const safeY = Math.max(maxY - minY, 1e-9);
  const midPoint = points[Math.floor(points.length / 2)];
  const summary = `${xKey} spans ${minX.toPrecision(3)} to ${maxX.toPrecision(3)} while ${yKey} spans ${minY.toPrecision(3)} to ${maxY.toPrecision(3)}. Midpoint sample: ${xKey} ${midPoint[xKey].toPrecision(3)}, ${yKey} ${midPoint[yKey].toPrecision(3)}.`;
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;
  const summaryId = `${chartId}-summary`;
  const d = points.map((point, index) => {
    const x = padding + ((point[xKey] - minX) / safeX) * (width - padding * 2);
    const y = height - padding - ((point[yKey] - minY) / safeY) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="text-sm font-semibold text-ink">{label}</figcaption>
      <svg
        className="mt-3 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={`${descId} ${summaryId}`}
      >
        <title id={titleId}>{label}</title>
        <desc id={descId}>{summary}</desc>
        <rect x="0" y="0" width={width} height={height} rx="6" fill="#f8fafc" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#cbd5e1" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
        <path d={d} fill="none" stroke="#0e7490" strokeWidth="3" />
      </svg>
      <p id={summaryId} className="mt-2 text-xs text-slate-500">
        {summary}
      </p>
    </figure>
  );
}

export function SimpleBandChart({
  points,
  xKey,
  lowKey,
  midKey,
  highKey,
  label
}: {
  points: Array<Record<string, number>>;
  xKey: string;
  lowKey: string;
  midKey: string;
  highKey: string;
  label: string;
}) {
  const chartId = useId();
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No uncertainty-band data is available for the current inputs. Adjust the preset or finite-key parameters to regenerate the teaching sweep.
        </p>
      </div>
    );
  }

  const width = 720;
  const height = 220;
  const padding = 36;
  const xs = points.map((point) => point[xKey]);
  const ys = points.flatMap((point) => [point[lowKey], point[midKey], point[highKey]]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const safeX = Math.max(maxX - minX, 1e-9);
  const safeY = Math.max(maxY - minY, 1e-9);
  const midPoint = points[Math.floor(points.length / 2)];
  const summary = `${xKey} spans ${minX.toPrecision(3)} to ${maxX.toPrecision(3)} while the band spans ${minY.toPrecision(3)} to ${maxY.toPrecision(3)}. Midpoint sample: ${xKey} ${midPoint[xKey].toPrecision(3)}, optimistic ${midPoint[highKey].toPrecision(3)}, baseline ${midPoint[midKey].toPrecision(3)}, conservative ${midPoint[lowKey].toPrecision(3)}.`;
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;
  const summaryId = `${chartId}-summary`;

  const pointToCoords = (point: Record<string, number>, yKey: string) => {
    const x = padding + ((point[xKey] - minX) / safeX) * (width - padding * 2);
    const y = height - padding - ((point[yKey] - minY) / safeY) * (height - padding * 2);
    return { x, y };
  };

  const linePath = (yKey: string) => points.map((point, index) => {
    const { x, y } = pointToCoords(point, yKey);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const areaPath = `${points.map((point, index) => {
    const { x, y } = pointToCoords(point, highKey);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ")} ${points.slice().reverse().map((point) => {
    const { x, y } = pointToCoords(point, lowKey);
    return `L${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ")} Z`;

  return (
    <figure className="rounded-lg border border-slate-200 bg-white p-4">
      <figcaption className="text-sm font-semibold text-ink">{label}</figcaption>
      <svg
        className="mt-3 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={`${descId} ${summaryId}`}
      >
        <title id={titleId}>{label}</title>
        <desc id={descId}>{summary}</desc>
        <rect x="0" y="0" width={width} height={height} rx="6" fill="#f8fafc" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#cbd5e1" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
        <path d={areaPath} fill="#67e8f9" fillOpacity="0.25" stroke="none" />
        <path d={linePath(highKey)} fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="6 5" />
        <path d={linePath(midKey)} fill="none" stroke="#0f766e" strokeWidth="3" />
        <path d={linePath(lowKey)} fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="2 4" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span><span className="font-semibold text-slate-800">Optimistic</span> uses observed QBER only.</span>
        <span><span className="font-semibold text-slate-800">Baseline</span> adds parameter-estimation slack.</span>
        <span><span className="font-semibold text-slate-800">Conservative</span> adds the full finite-key QBER slack.</span>
      </div>
      <p id={summaryId} className="mt-2 text-xs text-slate-500">
        {summary}
      </p>
    </figure>
  );
}

export function LoadingState({
  title = "Loading workbench view",
  message = "Preparing calibrated controls, default presets, and explanatory notes."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = "Workbench section unavailable",
  message,
  retryLabel = "Try the page again"
}: {
  title?: string;
  message: string;
  retryLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-950" role="alert">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-rose-800">{retryLabel}</p>
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-cyanline focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
    >
      {children}
    </button>
  );
}
