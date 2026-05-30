import { PageHeader, Section } from "@/components/ui";
import { loadOpenApiContract } from "@/lib/standards/openapi";

const contract = loadOpenApiContract();

export default function OpenApiViewerPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Standards and integration"
        title="OpenAPI viewer"
        description="Inspect the local QuantumComm Workbench contract without leaving the app. This is a reproducibility aid for the mock ETSI-style API and simulation endpoints, not a production assurance artifact."
      />

      <Section title="Contract summary" description="Use this page to cross-check endpoint shapes, schema names, and the current API version before exporting examples or comparing mock responses.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Title</p>
            <p className="mt-2 text-lg font-semibold text-ink">{contract.title}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Version</p>
            <p className="mt-2 text-lg font-semibold text-ink">{contract.version}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Endpoints</p>
            <p className="mt-2 text-lg font-semibold text-ink">{contract.endpoints.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Schemas</p>
            <p className="mt-2 text-lg font-semibold text-ink">{contract.schemas.length}</p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
          <p>{contract.description}</p>
          <p className="mt-2">
            Server roots: {contract.servers.length > 0 ? contract.servers.join(", ") : "No server roots declared"}.
          </p>
        </div>
      </Section>

      <Section title="Endpoints" description="Every operation below is sourced from the checked-in contract. Schema names are shown so the API sandbox and conformance checker can be compared against the same reference.">
        <div className="grid gap-4">
          {contract.endpoints.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  {endpoint.method}
                </span>
                <code className="text-sm font-semibold text-ink">{endpoint.path}</code>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{endpoint.summary}</p>
              <dl className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Request schema</dt>
                  <dd className="mt-1 text-sm text-ink">{endpoint.requestSchema ?? "No request body"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Response codes</dt>
                  <dd className="mt-1 text-sm text-ink">{endpoint.responseCodes.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Path parameters</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {endpoint.pathParameters.length > 0 ? endpoint.pathParameters.join(", ") : "None"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Schemas" description="This summary is intentionally compact. It highlights the required fields and property counts without pretending that the Workbench contract is a full standards-conformance proof.">
        <div className="grid gap-4 md:grid-cols-2">
          {contract.schemas.map((schema) => (
            <article key={schema.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{schema.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Type: {schema.type}. Properties: {schema.properties.length}. Required: {schema.required.length}.</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Required fields</p>
              <p className="mt-1 text-sm text-ink">{schema.required.length > 0 ? schema.required.join(", ") : "No required fields declared."}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Properties</p>
              <p className="mt-1 text-sm text-ink">{schema.properties.join(", ") || "No explicit properties listed."}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Raw contract" description="Keep the checked-in YAML visible for auditing, export mapping work, and mock example debugging.">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-soft">
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-100">{contract.raw}</pre>
        </div>
      </Section>
    </main>
  );
}
