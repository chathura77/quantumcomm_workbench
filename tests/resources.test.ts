import { describe, expect, it } from "vitest";
import resources from "../fixtures/resources.json";
import { filterResources, listResourceTags, listResourceTypes, type ResourceEntry } from "../lib/resources/filter";

const seededResources = resources as ResourceEntry[];

describe("resource filtering", () => {
  it("matches by query across names and summaries", () => {
    expect(filterResources(seededResources, { query: "discrete-event" }).map((item) => item.id)).toContain("netsquid");
    expect(filterResources(seededResources, { query: "post-quantum" }).map((item) => item.id)).toContain("nist-pqc");
  });

  it("applies exact type and tag filters", () => {
    expect(filterResources(seededResources, { type: "standard" }).every((item) => item.type === "standard")).toBe(true);
    expect(filterResources(seededResources, { tag: "QKD" }).map((item) => item.id)).toContain("etsi-qkd");
  });

  it("lists stable filter option values", () => {
    expect(listResourceTypes(seededResources)).toContain("simulator");
    expect(listResourceTags(seededResources)).toContain("QKD");
  });
});
