import { CardLink, PageHeader, Section } from "@/components/ui";
import { protocolList } from "@/lib/content";

export default function ProtocolResourcesPage() {
  return (
    <main>
      <PageHeader eyebrow="Resources" title="Protocol map" description="Protocol and primitive references used by the Learn section and tool copy." />
      <Section title="Protocols">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {protocolList.map((protocol) => <CardLink key={protocol.id} href={`/learn/${protocol.id}`} title={protocol.name}>{protocol.summary}</CardLink>)}
        </div>
      </Section>
    </main>
  );
}
