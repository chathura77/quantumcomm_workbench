import { LoadingState, PageHeader, Section } from "@/components/ui";

export default function Loading() {
  return (
    <main>
      <PageHeader
        eyebrow="Resources"
        title="Standards, simulators, and protocol references"
        description="Loading the fixture-backed directory, filters, and model-limitation links."
      />
      <Section title="Preparing resource directory">
        <LoadingState />
      </Section>
    </main>
  );
}
