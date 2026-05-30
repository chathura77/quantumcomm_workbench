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
        eyebrow="Resources"
        title="Standards, simulators, and protocol references"
        description="The resource directory could not be rendered. Retry the page to restore the filters and links."
      />
      <Section title="Resource view error">
        <div className="space-y-4">
          <ErrorState
            message={error.message || "An unexpected render error interrupted the resource directory."}
            retryLabel="Use the reset action or reload the page"
          />
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyanline focus:ring-offset-2"
          >
            Reset resource view
          </button>
        </div>
      </Section>
    </main>
  );
}
