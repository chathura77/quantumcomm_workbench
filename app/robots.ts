import type { MetadataRoute } from "next";
import { absoluteUrl, getPublicSiteUrl } from "@/lib/seo";

const allowedAgents = [
  "*",
  "Googlebot",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended"
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: allowedAgents.map((userAgent) => ({
      userAgent,
      allow: "/"
    })),
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getPublicSiteUrl()
  };
}
