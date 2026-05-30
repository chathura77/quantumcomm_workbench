import { CardLink, PageHeader, Section } from "@/components/ui";
import { protocolList } from "@/lib/content";

export default function LearnPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Learn"
        title="Protocol directory"
        description="Compact explainers for QKD protocols and quantum communication primitives, with cautious assumptions and related tools."
      />
      <Section title="Protocols and primitives">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {protocolList.map((protocol) => (
            <CardLink key={protocol.id} href={`/learn/${protocol.id}`} title={protocol.name}>
              {protocol.summary}
            </CardLink>
          ))}
        </div>
      </Section>
    </main>
  );
}
