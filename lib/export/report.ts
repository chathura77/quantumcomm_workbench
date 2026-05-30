import { formatId } from "@/lib/math";
import type { ModelWarning } from "@/lib/types";

export const REPORT_EXPORT_VERSION = "report-export.simplified.v1";

export type ReportExportInput = {
  toolId: string;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  assumptions: string[];
  warnings: ModelWarning[];
  references?: string[];
  formulas?: string[];
  version?: string;
  format: "json" | "markdown";
};

export function buildRunReport(input: ReportExportInput) {
  const createdAt = new Date().toISOString();
  const report = {
    runId: `${formatId(input.toolId)}-${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    toolId: input.toolId,
    title: input.title,
    createdAt,
    modelVersion: input.version ?? REPORT_EXPORT_VERSION,
    exportVersion: REPORT_EXPORT_VERSION,
    input: input.input,
    result: input.result,
    formulas: input.formulas ?? [],
    assumptions: input.assumptions,
    warnings: input.warnings,
    references: input.references ?? []
  };

  if (input.format === "json") {
    return {
      content: JSON.stringify(report, null, 2),
      filename: `${formatId(input.title)}.json`,
      mimeType: "application/json"
    };
  }

  const warningLines = report.warnings.length
    ? report.warnings.map((warning) => `- ${warning.severity}: ${warning.message}`).join("\n")
    : "- None";
  const formulaLines = report.formulas.length
    ? report.formulas.map((formula) => `- ${formula}`).join("\n")
    : "- See model assumptions.";
  const content = `# ${report.title}

- Run ID: ${report.runId}
- Created at: ${report.createdAt}
- Tool ID: ${report.toolId}
- Model version: ${report.modelVersion}

## Input

\`\`\`json
${JSON.stringify(report.input, null, 2)}
\`\`\`

## Result

\`\`\`json
${JSON.stringify(report.result, null, 2)}
\`\`\`

## Formulas

${formulaLines}

## Assumptions

${report.assumptions.map((assumption) => `- ${assumption}`).join("\n")}

## Warnings

${warningLines}

## References

${report.references.length ? report.references.map((reference) => `- ${reference}`).join("\n") : "- Not provided for this run."}
`;

  return {
    content,
    filename: `${formatId(input.title)}.md`,
    mimeType: "text/markdown"
  };
}
