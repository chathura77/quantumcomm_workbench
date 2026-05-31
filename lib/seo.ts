import { disclaimer, hostBrand, networkTools, protocolList, toolGroups } from "@/lib/content";

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  group: "core" | "learn" | "tools" | "networks" | "resources" | "machine";
  priority: number;
};

const defaultPublicSiteUrl = "https://quantum-workbench.sarathchandra.com";

function normalizePublicUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPublicSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.QUANTUMCOMM_SITE_URL ?? defaultPublicSiteUrl);
}

export function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
}

const toolPages: SeoPage[] = toolGroups.flatMap((group) => group.tools.map((tool) => ({
  path: tool.href,
  title: `${tool.label} | QuantumComm Workbench`,
  description: tool.summary,
  group: "tools" as const,
  priority: group.title === "QKD engineering" ? 0.82 : 0.74
})));

const learnPages: SeoPage[] = protocolList.map((protocol) => ({
  path: `/learn/${protocol.id}`,
  title: `${protocol.name} | QuantumComm Learn`,
  description: protocol.summary,
  group: "learn",
  priority: 0.68
}));

const networkPages: SeoPage[] = networkTools.map((tool) => ({
  path: tool.href,
  title: `${tool.label} | Quantum Network Workbench`,
  description: tool.summary,
  group: "networks",
  priority: 0.72
}));

export const seoPages: SeoPage[] = [
  {
    path: "/",
    title: "QuantumComm Workbench | Quantum Communication Tools",
    description: "Browser-based QKD calculators, quantum-network scenario tools, mock API sandboxes, and cautious learning resources.",
    group: "core",
    priority: 1
  },
  {
    path: "/learn",
    title: "Learn Quantum Communication Protocols",
    description: "Protocol explainers for BB84, E91, MDI-QKD, CV-QKD, teleportation, entanglement swapping, and repeaters.",
    group: "learn",
    priority: 0.85
  },
  ...learnPages,
  {
    path: "/tools",
    title: "Quantum Communication Engineering Tools",
    description: "QKD link budget, QBER forensics, post-processing, KMS, phase encoding, and report generation tools.",
    group: "tools",
    priority: 0.9
  },
  ...toolPages,
  {
    path: "/networks",
    title: "Quantum Network Scenario Tools",
    description: "Scenario builder, entanglement routing, repeater optimization, and cross-simulator benchmark tools.",
    group: "networks",
    priority: 0.86
  },
  ...networkPages,
  {
    path: "/resources",
    title: "Quantum Communication Resources",
    description: "Curated simulator, standards, protocol, and model limitation resources for quantum communication work.",
    group: "resources",
    priority: 0.78
  },
  {
    path: "/resources/simulators",
    title: "Quantum Network Simulators",
    description: "Resource map for SeQUeNCe, QuISP, NetSquid/SquidASM, QKDNetSim, and related simulators.",
    group: "resources",
    priority: 0.68
  },
  {
    path: "/resources/standards",
    title: "QKD Standards and References",
    description: "Standards-oriented references and cautious notes for QKD APIs, key management, and model interpretation.",
    group: "resources",
    priority: 0.68
  },
  {
    path: "/resources/protocols",
    title: "Quantum Communication Protocol Index",
    description: "A compact index of supported quantum communication protocols and learning pages.",
    group: "resources",
    priority: 0.64
  },
  {
    path: "/resources/model-limitations",
    title: "QuantumComm Workbench Model Limitations",
    description: "Visible caveats for simplified QKD, KMS, optical, and quantum-network models.",
    group: "resources",
    priority: 0.7
  },
  {
    path: "/llms.txt",
    title: "LLM Index for QuantumComm Workbench",
    description: "Machine-readable Markdown map of the workbench for AI assistants and retrieval systems.",
    group: "machine",
    priority: 0.5
  },
  {
    path: "/ai-summary.json",
    title: "AI Summary JSON for QuantumComm Workbench",
    description: "Machine-readable JSON catalog of tools, protocols, APIs, disclaimers, and canonical URLs.",
    group: "machine",
    priority: 0.5
  }
];

