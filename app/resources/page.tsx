import resources from "@/fixtures/resources.json";
import { ResourceDirectory } from "@/components/resource-directory";
import { CardLink, PageHeader, Section } from "@/components/ui";
import type { ResourceEntry } from "@/lib/resources/filter";

export default function ResourcesPage() {
  const total = resources.length;
  return (
    <main>
      <PageHeader eyebrow="Resources" title="Resource map" description={`${total} seeded resources for simulators, standards, protocols, guidance, and reproducibility workflows.`} />
      <Section title="Resource collections">
        <div className="grid gap-4 md:grid-cols-3">
          <CardLink href="/resources/simulators" title="Simulators">External quantum-network and QKD simulation frameworks.</CardLink>
          <CardLink href="/resources/standards" title="Standards">QKD, PQC, and key-management standards and guidance links.</CardLink>
          <CardLink href="/resources/protocols" title="Protocols">Protocol directory aligned with the Learn section.</CardLink>
        </div>
      </Section>
      <ResourceDirectory resources={resources as ResourceEntry[]} />
    </main>
  );
}
