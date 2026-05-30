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
        eyebrow="Networks"
        title="Quantum-network scenario tools"
        description="The requested network view failed to load. Check the scenario data and reload the page."
      />
      <Section title="Network view error">
        <div className="space-y-4">
          <ErrorState
            message={error.message || "An unexpected render error interrupted the network tools."}
            retryLabel="Use the reset action or reload the page"
          />
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2"
          >
            Reset network view
          </button>
        </div>
      </Section>
    </main>
  );
}
