import resources from "@/fixtures/resources.json";
import { CardLink, PageHeader, Section } from "@/components/ui";

export default function StandardsPage() {
  const standards = resources.filter((resource) => ["standard", "standardization", "guidance"].includes(resource.type));
  return (
    <main>
      <PageHeader eyebrow="Resources" title="Standards and guidance" description="Official standards, guidance, and standardization projects relevant to QKD, QKD networks, KMS, and PQC migration." />
      <Section title="Seeded references">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {standards.map((resource) => <CardLink key={resource.id} href={resource.url} title={resource.name}>{resource.summary}</CardLink>)}
        </div>
      </Section>
    </main>
  );
}
