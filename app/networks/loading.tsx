import { LoadingState, PageHeader, Section } from "@/components/ui";

export default function Loading() {
  return (
    <main>
      <PageHeader
        eyebrow="Networks"
        title="Quantum-network scenario tools"
        description="Loading scenario controls, sample topologies, and routing assumptions."
      />
      <Section title="Preparing network view">
        <LoadingState />
      </Section>
    </main>
  );
}
