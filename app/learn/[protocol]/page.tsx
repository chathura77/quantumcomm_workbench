import Link from "next/link";
import { notFound } from "next/navigation";
import { BB84MiniDemo, E91MiniDemo } from "@/components/learn-demos";
import { BB84TeachingLab, E91TeachingLab } from "@/components/teaching-labs";
import { PageHeader, Section } from "@/components/ui";
import { protocolDetails } from "@/lib/content";

type ProtocolKey = keyof typeof protocolDetails;

const aliases: Record<string, ProtocolKey> = {
  "mdi-qkd": "mdi_qkd",
  "cv-qkd": "cv_qkd",
  "tf-qkd": "tf_qkd",
  "decoy-bb84": "decoy_bb84",
  "entanglement-swapping": "entanglement_swapping",
  "quantum-repeaters": "repeaters"
};

export function generateStaticParams() {
  return Object.keys(protocolDetails).map((protocol) => ({ protocol }));
}

export default async function ProtocolPage({ params }: { params: Promise<{ protocol: string }> }) {
  const { protocol: protocolParam } = await params;
  const key = (aliases[protocolParam] ?? protocolParam) as ProtocolKey;
  const protocol = protocolDetails[key];
  if (!protocol) notFound();

  return (
    <main>
      <PageHeader eyebrow={protocol.category} title={protocol.name} description={protocol.summary} />
      <Section title="Core idea"><p className="max-w-3xl text-sm leading-6 text-slate-700">{protocol.coreIdea}</p></Section>
      <Section title="Minimal mathematics"><p className="max-w-3xl text-sm leading-6 text-slate-700">{protocol.math}</p></Section>
      {protocol.id === "bb84" ? <Section title="Interactive demo"><BB84MiniDemo /></Section> : null}
      {protocol.id === "e91" ? <Section title="Interactive demo"><E91MiniDemo /></Section> : null}
      {protocol.id === "bb84" ? (
        <Section title="Guided lab" description="Worksheet mode captures observations from the BB84 mini-demo and exports them as reproducible notes.">
          <BB84TeachingLab />
        </Section>
      ) : null}
      {protocol.id === "e91" ? (
        <Section title="Guided lab" description="This E91 worksheet keeps the Bell-style lesson short, explicit, and exportable without overstating the security claim.">
          <E91TeachingLab />
        </Section>
      ) : null}
      <Section title="Typical assumptions">
        <ul className="grid gap-2 text-sm text-slate-700">{protocol.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
      </Section>
      <Section title="Common failure modes">
        <ul className="grid gap-2 text-sm text-slate-700">{protocol.failureModes.map((item) => <li key={item}>{item}</li>)}</ul>
      </Section>
      <Section title="Related tools">
        <div className="flex flex-wrap gap-2">{protocol.relatedTools.map((href) => <Link key={href} href={href} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-ink hover:border-cyanline">{href}</Link>)}</div>
      </Section>
      <Section title="References">
        <ul className="grid gap-2 text-sm text-slate-700">{protocol.references.map((item) => <li key={item}>{item}</li>)}</ul>
      </Section>
    </main>
  );
}
