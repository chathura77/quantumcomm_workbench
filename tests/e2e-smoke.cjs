const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const next = require("next");

const projectRoot = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.SMOKE_PORT ?? 3100);
const baseUrl = process.env.SMOKE_BASE_URL ?? `http://${host}:${port}`;

const pageChecks = [
  { path: "/", expect: "Quantum communication tools from photon link to network scenario." },
  { path: "/learn", expect: "Protocol directory" },
  { path: "/learn/bb84", expect: "Guided lab" },
  { path: "/tools/link-budget", expect: "QKD link-budget calculator" },
  { path: "/tools/finite-key-bb84", expect: "Finite-key BB84 teaching estimator" },
  { path: "/tools/etsi-api-sandbox", expect: "ETSI-style QKD mock API sandbox" },
  { path: "/networks/scenario-builder", expect: "Network scenario builder" },
  { path: "/resources", expect: "Resource map" }
];

const linkBudgetInput = {
  protocol: "bb84",
  lengthKm: 25,
  fiberLossDbPerKm: 0.2,
  connectorLossDb: 3,
  sourceRateHz: 1_000_000_000,
  meanPhotonNumber: 0.4,
  detectorEfficiency: 0.25,
  darkCountProbability: 0.000001,
  backgroundCountProbability: 0.000002,
  misalignmentError: 0.015,
  basisSiftingFactor: 0.5,
  senderZBasisProbability: 0.5,
  receiverZBasisProbability: 0.5,
  detectorDeadTimeNs: 0,
  afterpulseProbability: 0,
  reconciliationEfficiency: 1.16,
  blockSize: 1_000_000
};

function ensureBuiltArtifacts() {
  const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
  assert.ok(
    fs.existsSync(buildIdPath),
    "Missing .next build artifacts. Run `npm run build` before `npm run test:e2e`."
  );
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Next server at ${baseUrl}`);
}

async function checkPage(routePath, expectedText) {
  const response = await fetch(`${baseUrl}${routePath}`);
  assert.equal(response.status, 200, `Expected ${routePath} to return 200`);

  const html = await response.text();
  assert.ok(html.includes(expectedText), `Expected ${routePath} to include "${expectedText}"`);
  assert.ok(html.includes("QuantumComm Workbench"), `Expected ${routePath} to include the site chrome`);
}

async function postJson(routePath, body) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await response.json();
  return { response, json };
}

async function runChecks() {
  for (const page of pageChecks) {
    await checkPage(page.path, page.expect);
    console.log(`PASS page ${page.path}`);
  }

  const statusResponse = await fetch(`${baseUrl}/api/qkd-mock/status`);
  assert.equal(statusResponse.status, 200, "Expected /api/qkd-mock/status to return 200");
  const statusJson = await statusResponse.json();
  assert.equal(statusJson.demoOnly, true);
  console.log("PASS api /api/qkd-mock/status");

  const { response: linkBudgetResponse, json: linkBudgetJson } = await postJson("/api/simulations/qkd/link-budget", linkBudgetInput);
  assert.equal(linkBudgetResponse.status, 200, "Expected /api/simulations/qkd/link-budget to return 200");
  assert.ok(linkBudgetJson.result.secretKeyRateHz >= 0);
  console.log("PASS api /api/simulations/qkd/link-budget");

  const { response: finiteKeyResponse, json: finiteKeyJson } = await postJson("/api/simulations/qkd/finite-key-bb84", {
    ...linkBudgetInput,
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-12,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  });
  assert.equal(finiteKeyResponse.status, 200, "Expected /api/simulations/qkd/finite-key-bb84 to return 200");
  assert.ok(finiteKeyJson.result.finalKeyBits >= 0);
  console.log("PASS api /api/simulations/qkd/finite-key-bb84");

  const { response: reportResponse, json: reportJson } = await postJson("/api/export/report", {
    toolId: "link-budget",
    title: "E2E smoke report",
    input: linkBudgetInput,
    result: linkBudgetJson.result,
    assumptions: ["Simplified educational BB84 model."],
    warnings: linkBudgetJson.warnings,
    references: ["Bennett and Brassard, 1984"],
    formulas: linkBudgetJson.formulas,
    version: "e2e-smoke",
    format: "markdown"
  });
  assert.equal(reportResponse.status, 200, "Expected /api/export/report to return 200");
  assert.equal(reportJson.mimeType, "text/markdown");
  assert.ok(reportJson.content.includes("E2E smoke report"));
  console.log("PASS api /api/export/report");
}

async function main() {
  ensureBuiltArtifacts();
  const useExternalServer = Boolean(process.env.SMOKE_BASE_URL);
  let serverOutput = "";
  let shutdown = async () => {};

  if (!useExternalServer) {
    const app = next({
      dev: false,
      dir: projectRoot,
      hostname: host,
      port
    });
    const handle = app.getRequestHandler();

    await app.prepare();

    const server = http.createServer((request, response) => handle(request, response));

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, resolve);
    });

    shutdown = async () => {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      if (typeof app.close === "function") {
        await app.close();
      }
    };

    process.on("exit", () => {
      server.close();
    });
    process.on("SIGINT", () => {
      void shutdown();
      process.exit(130);
    });
    process.on("SIGTERM", () => {
      void shutdown();
      process.exit(143);
    });
  }

  try {
    await waitForServer();
    await runChecks();
    console.log("\nServer smoke checks passed.");
  } catch (error) {
    console.error(serverOutput);
    throw error;
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
