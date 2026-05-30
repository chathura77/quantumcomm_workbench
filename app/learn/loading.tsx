import { LoadingState, PageHeader, Section } from "@/components/ui";

export default function Loading() {
  return (
    <main>
      <PageHeader
        eyebrow="Learn"
        title="Protocol explainers and guided context"
        description="Loading protocol summaries, references, and related workbench links."
      />
      <Section title="Preparing learning view">
        <LoadingState />
      </Section>
    </main>
  );
}