export const seoKeywords = [
  "quantum communication",
  "QKD calculator",
  "quantum key distribution",
  "BB84",
  "E91",
  "MDI-QKD",
  "CV-QKD",
  "quantum network simulator",
  "entanglement routing",
  "quantum repeater optimizer",
  "ETSI QKD API",
  "key management simulator",
  "agentic AI readable documentation"
];

export function buildAiSummary() {
  return {
    name: "QuantumComm Workbench",
    canonicalBaseUrl: getPublicSiteUrl(),
    publisher: hostBrand.name,
    publisherUrl: hostBrand.homeUrl,
    description: "A browser-based educational and research-estimation workbench for quantum communication, QKD engineering, key-management sandboxes, and quantum-network scenarios.",
    intendedAudience: [
      "quantum communication researchers",
      "educators",
      "network engineers",
      "students",
      "technical enthusiasts",
      "AI assistants summarizing quantum communication tools"
    ],
    caution: disclaimer,
    hostDisclaimer: hostBrand.personalDisclaimer,
    canonicalPages: seoPages.map((page) => ({
      ...page,
      url: absoluteUrl(page.path)
    })),
    protocols: protocolList.map((protocol) => ({
      id: protocol.id,
      name: protocol.name,
      category: protocol.category,
      summary: protocol.summary,
      url: absoluteUrl(`/learn/${protocol.id}`),
      relatedTools: protocol.relatedTools.map((path) => absoluteUrl(path))
    })),
    tools: toolGroups.flatMap((group) => group.tools.map((tool) => ({
      group: group.title,
      label: tool.label,
      summary: tool.summary,
      url: absoluteUrl(tool.href)
    }))),
    networks: networkTools.map((tool) => ({
      label: tool.label,
      summary: tool.summary,
      url: absoluteUrl(tool.href)
    })),
    apiSurface: [
      "/api/simulations/qkd/link-budget",
      "/api/simulations/qkd/qber-forensics",
      "/api/simulations/qkd/post-processing",
      "/api/simulations/qkd/attack",
      "/api/simulations/kms/run",
      "/api/simulations/network/route",
      "/api/simulations/network/repeater-optimize",
      "/api/qkd-mock/status",
      "/api/qkd-mock/keys/request",
      "/api/export/report"
    ].map((path) => absoluteUrl(path)),
    machineReadable: {
      llmsTxt: absoluteUrl("/llms.txt"),
      llmsFullTxt: absoluteUrl("/llms-full.txt"),
      aiSummaryJson: absoluteUrl("/ai-summary.json"),
      sitemap: absoluteUrl("/sitemap.xml"),
      robots: absoluteUrl("/robots.txt")
    }
  };
}

export function buildStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${hostBrand.homeUrl}#person`,
        name: hostBrand.name,
        url: hostBrand.homeUrl
      },
      {
        "@type": "WebSite",
        "@id": `${getPublicSiteUrl()}#website`,
        name: "QuantumComm Workbench",
        url: getPublicSiteUrl(),
        publisher: { "@id": `${hostBrand.homeUrl}#person` },
        description: "Educational quantum communication calculators, protocol explainers, and network scenario tools.",
        inLanguage: "en"
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${getPublicSiteUrl()}#software`,
        name: "QuantumComm Workbench",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: getPublicSiteUrl(),
        creator: { "@id": `${hostBrand.homeUrl}#person` },
        description: "A browser workbench for QKD link budgets, QBER forensics, mock key APIs, KMS simulations, and quantum-network scenarios.",
        isAccessibleForFree: true,
        audience: {
          "@type": "Audience",
          audienceType: "Quantum communication researchers, educators, engineers, and students"
        }
      },
      {
        "@type": "ItemList",
        "@id": `${getPublicSiteUrl()}#tool-index`,
        name: "QuantumComm Workbench tool index",
        itemListElement: toolGroups.flatMap((group) => group.tools).map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: tool.label,
          url: absoluteUrl(tool.href),
          description: tool.summary
        }))
      }
    ]
  };
}
