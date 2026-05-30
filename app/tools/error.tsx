"use client";

import { ErrorState, PageHeader, Section } from "@/components/ui";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <PageHeader
        eyebrow="Tools"
        title="Engineering and research workbench"
        description="The selected tool could not be rendered. Inputs and presets are not persisted across an error refresh."
      />
      <Section title="Tool error">
        <div className="space-y-4">
          <ErrorState
            message={error.message || "An unexpected render error interrupted this tool view."}
            retryLabel="Use the reset action or reload the page"
          />
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2"
          >
            Reset tool view
          </button>
        </div>
      </Section>
    </main>
  );
}
