const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const next = require("next");

const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const host = "127.0.0.1";
const configuredPort = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : null;
let baseUrl = process.env.SMOKE_BASE_URL ?? null;

const protocols = require("../fixtures/protocols.json");
const scenarios = require("../fixtures/sample-scenarios.json");

const coveredApiRoutes = new Set([
  "/api/export/report",
  "/api/qkd-mock/status",
  "/api/qkd-mock/keys/request",
  "/api/qkd-mock/keys/[keyId]",
  "/api/simulations/kms/run",
  "/api/simulations/network/repeater-optimize",
  "/api/simulations/network/route",
  "/api/simulations/qkd/attack",
  "/api/simulations/qkd/cv-qkd",
  "/api/simulations/qkd/entanglement-qkd",
  "/api/simulations/qkd/finite-key-bb84",
  "/api/simulations/qkd/link-budget",
  "/api/simulations/qkd/mdi-qkd",
  "/api/simulations/qkd/post-processing",
  "/api/simulations/qkd/qber-forensics",
  "/api/simulations/qkd/twin-field-qkd"
]);

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

const entanglementInput = {
  protocol: "e91",
  aliceLengthKm: 15,
  bobLengthKm: 15,
  fiberLossDbPerKm: 0.2,
  aliceInsertionLossDb: 2.5,
  bobInsertionLossDb: 2.5,
  pairGenerationRateHz: 80_000_000,
  pairEmissionProbability: 0.06,
  sourceVisibility: 0.985,
  sourceBellStateFidelity: 0.97,
  detectorEfficiencyAlice: 0.75,
  detectorEfficiencyBob: 0.75,
  darkCountProbabilityAlice: 0.000001,
  darkCountProbabilityBob: 0.000001,
  backgroundCountProbabilityAlice: 0.000001,
  backgroundCountProbabilityBob: 0.000001,
  coincidenceWindowNs: 1,
  misalignmentError: 0.01,
  basisSiftingFactor: 0.5,
  bellTestFraction: 0.2,
  reconciliationEfficiency: 1.14,
  blockSize: 1_000_000
};

function ensureBuiltArtifacts() {
  const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
  assert.ok(
    fs.existsSync(buildIdPath),
    "Missing .next build artifacts. Run `npm run build` before `npm run test:e2e`."
  );
}

function collectFiles(directory, fileName, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, fileName, found);
      continue;
    }

    if (entry.isFile() && entry.name === fileName) {
      found.push(fullPath);
    }
  }

  return found;
}

function normalizeRoutePath(filePath, rootDirectory) {
  const routeDirectory = path
    .relative(rootDirectory, path.dirname(filePath))
    .replace(/\\/g, "/");

  return routeDirectory === "" ? "/" : `/${routeDirectory}`;
}

function collectPagePaths() {
  const staticPages = collectFiles(appRoot, "page.tsx")
    .map((pageFile) => normalizeRoutePath(pageFile, appRoot))
    .filter((routePath) => !routePath.includes("["));

  const learnPages = protocols.map((protocol) => `/learn/${protocol.id}`);
  learnPages.push("/learn/repeaters");

  return Array.from(new Set([...staticPages, ...learnPages])).sort();
}

function collectApiRoutePaths() {
  return collectFiles(path.join(appRoot, "api"), "route.ts")
    .map((routeFile) => `/api${normalizeRoutePath(routeFile, path.join(appRoot, "api"))}`)
    .sort();
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

async function fetchHtml(routePath) {
  const response = await fetch(`${baseUrl}${routePath}`);
  assert.equal(response.status, 200, `Expected ${routePath} to return 200`);
  return response.text();
}

async function requestJson(routePath, init = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, init);
  const contentType = response.headers.get("content-type") ?? "";
  assert.ok(contentType.includes("application/json"), `Expected ${routePath} to return JSON`);
  const json = await response.json();
  return { response, json };
}

