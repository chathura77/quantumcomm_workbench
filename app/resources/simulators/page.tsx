import resources from "@/fixtures/resources.json";
import { CardLink, PageHeader, Section } from "@/components/ui";

export default function SimulatorsPage() {
  const simulators = resources.filter((resource) => resource.tags.includes("simulator") || resource.type === "simulator");
  return (
    <main>
      <PageHeader eyebrow="Resources" title="Simulator map" description="External simulators are listed as references; the MVP does not execute them in-browser." />
      <Section title="Simulators">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {simulators.map((resource) => <CardLink key={resource.id} href={resource.url} title={resource.name}>{resource.summary}</CardLink>)}
        </div>
      </Section>
    </main>
  );
}
