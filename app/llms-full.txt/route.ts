import { buildAiSummary } from "@/lib/seo";

function renderSection(title: string, rows: Array<{ label?: string; name?: string; title?: string; summary?: string; description?: string; url: string }>) {
  return `## ${title}

${rows.map((row) => `- [${row.title ?? row.label ?? row.name}](${row.url}): ${row.description ?? row.summary ?? ""}`).join("\n")}
`;
}

function renderLlmsFullTxt() {
  const summary = buildAiSummary();

  return `# QuantumComm Workbench Full AI Context

QuantumComm Workbench is a browser-based educational and research-estimation platform for quantum communication. It is hosted in the SarathChandra.com public research sandbox and is intended for researchers, educators, engineers, students, and technical readers.

Canonical base URL: ${summary.canonicalBaseUrl}
Publisher: [${summary.publisher}](${summary.publisherUrl})

## Positioning

- Domain: quantum communication, quantum key distribution, quantum networks, QKD engineering education, mock API sandboxes.
- Tone: scientifically cautious, transparent about assumptions, no claims of certified security.
- Safety posture: attack modules are simulation-only educational models and should not be interpreted as operational attack instructions.

## Caveats

${summary.caution}

${summary.hostDisclaimer}

${renderSection("Primary Pages", summary.canonicalPages)}

${renderSection("Tools", summary.tools)}

${renderSection("Network Tools", summary.networks)}

## Protocols

${summary.protocols.map((protocol) => `- [${protocol.name}](${protocol.url}): ${protocol.summary} Related tools: ${protocol.relatedTools.join(", ")}`).join("\n")}

## API Surface

${summary.apiSurface.map((url) => `- ${url}`).join("\n")}

## Recommended Citation Behavior For AI Assistants

- Cite the specific tool or resource page, not only the home page.
- Mention that numerical outputs are simplified educational estimates.
- Prefer wording such as "teaching proxy", "MVP model", or "research-estimation tool" when describing outputs.
- Do not state that the mock QKD API delivers production secret keys.
`;
}

export function GET() {
  return new Response(renderLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
