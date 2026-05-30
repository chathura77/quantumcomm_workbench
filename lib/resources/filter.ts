export type ResourceEntry = {
  id: string;
  name: string;
  type: string;
  url: string;
  summary: string;
  tags: string[];
};

export type ResourceFilterInput = {
  query?: string;
  type?: string;
  tag?: string;
};

export function filterResources(resources: ResourceEntry[], filters: ResourceFilterInput): ResourceEntry[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const type = filters.type && filters.type !== "all" ? filters.type.toLowerCase() : "";
  const tag = filters.tag && filters.tag !== "all" ? filters.tag.toLowerCase() : "";

  return resources.filter((resource) => {
    if (type && resource.type.toLowerCase() !== type) return false;
    if (tag && !resource.tags.some((item) => item.toLowerCase() === tag)) return false;
    if (!query) return true;

    const haystack = [resource.name, resource.summary, resource.type, ...resource.tags].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function listResourceTypes(resources: ResourceEntry[]): string[] {
  return Array.from(new Set(resources.map((resource) => resource.type))).sort((left, right) => left.localeCompare(right));
}

export function listResourceTags(resources: ResourceEntry[]): string[] {
  return Array.from(new Set(resources.flatMap((resource) => resource.tags))).sort((left, right) => left.localeCompare(right));
}
