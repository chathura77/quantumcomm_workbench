import { CardLink, PageHeader, Section } from "@/components/ui";
import { networkTools } from "@/lib/content";

export default function NetworksPage() {
  return (
    <main>
      <PageHeader eyebrow="Networks" title="Quantum-network scenario tools" description="Build scenarios, rank entanglement routes, explore repeater chains, and export benchmark-ready topology JSON." />
      <Section title="Network tools">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {networkTools.map((tool) => <CardLink key={tool.href} href={tool.href} title={tool.label}>{tool.summary}</CardLink>)}
        </div>
      </Section>
    </main>
  );
}
