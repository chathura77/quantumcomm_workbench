const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function loadWithNextStubs(request, parent, isMain) {
  if (request === "next/link") {
    return function Link({ href, children, ...props }) {
      const resolvedHref = typeof href === "string" ? href : href?.pathname ?? "#";
      return React.createElement("a", { href: resolvedHref, ...props }, children);
    };
  }

  if (request === "next/navigation") {
    return {
      notFound() {
        const error = new Error("NEXT_NOT_FOUND");
        error.digest = "NEXT_NOT_FOUND";
        throw error;
      }
    };
  }

  if (request === "next/server") {
    return {
      NextResponse: {
        json(body, init = {}) {
          return new Response(JSON.stringify(body), {
            status: init.status ?? 200,
            headers: {
              "content-type": "application/json",
              ...(init.headers ?? {})
            }
          });
        }
      }
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      resolveJsonModule: true
    },
    fileName: filename
  });

  module._compile(transpiled.outputText, filename);
}

require.extensions[".ts"] = compileTypeScript;
require.extensions[".tsx"] = compileTypeScript;
require.extensions[".css"] = function ignoreStyleModule() {};

const resources = require("../fixtures/resources.json");
const scenarios = require("../fixtures/sample-scenarios.json");
const { compareSavedRuns, createSavedRunRecord, duplicateSavedRun, parseSavedRun, serializeSavedRun, sortSavedRuns } = require("../lib/export/savedRuns.ts");
const { buildShareableStateUrl, decodeShareableState, encodeShareableState } = require("../lib/export/shareableState.ts");
const { buildBb84LabSummary, buildBb84TeachingLab, buildE91LabSummary, buildE91TeachingLab, buildTeachingLabExport } = require("../lib/learnLabs.ts");
const { h2 } = require("../lib/math.ts");
const { runKmsSimulation } = require("../lib/kms/simulator.ts");
const { optimizeRepeaterChain } = require("../lib/network/repeater.ts");
const { rankRoutes } = require("../lib/network/routing.ts");
const { createSavedScenarioRecord, duplicateSavedScenario, parseSavedScenarioBundle, serializeSavedScenarioBundle, sortSavedScenarios } = require("../lib/network/scenarioLibrary.ts");
const { validateScenario } = require("../lib/network/scenario.ts");
const { filterResources, listResourceTags, listResourceTypes } = require("../lib/resources/filter.ts");
const { runAttackModel } = require("../lib/qkd/attacks.ts");
const { estimateCvQkd } = require("../lib/qkd/cvQkd.ts");
const { estimateEntanglementQkd } = require("../lib/qkd/entanglementQkd.ts");
const { estimateFiniteKeyBb84 } = require("../lib/qkd/finiteKeyBb84.ts");
const { computeLinkBudget } = require("../lib/qkd/linkBudget.ts");
const { estimateMdiQkd } = require("../lib/qkd/mdiQkd.ts");
const { estimatePostProcessing } = require("../lib/qkd/postProcessing.ts");
const { analyzeQber } = require("../lib/qkd/qber.ts");
const { checkMockQkdConformance } = require("../lib/standards/conformance.ts");
const { __advanceMockPoolClockForTests, __resetMockPoolForTests } = require("../lib/standards/etsiMock.ts");
const { conformanceExampleCases, mockApiExamples, serializeMockApiExampleBundle } = require("../lib/standards/mockExamples.ts");
const { loadOpenApiContract } = require("../lib/standards/openapi.ts");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function approxEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
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

function projectRequire(relativePath) {
  return require(path.join(projectRoot, relativePath));
}

async function renderPageMarkup(pageComponent, props) {
  const rendered = pageComponent(props);
  const node = typeof rendered?.then === "function" ? await rendered : rendered;
  return renderToStaticMarkup(node);
}

function projectRelative(fullPath) {
  return path.relative(projectRoot, fullPath).replace(/\\/g, "/");
}

function routePathFromPageFile(pageFile) {
  const routeDirectory = path.relative(path.join(projectRoot, "app"), path.dirname(pageFile)).replace(/\\/g, "/");
  return routeDirectory === "" ? "/" : `/${routeDirectory}`;
}

