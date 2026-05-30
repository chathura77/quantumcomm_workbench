import { LoadingState, PageHeader, Section } from "@/components/ui";

export default function Loading() {
  return (
    <main>
      <PageHeader
        eyebrow="Tools"
        title="Engineering and research workbench"
        description="Loading the selected calculator, defaults, and scientific caution notes."
      />
      <Section title="Preparing tool">
        <LoadingState />
      </Section>
    </main>
  );
}