function postJson(routePath, body, headers = {}) {
  return requestJson(routePath, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function checkPage(routePath) {
  const html = await fetchHtml(routePath);
  assert.ok(html.includes("QuantumComm Workbench"), `Expected ${routePath} to include the site chrome`);
  assert.ok(html.includes("<main"), `Expected ${routePath} to include a main landmark`);
  assert.ok(html.includes("Skip to main content"), `Expected ${routePath} to include the skip link`);
  assert.ok(html.length > 1200, `Expected ${routePath} to render substantial markup`);
  console.log(`PASS page ${routePath}`);
}

function assertApiInventoryIsCovered() {
  const apiRoutes = collectApiRoutePaths();
  assert.deepEqual(apiRoutes, Array.from(coveredApiRoutes).sort());
}

async function runPageChecks() {
  for (const routePath of collectPagePaths()) {
    await checkPage(routePath);
  }
}

async function runApiChecks() {
  assertApiInventoryIsCovered();

  const { response: statusResponse, json: statusJson } = await requestJson("/api/qkd-mock/status");
  assert.equal(statusResponse.status, 200);
  assert.equal(statusJson.demoOnly, true);
  assert.equal(statusJson.authorizationMode, "header_token_demo");
  assert.ok(Array.isArray(statusJson.authorizedApplications));
  console.log("PASS api /api/qkd-mock/status");

  const { response: keyRequestResponse, json: keyRequestJson } = await postJson("/api/qkd-mock/keys/request", {
    applicationId: "smoke-suite",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, {
    "x-qkd-app-token": "smoke-suite-token"
  });
  assert.equal(keyRequestResponse.status, 200);
  assert.equal(keyRequestJson.keys.length, 1);
  const issuedKeyId = keyRequestJson.keys[0].keyId;
  console.log("PASS api /api/qkd-mock/keys/request");

  const { response: keyRetrieveResponse, json: keyRetrieveJson } = await requestJson(`/api/qkd-mock/keys/${issuedKeyId}`, {
    headers: {
      "x-qkd-application-id": "smoke-suite",
      "x-qkd-app-token": "smoke-suite-token"
    }
  });
  assert.equal(keyRetrieveResponse.status, 200);
  assert.equal(keyRetrieveJson.keyId, issuedKeyId);
  console.log("PASS api /api/qkd-mock/keys/[keyId]");

  const { response: unauthorizedKeyRequestResponse, json: unauthorizedKeyRequestJson } = await postJson("/api/qkd-mock/keys/request", {
    applicationId: "demo-app",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, {
    "x-qkd-app-token": "wrong-token"
  });
  assert.equal(unauthorizedKeyRequestResponse.status, 403);
  assert.equal(unauthorizedKeyRequestJson.error, "UnauthorizedApplication");
  console.log("PASS api /api/qkd-mock/keys/request unauthorized");

  const { response: insufficientKeyResponse, json: insufficientKeyJson } = await postJson("/api/qkd-mock/keys/request", {
    applicationId: "smoke-suite",
    keyLengthBits: 1_048_576,
    numberOfKeys: 100,
    priority: 1
  }, {
    "x-qkd-app-token": "smoke-suite-token"
  });
  assert.equal(insufficientKeyResponse.status, 409);
  assert.equal(insufficientKeyJson.error, "InsufficientKeyMaterial");
  console.log("PASS api /api/qkd-mock/keys/request insufficient");

  const { response: missingKeyResponse, json: missingKeyJson } = await requestJson("/api/qkd-mock/keys/missing-key");
  assert.equal(missingKeyResponse.status, 404);
  assert.equal(missingKeyJson.error, "NotFound");
  console.log("PASS api /api/qkd-mock/keys/[keyId] missing");

  const { response: linkBudgetResponse, json: linkBudgetJson } = await postJson("/api/simulations/qkd/link-budget", linkBudgetInput);
  assert.equal(linkBudgetResponse.status, 200);
  assert.ok(linkBudgetJson.result.secretKeyRateHz >= 0);
  console.log("PASS api /api/simulations/qkd/link-budget");

  const { response: finiteKeyResponse, json: finiteKeyJson } = await postJson("/api/simulations/qkd/finite-key-bb84", {
    ...linkBudgetInput,
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-12,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  });
  assert.equal(finiteKeyResponse.status, 200);
  assert.ok(finiteKeyJson.result.finalKeyBits >= 0);
  assert.equal(finiteKeyJson.result.sensitivitySweeps.length, 5);
  console.log("PASS api /api/simulations/qkd/finite-key-bb84");

  const { response: qberResponse, json: qberJson } = await postJson("/api/simulations/qkd/qber-forensics", {
    measuredQber: 0.03,
    misalignmentError: 0.01,
    visibility: 0.98,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    detectorMismatch: 0.01,
    eveInterceptFraction: 0.02,
    signalDetectionProbability: 0.1
  });
  assert.equal(qberResponse.status, 200);
  assert.ok(Array.isArray(qberJson.result.contributions));
  console.log("PASS api /api/simulations/qkd/qber-forensics");

  const { response: postProcessingResponse, json: postProcessingJson } = await postJson("/api/simulations/qkd/post-processing", {
    rawDetections: 1_000_000,
    basisSiftingFactor: 0.5,
    qber: 0.02,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  });
  assert.equal(postProcessingResponse.status, 200);
  assert.ok(postProcessingJson.result.finalKeyBits >= 0);
  console.log("PASS api /api/simulations/qkd/post-processing");

  const { response: attackResponse, json: attackJson } = await postJson("/api/simulations/qkd/attack", {
    attackType: "pns_risk",
    parameters: {
      meanPhotonNumber: 0.4,
      channelLossAdvantageFactor: 1.2,
      decoyStateEnabled: true
    }
  });
  assert.equal(attackResponse.status, 200);
  assert.ok(attackJson.result.metrics);
  console.log("PASS api /api/simulations/qkd/attack");

  const { response: mdiResponse, json: mdiJson } = await postJson("/api/simulations/qkd/mdi-qkd", {
    relayMode: "untrusted",
    aliceLengthKm: 25,
    bobLengthKm: 25,
    fiberLossDbPerKm: 0.2,
    aliceConnectorLossDb: 3,
    bobConnectorLossDb: 3,
    sourceRateHz: 1_000_000_000,
    aliceMeanPhotonNumber: 0.35,
    bobMeanPhotonNumber: 0.35,
    relayDetectorEfficiency: 0.65,
    relayDarkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    interferenceVisibility: 0.97,
    misalignmentError: 0.015,
    bellStateMeasurementEfficiency: 0.5,
    basisSiftingFactor: 0.5,
    reconciliationEfficiency: 1.16,
    blockSize: 1_000_000
  });
  assert.equal(mdiResponse.status, 200);
  assert.ok(Array.isArray(mdiJson.result.distanceSweep));
  console.log("PASS api /api/simulations/qkd/mdi-qkd");

  const { response: twinFieldResponse, json: twinFieldJson } = await postJson("/api/simulations/qkd/twin-field-qkd", {
    stationMode: "untrusted",
    aliceLengthKm: 75,
    bobLengthKm: 75,
    fiberLossDbPerKm: 0.18,
    aliceConnectorLossDb: 2.5,
    bobConnectorLossDb: 2.5,
    sourceRateHz: 500_000_000,
    aliceMeanPhotonNumber: 0.2,
    bobMeanPhotonNumber: 0.2,
    middleStationDetectorEfficiency: 0.72,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    interferenceVisibility: 0.985,
    phaseTrackingEfficiency: 0.96,
    phaseErrorSigmaRad: 0.12,
    phasePostSelectionFraction: 0.85,
    basisSiftingFactor: 0.5,
    reconciliationEfficiency: 1.12,
    blockSize: 1_000_000
  });
  assert.equal(twinFieldResponse.status, 200);
  assert.ok(Array.isArray(twinFieldJson.result.distanceSweep));
  console.log("PASS api /api/simulations/qkd/twin-field-qkd");

  const { response: cvResponse, json: cvJson } = await postJson("/api/simulations/qkd/cv-qkd", {
    detectionMode: "homodyne",
    receiverTrustMode: "trusted_receiver",
    distanceKm: 25,
    fiberLossDbPerKm: 0.2,
    excessLossDb: 2,
    sourceRateHz: 100_000_000,
    modulationVarianceSnu: 6,
    reconciliationEfficiency: 0.96,
    excessNoiseSnu: 0.01,
    preparationNoiseSnu: 0.005,
    detectorEfficiency: 0.7,
    electronicNoiseSnu: 0.03,
    phaseRecoveryEfficiency: 0.96,
    symbolUseFactor: 0.9
  });
  assert.equal(cvResponse.status, 200);
  assert.ok(Array.isArray(cvJson.result.distanceSweep));
  console.log("PASS api /api/simulations/qkd/cv-qkd");

  const { response: entanglementResponse, json: entanglementJson } = await postJson("/api/simulations/qkd/entanglement-qkd", entanglementInput);
  assert.equal(entanglementResponse.status, 200);
  assert.ok(Array.isArray(entanglementJson.result.distanceSweep));
  console.log("PASS api /api/simulations/qkd/entanglement-qkd");

  const { response: kmsResponse, json: kmsJson } = await postJson("/api/simulations/kms/run", {
    durationSeconds: 120,
    timeStepSeconds: 10,
    initialBufferBits: 1000,
    bufferCapacityBits: 10000,
    generationRateBitsPerSecond: 200,
    keyTtlSeconds: 3600,
    services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 0.2, bitsPerRequest: 128 }]
  });
  assert.equal(kmsResponse.status, 200);
  assert.ok(Array.isArray(kmsJson.result.timeline));
  console.log("PASS api /api/simulations/kms/run");

  const { response: networkResponse, json: networkJson } = await postJson("/api/simulations/network/route", {
    scenario: scenarios[1],
    sourceNodeId: "a",
    targetNodeId: "b",
    objective: "balanced"
  });
  assert.equal(networkResponse.status, 200);
  assert.ok(Array.isArray(networkJson.result.routes));
  console.log("PASS api /api/simulations/network/route");

  const { response: repeaterResponse, json: repeaterJson } = await postJson("/api/simulations/network/repeater-optimize", {
    totalDistanceKm: 120,
    attenuationDbPerKm: 0.2,
    memoryLifetimeMs: 100,
    attemptRateHz: 100000,
    targetFidelity: 0.8,
    maxRepeaters: 4
  });
  assert.equal(repeaterResponse.status, 200);
  assert.ok(repeaterJson.result.bestCandidate);
  console.log("PASS api /api/simulations/network/repeater-optimize");

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
  assert.equal(reportResponse.status, 200);
  assert.equal(reportJson.mimeType, "text/markdown");
  assert.ok(reportJson.content.includes("E2E smoke report"));
  console.log("PASS api /api/export/report");
}

async function main() {
  ensureBuiltArtifacts();
  const useExternalServer = Boolean(baseUrl);
  let shutdown = async () => {};

  if (!useExternalServer) {
    const requestedPort = configuredPort ?? 0;
    const app = next({
      dev: false,
      dir: projectRoot,
      hostname: host,
      port: requestedPort
    });
    await app.prepare();
    const handle = app.getRequestHandler();
    const server = http.createServer((request, response) => handle(request, response));

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(requestedPort, host, resolve);
    });

    const address = server.address();
    assert.ok(address && typeof address === "object", "Expected smoke server to expose a bound address.");
    baseUrl = `http://${host}:${address.port}`;

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
    await runPageChecks();
    await runApiChecks();
    console.log("\nServer smoke checks passed.");
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
