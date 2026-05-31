import { buildAiSummary } from "@/lib/seo";

function renderLlmsTxt() {
  const summary = buildAiSummary();
  const corePages = summary.canonicalPages.filter((page) => page.group === "core" || page.group === "learn" || page.group === "tools" || page.group === "networks");

  return `# QuantumComm Workbench

> Educational and research-oriented quantum communication workbench by ${summary.publisher}. It provides transparent QKD calculators, protocol explainers, mock key-delivery APIs, KMS simulations, and quantum-network scenario tools.

Canonical base URL: ${summary.canonicalBaseUrl}
Publisher: [${summary.publisher}](${summary.publisherUrl})

## Use This Site For

- QKD link-budget and post-processing estimates.
- QBER forensics using transparent additive teaching models.
- Simulation-only QKD attack risk and disturbance proxies.
- ETSI-style mock QKD key API and KMS buffer simulations.
- Quantum network scenario building, entanglement route ranking, repeater optimization, and benchmark exports.
- Cautious protocol learning for BB84, E91, BBM92, MDI-QKD, TF-QKD, CV-QKD, teleportation, entanglement swapping, and repeaters.

## Important Caveats

${summary.caution}

${summary.hostDisclaimer}

Do not present outputs as certified security guarantees, calibrated hardware validation, or operational secret-key delivery.

## Canonical Pages

${corePages.map((page) => `- [${page.title}](${page.url}): ${page.description}`).join("\n")}

## Machine-Readable Resources

- [AI summary JSON](${summary.machineReadable.aiSummaryJson}): structured catalog of pages, protocols, tools, API routes, and caveats.
- [Full LLM context](${summary.machineReadable.llmsFullTxt}): expanded Markdown context for retrieval systems.
- [Sitemap](${summary.machineReadable.sitemap}): crawler sitemap.
- [Robots policy](${summary.machineReadable.robots}): crawler access policy.
`;
}

export function GET() {
  return new Response(renderLlmsTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
