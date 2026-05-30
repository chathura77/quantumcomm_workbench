import { describe, expect, it } from "vitest";
import { loadOpenApiContract, parseOpenApiContract } from "../lib/standards/openapi";

describe("OpenAPI contract summary", () => {
  it("parses endpoint, schema, and server metadata from the checked-in contract", () => {
    const contract = loadOpenApiContract();

    expect(contract.title).toBe("QuantumComm Workbench API");
    expect(contract.version).toBe("0.1.0");
    expect(contract.servers).toContain("/api");
    expect(contract.endpoints.some((endpoint) => endpoint.path === "/qkd-mock/status" && endpoint.method === "GET")).toBe(true);
    expect(contract.endpoints.some((endpoint) => endpoint.path === "/qkd-mock/keys/{keyId}" && endpoint.pathParameters.includes("keyId"))).toBe(true);
    expect(contract.schemas.some((schema) => schema.name === "LinkBudgetInput" && schema.required.includes("lengthKm"))).toBe(true);
  });

  it("extracts request schemas and response codes for simulation endpoints", () => {
    const contract = parseOpenApiContract(`
openapi: 3.1.0
info:
  title: Demo API
  version: 1.2.3
  description: Small contract
servers:
  - url: /api
paths:
  /demo:
    post:
      summary: Demo endpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DemoInput'
      responses:
        '200':
          description: Success
        '400':
          $ref: '#/components/responses/ValidationError'
components:
  schemas:
    DemoInput:
      type: object
      required:
        - value
      properties:
        value:
          type: number
`);

    expect(contract.title).toBe("Demo API");
    expect(contract.endpoints).toEqual([
      {
        path: "/demo",
        method: "POST",
        summary: "Demo endpoint",
        requestSchema: "DemoInput",
        responseCodes: ["200", "400"],
        pathParameters: []
      }
    ]);
    expect(contract.schemas).toEqual([
      {
        name: "DemoInput",
        type: "object",
        required: ["value"],
        properties: ["value"]
      }
    ]);
  });
});
