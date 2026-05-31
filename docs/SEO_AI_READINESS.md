# SEO and AI Readiness

QuantumComm Workbench exposes both human-readable pages and machine-readable indexes for search engines, AI search, and agentic retrieval tools.

## Public URL configuration

By default, generated canonical URLs point to:

```text
https://quantum-workbench.sarathchandra.com
```

For a true subdomain deployment, set the canonical base URL before build:

```bash
NEXT_PUBLIC_SITE_URL=https://quantum-workbench.sarathchandra.com npm run build
```

For the path deployment, combine canonical URL and base path:

```bash
QUANTUMCOMM_BASE_PATH=/quantumworkbench NEXT_PUBLIC_SITE_URL=https://www.sarathchandra.com/quantumworkbench npm run build
```

## Crawler surfaces

- `/sitemap.xml` lists canonical pages, tools, learning pages, resources, and machine-readable indexes.
- `/robots.txt` allows general crawlers plus named AI/search crawlers and points to the sitemap.
- `/llms.txt` provides a compact Markdown map for AI assistants and retrieval systems.
- `/llms-full.txt` provides expanded Markdown context, caveats, protocol summaries, and recommended citation behavior.
- `/ai-summary.json` provides a structured catalog of pages, protocols, tools, API routes, disclaimers, and canonical URLs.

## Structured data

The root layout emits JSON-LD for:

- the publisher/person,
- the website,
- the web application,
- and an item list of the main tools.

This markup describes visible site content and stays cautious about educational/research-estimation limits.

## Caveats

`llms.txt` is useful as an AI-readable convention, but it is not a ratified search-engine or model-provider standard. Do not treat it as a ranking guarantee. Keep the human pages crawlable, server-rendered, and linked from the sitemap.
