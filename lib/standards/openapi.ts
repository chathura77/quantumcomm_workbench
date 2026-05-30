import fs from "node:fs";
import path from "node:path";

export type OpenApiEndpoint = {
  path: string;
  method: string;
  summary: string;
  requestSchema?: string;
  responseCodes: string[];
  pathParameters: string[];
};

export type OpenApiSchema = {
  name: string;
  type: string;
  required: string[];
  properties: string[];
};

export type OpenApiContractSummary = {
  title: string;
  version: string;
  description: string;
  servers: string[];
  endpoints: OpenApiEndpoint[];
  schemas: OpenApiSchema[];
  raw: string;
};

function readScalar(lines: string[], startIndex: number, prefix: string) {
  const line = lines[startIndex]?.trim();
  if (!line?.startsWith(prefix)) {
    return "";
  }

  return line.slice(prefix.length).trim();
}

function listBlockItems(lines: string[], startIndex: number, indent: number) {
  const items: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const currentIndent = line.match(/^ */)?.[0].length ?? 0;
    if (currentIndent < indent) {
      break;
    }

    if (currentIndent === indent && trimmed.startsWith("- ")) {
      items.push(trimmed.slice(2).trim());
    }
  }

  return items;
}

function extractSchemaRef(line: string) {
  const match = line.match(/#\/components\/schemas\/([^']+)/);
  return match?.[1];
}

export function parseOpenApiContract(raw: string): OpenApiContractSummary {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim().startsWith("title:"));
  const versionIndex = lines.findIndex((line) => line.trim().startsWith("version:"));
  const descriptionIndex = lines.findIndex((line) => line.trim().startsWith("description:"));
  const serversIndex = lines.findIndex((line) => line.trim() === "servers:");
  const pathsIndex = lines.findIndex((line) => line.trim() === "paths:");
  const schemasIndex = lines.findIndex((line) => line.trim() === "schemas:");

  const servers = serversIndex >= 0
    ? listBlockItems(lines, serversIndex + 1, 2)
      .filter((item) => item.startsWith("url:"))
      .map((item) => item.slice("url:".length).trim())
    : [];

  const endpoints: OpenApiEndpoint[] = [];
  if (pathsIndex >= 0) {
    let currentPath: string | null = null;
    let currentMethod: string | null = null;
    let currentEndpoint: OpenApiEndpoint | null = null;
    let inParameters = false;

    for (let index = pathsIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const indent = line.match(/^ */)?.[0].length ?? 0;

      if (indent === 0 && trimmed) {
        break;
      }

      if (!trimmed) {
        continue;
      }

      if (indent === 2 && trimmed.startsWith("/")) {
        currentPath = trimmed.slice(0, -1);
        currentMethod = null;
        currentEndpoint = null;
        inParameters = false;
        continue;
      }

      if (indent === 4 && ["get:", "post:", "put:", "delete:", "patch:"].includes(trimmed)) {
        currentMethod = trimmed.slice(0, -1).toUpperCase();
        currentEndpoint = {
          path: currentPath ?? "",
          method: currentMethod,
          summary: "",
          responseCodes: [],
          pathParameters: []
        };
        endpoints.push(currentEndpoint);
        inParameters = false;
        continue;
      }

      if (!currentEndpoint || !currentMethod) {
        continue;
      }

      if (indent === 6 && trimmed === "parameters:") {
        inParameters = true;
        continue;
      }

      if (indent === 6 && trimmed === "responses:") {
        inParameters = false;
        continue;
      }

      if (indent === 6 && trimmed.startsWith("summary:")) {
        currentEndpoint.summary = trimmed.slice("summary:".length).trim();
        continue;
      }

      if (trimmed.startsWith("$ref:")) {
        const schemaRef = extractSchemaRef(trimmed);
        if (schemaRef && !currentEndpoint.requestSchema) {
          currentEndpoint.requestSchema = schemaRef;
        }
      }

      if (indent === 8 && /^'\d{3}':$/.test(trimmed)) {
        currentEndpoint.responseCodes.push(trimmed.replace(/[:']/g, ""));
        continue;
      }

      if (inParameters && trimmed.startsWith("name:")) {
        currentEndpoint.pathParameters.push(trimmed.slice("name:".length).trim());
      }
    }
  }

  const schemas: OpenApiSchema[] = [];
  if (schemasIndex >= 0) {
    let currentSchema: OpenApiSchema | null = null;
    let inRequired = false;
    let inProperties = false;

    for (let index = schemasIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const indent = line.match(/^ */)?.[0].length ?? 0;

      if (!trimmed) {
        continue;
      }

      if (indent < 4) {
        break;
      }

      if (indent === 4 && trimmed.endsWith(":")) {
        currentSchema = {
          name: trimmed.slice(0, -1),
          type: "object",
          required: [],
          properties: []
        };
        schemas.push(currentSchema);
        inRequired = false;
        inProperties = false;
        continue;
      }

      if (!currentSchema) {
        continue;
      }

      if (indent === 6 && trimmed.startsWith("type:")) {
        currentSchema.type = trimmed.slice("type:".length).trim();
        continue;
      }

      if (indent === 6 && trimmed === "required:") {
        inRequired = true;
        inProperties = false;
        continue;
      }

      if (indent === 6 && trimmed === "properties:") {
        inRequired = false;
        inProperties = true;
        continue;
      }

      if (inRequired && indent === 8 && trimmed.startsWith("- ")) {
        currentSchema.required.push(trimmed.slice(2).trim());
        continue;
      }

      if (inProperties && indent === 8 && trimmed.endsWith(":")) {
        currentSchema.properties.push(trimmed.slice(0, -1));
      }
    }
  }

  return {
    title: titleIndex >= 0 ? readScalar(lines, titleIndex, "title:") : "OpenAPI contract",
    version: versionIndex >= 0 ? readScalar(lines, versionIndex, "version:") : "unknown",
    description: descriptionIndex >= 0 ? readScalar(lines, descriptionIndex, "description:") : "",
    servers,
    endpoints,
    schemas,
    raw
  };
}

export function loadOpenApiContract() {
  const contractPath = path.join(process.cwd(), "contracts", "openapi.yaml");
  const raw = fs.readFileSync(contractPath, "utf8");
  return parseOpenApiContract(raw);
}