function collectDocumentedRoutes() {
  const routeDoc = fs.readFileSync(path.join(projectRoot, "docs", "ROUTES_AND_PAGES.md"), "utf8");
  return new Set(Array.from(routeDoc.matchAll(/`(\/[^`]*)`/g), (match) => match[1]));
}

function createJsonRequest(body, headers = {}) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function assertValidationError(body) {
  assert.equal(body.error, "ValidationError");
  assert.ok(typeof body.message === "string" && body.message.length > 0);
  assert.ok(Array.isArray(body.issues) && body.issues.length > 0);
}

const coveredApiRoutes = new Set([
  "app/api/export/report/route.ts",
  "app/api/qkd-mock/status/route.ts",
  "app/api/qkd-mock/keys/request/route.ts",
  "app/api/qkd-mock/keys/[keyId]/route.ts",
  "app/api/simulations/kms/run/route.ts",
  "app/api/simulations/network/repeater-optimize/route.ts",
  "app/api/simulations/network/route/route.ts",
  "app/api/simulations/qkd/attack/route.ts",
  "app/api/simulations/qkd/cv-qkd/route.ts",
  "app/api/simulations/qkd/entanglement-qkd/route.ts",
  "app/api/simulations/qkd/finite-key-bb84/route.ts",
  "app/api/simulations/qkd/link-budget/route.ts",
  "app/api/simulations/qkd/mdi-qkd/route.ts",
  "app/api/simulations/qkd/post-processing/route.ts",
  "app/api/simulations/qkd/qber-forensics/route.ts",
  "app/api/simulations/qkd/twin-field-qkd/route.ts"
]);

async function readJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  assert.ok(contentType.includes("application/json"), `Expected JSON response but received ${contentType || "no content type"}`);
  return response.json();
}

const baseLink = {
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

const baseEntanglement = {
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

test("binary entropy handles endpoints and midpoint", () => {
  assert.equal(h2(0), 0);
  assert.equal(h2(1), 0);
  approxEqual(h2(0.5), 1, 1e-8);
  assert.equal(Number.isNaN(h2(1e-12)), false);
});

test("link budget decreases rate with distance and loss", () => {
  const near = computeLinkBudget({ ...baseLink, lengthKm: 0 });
  const far = computeLinkBudget({ ...baseLink, lengthKm: 100 });
  assert.ok(near.result.secretKeyRateHz > far.result.secretKeyRateHz);

  const higherLoss = computeLinkBudget({ ...baseLink, fiberLossDbPerKm: 0.4 });
  const nominal = computeLinkBudget(baseLink);
  assert.ok(higherLoss.result.channelTransmittance < nominal.result.channelTransmittance);
});

test("link budget increases QBER with dark counts and warns above threshold", () => {
  const lowDark = computeLinkBudget({ ...baseLink, darkCountProbability: 0.000001 });
  const highDark = computeLinkBudget({ ...baseLink, darkCountProbability: 0.05 });
  assert.ok(highDark.result.qber > lowDark.result.qber);
  assert.equal(highDark.result.secretFraction, 0);
  assert.ok(highDark.warnings.some((warning) => warning.code === "high-qber"));
});

test("link budget hardware imperfection proxies move in expected directions", () => {
  const baseline = computeLinkBudget(baseLink);
  const deadTimeLimited = computeLinkBudget({ ...baseLink, detectorDeadTimeNs: 500 });
  const afterpulseHeavy = computeLinkBudget({ ...baseLink, afterpulseProbability: 0.05 });
  const biased = computeLinkBudget({
    ...baseLink,
    senderZBasisProbability: 0.8,
    receiverZBasisProbability: 0.8
  });

  assert.ok(deadTimeLimited.result.rawRateHz < baseline.result.rawRateHz);
  assert.ok(deadTimeLimited.result.deadTimeAvailabilityFactor < 1);
  assert.ok(afterpulseHeavy.result.qber > baseline.result.qber);
  assert.ok(afterpulseHeavy.result.afterpulseNoiseProbability > 0);
  assert.ok(biased.result.effectiveSiftingFactor > baseline.result.effectiveSiftingFactor);
  assert.ok(biased.result.basisAgreementProbability > 0.5);
});

test("decoy-state proxy exposes single-photon lower-bound metrics", () => {
  const baseline = computeLinkBudget({ ...baseLink, protocol: "decoy_bb84", meanPhotonNumber: 0.3 });
  const higherMu = computeLinkBudget({ ...baseLink, protocol: "decoy_bb84", meanPhotonNumber: 0.8 });
  const noisier = computeLinkBudget({
    ...baseLink,
    protocol: "decoy_bb84",
    meanPhotonNumber: 0.3,
    backgroundCountProbability: 0.001
  });

  assert.ok(baseline.result.decoyLowerBound);
  assert.ok(baseline.result.decoyLowerBound.singlePhotonGainLowerBound > 0);
  assert.ok(baseline.result.decoyLowerBound.singlePhotonErrorUpperBound >= 0);
  assert.ok(baseline.result.decoyLowerBound.singlePhotonErrorUpperBound <= 0.5);
  approxEqual(baseline.result.decoyLowerBound.lowerBoundSecretKeyRateHz, baseline.result.secretKeyRateHz, 1e-6);
  assert.ok(higherMu.result.decoyLowerBound.multiPhotonEmissionProbability > baseline.result.decoyLowerBound.multiPhotonEmissionProbability);
  assert.ok(noisier.result.decoyLowerBound.singlePhotonErrorUpperBound > baseline.result.decoyLowerBound.singlePhotonErrorUpperBound);
  assert.ok(baseline.warnings.some((warning) => warning.code === "decoy-proxy"));
});

test("QBER forensics conserves residual accounting", () => {
  const response = analyzeQber({
    measuredQber: 0.3,
    misalignmentError: 0,
    visibility: 1,
    darkCountProbability: 0,
    backgroundCountProbability: 0,
    detectorMismatch: 0,
    eveInterceptFraction: 1,
    signalDetectionProbability: 0.1
  });

  const interceptContribution = response.result.contributions.find((item) => item.id === "intercept-resend");
  approxEqual(interceptContribution?.qberContribution ?? 0, 0.25, 1e-9);
  approxEqual(response.result.modeledQber + response.result.residualQber, response.result.measuredQber, 1e-9);
});

test("post-processing output shrinks with QBER and authentication cost", () => {
  const input = {
    rawDetections: 1_000_000,
    basisSiftingFactor: 0.5,
    qber: 0.02,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  };

  const low = estimatePostProcessing(input);
  const highQber = estimatePostProcessing({ ...input, qber: 0.09 });
  const highAuth = estimatePostProcessing({ ...input, authenticationBits: 10_000 });
  assert.ok(low.result.finalKeyBits >= 0);
  assert.ok(highQber.result.finalKeyBits <= low.result.finalKeyBits);
  assert.ok(highAuth.result.finalKeyBits < low.result.finalKeyBits);
});

test("finite-key BB84 shrinks output when security epsilons tighten", () => {
  const baseline = estimateFiniteKeyBb84({
    ...baseLink,
    protocol: "bb84",
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-9,
    epsilonSecrecy: 1e-8,
    epsilonParameterEstimation: 1e-7
  });
  const stricter = estimateFiniteKeyBb84({
    ...baseLink,
    protocol: "bb84",
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-12,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  });

  assert.ok(stricter.result.qberUpperBound >= baseline.result.qberUpperBound);
  assert.ok(stricter.result.finalKeyBits <= baseline.result.finalKeyBits);
  assert.ok(stricter.warnings.some((warning) => warning.code === "teaching-model"));
  assert.equal(stricter.result.deadTimeAvailabilityFactor, 1);
  assert.equal(stricter.result.afterpulseNoiseProbability, 0);
  assert.equal(stricter.result.sensitivitySweeps.length, 5);
  assert.ok(stricter.result.sensitivitySweeps.every((sweep) => sweep.points.length >= 10));
  assert.ok(stricter.result.distanceUncertaintyBand.length >= 10);
  assert.ok(stricter.result.distanceUncertaintyBand.every((point) => point.optimisticKeyRateHz >= point.baselineKeyRateHz && point.baselineKeyRateHz >= point.conservativeKeyRateHz));
});

test("finite-key BB84 carries decoy lower-bound context into exports", () => {
  const response = estimateFiniteKeyBb84({
    ...baseLink,
    protocol: "decoy_bb84",
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-12,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  });

  assert.ok(response.result.decoyLowerBound);
  assert.ok(response.result.decoyLowerBound.lowerBoundSecretKeyRateHz >= response.result.secretKeyRateHz);
  assert.ok(response.warnings.some((warning) => warning.code === "decoy-lower-bound"));
});

test("MDI-QKD relay estimator penalizes imbalance and low visibility", () => {
  const balanced = estimateMdiQkd({
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
  const imbalanced = estimateMdiQkd({
    ...balanced.input,
    aliceLengthKm: 5,
    bobLengthKm: 45
  });
  const lowerVisibility = estimateMdiQkd({
    ...balanced.input,
    interferenceVisibility: 0.8
  });

  assert.ok(imbalanced.result.symmetryRatio < balanced.result.symmetryRatio);
  assert.ok(imbalanced.result.secretKeyRateHz <= balanced.result.secretKeyRateHz);
  assert.ok(lowerVisibility.result.qber > balanced.result.qber);
  assert.ok(lowerVisibility.warnings.some((warning) => warning.code === "low-visibility"));
  assert.ok(balanced.result.distanceSweep.length >= 10);
});

test("CV-QKD estimator penalizes excess noise and receiver distrust", () => {
  const baseline = estimateCvQkd({
    detectionMode: "homodyne",
    receiverTrustMode: "trusted_receiver",
    distanceKm: 25,
    fiberLossDbPerKm: 0.2,
    excessLossDb: 2,
    sourceRateHz: 100000000,
    modulationVarianceSnu: 6,
    reconciliationEfficiency: 0.96,
    excessNoiseSnu: 0.01,
    preparationNoiseSnu: 0.005,
    detectorEfficiency: 0.7,
    electronicNoiseSnu: 0.03,
    phaseRecoveryEfficiency: 0.96,
    symbolUseFactor: 0.9
  });
  const noisier = estimateCvQkd({
    ...baseline.input,
    excessNoiseSnu: 0.08
  });
  const untrusted = estimateCvQkd({
    ...baseline.input,
    receiverTrustMode: "untrusted_receiver"
  });

  assert.ok(noisier.result.totalNoiseSnu > baseline.result.totalNoiseSnu);
  assert.ok(noisier.result.snr < baseline.result.snr);
  assert.ok(noisier.result.secretKeyRateHz <= baseline.result.secretKeyRateHz);
  assert.ok(noisier.warnings.some((warning) => warning.code === "high-excess-noise"));
  assert.ok(untrusted.result.holevoBoundProxy >= baseline.result.holevoBoundProxy);
  assert.ok(untrusted.result.distanceSweep.length >= 10);
});

test("entanglement-based estimator penalizes low visibility and long distances", () => {
  const e91 = estimateEntanglementQkd(baseEntanglement);
  const lowVisibility = estimateEntanglementQkd({
    ...baseEntanglement,
    sourceVisibility: 0.8,
    sourceBellStateFidelity: 0.88
  });
  const longer = estimateEntanglementQkd({
    ...baseEntanglement,
    aliceLengthKm: 35,
    bobLengthKm: 35
  });
  const bbm92 = estimateEntanglementQkd({
    ...baseEntanglement,
    protocol: "bbm92",
    bellTestFraction: 0.05
  });

  assert.ok(lowVisibility.result.qber > e91.result.qber);
  assert.ok(lowVisibility.result.chshScore < e91.result.chshScore);
  assert.ok(longer.result.secretKeyRateHz <= e91.result.secretKeyRateHz);
  assert.ok(bbm92.result.keyGenerationFraction > e91.result.keyGenerationFraction);
  assert.ok(lowVisibility.warnings.some((warning) => warning.code === "low-visibility"));
  assert.ok(e91.result.distanceSweep.length >= 10);
});

test("attack explorer risk proxies move in expected directions", () => {
  const lowEve = runAttackModel({ attackType: "intercept_resend", parameters: { eveInterceptFraction: 0.1 } });
  const highEve = runAttackModel({ attackType: "intercept_resend", parameters: { eveInterceptFraction: 0.9 } });
  assert.ok(Number(highEve.result.metrics.qberAdded) > Number(lowEve.result.metrics.qberAdded));

  const lowMu = runAttackModel({
    attackType: "pns_risk",
    parameters: { meanPhotonNumber: 0.1, channelLossAdvantageFactor: 1, decoyStateEnabled: false }
  });
  const highMu = runAttackModel({
    attackType: "pns_risk",
    parameters: { meanPhotonNumber: 1, channelLossAdvantageFactor: 1, decoyStateEnabled: false }
  });
  assert.ok(Number(highMu.result.metrics.riskProxy) > Number(lowMu.result.metrics.riskProxy));

  const lowBg = runAttackModel({ attackType: "dos_background", parameters: { backgroundCountProbability: 0.000001 } });
  const highBg = runAttackModel({ attackType: "dos_background", parameters: { backgroundCountProbability: 0.1 } });
  assert.ok(Number(highBg.result.metrics.qberNoise) > Number(lowBg.result.metrics.qberNoise));
});

test("shareable calculator state round-trips through the URL helper", () => {
  const encoded = encodeShareableState({
    protocol: "bb84",
    lengthKm: 25,
    detectorEfficiency: 0.25
  });
  const decoded = decodeShareableState(encoded);
  assert.deepEqual(decoded, {
    protocol: "bb84",
    lengthKm: 25,
    detectorEfficiency: 0.25
  });

  const url = buildShareableStateUrl("/tools/link-budget", "input", {
    protocol: "bb84",
    lengthKm: 25
  });
  assert.ok(url.startsWith("/tools/link-budget?input="));
  assert.ok(url.includes("%257B"));
});

test("guided BB84 lab exposes deterministic disturbance worksheet outputs", () => {
  const quiet = buildBb84LabSummary({ eveFraction: 0 });
  const disturbed = buildBb84LabSummary({ eveFraction: 0.5 });
  const worksheet = buildBb84TeachingLab({ eveFraction: 0.25 });

  assert.equal(quiet.qber, 0);
  assert.ok(disturbed.qber >= quiet.qber);
  assert.equal(worksheet.questions.length, 3);
  assert.ok(worksheet.metrics.some((metric) => metric.label === "Observed QBER"));
  assert.ok(worksheet.caution.includes("does not certify secure key generation"));
});

test("guided E91 lab exposes Bell-threshold worksheet exports", () => {
  const strong = buildE91LabSummary({ visibility: 0.98, noiseFraction: 0.01 });
  const weak = buildE91LabSummary({ visibility: 0.6, noiseFraction: 0.2 });
  const worksheet = buildTeachingLabExport(buildE91TeachingLab({ visibility: 0.94, noiseFraction: 0.02 }), [
    { id: "threshold", response: "The score stays above 2." }
  ], "markdown", "2026-05-30T03:30:00.000Z");

  assert.ok(strong.chshScore > 2);
  assert.ok(weak.chshScore < strong.chshScore);
  assert.ok(worksheet.content.includes("Student response: The score stays above 2."));
  assert.ok(worksheet.content.includes("device-independent security claim"));
});

test("KMS simulator grows buffer when generation exceeds consumption", () => {
  const response = runKmsSimulation({
    durationSeconds: 20,
    timeStepSeconds: 10,
    initialBufferBits: 1000,
    bufferCapacityBits: 10000,
    generationRateBitsPerSecond: 200,
    keyTtlSeconds: 1000,
    services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 0.1, bitsPerRequest: 100 }]
  });
  assert.ok(response.result.finalBufferBits > 1000);
  assert.ok(response.result.finalBufferBits <= 10000);
});

test("KMS simulator denies requests when consumption exceeds supply", () => {
  const response = runKmsSimulation({
    durationSeconds: 20,
    timeStepSeconds: 10,
    initialBufferBits: 100,
    bufferCapacityBits: 1000,
    generationRateBitsPerSecond: 0,
    keyTtlSeconds: 1000,
    services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 1, bitsPerRequest: 256 }]
  });
  assert.ok(response.result.totalDeniedRequests > 0);
  assert.ok(response.result.finalBufferBits >= 0);
});

test("standards example cases match expected conformance outcomes", () => {
  for (const example of conformanceExampleCases) {
    const result = checkMockQkdConformance(example.kind, example.payload);
    assert.equal(result.ok, example.expectedOk, `Example ${example.id} returned an unexpected conformance result.`);
  }

  const bundle = JSON.parse(serializeMockApiExampleBundle());
  assert.equal(bundle.demoOnly, true);
  assert.equal(Array.isArray(bundle.examples), true);
  assert.equal(bundle.examples.length, mockApiExamples.length);
  assert.ok(bundle.examples.some((example) => example.endpoint === "/api/qkd-mock/keys/request" && example.status === 409));
  assert.ok(bundle.examples.some((example) => example.endpoint === "/api/qkd-mock/keys/request" && example.status === 403));
  assert.ok(bundle.examples.some((example) => example.endpoint.includes("/api/qkd-mock/keys/") && example.status === 410));
});

test("sample scenarios validate", () => {
  for (const scenario of scenarios) {
    assert.equal(validateScenario(scenario).ok, true);
  }
});

test("route ranking returns routes for connected nodes", () => {
  const sample = scenarios[1];
  const response = rankRoutes({ scenario: sample, sourceNodeId: "a", targetNodeId: "b", objective: "balanced" });
  assert.ok(response.result.routes.length > 0);
  assert.ok(response.result.routes[0].successProbability > 0);
});

test("route ranking warns when no path exists", () => {
  const sample = scenarios[1];
  const response = rankRoutes({ scenario: { ...sample, links: [] }, sourceNodeId: "a", targetNodeId: "b", objective: "balanced" });
  assert.equal(response.result.routes.length, 0);
  assert.ok(response.warnings.some((warning) => warning.code === "no-route"));
});

test("route ranking score drops with lower success probability", () => {
  const sample = scenarios[1];
  const high = rankRoutes({ scenario: sample, sourceNodeId: "a", targetNodeId: "b", objective: "rate" }).result.routes[0];
  const weaker = {
    ...sample,
    links: sample.links.map((link) => ({ ...link, successProbability: 0.01 }))
  };
  const low = rankRoutes({ scenario: weaker, sourceNodeId: "a", targetNodeId: "b", objective: "rate" }).result.routes[0];
  assert.ok(low.score < high.score);
});

test("repeater optimizer emits candidate list and best choice", () => {
  const response = optimizeRepeaterChain({
    totalDistanceKm: 200,
    attenuationDbPerKm: 0.2,
    memoryLifetimeMs: 100,
    attemptRateHz: 100000,
    targetFidelity: 0.8,
    maxRepeaters: 5
  });
  assert.equal(response.result.candidates.length, 6);
  assert.ok(response.result.candidates[1].segmentLengthKm < response.result.candidates[0].segmentLengthKm);
  assert.ok(response.result.bestCandidate);
});

test("resource filtering matches queries, types, and tags", () => {
  assert.ok(filterResources(resources, { query: "discrete-event" }).map((item) => item.id).includes("netsquid"));
  assert.ok(filterResources(resources, { query: "post-quantum" }).map((item) => item.id).includes("nist-pqc"));
  assert.ok(filterResources(resources, { type: "standard" }).every((item) => item.type === "standard"));
  assert.ok(filterResources(resources, { tag: "QKD" }).map((item) => item.id).includes("etsi-qkd"));
  assert.ok(listResourceTypes(resources).includes("simulator"));
  assert.ok(listResourceTags(resources).includes("QKD"));
});

test("saved run helpers preserve, duplicate, and compare local history entries", () => {
  const first = createSavedRunRecord({
    toolId: "link-budget",
    title: "Run A",
    input: { lengthKm: 10, protocol: "bb84" },
    result: { secretKeyRateHz: 100 },
    assumptions: ["A"],
    warnings: [],
    version: "test.v1",
    createdAt: "2026-05-29T13:00:00.000Z"
  });
  const second = createSavedRunRecord({
    toolId: "link-budget",
    title: "Run B",
    input: { lengthKm: 20, protocol: "bb84" },
    result: { secretKeyRateHz: 50 },
    assumptions: ["A", "B"],
    warnings: [{ code: "high-loss", message: "High loss.", severity: "warning" }],
    version: "test.v1",
    createdAt: "2026-05-29T14:00:00.000Z"
  });
  const serialized = serializeSavedRun(first);
  const parsed = parseSavedRun(serialized);
  const copy = duplicateSavedRun(first, "2026-05-29T15:00:00.000Z");
  const comparison = compareSavedRuns(first, second);

  assert.deepEqual(parsed, first);
  assert.equal(copy.title, "Run A (copy)");
  assert.deepEqual(sortSavedRuns([first, second, copy]).map((run) => run.createdAt), [
    "2026-05-29T15:00:00.000Z",
    "2026-05-29T14:00:00.000Z",
    "2026-05-29T13:00:00.000Z"
  ]);
  assert.deepEqual(comparison, {
    sameTool: true,
    inputDifferences: ["lengthKm"],
    resultDifferences: ["secretKeyRateHz"],
    assumptionDelta: -1,
    warningDelta: -1
  });
});

test("saved scenario helpers preserve, duplicate, and bundle local library entries", () => {
  const first = createSavedScenarioRecord({
    title: "Metro baseline",
    scenario: scenarios[0],
    createdAt: "2026-05-29T13:00:00.000Z"
  });
  const second = createSavedScenarioRecord({
    title: "Trusted backbone",
    scenario: scenarios[1],
    createdAt: "2026-05-29T14:00:00.000Z"
  });
  const bundle = parseSavedScenarioBundle(serializeSavedScenarioBundle([first, second], "2026-05-29T15:00:00.000Z"));
  const copy = duplicateSavedScenario(first, "2026-05-29T16:00:00.000Z");

  assert.equal(bundle.version, "quantumcomm.saved-scenarios.bundle.v1");
  assert.equal(bundle.exportedAt, "2026-05-29T15:00:00.000Z");
  assert.deepEqual(bundle.scenarios.map((record) => record.id), [second.id, first.id]);
  assert.equal(copy.title, "Metro baseline (copy)");
  assert.deepEqual(sortSavedScenarios([first, second, copy]).map((record) => record.createdAt), [
    "2026-05-29T16:00:00.000Z",
    "2026-05-29T14:00:00.000Z",
    "2026-05-29T13:00:00.000Z"
  ]);
});

test("all page routes render non-empty markup", async () => {
  const pageFiles = collectFiles(path.join(projectRoot, "app"), "page.tsx");

  for (const pageFile of pageFiles) {
    const relativePath = projectRelative(pageFile);
    const moduleExports = require(pageFile);
    assert.equal(typeof moduleExports.default, "function", `${relativePath} is missing a default page component`);

    const propVariants = relativePath.includes("[")
      ? typeof moduleExports.generateStaticParams === "function"
        ? moduleExports.generateStaticParams().map((params) => ({ params }))
        : []
      : [{}];

    assert.ok(propVariants.length > 0, `${relativePath} did not provide any params to render`);

    for (const props of propVariants) {
      const html = await renderPageMarkup(moduleExports.default, props);
      assert.ok(html.includes("<main"), `${relativePath} did not render a main landmark`);
      assert.ok(html.length > 200, `${relativePath} rendered unexpectedly short output`);
      assert.ok(!html.includes("undefined"), `${relativePath} rendered undefined content`);
    }
  }

  const protocolPage = projectRequire("app/learn/[protocol]/page.tsx");
  const bb84Html = await renderPageMarkup(protocolPage.default, { params: Promise.resolve({ protocol: "bb84" }) });
  const e91Html = await renderPageMarkup(protocolPage.default, { params: Promise.resolve({ protocol: "e91" }) });
  assert.ok(bb84Html.includes("Guided lab"));
  assert.ok(bb84Html.includes("Worksheet mode"));
  assert.ok(e91Html.includes("Bell-style interpretation"));
});

test("documented route inventory matches the app page tree", () => {
  const pageRoutes = collectFiles(path.join(projectRoot, "app"), "page.tsx")
    .map(routePathFromPageFile)
    .sort();
  const documentedRoutes = Array.from(collectDocumentedRoutes()).sort();

  assert.deepEqual(documentedRoutes, pageRoutes);
});

test("root layout exposes skip navigation and repository footer link", () => {
  const layoutModule = projectRequire("app/layout.tsx");
  assert.equal(typeof layoutModule.default, "function");

  const html = renderToStaticMarkup(
    React.createElement(layoutModule.default, {
      children: React.createElement("main", null, React.createElement("p", null, "Layout smoke test"))
    })
  );

  assert.ok(html.includes("Skip to main content"));
  assert.ok(html.includes("id=\"main-content\""));
  assert.ok(html.includes("aria-label=\"Primary\""));
  assert.ok(html.includes("Source repository"));
  assert.ok(html.includes("github.com/chathura77/quantumcomm_workbench"));
  assert.ok(!html.includes("Source link placeholder"));
});

test("shared UI helpers expose accessible descriptions and chart summaries", () => {
  const ui = projectRequire("components/ui.tsx");

  const fieldHtml = renderToStaticMarkup(
    React.createElement("div", null,
      React.createElement(ui.NumberField, {
        label: "Detector efficiency",
        value: 0.25,
        onChange() {},
        help: "Fractional detector efficiency between zero and one."
      }),
      React.createElement(ui.TextField, {
        label: "Scenario name",
        value: "Metro ring",
        onChange() {},
        help: "Used in exported reports and scenario bundles."
      }),
      React.createElement(ui.TextAreaField, {
        label: "Scenario JSON",
        value: "{\"id\":\"metro-ring\"}",
        onChange() {},
        help: "Paste a scenario object for validation and editing.",
        error: "Scenario JSON does not satisfy the local schema."
      }),
      React.createElement(ui.SelectField, {
        label: "Protocol",
        value: "bb84",
        onChange() {},
        options: [{ value: "bb84", label: "BB84" }],
        help: "Teaching label only; not a certified protocol profile."
      }),
      React.createElement(ui.CheckboxField, {
        label: "Compliance driver present",
        checked: true,
        onChange() {},
        help: "Flags use cases where standards posture changes the architecture tradeoff."
      })
    )
  );

  assert.ok(fieldHtml.includes("aria-describedby"));
  assert.ok(fieldHtml.includes("Fractional detector efficiency between zero and one."));
  assert.ok(fieldHtml.includes("Used in exported reports and scenario bundles."));
  assert.ok(fieldHtml.includes("Paste a scenario object for validation and editing."));
  assert.ok(fieldHtml.includes("Scenario JSON does not satisfy the local schema."));
  assert.ok(fieldHtml.includes("Teaching label only; not a certified protocol profile."));
  assert.ok(fieldHtml.includes("Flags use cases where standards posture changes the architecture tradeoff."));
  assert.ok(fieldHtml.includes("aria-invalid=\"true\""));

  const chartHtml = renderToStaticMarkup(
    React.createElement(ui.SimpleLineChart, {
      points: [
        { distanceKm: 0, secretKeyRateHz: 1000 },
        { distanceKm: 50, secretKeyRateHz: 100 }
      ],
      xKey: "distanceKm",
      yKey: "secretKeyRateHz",
      label: "Distance sweep"
    })
  );

  assert.ok(chartHtml.includes("aria-describedby"));
  assert.ok(chartHtml.includes("<desc"));
  assert.ok(chartHtml.includes("Midpoint sample"));

  const bandHtml = renderToStaticMarkup(
    React.createElement(ui.SimpleBandChart, {
      points: [
        { distanceKm: 0, optimisticKeyRateHz: 1200, baselineKeyRateHz: 1000, conservativeKeyRateHz: 800 },
        { distanceKm: 50, optimisticKeyRateHz: 300, baselineKeyRateHz: 200, conservativeKeyRateHz: 100 }
      ],
      xKey: "distanceKm",
      lowKey: "conservativeKeyRateHz",
      midKey: "baselineKeyRateHz",
      highKey: "optimisticKeyRateHz",
      label: "Finite-key uncertainty band"
    })
  );

  assert.ok(bandHtml.includes("Optimistic"));
  assert.ok(bandHtml.includes("Conservative"));
  assert.ok(bandHtml.includes("Midpoint sample"));
});

test("phase 6 loading and error shells render status and recovery copy", () => {
  const loadingModules = [
    projectRequire("app/tools/loading.tsx"),
    projectRequire("app/networks/loading.tsx"),
    projectRequire("app/resources/loading.tsx"),
    projectRequire("app/learn/loading.tsx")
  ];

  for (const moduleExports of loadingModules) {
    const html = renderToStaticMarkup(React.createElement(moduleExports.default));
    assert.ok(html.includes("role=\"status\""));
    assert.ok(html.includes("Loading"));
  }

  const errorModules = [
    projectRequire("app/tools/error.tsx"),
    projectRequire("app/networks/error.tsx"),
    projectRequire("app/resources/error.tsx"),
    projectRequire("app/learn/error.tsx")
  ];

  for (const moduleExports of errorModules) {
    const html = renderToStaticMarkup(React.createElement(moduleExports.default, {
      error: new Error("Smoke test render error"),
      reset() {}
    }));
    assert.ok(html.includes("role=\"alert\""));
    assert.ok(html.includes("Smoke test render error"));
    assert.ok(html.includes("Reset"));
  }
});

test("JSON-driven tools surface invalid-state recovery copy", () => {
  const tools = projectRequire("components/workbench-tools.tsx");

  const reportHtml = renderToStaticMarkup(React.createElement(tools.ReportGeneratorTool));
  assert.ok(reportHtml.includes("Report generator"));
  assert.ok(reportHtml.includes("Run JSON"));
  assert.ok(reportHtml.includes("Saved runs"));
  assert.ok(reportHtml.includes("No saved runs yet"));

  const scenarioHtml = renderToStaticMarkup(React.createElement(tools.ScenarioBuilderTool));
  assert.ok(scenarioHtml.includes("Editable node records"));
  assert.ok(scenarioHtml.includes("Editable link records"));
  assert.ok(scenarioHtml.includes("Saved scenario library"));
  assert.ok(scenarioHtml.includes("Import scenario bundle"));
  assert.ok(scenarioHtml.includes("aria-label=\"Node ID for Alice"));
  assert.ok(scenarioHtml.includes("aria-label=\"Node type for Alice"));
  assert.ok(scenarioHtml.includes("aria-label=\"Remove node Alice"));
  assert.ok(scenarioHtml.includes("aria-label=\"Source node for alice-relay"));
  assert.ok(scenarioHtml.includes("aria-label=\"Classical latency for alice-relay"));
  assert.ok(scenarioHtml.includes("aria-label=\"Remove link alice-relay"));

  const linkBudgetHtml = renderToStaticMarkup(React.createElement(tools.LinkBudgetTool));
  assert.ok(linkBudgetHtml.includes("Shareable URL state"));
  assert.ok(linkBudgetHtml.includes("Copy share URL"));

  const finiteKeyHtml = renderToStaticMarkup(React.createElement(tools.FiniteKeyBb84Tool));
  assert.ok(finiteKeyHtml.includes("Shareable URL state"));
  assert.ok(finiteKeyHtml.includes("Copy share URL"));

  const etsiHtml = renderToStaticMarkup(React.createElement(tools.EtsiApiSandboxTool));
  assert.ok(etsiHtml.includes("Download example bundle"));
  assert.ok(etsiHtml.includes("Mock API examples"));

  const conformanceHtml = renderToStaticMarkup(React.createElement(tools.StandardsConformanceTool));
  assert.ok(conformanceHtml.includes("Built-in example"));
  assert.ok(conformanceHtml.includes("Expected outcome"));
});

test("OpenAPI viewer reflects the checked-in contract", () => {
  const contract = loadOpenApiContract();
  assert.equal(contract.title, "QuantumComm Workbench API");
  assert.ok(contract.endpoints.some((endpoint) => endpoint.path === "/qkd-mock/status" && endpoint.method === "GET"));
  assert.ok(contract.schemas.some((schema) => schema.name === "LinkBudgetInput"));

  const viewerModule = projectRequire("app/tools/openapi-viewer/page.tsx");
  const html = renderToStaticMarkup(React.createElement(viewerModule.default));
  assert.ok(html.includes("OpenAPI viewer"));
  assert.ok(html.includes("QuantumComm Workbench API"));
  assert.ok(html.includes("/simulations/qkd/link-budget"));
  assert.ok(html.includes("LinkBudgetInput"));
  assert.ok(html.includes("Raw contract"));
});

test("phase 13 CI and release artifacts are checked in", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["test:e2e"], "node tests/e2e-smoke.cjs");

  const smokeScript = fs.readFileSync(path.join(projectRoot, "tests", "e2e-smoke.cjs"), "utf8");
  assert.ok(smokeScript.includes("const requestedPort = configuredPort ?? 0;"));
  assert.ok(smokeScript.includes("baseUrl = `http://${host}:${address.port}`;"));

  const ciWorkflow = fs.readFileSync(path.join(projectRoot, ".github", "workflows", "ci.yml"), "utf8");
  assert.ok(ciWorkflow.includes("npm ci"));
  assert.ok(ciWorkflow.includes("npm run lint"));
  assert.ok(ciWorkflow.includes("npm run typecheck"));
  assert.ok(ciWorkflow.includes("npm run test"));
  assert.ok(ciWorkflow.includes("npm run build"));
  assert.ok(ciWorkflow.includes("npm run test:e2e"));

  const auditWorkflow = fs.readFileSync(path.join(projectRoot, ".github", "workflows", "dependency-audit.yml"), "utf8");
  assert.ok(auditWorkflow.includes("npm audit --audit-level=high"));
  assert.ok(auditWorkflow.includes("schedule:"));

  const deploymentDoc = fs.readFileSync(path.join(projectRoot, "docs", "DEPLOYMENT.md"), "utf8");
  assert.ok(deploymentDoc.includes("Pre-deploy checks"));
  assert.ok(deploymentDoc.includes("npm run build"));
  assert.ok(deploymentDoc.includes("npm run test:e2e"));
  assert.ok(deploymentDoc.includes("demo-only posture"));

  const releaseChecklist = fs.readFileSync(path.join(projectRoot, "docs", "RELEASE_CHECKLIST.md"), "utf8");
  assert.ok(releaseChecklist.includes("npm run lint"));
  assert.ok(releaseChecklist.includes("npm run test:e2e"));
  assert.ok(releaseChecklist.includes("docs/VISUAL_QA.md"));
  assert.ok(releaseChecklist.includes("simulation-only"));
});

