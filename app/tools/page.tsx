import { CardLink, PageHeader, Section } from "@/components/ui";
import { toolGroups } from "@/lib/content";

export default function ToolsPage() {
  return (
    <main>
      <PageHeader eyebrow="Tools" title="Engineering and research workbench" description="Editable calculators and sandboxes that expose assumptions, warnings, and exportable results." />
      {toolGroups.map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.tools.map((tool) => <CardLink key={tool.href} href={tool.href} title={tool.label}>{tool.summary}</CardLink>)}
          </div>
        </Section>
      ))}
    </main>
  );
}
