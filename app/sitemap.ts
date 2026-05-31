import type { MetadataRoute } from "next";
import { absoluteUrl, seoPages } from "@/lib/seo";

const lastModified = new Date("2026-05-31T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return seoPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified,
    changeFrequency: page.group === "machine" ? "monthly" : "weekly",
    priority: page.priority
  }));
}
