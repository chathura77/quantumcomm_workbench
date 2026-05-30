"use client";

import { useMemo, useState } from "react";
import { CardLink, EmptyState, Section, SelectField, TextField } from "@/components/ui";
import { filterResources, listResourceTags, listResourceTypes, type ResourceEntry } from "@/lib/resources/filter";

export function ResourceDirectory({ resources }: { resources: ResourceEntry[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [tag, setTag] = useState("all");

  const typeOptions = useMemo(
    () => [{ value: "all", label: "All types" }, ...listResourceTypes(resources).map((value) => ({ value, label: value }))],
    [resources]
  );
  const tagOptions = useMemo(
    () => [{ value: "all", label: "All tags" }, ...listResourceTags(resources).map((value) => ({ value, label: value }))],
    [resources]
  );
  const filtered = useMemo(() => filterResources(resources, { query, type, tag }), [query, resources, tag, type]);

  return (
    <>
      <Section title="Search and filter" description="Use fixture-backed filters to narrow simulator, standards, and protocol references by topic before opening source material.">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-3">
          <TextField label="Search resources" value={query} onChange={setQuery} help="Matches resource names, summaries, types, and tags." />
          <SelectField label="Type" value={type} onChange={setType} options={typeOptions} />
          <SelectField label="Tag" value={tag} onChange={setTag} options={tagOptions} />
        </div>
      </Section>
      <Section title="Filtered resources" description={`${filtered.length} of ${resources.length} seeded references match the current filters.`}>
        {filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((resource) => (
              <CardLink key={resource.id} href={resource.url} title={resource.name}>
                {resource.summary}
              </CardLink>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No resources match the current filters"
            message="Broaden the search text or clear the type and tag filters to restore the seeded standards, simulator, and protocol references."
          />
        )}
      </Section>
    </>
  );
}
