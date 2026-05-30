import { PageHeader, Section } from "@/components/ui";

export default function ModelLimitationsPage() {
  return (
    <main>
      <PageHeader eyebrow="Resources" title="Model limitations" description="The MVP is built for transparent education and research estimation, not certified security or calibrated production engineering." />
      <Section title="Limitations">
        <ul className="grid gap-3 text-sm leading-6 text-slate-700">
          <li>Finite-key security proofs, composable security terms, detector dead time, afterpulsing, and hardware side channels are simplified or omitted.</li>
          <li>Attack modules are simulation-only educational risk proxies and avoid operational instructions for deployed systems.</li>
          <li>Network routing, fidelity, and repeater models are scalar proxies rather than discrete-event quantum-network simulation.</li>
          <li>Mock key material is a demo-only string and must not be used for production secrets.</li>
        </ul>
      </Section>
    </main>
  );
}