test("all API route files are explicitly covered by smoke tests", () => {
  const routeFiles = collectFiles(path.join(projectRoot, "app", "api"), "route.ts")
    .map(projectRelative)
    .sort();

  assert.deepEqual(routeFiles, Array.from(coveredApiRoutes).sort());
});

test("key API routes return JSON for representative requests", async () => {
  const statusRoute = projectRequire("app/api/qkd-mock/status/route.ts");
  const keyRequestRoute = projectRequire("app/api/qkd-mock/keys/request/route.ts");
  const keyRetrieveRoute = projectRequire("app/api/qkd-mock/keys/[keyId]/route.ts");
  const linkBudgetRoute = projectRequire("app/api/simulations/qkd/link-budget/route.ts");
  const finiteKeyRoute = projectRequire("app/api/simulations/qkd/finite-key-bb84/route.ts");
  const qberRoute = projectRequire("app/api/simulations/qkd/qber-forensics/route.ts");
  const cvRoute = projectRequire("app/api/simulations/qkd/cv-qkd/route.ts");
  const entanglementRoute = projectRequire("app/api/simulations/qkd/entanglement-qkd/route.ts");
  const mdiRoute = projectRequire("app/api/simulations/qkd/mdi-qkd/route.ts");
  const twinFieldRoute = projectRequire("app/api/simulations/qkd/twin-field-qkd/route.ts");
  const postProcessingRoute = projectRequire("app/api/simulations/qkd/post-processing/route.ts");
  const attackRoute = projectRequire("app/api/simulations/qkd/attack/route.ts");
  const kmsRoute = projectRequire("app/api/simulations/kms/run/route.ts");
  const networkRoute = projectRequire("app/api/simulations/network/route/route.ts");
  const repeaterRoute = projectRequire("app/api/simulations/network/repeater-optimize/route.ts");
  const reportRoute = projectRequire("app/api/export/report/route.ts");
  __resetMockPoolForTests();

  const statusResponse = await statusRoute.GET();
  assert.equal(statusResponse.status, 200);
  const statusBody = await readJson(statusResponse);
  assert.ok(statusBody.poolId);
  assert.equal(statusBody.demoOnly, true);
  assert.equal(statusBody.authorizationMode, "header_token_demo");
  assert.ok(Array.isArray(statusBody.authorizedApplications));

  const keyRequestResponse = await keyRequestRoute.POST(createJsonRequest({
    applicationId: "smoke-suite",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, { "x-qkd-app-token": "smoke-suite-token" }));
  assert.equal(keyRequestResponse.status, 200);
  const keyRequestBody = await readJson(keyRequestResponse);
  assert.equal(keyRequestBody.keys.length, 1);
  assert.equal(keyRequestBody.keys[0].applicationId, "smoke-suite");

  const keyRetrieveResponse = await keyRetrieveRoute.GET(new Request("http://localhost/test", {
    headers: {
      "x-qkd-application-id": "smoke-suite",
      "x-qkd-app-token": "smoke-suite-token"
    }
  }), {
    params: Promise.resolve({ keyId: keyRequestBody.keys[0].keyId })
  });
  assert.equal(keyRetrieveResponse.status, 200);
  const keyRetrieveBody = await readJson(keyRetrieveResponse);
  assert.equal(keyRetrieveBody.keyId, keyRequestBody.keys[0].keyId);
  assert.equal(keyRetrieveBody.applicationId, "smoke-suite");

  const linkBudgetResponse = await linkBudgetRoute.POST(createJsonRequest(baseLink));
  assert.equal(linkBudgetResponse.status, 200);
  const linkBudgetBody = await readJson(linkBudgetResponse);
  assert.ok(linkBudgetBody.result.secretKeyRateHz >= 0);

  const finiteKeyResponse = await finiteKeyRoute.POST(createJsonRequest({
    ...baseLink,
    protocol: "bb84",
    sampleFraction: 0.1,
    epsilonCorrectness: 1e-12,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  }));
  assert.equal(finiteKeyResponse.status, 200);
  const finiteKeyBody = await readJson(finiteKeyResponse);
  assert.ok(finiteKeyBody.result.finalKeyBits >= 0);
  assert.ok(finiteKeyBody.result.qberUpperBound >= finiteKeyBody.result.observedQber);
  assert.equal(finiteKeyBody.result.sensitivitySweeps.length, 5);
  assert.ok(Array.isArray(finiteKeyBody.result.distanceUncertaintyBand));

  const qberResponse = await qberRoute.POST(createJsonRequest({
    measuredQber: 0.03,
    misalignmentError: 0.01,
    visibility: 0.98,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    detectorMismatch: 0.01,
    eveInterceptFraction: 0.02,
    signalDetectionProbability: 0.1
  }));
  assert.equal(qberResponse.status, 200);
  const qberBody = await readJson(qberResponse);
  assert.ok(Array.isArray(qberBody.result.contributions));

  const cvResponse = await cvRoute.POST(createJsonRequest({
    detectionMode: "homodyne",
    receiverTrustMode: "trusted_receiver",
    distanceKm: 25,
    fiberLossDbPerKm: 0.2,
    excessLossDb: 2,
    sourceRateHz: 100000000,
    modulationVarianceSnu: 6,
    reconciliationEfficiency: 0.96,
    excessNoiseSnu: 0.01,
    preparationNoiseSnu: 0.005,
    detectorEfficiency: 0.7,
    electronicNoiseSnu: 0.03,
    phaseRecoveryEfficiency: 0.96,
    symbolUseFactor: 0.9
  }));
  assert.equal(cvResponse.status, 200);
  const cvBody = await readJson(cvResponse);
  assert.ok(cvBody.result.snr >= 0);
  assert.ok(cvBody.result.covarianceProxy >= 0);
  assert.ok(Array.isArray(cvBody.result.distanceSweep));

  const entanglementResponse = await entanglementRoute.POST(createJsonRequest(baseEntanglement));
  assert.equal(entanglementResponse.status, 200);
  const entanglementBody = await readJson(entanglementResponse);
  assert.ok(entanglementBody.result.coincidenceProbability >= 0);
  assert.ok(entanglementBody.result.chshScore >= 0);
  assert.ok(Array.isArray(entanglementBody.result.distanceSweep));

  const mdiResponse = await mdiRoute.POST(createJsonRequest({
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
  }));
  assert.equal(mdiResponse.status, 200);
  const mdiBody = await readJson(mdiResponse);
  assert.ok(mdiBody.result.coincidenceProbability >= 0);
  assert.ok(Array.isArray(mdiBody.result.distanceSweep));

  const twinFieldResponse = await twinFieldRoute.POST(createJsonRequest({
    stationMode: "untrusted",
    aliceLengthKm: 75,
    bobLengthKm: 75,
    fiberLossDbPerKm: 0.18,
    aliceConnectorLossDb: 2.5,
    bobConnectorLossDb: 2.5,
    sourceRateHz: 500000000,
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
    blockSize: 1000000
  }));
  assert.equal(twinFieldResponse.status, 200);
  const twinFieldBody = await readJson(twinFieldResponse);
  assert.ok(twinFieldBody.result.phaseStabilityFactor >= 0);
  assert.ok(Array.isArray(twinFieldBody.result.distanceSweep));

  const postProcessingResponse = await postProcessingRoute.POST(createJsonRequest({
    rawDetections: 1_000_000,
    basisSiftingFactor: 0.5,
    qber: 0.02,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  }));
  assert.equal(postProcessingResponse.status, 200);
  const postProcessingBody = await readJson(postProcessingResponse);
  assert.ok(postProcessingBody.result.finalKeyBits >= 0);

  const attackResponse = await attackRoute.POST(createJsonRequest({
    attackType: "pns_risk",
    parameters: {
      meanPhotonNumber: 0.4,
      channelLossAdvantageFactor: 1.2,
      decoyStateEnabled: true
    }
  }));
  assert.equal(attackResponse.status, 200);
  const attackBody = await readJson(attackResponse);
  assert.ok(attackBody.result.metrics);

  const kmsResponse = await kmsRoute.POST(createJsonRequest({
    durationSeconds: 120,
    timeStepSeconds: 10,
    initialBufferBits: 1000,
    bufferCapacityBits: 10000,
    generationRateBitsPerSecond: 200,
    keyTtlSeconds: 3600,
    services: [{ id: "svc", name: "Service", priority: 1, requestRatePerSecond: 0.2, bitsPerRequest: 128 }]
  }));
  assert.equal(kmsResponse.status, 200);
  const kmsBody = await readJson(kmsResponse);
  assert.ok(Array.isArray(kmsBody.result.timeline));

  const networkResponse = await networkRoute.POST(createJsonRequest({
    scenario: scenarios[1],
    sourceNodeId: "a",
    targetNodeId: "b",
    objective: "balanced"
  }));
  assert.equal(networkResponse.status, 200);
  const networkBody = await readJson(networkResponse);
  assert.ok(Array.isArray(networkBody.result.routes));

  const repeaterResponse = await repeaterRoute.POST(createJsonRequest({
    totalDistanceKm: 120,
    attenuationDbPerKm: 0.2,
    memoryLifetimeMs: 100,
    attemptRateHz: 100000,
    targetFidelity: 0.8,
    maxRepeaters: 4
  }));
  assert.equal(repeaterResponse.status, 200);
  const repeaterBody = await readJson(repeaterResponse);
  assert.ok(repeaterBody.result.bestCandidate);

  const reportResponse = await reportRoute.POST(createJsonRequest({
    toolId: "link-budget",
    title: "Smoke suite link budget",
    input: baseLink,
    result: linkBudgetBody.result,
    assumptions: ["Simplified educational BB84 model."],
    warnings: linkBudgetBody.warnings,
    references: ["Bennett and Brassard, 1984"],
    formulas: linkBudgetBody.formulas,
    version: "smoke-suite",
    format: "markdown"
  }));
  assert.equal(reportResponse.status, 200);
  const reportBody = await readJson(reportResponse);
  assert.equal(reportBody.mimeType, "text/markdown");
  assert.ok(typeof reportBody.content === "string" && reportBody.content.includes("Smoke suite link budget"));
});

test("mock key lifecycle cleans up expired descriptors", async () => {
  const statusRoute = projectRequire("app/api/qkd-mock/status/route.ts");
  const keyRequestRoute = projectRequire("app/api/qkd-mock/keys/request/route.ts");
  const keyRetrieveRoute = projectRequire("app/api/qkd-mock/keys/[keyId]/route.ts");

  __resetMockPoolForTests();
  const keyRequestResponse = await keyRequestRoute.POST(createJsonRequest({
    applicationId: "demo-app",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, { "x-qkd-app-token": "demo-token-alice" }));
  const keyRequestBody = await readJson(keyRequestResponse);
  const keyId = keyRequestBody.keys[0].keyId;

  __advanceMockPoolClockForTests(60 * 60 * 1000 + 1000);

  const expiredResponse = await keyRetrieveRoute.GET(new Request("http://localhost/test", {
    headers: {
      "x-qkd-application-id": "demo-app",
      "x-qkd-app-token": "demo-token-alice"
    }
  }), {
    params: Promise.resolve({ keyId })
  });
  assert.equal(expiredResponse.status, 410);
  const expiredBody = await readJson(expiredResponse);
  assert.equal(expiredBody.error, "ExpiredKey");
  assert.equal(expiredBody.keyId, keyId);

  const statusResponse = await statusRoute.GET();
  const statusBody = await readJson(statusResponse);
  assert.equal(statusBody.activeKeyCount, 0);
  assert.equal(statusBody.expiredKeyCount, 1);
});

test("API routes return expected validation and not-found errors", async () => {
  const keyRequestRoute = projectRequire("app/api/qkd-mock/keys/request/route.ts");
  const keyRetrieveRoute = projectRequire("app/api/qkd-mock/keys/[keyId]/route.ts");
  const linkBudgetRoute = projectRequire("app/api/simulations/qkd/link-budget/route.ts");
  const finiteKeyRoute = projectRequire("app/api/simulations/qkd/finite-key-bb84/route.ts");
  const qberRoute = projectRequire("app/api/simulations/qkd/qber-forensics/route.ts");
  const cvRoute = projectRequire("app/api/simulations/qkd/cv-qkd/route.ts");
  const entanglementRoute = projectRequire("app/api/simulations/qkd/entanglement-qkd/route.ts");
  const mdiRoute = projectRequire("app/api/simulations/qkd/mdi-qkd/route.ts");
  const twinFieldRoute = projectRequire("app/api/simulations/qkd/twin-field-qkd/route.ts");
  const postProcessingRoute = projectRequire("app/api/simulations/qkd/post-processing/route.ts");
  const attackRoute = projectRequire("app/api/simulations/qkd/attack/route.ts");
  const kmsRoute = projectRequire("app/api/simulations/kms/run/route.ts");
  const networkRoute = projectRequire("app/api/simulations/network/route/route.ts");
  const repeaterRoute = projectRequire("app/api/simulations/network/repeater-optimize/route.ts");
  const reportRoute = projectRequire("app/api/export/report/route.ts");
  __resetMockPoolForTests();

  const missingKeyResponse = await keyRetrieveRoute.GET(new Request("http://localhost/test"), {
    params: Promise.resolve({ keyId: "missing-key" })
  });
  assert.equal(missingKeyResponse.status, 404);
  const missingKeyBody = await readJson(missingKeyResponse);
  assert.equal(missingKeyBody.error, "NotFound");

  const insufficientResponse = await keyRequestRoute.POST(createJsonRequest({
    applicationId: "smoke-suite",
    keyLengthBits: 1048576,
    numberOfKeys: 100,
    priority: 1
  }, { "x-qkd-app-token": "smoke-suite-token" }));
  assert.equal(insufficientResponse.status, 409);
  const insufficientBody = await readJson(insufficientResponse);
  assert.equal(insufficientBody.error, "InsufficientKeyMaterial");
  assert.ok(insufficientBody.requestedBits > insufficientBody.availableBits);

  const unauthorizedRequestResponse = await keyRequestRoute.POST(createJsonRequest({
    applicationId: "demo-app",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, { "x-qkd-app-token": "wrong-token" }));
  assert.equal(unauthorizedRequestResponse.status, 403);
  const unauthorizedRequestBody = await readJson(unauthorizedRequestResponse);
  assert.equal(unauthorizedRequestBody.error, "UnauthorizedApplication");

  const validRequestResponse = await keyRequestRoute.POST(createJsonRequest({
    applicationId: "demo-app",
    keyLengthBits: 128,
    numberOfKeys: 1,
    priority: 1
  }, { "x-qkd-app-token": "demo-token-alice" }));
  const validRequestBody = await readJson(validRequestResponse);
  const issuedKeyId = validRequestBody.keys[0].keyId;

  const unauthorizedRetrieveResponse = await keyRetrieveRoute.GET(new Request("http://localhost/test", {
    headers: {
      "x-qkd-application-id": "lab-app",
      "x-qkd-app-token": "lab-token-bob"
    }
  }), {
    params: Promise.resolve({ keyId: issuedKeyId })
  });
  assert.equal(unauthorizedRetrieveResponse.status, 403);
  const unauthorizedRetrieveBody = await readJson(unauthorizedRetrieveResponse);
  assert.equal(unauthorizedRetrieveBody.error, "UnauthorizedApplication");

  const badLinkBudget = await linkBudgetRoute.POST(createJsonRequest({ ...baseLink, lengthKm: -1 }));
  assert.equal(badLinkBudget.status, 400);
  assertValidationError(await readJson(badLinkBudget));

  const badFiniteKey = await finiteKeyRoute.POST(createJsonRequest({
    ...baseLink,
    protocol: "mdi_qkd",
    sampleFraction: 0.9,
    epsilonCorrectness: 0,
    epsilonSecrecy: 1e-10,
    epsilonParameterEstimation: 1e-9
  }));
  assert.equal(badFiniteKey.status, 400);
  assertValidationError(await readJson(badFiniteKey));

  const badQber = await qberRoute.POST(createJsonRequest({
    measuredQber: 0.7,
    misalignmentError: 0.01,
    visibility: 0.98,
    darkCountProbability: 0.000001,
    backgroundCountProbability: 0.000002,
    detectorMismatch: 0.01,
    eveInterceptFraction: 0.02,
    signalDetectionProbability: 0.1
  }));
  assert.equal(badQber.status, 400);
  assertValidationError(await readJson(badQber));

  const badCv = await cvRoute.POST(createJsonRequest({
    detectionMode: "homodyne",
    receiverTrustMode: "invalid",
    distanceKm: -1,
    fiberLossDbPerKm: 0.2,
    excessLossDb: 2,
    sourceRateHz: 100000000,
    modulationVarianceSnu: 6,
    reconciliationEfficiency: 1.2,
    excessNoiseSnu: 0.01,
    preparationNoiseSnu: 0.005,
    detectorEfficiency: 0.7,
    electronicNoiseSnu: 0.03,
    phaseRecoveryEfficiency: 0.96,
    symbolUseFactor: 0.9
  }));
  assert.equal(badCv.status, 400);
  assertValidationError(await readJson(badCv));

  const badEntanglement = await entanglementRoute.POST(createJsonRequest({
    ...baseEntanglement,
    protocol: "bb84",
    pairEmissionProbability: 1.5
  }));
  assert.equal(badEntanglement.status, 400);
  assertValidationError(await readJson(badEntanglement));

  const badMdi = await mdiRoute.POST(createJsonRequest({
    relayMode: "invalid",
    aliceLengthKm: -1,
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
  }));
  assert.equal(badMdi.status, 400);
  assertValidationError(await readJson(badMdi));

  const badTwinField = await twinFieldRoute.POST(createJsonRequest({
    stationMode: "invalid",
    aliceLengthKm: -1,
    bobLengthKm: 75,
    fiberLossDbPerKm: 0.18,
    aliceConnectorLossDb: 2.5,
    bobConnectorLossDb: 2.5,
    sourceRateHz: 500000000,
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
    blockSize: 1000000
  }));
  assert.equal(badTwinField.status, 400);
  assertValidationError(await readJson(badTwinField));

  const badPostProcessing = await postProcessingRoute.POST(createJsonRequest({
    rawDetections: -1,
    basisSiftingFactor: 0.5,
    qber: 0.02,
    sampleFraction: 0.1,
    reconciliationEfficiency: 1.16,
    verificationBits: 128,
    authenticationBits: 256,
    securityMarginBits: 1024
  }));
  assert.equal(badPostProcessing.status, 400);
  assertValidationError(await readJson(badPostProcessing));

  const badAttack = await attackRoute.POST(createJsonRequest({
    attackType: "invalid_attack",
    parameters: {}
  }));
  assert.equal(badAttack.status, 400);
  assertValidationError(await readJson(badAttack));

  const badKms = await kmsRoute.POST(createJsonRequest({
    durationSeconds: 120,
    timeStepSeconds: 10,
    initialBufferBits: 1000,
    bufferCapacityBits: 10000,
    generationRateBitsPerSecond: 200,
    keyTtlSeconds: 3600,
    services: []
  }));
  assert.equal(badKms.status, 400);
  assertValidationError(await readJson(badKms));

  const badNetwork = await networkRoute.POST(createJsonRequest({
    scenario: scenarios[1],
    sourceNodeId: "",
    targetNodeId: "b",
    objective: "balanced"
  }));
  assert.equal(badNetwork.status, 400);
  assertValidationError(await readJson(badNetwork));

  const badRepeater = await repeaterRoute.POST(createJsonRequest({
    totalDistanceKm: 120,
    attenuationDbPerKm: 0.2,
    memoryLifetimeMs: 100,
    attemptRateHz: 100000,
    targetFidelity: 0.8,
    maxRepeaters: 101
  }));
  assert.equal(badRepeater.status, 400);
  assertValidationError(await readJson(badRepeater));

  const badReport = await reportRoute.POST(createJsonRequest({
    toolId: "link-budget",
    title: "Invalid report export",
    input: baseLink,
    result: { ok: true },
    assumptions: [],
    warnings: [],
    format: "pdf"
  }));
  assert.equal(badReport.status, 400);
  assertValidationError(await readJson(badReport));
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  }

  console.log(`\n${tests.length} test(s) passed.`);
})();
