import { round } from "@/lib/math";
import type { KmsSimulationInput, KmsSimulationResult, ModelWarning, SimulationResponse } from "@/lib/types";

export const KMS_SIMULATOR_VERSION = "kms-buffer-simulator.simplified.v1";

export function runKmsSimulation(input: KmsSimulationInput): SimulationResponse<KmsSimulationInput, KmsSimulationResult> {
  const serviceSummaries = new Map(input.services.map((service) => [
    service.id,
    {
      serviceId: service.id,
      name: service.name,
      grantedRequests: 0,
      deniedRequests: 0,
      consumedBits: 0
    }
  ]));
  let bufferBits = Math.min(input.initialBufferBits, input.bufferCapacityBits);
  let totalGeneratedBits = 0;
  let totalConsumedBits = 0;
  let totalDeniedRequests = 0;
  let exhaustionEvents = 0;
  const timeline = [];
  const steps = Math.ceil(input.durationSeconds / input.timeStepSeconds);
  const services = [...input.services].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  for (let step = 0; step <= steps; step += 1) {
    const t = Math.min(input.durationSeconds, step * input.timeStepSeconds);
    const generatedBits = step === 0 ? 0 : Math.min(
      input.generationRateBitsPerSecond * input.timeStepSeconds,
      input.bufferCapacityBits - bufferBits
    );
    bufferBits = Math.min(input.bufferCapacityBits, bufferBits + generatedBits);
    totalGeneratedBits += generatedBits;

    let consumedBits = 0;
    let deniedRequests = 0;

    if (step > 0) {
      for (const service of services) {
        const expectedRequests = service.requestRatePerSecond * input.timeStepSeconds;
        const requestedBits = expectedRequests * service.bitsPerRequest;
        const summary = serviceSummaries.get(service.id);
        if (!summary || requestedBits <= 0) continue;

        if (bufferBits >= requestedBits) {
          bufferBits -= requestedBits;
          consumedBits += requestedBits;
          summary.grantedRequests += expectedRequests;
          summary.consumedBits += requestedBits;
        } else {
          const grantableRequests = Math.floor(bufferBits / service.bitsPerRequest);
          const denied = Math.ceil(Math.max(0, expectedRequests - grantableRequests));
          const grantBits = grantableRequests * service.bitsPerRequest;
          bufferBits -= grantBits;
          consumedBits += grantBits;
          deniedRequests += denied;
          summary.grantedRequests += grantableRequests;
          summary.deniedRequests += denied;
          summary.consumedBits += grantBits;
        }
      }
    }

    totalConsumedBits += consumedBits;
    totalDeniedRequests += deniedRequests;
    if (deniedRequests > 0) exhaustionEvents += 1;
    timeline.push({
      t: round(t, 3),
      bufferBits: round(bufferBits, 3),
      generatedBits: round(generatedBits, 3),
      consumedBits: round(consumedBits, 3),
      deniedRequests
    });
  }

  const warnings: ModelWarning[] = [];
  if (input.keyTtlSeconds < input.durationSeconds) {
    warnings.push({
      code: "ttl-simplified",
      severity: "info",
      message: "Key TTL is reported but this deterministic MVP does not age individual key chunks."
    });
  }
  if (totalDeniedRequests > 0) {
    warnings.push({
      code: "exhaustion",
      severity: "warning",
      message: "At least one service request was denied because the buffer lacked enough key material."
    });
  }

  return {
    input,
    result: {
      timeline,
      finalBufferBits: round(bufferBits, 3),
      totalGeneratedBits: round(totalGeneratedBits, 3),
      totalConsumedBits: round(totalConsumedBits, 3),
      totalDeniedRequests,
      exhaustionEvents,
      exhaustionProbability: timeline.length > 0 ? exhaustionEvents / timeline.length : 0,
      summaryByService: Array.from(serviceSummaries.values())
    },
    assumptions: [
      "Discrete deterministic time steps approximate expected service requests.",
      "Requests are granted by ascending priority number.",
      "Partial key requests are not granted; available whole requests may be granted before denial accounting."
    ],
    warnings,
    version: KMS_SIMULATOR_VERSION
  };
}
