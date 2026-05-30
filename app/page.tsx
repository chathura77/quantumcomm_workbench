import Link from "next/link";
import { CardLink, PageHeader, Section } from "@/components/ui";
import { disclaimer, networkTools, toolGroups } from "@/lib/content";

export default function HomePage() {
  return (
    <main>
      <PageHeader
        eyebrow="QuantumComm Workbench"
        title="Quantum communication tools from photon link to network scenario."
        description="A browser-based workbench for cautious QKD estimates, protocol learning, mock key-delivery integration, and quantum-network scenario exploration."
      />
      <Section title="Main sections">
        <div className="grid gap-4 md:grid-cols-4">
          <CardLink href="/learn" title="Learn">Protocol explainers and compact interactive demos.</CardLink>
          <CardLink href="/tools" title="Tools">Engineering calculators, API mocks, standards checks, and reports.</CardLink>
          <CardLink href="/networks" title="Networks">Scenario builder, routing, repeater optimization, and benchmarks.</CardLink>
          <CardLink href="/resources" title="Resources">Curated simulators, standards, protocols, and model cautions.</CardLink>
        </div>
      </Section>
      <Section title="Flagship workflow" description="A complete MVP path from optical link assumptions to application key consumption and network scenario export.">
        <div className="grid gap-4 md:grid-cols-3">
          <CardLink href="/tools/qkd-engineering-lab" title="QKD Engineering Lab">Combine link budget, QBER, post-processing, and risk proxies.</CardLink>
          <CardLink href="/tools/etsi-api-sandbox" title="API/KMS Sandbox">Request demo-only keys, watch exhaustion, and simulate consumption.</CardLink>
          <CardLink href="/networks/scenario-builder" title="Scenario Builder">Import, validate, and export quantum-network topology JSON.</CardLink>
        </div>
      </Section>
      <Section title="Available tools">
        <div className="grid gap-5 lg:grid-cols-3">
          {toolGroups.map((group) => (
            <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">{group.title}</h3>
              <div className="mt-4 grid gap-2">
                {group.tools.map((tool) => <Link key={tool.href} href={tool.href} className="text-sm font-medium text-cyanline hover:text-ink">{tool.label}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Network workbench">
        <div className="grid gap-4 md:grid-cols-4">
          {networkTools.map((tool) => <CardLink key={tool.href} href={tool.href} title={tool.label}>{tool.summary}</CardLink>)}
        </div>
      </Section>
      <Section title="Disclaimer">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{disclaimer}</div>
      </Section>
    </main>
  );
}
